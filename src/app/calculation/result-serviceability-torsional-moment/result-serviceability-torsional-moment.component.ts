import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";
import { ResultDataService } from "../result-data.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { SetPostDataService } from "../set-post-data.service";
import { CalcServiceabilityTorsionalMomentService } from "./calc-serviceability-torsional-moment.service";

@Component({
  selector: "app-result-serviceability-torsional-moment",
  templateUrl: "./result-serviceability-torsional-moment.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultServiceabilityTorsionalMomentComponent implements OnInit {
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public serviceabilityTorsionalMomentPages: any[] = new Array();
  private title = "耐久性 ねじりひび割れの照査結果";
  public page_index = "ap_15";
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcServiceabilityTorsionalMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("serviceabilityTorsionalMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post
      .http_post(inputJson)
      .then((response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable(
          "serviceabilityTorsionalMoment",
          this.serviceabilityTorsionalMomentPages
        );
      })
      .catch((error) => {
        this.err = "error!!\n" + error;
        this.summary.setSummaryTable("serviceabilityTorsionalMoment");
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.serviceabilityTorsionalMomentPages =
        this.setServiceabilityPages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public setServiceabilityPages(
    OutputData: any,
    title: string = "耐久性（破壊）ねじりモーメントの照査結果",
    DesignForceList: any = this.calc.DesignForceList,
    safetyID: number = this.calc.safetyID
  ): any[] {
    const result: any[] = new Array();

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);
      const g = groupe[ig];

      page = {
        caption: this.title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag: false,
      };


      const safetyM = this.calc.getSafetyFactor("Md", g[0].g_id, safetyID);
      const safetyV = this.calc.getSafetyFactor("Vd", g[0].g_id, safetyID);

      let SRCFlag = false;
      for (const m of groupe[ig]) {
        for (const position of m.positions) {
          for (const side of ["上側引張", "下側引張"]) {
            const res = OutputData.find(
              (e) => e.index === position.index && e.side === side
            );
            if (res === undefined || res.length < 1) {
              continue;
            }

            const force = DesignForceList.find(
              (v) => v.index === res.index
            ).designForce.find((v) => v.side === res.side);

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: this.title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag: false,
              };
              SRCFlag = false;
            }

            /////////////// まず計算 ///////////////
            const sectionM = this.result.getSection("Md", res, safetyM);
            const sectionV = this.result.getSection("Vd", res, safetyV);
            // const section = this.result.getSteelStruct("Vd", res, safety);
            const member = sectionM.member;
            const shape = sectionM.shape;
            const Ast = sectionM.Ast;

            const titleColumn = this.result.getTitleString(
              sectionM.member,
              position,
              side
            );
            const fck: any = this.helper.getFck(safetyV);

            const column: any = this.getResultString(
              this.calc.calcSigma(
                OutputData,
                res,
                sectionM,
                sectionV,
                fck,
                safetyM,
                safetyV,
                position.La,
                force
              )
            );

            let fwyd3: number = 0;
            if ("fsvy_Hweb" in sectionV.steel) {
              fwyd3 =
                sectionV.steel.fsvy_Hweb.fvyd !== null
                  ? sectionV.steel.fsvy_Hweb.fvyd
                  : sectionV.steel.fsvy_Iweb.fvyd;
            }

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(sectionM.steel.fsy_compress.fsy) !== null)
              SRC_pik = "fsy_compress";
            if (this.helper.toNumber(sectionM.steel.fsy_right.fsy) !== null)
              SRC_pik = "fsy_right";
            if (this.helper.toNumber(sectionM.steel.fsy_left.fsy) !== null)
              SRC_pik = "fsy_left";
            if (this.helper.toNumber(sectionM.steel.fsy_tension.fsy) !== null)
              SRC_pik = "fsy_tension";

            /////////////// タイトル ///////////////
            column["title1"] = { alien: "center", value: titleColumn.title1 };
            column["title2"] = { alien: "center", value: titleColumn.title2 };
            column["title3"] = { alien: "center", value: titleColumn.title3 };
            ///////////////// 形状 /////////////////
            column["B"] = this.result.alien(this.result.numStr(shape.B, 1));
            column["H"] = this.result.alien(this.result.numStr(shape.H, 1));
            ///////////////// 鉄骨情報 /////////////////
            column["steel_I_tension"] = this.result.alien(
              sectionM.steel.I.tension_flange
            );
            column["steel_I_web"] = this.result.alien(sectionM.steel.I.web);
            column["steel_I_compress"] = this.result.alien(
              sectionM.steel.I.compress_flange
            );
            column["steel_H_tension"] = this.result.alien(
              sectionM.steel.H.left_flange
            );
            column["steel_H_web"] = this.result.alien(sectionM.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
            column["tan"] = this.result.alien(
              sectionM.tan === 0 ? "-" : Ast.tan,
              "center"
            );
            column["Ast"] = this.result.alien(
              this.result.numStr(sectionM.Ast.Ast),
              "center"
            );
            column["AstString"] = this.result.alien(
              sectionM.Ast.AstString,
              "center"
            );
            column["dst"] = this.result.alien(
              this.result.numStr(sectionM.Ast.dst, 1),
              "center"
            );
            column["tcos"] = this.result.alien(
              this.result.numStr(
                sectionM.Ast.tension !== null ? sectionM.Ast.tension.cos : 1,
                3
              ),
              "center"
            );
            /////////////// 圧縮鉄筋 ///////////////
            column["Asc"] = this.result.alien(
              this.result.numStr(sectionM.Asc.Asc),
              "center"
            );
            column["AscString"] = this.result.alien(
              sectionM.Asc.AscString,
              "center"
            );
            column["dsc"] = this.result.alien(
              this.result.numStr(sectionM.Asc.dsc, 1),
              "center"
            );
            column["ccos"] = this.result.alien(
              this.result.numStr(
                sectionM.Asc.compress !== null ? sectionM.Asc.compress.cos : 1,
                3
              ),
              "center"
            );
            /////////////// 側面鉄筋 ///////////////
            // column['col'] = this.result.alien(this.result.numStr(Ast.Ase), 'center');
            column["AseString"] = this.result.alien(
              sectionM.Ase.AseString,
              "center"
            );
            column["dse"] = this.result.alien(
              this.result.numStr(sectionM.Ase.dse, 1),
              "center"
            );
            /////////////// コンクリート情報 ///////////////
            column["fck"] = this.result.alien(fck.fck.toFixed(1), "center");
            column["rc"] = this.result.alien(fck.rc.toFixed(2), "center");
            column["fcd"] = this.result.alien(fck.fcd.toFixed(1), "center");
            /////////////// 鉄筋強度情報 ///////////////
            column["fsy"] = this.result.alien(
              this.result.numStr(sectionM.Ast.fsy, 1),
              "center"
            );
            column["rs"] = this.result.alien(
              sectionV.Ast.rs.toFixed(2),
              "center"
            );
            column["fsd"] = this.result.alien(
              this.result.numStr(sectionM.Ast.fsd, 1),
              "center"
            );
            /////////////// 鉄骨情報 ///////////////
            if (SRC_pik in sectionM.steel) {
              column["fsy_steel"] = this.result.alien(
                this.result.numStr(sectionM.steel[SRC_pik].fsy, 1),
                "center"
              );
              column["fsd_steel"] = this.result.alien(
                this.result.numStr(sectionM.steel[SRC_pik].fsd, 1),
                "center"
              );
            } else {
              column["fsy_steel"] = { alien: "center", value: "-" };
              column["fsd_steel"] = { alien: "center", value: "-" };
            }
            column["rs_steel"] = this.result.alien(
              sectionM.steel.rs.toFixed(2),
              "center"
            );
            /////////////// 鉄骨情報及びそれに伴う係数 ///////////////
            column["fwyd3"] = this.result.alien(
              this.result.numStr(fwyd3, 0),
              "center"
            );

            /////////////// flag用 ///////////////
            column["bendFlag"] = column.Asb.value !== "-"; //折り曲げ鉄筋の情報があればtrue、無ければfalse
            column["steelFlag"] = sectionM.steel.flag; // 鉄骨情報があればtrue
            column["CFTFlag"] = sectionM.CFTFlag;
            /////////////// 総括表用 ///////////////
            column["g_name"] = m.g_name;
            column["index"] = position.index;
            column["side_summary"] = side;
            column["shape_summary"] = sectionM.shapeName;
            column["B_summary"] =
              "B_summary" in shape ? shape.B_summary : shape.B;
            column["H_summary"] =
              "H_summary" in shape ? shape.H_summary : shape.H;

            // SRCのデータの有無を確認
            for (const src_key of [
              "steel_I_tension",
              "steel_I_web",
              "steel_I_compress",
              "steel_H_tension",
              "steel_H_web",
            ]) {
              if (column[src_key].value !== "-") {
                SRCFlag = true;
                this.isSRC = true;
              }
            }
            page.columns.push(column);
          }
        }
      }
      // 最後のページ
      if (page.columns.length > 0) {
        for (let i = page.columns.length; i < 5; i++) {
          const column = {};
          for (let aa of Object.keys(page.columns[0])) {
            if (
              aa === "index" ||
              aa === "side_summary" ||
              aa === "shape_summary"
            ) {
              column[aa] = null;
            } else if (
              aa === "bendFlag" ||
              aa === "steelFlag" ||
              aa === "CFTFlag"
            ) {
              column[aa] = false;
            } else {
              column[aa] = { alien: "center", value: "-" };
            }
          }
          page.columns.push(column);
        }
        page.SRCFlag = SRCFlag;
        result.push(page);
      }
    }
    return result;
  }

  public getResultString(re: any): any {
    const result = {
      Aw: { alien: "center", value: "-" },
      AwString: { alien: "center", value: "-" },
      fwyd: { alien: "center", value: "-" },
      deg: { alien: "center", value: "-" },
      Ss: { alien: "center", value: "-" },

      Asb: { alien: "center", value: "-" },
      AsbString: { alien: "center", value: "-" },
      fwyd2: { alien: "center", value: "-" },
      deg2: { alien: "center", value: "-" },
      Ss2: { alien: "center", value: "-" },

      // M_rb: { alien: "center", value: "-" },

      Zs: { alien: "center", value: "-" },
      ar: { alien: "center", value: "-" },

      Nd: { alien: "center", value: "-" },
      Vhd: { alien: "center", value: "-" },
      Mthd: { alien: "center", value: "-" },
      Vpd: { alien: "center", value: "-" },
      Mtpd: { alien: "center", value: "-" },

      Mu: { alien: "center", value: "-" },
      Mud: { alien: "center", value: "-" },

      // rbs: { alien: "center", value: "-" },
      // rbc: { alien: "center", value: "-" },
      V_rbc: { alien: "center", value: "-" },
      V_rbs: { alien: "center", value: "-" },
      T_rbt: { alien: "center", value: "-" },
      Vyd: { alien: "center", value: "-" },
      comMtud07: { alien: "center", value: "-" },

      fvcd: { alien: "center", value: "-" },

      Bd: { alien: "center", value: "-" },
      pc: { alien: "center", value: "-" },
      Bp: { alien: "center", value: "-" },
      Mo: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },
      Vsd: { alien: "center", value: "-" },
      Vsd2: { alien: "center", value: "-" },

      ri: { alien: "center", value: "-" },

      fwcd: { alien: "center", value: "-" },
      Kt: { alien: "center", value: "-" },
      Mtcud: { alien: "center", value: "-" },
      Mtcud_Ratio: { alien: "center", value: "-" },
      bo: { alien: "center", value: "-" },
      do: { alien: "center", value: "-" },
      Am: { alien: "center", value: "-" },
      qw: { alien: "center", value: "-" },
      ql: { alien: "center", value: "-" },
      Mtyd: { alien: "center", value: "-" },
      Mtu_min: { alien: "center", value: "-" },
      sigma_nd: { alien: "center", value: "-" },
      ftd: { alien: "center", value: "-" },
      Bn: { alien: "center", value: "-" },
      Bnt: { alien: "center", value: "-" },
      Mtcd: { alien: "center", value: "-" },
      Mtud1: { alien: "center", value: "-" },
      Mtud2: { alien: "center", value: "-" },
      Mtud: { alien: "center", value: "-" },
      Mtud_Ratio: { alien: "center", value: "-" },

      sigma: { alien: "center", value: "-" },

      Mt1: { alien: "center", value: "-" },
      Mt2: { alien: "center", value: "-" },
      con: { alien: "center", value: "-" },
      steel_type: { alien: "center", value: "-" },

      sigma_wpd: { alien: "right", value: "-" },
      sigma_12: { alien: "right", value: "-" },
      sigma_Ratio: { alien: "right", value: "-" },
      sigma_Result: { alien: "right", value: "-" },

      comMtud07_Ratio: { alien: "center", value: "-" },
      comMtud07_Result: { alien: "center", value: "-" },

      ////////// summary_table用 //////////
      sigma_calc: { value: 0, dividend: 0, divisor: 1 },
    };

    // 帯鉄筋
    if ("Aw" in re) {
      result.Aw = { alien: "right", value: re.Aw.toFixed(1) };
    }
    if ("AwString" in re) {
      result.AwString = { alien: "right", value: re.AwString };
    }
    if ("fwyd" in re) {
      result.fwyd = { alien: "right", value: re.fwyd.toFixed(0) };
    }
    if ("deg" in re) {
      result.deg = { alien: "right", value: re.deg.toFixed(0) };
    }
    if ("Ss" in re) {
      result.Ss = { alien: "right", value: re.Ss.toFixed(0) };
    }

    //折り曲げ鉄筋
    if ("Asb" in re) {
      result.Asb = { alien: "right", value: re.Asb.toFixed(1) };
    }
    if ("AsbString" in re) {
      result.AsbString = { alien: "right", value: re.AsbString };
    }
    if ("fwyd2" in re) {
      result.fwyd2 = { alien: "right", value: re.fwyd2.toFixed(0) };
    }
    if ("deg2" in re) {
      result.deg2 = { alien: "right", value: re.deg2.toFixed(0) };
    }
    if ("Ss2" in re) {
      result.Ss2 = { alien: "right", value: re.Ss2.toFixed(0) };
    }

    // 鉄骨がある時の係数
    if ("Zs" in re) {
      result.Zs = { alien: "right", value: re.Zs.toFixed(0) };
    }
    if ("ar" in re) {
      result.ar = { alien: "right", value: re.ar.toFixed(4) };
    }

    // 断面力
    if ("Nd" in re) {
      result.Nd = {
        alien: "right",
        value: (Math.round(re.Nd * 10) / 10).toFixed(1),
      };
    }

    if ("Vhd" in re) {
      result.Vhd = {
        alien: "right",
        value: Math.round((re.Vhd * 10) / 10).toFixed(1),
      };
    }

    if ("Vpd" in re) {
      result.Vpd = {
        alien: "right",
        value: Math.round((re.Vpd * 10) / 10).toFixed(1),
      };
    }

    if ("Mthd" in re) {
      result.Mthd = {
        alien: "right",
        value: Math.round((re.Mthd * 10) / 10).toFixed(1),
      };
    }

    if ("Mtpd" in re) {
      result.Mtpd = {
        alien: "right",
        value: Math.round((re.Mtpd * 10) / 10).toFixed(1),
      };
    }

    if ("steel_type" in re) {
      result.steel_type = {
        alien: "center",
        value: re.steel_type
      }
    }

    // 耐力
    if ("Mu" in re) {
      result.Mu = { alien: "right", value: re.Mu.toFixed(1) };
    }

    if ("Mud" in re) {
      result.Mud = { alien: "right", value: re.Mud.toFixed(1) };
    }



    // if ("rbc" in re) {
    //   result.rbc = { alien: "right", value: re.rbc.toFixed(2) };
    // }

    if ("comMtud07" in re) {
      result.comMtud07 = { alien: "center", value: re.comMtud07 };
    }


    // if ("sigma_wpd" in re && "sigma_12" in re) {
    //   const str: string = re.sigma_wpd.toFixed(1) + "/" + re.sigma12.toFixed(0);
    //   result.sigma = { alien: "center", value: str };
    // }

    if ("sigma_wpd" in re) {
      const str: string = re.sigma_wpd.toFixed(1);
      result.sigma_wpd = { alien: "right", value: str };
      result.sigma_calc.dividend = re.sigma_wpd;
    }

    if ("sigma_12" in re) {
      const str: string = re.sigma_12.toFixed(1);
      result.sigma_12 = { alien: "right", value: str };
      result.sigma_calc.divisor = re.sigma_12;
    }

    // 計算結果
    if ("fvcd" in re) {
      if(this.helper.toNumber(re.fvcd) !== null){
        result.fvcd = { alien: "right", value: re.fvcd.toFixed(3) };
      }
    }
    if ("Bd" in re) {
      if(this.helper.toNumber(re.Bd) !== null){
        result.Bd = { alien: "right", value: re.Bd.toFixed(3) };
      }
    }
    if ("pc" in re) {
      if(this.helper.toNumber(re.pc) !== null){
        result.pc = { alien: "right", value: re.pc.toFixed(3) };
      }
    }
    if ("Bp" in re) {
      if(this.helper.toNumber(re.Bp) !== null){
        result.Bp = { alien: "right", value: re.Bp.toFixed(3) };
      }
    }
    if ("Mo" in re) {
      if(this.helper.toNumber(re.Mo) !== null){
        result.Mo = { alien: "right", value: re.Mo.toFixed(1) };
      }
    }
    if ("Bn" in re) {
      if(this.helper.toNumber(re.Bn) !== null){
        result.Bn = { alien: "right", value: re.Bn.toFixed(3) };
      }
    }
    if ("Vcd" in re) {
      if(this.helper.toNumber(re.Vcd) !== null){
        result.Vcd = { alien: "right", value: re.Vcd.toFixed(1) };
      }
    }
    if ("Vsd" in re) {
      if(this.helper.toNumber(re.Vsd) !== null){
        result.Vsd = { alien: "right", value: re.Vsd.toFixed(1) };
      }
    }
    if ("Vsd2" in re) {
      if(this.helper.toNumber(re.Vsd2) !== null){
        result.Vsd2 = { alien: "right", value: re.Vsd2.toFixed(1) };
      }
    }
    if ("ri" in re) {
      if(this.helper.toNumber(re.ri) !== null){
        result.ri = { alien: "right", value: re.ri.toFixed(2) };
      }
    }

    if ("V_rbc" in re) {
      if(this.helper.toNumber(re.V_rbc) !== null){
        result.V_rbc = { alien: "right", value: re.V_rbc.toFixed(2) };
      }
    }
    if ("V_rbs" in re) {
      if(this.helper.toNumber(re.V_rbs) !== null){
        result.V_rbs = { alien: "right", value: re.V_rbs.toFixed(2) };
      }
    }
    if ("T_rbt" in re) {
      if(this.helper.toNumber(re.T_rbt) !== null){
        result.T_rbt = { alien: "right", value: re.T_rbt.toFixed(2) };
      }
    }
    if ("Mu" in re) {
      if(this.helper.toNumber(re.Mu) !== null){
        result.Mu = { alien: "right", value: re.Mu.toFixed(1) };
      }
    }
    if ("Vyd" in re) {
      if(this.helper.toNumber(re.Vyd) !== null){
        result.Vyd = { alien: "right", value: re.Vyd.toFixed(1) };
      }
    }
    if ("fwcd" in re) {
      if(this.helper.toNumber(re.fwcd) !== null){
        result.fwcd = { alien: "right", value: re.fwcd.toFixed(3) };
      }
    }
    if ("Kt" in re) {
      if(this.helper.toNumber(re.Kt) !== null){
        result.Kt = { alien: "right", value: re.Kt.toFixed(0) };
      }
    }
    if ("Mtcud" in re) {
      if(this.helper.toNumber(re.Mtcud) !== null){
        result.Mtcud = { alien: "right", value: re.Mtcud.toFixed(1) };
      }
    }
    if ("Mtcud_Ratio" in re) {
      if(this.helper.toNumber(re.Mtcud_Ratio) !== null){
        result.Mtcud_Ratio = {
          alien: "center",
          value:
            re.Mtcud_Ratio.toFixed(3).toString() +
            (re.Mtcud_Ratio < 0.2 ? " < 0.2" : " > 0.2"),
        };
      }
    }
    if ("bo" in re) {
      if(this.helper.toNumber(re.bo) !== null){
        result.bo = { alien: "right", value: re.bo.toFixed(1) };
      }
    }
    if ("do" in re) {
      if(this.helper.toNumber(re.do) !== null){
        result.do = { alien: "right", value: re.do.toFixed(1) };
      }
    }
    if ("Am" in re) {
      if(this.helper.toNumber(re.Am) !== null){
        result.Am = { alien: "right", value: re.Am.toFixed(0) };
      }
    }
    if ("qw" in re) {
      if(this.helper.toNumber(re.qw) !== null){
        result.qw = { alien: "right", value: re.qw.toFixed(1) };
      }
    }
    if ("ql" in re) {
      if(this.helper.toNumber(re.ql) !== null){
        result.ql = { alien: "right", value: re.ql.toFixed(1) };
      }
    }
    if ("Mtyd" in re) {
      if(this.helper.toNumber(re.Mtyd) !== null){
        result.Mtyd = { alien: "right", value: re.Mtyd.toFixed(1) };
      }
    }
    if ("Mtu_min" in re) {
      if(this.helper.toNumber(re.Mtu_min) !== null){
        result.Mtu_min = { alien: "right", value: re.Mtu_min.toFixed(1) };
      }
    }
    if ("sigma_nd" in re) {
      if(this.helper.toNumber(re.sigma_nd) !== null){
        result.sigma_nd = { alien: "right", value: re.sigma_nd.toFixed(1) };
      }
    }
    if ("ftd" in re) {
      if(this.helper.toNumber(re.ftd) !== null){
        result.ftd = { alien: "right", value: re.ftd.toFixed(1) };
      }
    }
    if ("Bnt" in re) {
      if(this.helper.toNumber(re.Bnt) !== null){
        result.Bnt = { alien: "right", value: re.Bnt.toFixed(3) };
      }
    }
    if ("Mtcd" in re) {
      if(this.helper.toNumber(re.Mtcd) !== null){
        result.Mtcd = { alien: "right", value: re.Mtcd.toFixed(1) };
      }
    }
    if ("Mtud1" in re) {
      if(this.helper.toNumber(re.Mtud1) !== null){
        result.Mtud1 = { alien: "right", value: re.Mtud1.toFixed(1) };
      }
    }
    if ("Mtud2" in re) {
      if(this.helper.toNumber(re.Mtud2) !== null){
        result.Mtud2 = { alien: "right", value: re.Mtud2.toFixed(1) };
      }
    }
    if ("Mtud" in re) {
      if(this.helper.toNumber(re.Mtud) !== null){
        result.Mtud = { alien: "right", value: re.Mtud.toFixed(1) };
      }
    }
    if ("Mtud_Ratio" in re) {
      if(this.helper.toNumber(re.Mtud_Ratio) !== null){
          result.Mtud_Ratio = {
          alien: "center",
          value:
            re.Mtud_Ratio.toFixed(3).toString() +
            (re.Mtud_Ratio < 1 ? " <1.00" : " >1.00"),
        };
      }
    }

    if ("Mt1" in re) {
      if(this.helper.toNumber(re.Mt1) !== null){
        result.Mt1 = { alien: "right", value: re.Mt1.toFixed(1) };
      }
    }
    if ("Mt2" in re) {
      if(this.helper.toNumber(re.Mt2) !== null){
        result.Mt2 = { alien: "right", value: re.Mt2.toFixed(1) };
      }
    }

    if ("con" in re) {
      result.con = { alien: "center", value: re.con };
    }

    if ("comMtud07_Ratio" in re) {
      result.comMtud07_Ratio = { alien: "right", value: re.comMtud07_Ratio };
    }

    if ("comMtud07_Result" in re) {
      result.comMtud07_Result = { alien: "center", value: re.comMtud07_Result };
    }

    if ("sigma_Ratio" in re) {
      result.sigma_Ratio = { alien: "right", value: re.sigma_Ratio };
      result.sigma_calc.value = re.sigma_wpd / re.sigma_12;
    }

    if ("sigma_Result" in re) {
      result.sigma_Result = { alien: "center", value: re.sigma_Result };
    }

    return result;
  }
}

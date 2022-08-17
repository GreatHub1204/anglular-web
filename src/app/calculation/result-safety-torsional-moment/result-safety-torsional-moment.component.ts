import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcSafetyTorsionalMomentService } from "./calc-safety-torsional-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-result-safety-torsional-moment',
  templateUrl: './result-safety-torsional-moment.component.html',
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultSafetyTorsionalMomentComponent implements OnInit {
  public title: string = "安全性（破壊）";
  public page_index = "ap_14";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyTorsionalMomentPages: any[] = new Array();
  public isJREAST: boolean = false;
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcSafetyTorsionalMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("safetyTorsionalMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("safetyTorsionalMoment", this.safetyTorsionalMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;
        this.summary.setSummaryTable("safetyTorsionalMoment");
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  public setPages(OutputData: any): boolean {
    try {
      this.safetyTorsionalMomentPages = this.getSafetyPages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public getSafetyPages(
    OutputData: any,
    title: string = this.translate.instant("result-safety-torsional-moment.safe_d_torsion_vrfy_rslt"),
    DesignForceList: any = this.calc.DesignForceList,
    safetyID: number = this.calc.safetyID
  ): any[] {
    const result: any[] = new Array();

    this.isJREAST = false;
    const speci2 = this.basic.get_specification2();
    if (speci2 === 2 || speci2 === 5) {
      this.isJREAST = true;
    }

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);
      const g = groupe[ig];

      page = {
        caption: title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag: false,
      };

      const safetyM = this.calc.getSafetyFactor('Md', g[0].g_id, safetyID);
      const safetyV = this.calc.getSafetyFactor('Vd', g[0].g_id, safetyID);

      let SRCFlag = false;
      for (const m of g) {
        for (const position of m.positions) {
          for (const side of ["上側引張", "下側引張"]) {
            const res = OutputData.find(
              (e) => e.index === position.index && e.side === side
            );
            if (res == null || res.length < 1) {
              continue;
            }

            const force = DesignForceList.find(
              (v) => v.index === res.index
            ).designForce.find((v) => v.side === res.side);

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag: false,
              };
              SRCFlag = false;
            }

            /////////////// まず計算 ///////////////
            const sectionM = this.result.getSection("Md", res, safetyM);
            const sectionV = this.result.getSection("Vd", res, safetyV);
            const member = sectionM.member;
            const shape = sectionM.shape;
            const Ast = sectionM.Ast;

            const titleColumn = this.result.getTitleString(sectionM.member, position, side);
            const fck: any = this.helper.getFck(safetyV);

            const column: any = this.getResultString(
              this.calc.calcMtud(OutputData, res, sectionM, sectionV, fck, safetyM, safetyV, position.La, force)
            );

            let fwyd3: number = 0
            if ('fsvy_Hweb' in sectionV.steel) {
              fwyd3 = (sectionV.steel.fsvy_Hweb.fvyd !== null) ?
                sectionV.steel.fsvy_Hweb.fvyd :
                sectionV.steel.fsvy_Iweb.fvyd;
            }

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(sectionM.steel.fsy_compress.fsy) !== null) SRC_pik = "fsy_compress";
            if (this.helper.toNumber(sectionM.steel.fsy_right.fsy) !== null) SRC_pik = "fsy_right";
            if (this.helper.toNumber(sectionM.steel.fsy_left.fsy) !== null) SRC_pik = "fsy_left";
            if (this.helper.toNumber(sectionM.steel.fsy_tension.fsy) !== null) SRC_pik = "fsy_tension";

            /////////////// タイトル ///////////////
            column['title1'] = { alien: "center", value: titleColumn.title1 };
            column['title2'] = { alien: "center", value: titleColumn.title2 };
            column['title3'] = { alien: "center", value: titleColumn.title3 };
            ///////////////// 形状 /////////////////
            column['B'] = this.result.alien(this.result.numStr(shape.B, 1));
            column['H'] = this.result.alien(this.result.numStr(shape.H, 1));
            ///////////////// 鉄骨情報 /////////////////
            column['steel_I_tension'] = this.result.alien(sectionM.steel.I.tension_flange);
            column['steel_I_web'] = this.result.alien(sectionM.steel.I.web);
            column['steel_I_compress'] = this.result.alien(sectionM.steel.I.compress_flange);
            column['steel_H_tension'] = this.result.alien(sectionM.steel.H.left_flange);
            column['steel_H_web'] = this.result.alien(sectionM.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
            column['tan'] = this.result.alien((sectionV.tan === 0) ? '-' : sectionV.tan, "center");
            column['Ast'] = this.result.alien(this.result.numStr(sectionM.Ast.Ast), "center");
            column['AstString'] = this.result.alien(sectionM.Ast.AstString, "center");
            column['dst'] = this.result.alien(this.result.numStr(sectionM.Ast.dst, 1), "center");
            column['tcos'] = this.result.alien(this.result.numStr((sectionM.Ast.tension !== null) ? sectionM.Ast.tension.cos : 1, 3), "center");
            /////////////// 圧縮鉄筋 ///////////////
            column['Asc'] = this.result.alien(this.result.numStr(sectionM.Asc.Asc), "center");
            column['AscString'] = this.result.alien(sectionM.Asc.AscString, "center");
            column['dsc'] = this.result.alien(this.result.numStr(sectionM.Asc.dsc, 1), "center");
            column['ccos'] = this.result.alien(this.result.numStr((sectionM.Asc.compress !== null) ? sectionM.Asc.compress.cos : 1, 3), "center");
            /////////////// 側面鉄筋 ///////////////
            // column['Ase'] = this.result.alien(this.result.numStr(Ast.Ase), "center");
            column['AseString'] = this.result.alien(sectionM.Ase.AseString, "center");
            column['dse'] = this.result.alien(this.result.numStr(sectionM.Ase.dse, 1), "center");
            /////////////// コンクリート情報 ///////////////
            column['fck'] = this.result.alien(fck.fck.toFixed(1), "center");
            column['rc'] = this.result.alien(fck.rc.toFixed(2), "center");
            column['fcd'] = this.result.alien(fck.fcd.toFixed(1), "center");
            /////////////// 鉄筋強度情報 ///////////////
            column['fsy'] = this.result.alien(this.result.numStr(sectionM.Ast.fsy, 1), "center");
            column['rs'] = this.result.alien(sectionV.Ast.rs.toFixed(2), "center");
            column['fsd'] = this.result.alien(this.result.numStr(sectionM.Ast.fsd, 1), "center");
            /////////////// 鉄骨情報 ///////////////
            if (SRC_pik in sectionM.steel) {
              column['fsy_steel'] = this.result.alien(this.result.numStr(sectionM.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(sectionM.steel[SRC_pik].fsd, 1), 'center');
            } else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(sectionM.steel.rs.toFixed(2), 'center');
            /////////////// 鉄骨情報 ///////////////
            column['fwyd3'] = this.result.alien(this.result.numStr(fwyd3, 0), 'center');
            if (sectionM.CFTFlag) {
              column['fwyd3'] = this.result.alien(this.result.numStr(sectionM.steel["fsvy_Iweb"].fvyd, 1), 'center');
            }


            /////////////// flag用 ///////////////
            column['bendFlag'] = (column.Asb.value !== '-'); //折り曲げ鉄筋の情報があればtrue、無ければfalse
            column['steelFlag'] = (sectionM.steel.flag); // 鉄骨情報があればtrue
            column['CFTFlag'] = (sectionM.CFTFlag);

            /////////////// 総括表用 ///////////////
            column['g_name'] = m.g_name;
            column['index'] = position.index;
            column['side_summary'] = side;
            column['shape_summary'] = sectionM.shapeName;
            column['B_summary'] = ('B_summary' in shape) ? shape.B_summary : shape.B;
            column['H_summary'] = ('H_summary' in shape) ? shape.H_summary : shape.H;

            // SRCのデータの有無を確認
            for (const src_key of ['steel_I_tension', 'steel_I_web', 'steel_I_compress',
              'steel_H_tension', 'steel_H_web']) {
              if (column[src_key].value !== '-') {
                SRCFlag = true
                this.isSRC = true
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
            if (aa === "index" || aa === "side_summary" || aa === "shape_summary") {
              column[aa] = null;
            } else if (aa === "bendFlag" || aa === "steelFlag" || aa === "CFTFlag") {
              column[aa] = false;
            } else {
              column[aa] = { alien: 'center', value: '-' };
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
      fck: { alien: "center", value: "-" },
      fcd: { alien: "center", value: "-" },
      fsyk: { alien: "center", value: "-" },

      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      Vd: { alien: "center", value: "-" },
      Mt: { alien: "center", value: "-" },

      ipu_cu: { alien: "center", value: "-" },
      ipu_s: { alien: "center", value: "-" },
      x: { alien: "center", value: "-" },

      Aw: { alien: "center", value: "-" },
      AwString: { alien: "center", value: "-" },
      Atw: { alien: "center", value: "-" },
      Atl: { alien: "center", value: "-" },


      Ab: { alien: "center", value: "-" },
      fwyd: { alien: "center", value: "-" },
      deg: { alien: "center", value: "-" },
      Ss: { alien: "center", value: "-" },

      s: { alien: "center", value: "-" },
      u: { alien: "center", value: "-" },


      Asb: { alien: "center", value: "-" },
      AsbString: { alien: "center", value: "-" },
      fwyd2: { alien: "center", value: "-" },
      deg2: { alien: "center", value: "-" },
      Ss2: { alien: "center", value: "-" },
      fbyd: { alien: "center", value: "-" },

      deg_b: { alien: "center", value: "-" },
      Sb: { alien: "center", value: "-" },
      fvcd: { alien: "center", value: "-" },

      Bd: { alien: "center", value: "-" },
      pc: { alien: "center", value: "-" },
      Bp: { alien: "center", value: "-" },
      Mo: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },
      Vsd: { alien: "center", value: "-" },
      Vsd2: { alien: "center", value: "-" },

      ri: { alien: "center", value: "-" },
      Vyd_ratio: { alien: "center", value: "-" },

      M_rb: { alien: "center", value: "-" },
      // rb: { alien: "center", value: "-" },
      Mud: { alien: "center", value: "-" },
      Mudd: { alien: "center", value: "-" },
      V_rbt: { alien: "center", value: "-" },
      V_rbc: { alien: "center", value: "-" },
      V_rbs: { alien: "center", value: "-" },
      T_rbt: {alien:"center",value:"-"},
      Mu: { alien: "center", value: "-" },
      Vyd: { alien: "center", value: "-" },
      fwcd: { alien: "center", value: "-" },
      Vwcd: { alien: "center", value: "-" },
      Vwcd_ratio: { alien: "center", value: "-" },

      Kt: { alien: "center", value: "-" },
      rbt: { alien: "center", value: "-" },

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
      Mtcd_Ratio: { alien: "center", value: "-" },
      Mtcd_Result: { alien: "center", value: "-" },

      Mtud1: { alien: "center", value: "-" },
      Mtud1_Ratio: { alien: "center", value: "-" },
      Mtud1_Result: { alien: "center", value: "-" },
      Mtud2: { alien: "center", value: "-" },
      Mtud2_Ratio: { alien: "center", value: "-" },
      Mtud2_Result: { alien: "center", value: "-" },
      Mtud3: { alien: "center", value: "-" },
      Mtud3_Ratio: { alien: "center", value: "-" },
      Mtud3_Result: { alien: "center", value: "-" },
      Mtud4: { alien: "center", value: "-" },
      Mtud4_Ratio: { alien: "center", value: "-" },
      Mtud4_Result: { alien: "center", value: "-" },


      // Mtvd: { alien: "center", value: "-" },
      // Mtvd_Ratio: { alien: "center", value: "-" },
      // Result: { alien: "center", value: "-" },
    };

    if (re === null) {
      return result;
    }

    // 断面力
    if ("Md" in re) {
      result.Md = { alien: "right", value: (Math.round(re.Md * 10) / 10).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: (Math.round(re.Nd * 10) / 10).toFixed(1) };
    }
    if ("Vd" in re) {
      result.Vd = { alien: "right", value: (Math.round(re.Vd * 10) / 10).toFixed(1) };
    }
    if ("Mt" in re) {
      result.Mt = { alien: "right", value: (Math.round(re.Mt * 10) / 10).toFixed(1) };
    }



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

    // 計算結果   
    if ("fvcd" in re) {
      result.fvcd = { alien: "right", value: re.fvcd.toFixed(3) };
    }
    if ("Bd" in re) {
      result.Bd = { alien: "right", value: re.Bd.toFixed(3) };
    }
    if ("pc" in re) {
      result.pc = { alien: "right", value: re.pc.toFixed(3) };
    }
    if ("Bp" in re) {
      result.Bp = { alien: "right", value: re.Bp.toFixed(3) };
    }
    if ("Mo" in re) {
      result.Mo = { alien: "right", value: re.Mo.toFixed(1) };
    }
    if ("Bn" in re) {
      result.Bn = { alien: "right", value: re.Bn.toFixed(3) };
    }
    if ("Vcd" in re) {
      result.Vcd = { alien: "right", value: re.Vcd.toFixed(1) };
    }
    if ("Vsd" in re) {
      result.Vsd = { alien: "right", value: re.Vsd.toFixed(1) };
    }
    if ("Vsd2" in re) {
      result.Vsd2 = { alien: "right", value: re.Vsd2.toFixed(1) };
    }
    if ("ri" in re) {
      result.ri = { alien: "right", value: re.ri.toFixed(2) };
    }
    // if ("rbm" in re) {
    //   result.rbm = { alien: "right", value: re.rbm.toFixed(2) };
    // }
    if ("M_rb" in re) {
      result.M_rb = { alien: "right", value: re.M_rb.toFixed(2) };
    }
    // if ("rb" in re) {
    //   result.rb = { alien: "right", value: re.rb.toFixed(2) };
    // }
    if ("Mud" in re) {
      result.Mud = { alien: "right", value: re.Mud.toFixed(1) };
    }
    if ("Mudd" in re) {
      result.Mudd = { alien: "right", value: re.Mudd.toFixed(1) };
    }
    // if ("rbc" in re) {
    //   result.rbc = { alien: "right", value: re.rbc.toFixed(2) };
    // }
    // if ("rbs" in re) {
    //   result.rbs = { alien: "right", value: re.rbs.toFixed(2) };
    // }
    if ("V_rbt" in re) {
      result.V_rbt = { alien: "right", value: re.V_rbt.toFixed(2) };
    }
    if ("V_rbc" in re) {
      result.V_rbc = { alien: "right", value: re.V_rbc.toFixed(2) };
    }
    if ("V_rbs" in re) {
      result.V_rbs = { alien: "right", value: re.V_rbs.toFixed(2) };
    }
    if("T_rbt" in re){
      result.T_rbt = {alien:"right",value:re.T_rbt.toFixed(2)};
    }

    if ("Mu" in re) {
      result.Mu = { alien: "right", value: re.Mu.toFixed(1) };
    }
    if ("Vyd" in re) {
      result.Vyd = { alien: "right", value: re.Vyd.toFixed(1) };
    }
    if ("fwcd" in re) {
      result.fwcd = { alien: "right", value: re.fwcd.toFixed(3) };
    }
    if ("Kt" in re) {
      result.Kt = { alien: "right", value: re.Kt.toFixed(0) };
    }
    if ("Mtcud" in re) {
      result.Mtcud = { alien: "right", value: re.Mtcud.toFixed(1) };
    }
    if ("Mtcud_Ratio" in re) {
      result.Mtcud_Ratio = {
        alien: "center",
        value: re.Mtcud_Ratio.toFixed(3).toString() + ((re.Mtcud_Ratio < 0.2) ? ' < 0.2' : ' > 0.2'),
      }
    }
    if ("bo" in re) {
      result.bo = { alien: "right", value: re.bo.toFixed(1) };
    }
    if ("do" in re) {
      result.do = { alien: "right", value: re.do.toFixed(1) };
    }
    if ("Am" in re) {
      result.Am = { alien: "right", value: re.Am.toFixed(0) };
    }
    if ("Atw" in re) {
      result.Atw = { alien: "right", value: re.Atw.toFixed(1) };
    }
    if ("Atl" in re) {
      result.Atl = { alien: "right", value: re.Atl.toFixed(0) };
    }
    if ("u" in re) {
      result.u = { alien: "right", value: re.u.toFixed(0) };
    }
    if ("qw" in re) {
      result.qw = { alien: "right", value: re.qw.toFixed(1) };
    }
    if ("ql" in re) {
      result.ql = { alien: "right", value: re.ql.toFixed(1) };
    }
    if ("Mtyd" in re) {
      result.Mtyd = { alien: "right", value: re.Mtyd.toFixed(1) };
    }
    if ("Mtu_min" in re) {
      result.Mtu_min = { alien: "right", value: re.Mtu_min.toFixed(1) };
    }
    if ("sigma_nd" in re) {
      result.sigma_nd = { alien: "right", value: re.sigma_nd.toFixed(1) };
    }
    if ("ftd" in re) {
      result.ftd = { alien: "right", value: re.ftd.toFixed(1) };
    }
    if ("Bnt" in re) {
      result.Bnt = { alien: "right", value: re.Bnt.toFixed(3) };
    }
    if ("Mtcd" in re) {
      result.Mtcd = { alien: "right", value: re.Mtcd.toFixed(1) };
    }
    if ("Mtcd_Ratio" in re) {
      result.Mtcd_Ratio = { alien: "right", value: re.Mtcd_Ratio.toFixed(3) };
    }
    if ("Mtcd_Result" in re) {
      result.Mtcd_Result = { alien: "center", value: re.Mtcd_Result };
    }


    if ("Mtud1" in re) {
      result.Mtud1 = { alien: "right", value: re.Mtud1.toFixed(1) };
    }
    if ("Mtud1_Ratio" in re) {
      result.Mtud1_Ratio = {
        alien: "center",
        value: re.Mtud1_Ratio.toFixed(3).toString() + ((re.Mtud1_Ratio <= 0.5) ? ' <= 0.5' : ' > 0.5'),
      }
    }
    if ("Mtud1_Result" in re) {
      result.Mtud1_Result = { alien: "center", value: re.Mtud1_Result };
    }

    if ("Mtud2" in re) {
      result.Mtud2 = { alien: "right", value: re.Mtud2.toFixed(1) };
    }
    if ("Mtud2_Ratio" in re) {
      result.Mtud2_Ratio = {
        alien: "center",
        value: re.Mtud2_Ratio.toFixed(3).toString() + ((re.Mtud2_Ratio <= 0.5) ? ' <= 0.5' : ' > 0.5'),
      }
    }
    if ("Mtud2_Result" in re) {
      result.Mtud2_Result = { alien: "center", value: re.Mtud2_Result };
    }
    if ("Mtud3" in re) {
      result.Mtud3 = { alien: "right", value: re.Mtud3.toFixed(1) };
    }
    if ("Mtud3_Ratio" in re) {
      result.Mtud3_Ratio = {
        alien: "center",
        value: re.Mtud3_Ratio.toFixed(3).toString() + ((re.Mtud3_Ratio <= 1) ? ' < 1.00' : ' > 1.00'),
      }
    }
    if ("Mtud3_Result" in re) {
      result.Mtud3_Result = { alien: "center", value: re.Mtud3_Result };
    }
    if ("Mtud4" in re) {
      result.Mtud4 = { alien: "right", value: re.Mtud4.toFixed(1) };
    }
    if ("Mtud4_Ratio" in re) {
      result.Mtud4_Ratio = {
        alien: "center",
        value: re.Mtud4_Ratio.toFixed(3).toString() + ((re.Mtud4_Ratio < 1) ? ' < 1.00' : ' > 1.00'),
      }
    }
    if ("Mtud4_Result" in re) {
      result.Mtud4_Result = { alien: "center", value: re.Mtud4_Result };
    }

    // if ("Mtvd" in re) {
    //   result.Mtvd = { alien: "right", value: re.Mtvd.toFixed(1) };
    // }
    // if ("Mtvd_Ratio" in re) {
    //   result.Mtvd_Ratio = {
    //     alien: "center",
    //     value: re.Mtvd_Ratio.toFixed(3).toString() + ((re.Mtvd_Ratio < 1) ? ' < 1.00' : ' > 1.00'),
    //   }
    // }
    // if ("Result" in re) {
    //   result.Result = { alien: "center", value: re.Result };
    // }

    return result;
  }
}

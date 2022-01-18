import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcServiceabilityShearForceService } from "./calc-serviceability-shear-force.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";

@Component({
  selector: "app-result-serviceability-shear-force",
  templateUrl: "./result-serviceability-shear-force.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultServiceabilityShearForceComponent implements OnInit {
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public serviceabilityShearForcePages: any[] = new Array();
  private title = "耐久性 せん断ひび割れの照査結果";
  public page_index = "ap_6";
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcServiceabilityShearForceService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("serviceabilityShearForce");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("serviceabilityShearForce", this.serviceabilityShearForcePages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("serviceabilityShearForce");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.serviceabilityShearForcePages = this.setServiceabilityPages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public setServiceabilityPages(OutputData: any): any[] {
    const result: any[] = new Array();

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);
      page = {
        caption: this.title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag : false,
      };

      const safety = this.calc.getSafetyFactor(groupe[ig][0].g_id);

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

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: this.title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag : false,
              };
              SRCFlag = false;
            }

            /////////////// まず計算 ///////////////
            const section = this.result.getSteelStruct("Vd", res, safety);

            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString( section.member, position, side );
            const fck: any = this.helper.getFck(safety);

            const column: any = this.getResultString(
              this.calc.calcSigma(
                res,
                section,
                fck,
                safety)
            );

            let fwyd3: number = 0
            if('fsvy_Hweb' in section.steel) {
              fwyd3 = (section.steel.fsvy_Hweb.fvyd !== null) ? 
              section.steel.fsvy_Hweb.fvyd :
              section.steel.fsvy_Iweb.fvyd ;
            }

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(section.steel.fsy_compress.fsy) !== null) SRC_pik = "fsy_compress" ;
            if (this.helper.toNumber(section.steel.fsy_right.fsy) !== null) SRC_pik = "fsy_right" ;
            if (this.helper.toNumber(section.steel.fsy_left.fsy) !== null) SRC_pik = "fsy_left" ;
            if (this.helper.toNumber(section.steel.fsy_tension.fsy) !== null) SRC_pik = "fsy_tension" ;

              /////////////// タイトル ///////////////
              column['title1'] = { alien: "center", value: titleColumn.title1 };
              column['title2'] = { alien: "center", value: titleColumn.title2 };
              column['title3'] =  { alien: "center", value: titleColumn.title3 };
              ///////////////// 形状 /////////////////
              column['B'] = this.result.alien(this.result.numStr(shape.B,1));
              column['H'] = this.result.alien(this.result.numStr(shape.H,1));
              ///////////////// 鉄骨情報 /////////////////
              column['steel_I_tension'] = this.result.alien(section.steel.I.tension_flange);
              column['steel_I_web'] = this.result.alien(section.steel.I.web);
              column['steel_I_compress'] = this.result.alien(section.steel.I.compress_flange);
              column['steel_H_tension'] = this.result.alien(section.steel.H.left_flange);
              column['steel_H_web'] = this.result.alien(section.steel.H.web);
              /////////////// 引張鉄筋 ///////////////
              column['tan'] = this.result.alien(( section.tan === 0 ) ? '-' : Ast.tan, "center");
              column['Ast'] = this.result.alien(this.result.numStr(section.Ast.Ast), "center");
              column['AstString'] = this.result.alien(section.Ast.AstString, "center");
              column['dst'] = this.result.alien(this.result.numStr(section.Ast.dst, 1), "center");
              column['tcos'] = this.result.alien(this.result.numStr((section.Ast.tension!==null)?section.Ast.tension.cos: 1, 3), "center");
              /////////////// 圧縮鉄筋 ///////////////
              column['Asc'] = this.result.alien(this.result.numStr(section.Asc.Asc), "center");
              column['AscString'] = this.result.alien(section.Asc.AscString, "center");
              column['dsc'] = this.result.alien(this.result.numStr(section.Asc.dsc ,1), "center");
              column['ccos'] = this.result.alien(this.result.numStr((section.Asc.compress!==null)?section.Asc.compress.cos: 1, 3), "center");
              /////////////// 側面鉄筋 ///////////////
              // column['col'] = this.result.alien(this.result.numStr(Ast.Ase), 'center');
              column['AseString'] = this.result.alien(section.Ase.AseString, "center");
              column['dse'] = this.result.alien(this.result.numStr(section.Ase.dse, 1), "center");
              /////////////// コンクリート情報 ///////////////
              column['fck'] = this.result.alien(fck.fck.toFixed(1), "center");
              column['rc'] = this.result.alien(fck.rc.toFixed(2), "center");
              column['fcd'] = this.result.alien(fck.fcd.toFixed(1), "center");
              /////////////// 鉄筋強度情報 ///////////////
              column['fsy'] = this.result.alien(this.result.numStr(section.Ast.fsy, 1), "center");
              column['rs'] = this.result.alien(section.Ast.rs.toFixed(2), "center");
              column['fsd'] = this.result.alien(this.result.numStr(section.Ast.fsd, 1), "center");
              /////////////// 鉄骨情報 ///////////////
              if( SRC_pik in section.steel) { 
                column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
                column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
              } else {
                column['fsy_steel'] = { alien: "center", value: "-" };
                column['fsd_steel'] = { alien: "center", value: "-" };
              }
              column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');
               /////////////// 鉄骨情報及びそれに伴う係数 ///////////////
              column['fwyd3'] = this.result.alien(this.result.numStr(fwyd3, 0), 'center');

              /////////////// flag用 ///////////////
              column['bendFlag'] = (column.Asb.value!=='-'); //折り曲げ鉄筋の情報があればtrue、無ければfalse
              column['steelFlag'] = (section.steel.flag); // 鉄骨情報があればtrue
              column['CFTFlag'] = (section.CFTFlag);
              /////////////// 総括表用 ///////////////
              column['g_name'] = m.g_name;
              column['index'] = position.index;
              column['side_summary'] = side;
              column['shape_summary'] = section.shapeName;
              column['B_summary'] = ('B_summary' in shape) ? shape.B_summary : shape.B;
              column['H_summary'] = ('H_summary' in shape) ? shape.H_summary : shape.H;
            
            // SRCのデータの有無を確認
            for(const src_key of ['steel_I_tension', 'steel_I_web', 'steel_I_compress',
                                  'steel_H_tension','steel_H_web']){
              if(column[src_key].value !== '-'){
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
        for(let i=page.columns.length; i<5; i++){
          const column = {};
          for (let aa of Object.keys(page.columns[0])) {
            if (aa === "index" || aa === "side_summary" || aa === "shape_summary") {
              column[aa] = null;
            } else if (aa === "bendFlag" || aa === "steelFlag" || aa === "CFTFlag"){
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

      Zs: { alien: "center", value: "-" },
      ar: { alien: "center", value: "-" },

      Nd: { alien: "center", value: "-" },
      Vhd: { alien: "center", value: "-" },
      Vpd: { alien: "center", value: "-" },
      Vrd: { alien: "center", value: "-" },

      fvcd: { alien: "center", value: "-" },
      Bd: { alien: "center", value: "-" },
      pc: { alien: "center", value: "-" },
      Bp: { alien: "center", value: "-" },
      Mu: { alien: "center", value: "-" },
      Mo: { alien: "center", value: "-" },
      Bn: { alien: "center", value: "-" },
      rbc: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },
      Vcd07: { alien: "center", value: "-" },

      con: { alien: "center", value: "-" },
      kr: { alien: "center", value: "-" },
      ri: { alien: "center", value: "-" },

      sigma: { alien: "center", value: "-" },
      Ratio: { alien: "center", value: "-" },
      Result: { alien: "center", value: "-" },

      sigma2: { alien: "center", value: "-" },
      Ratio2: { alien: "center", value: "-" },
      Result2: { alien: "center", value: "-" },

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
      result.Nd = { alien: "right", value: (Math.round(re.Nd*10)/10).toFixed(1) };
    }
    let Vhd: number = re.Vd;
    if ("Vhd" in re) {
      // tanθc + tanθt があるとき
      Vhd = (Math.round((re.Vd - re.Vhd)*10)/10);
      const sVd: string = Vhd.toFixed(1) + "(" + (Math.round(re.Vd*10)/10).toFixed(1) + ")";
      result.Vhd = { alien: "right", value: sVd };
    } else {
      result.Vhd = { alien: "right", value: (Math.round(Vhd*10)/10).toFixed(1) };
    }
    if ("Vpd" in re) {
      result.Vpd = { alien: "right", value: (Math.round(re.Vpd*10)/10).toFixed(1) };
    }
    if ("Vrd" in re) {
      result.Vrd = { alien: "right", value: (Math.round(re.Vrd*10)/10).toFixed(1) };
    }

    // 耐力
    if ("fvcd" in re) {
      result.fvcd = { alien: "right", value: re.fvcd.toFixed(3) };
    }
    if ("Bd" in re) {
      result.Bd = { alien: "right", value: re.Bd.toFixed(3) };
    }
    if ("pc" in re) {
      result.pc = { alien: "right", value: re.pc.toFixed(5) };
    }
    if ("Bp" in re) {
      result.Bp = { alien: "right", value: re.Bp.toFixed(3) };
    }
    if ("Mu" in re) {
      result.Mu = { alien: "right", value: re.Mu.toFixed(1) };
    }
    if ("Mo" in re) {
      result.Mo = { alien: "right", value: re.Mo.toFixed(1) };
    }
    if ("Bn" in re) {
      result.Bn = { alien: "right", value: re.Bn.toFixed(3) };
    }
    if ("rbc" in re) {
      result.rbc = { alien: "right", value: re.rbc.toFixed(2) };
    }
    if ("Vcd" in re) {
      result.Vcd = { alien: "right", value: re.Vcd.toFixed(1) };
    }
    if ("Vcd07" in re) {
      if (Vhd <= re.Vcd07) {
        const str: string = Vhd.toFixed(1) + "<" + re.Vcd07.toFixed(1);
        result.Vcd07 = { alien: "center", value: str };
      } else {
        const str: string = Vhd.toFixed(1) + ">" + re.Vcd07.toFixed(1);
        result.Vcd07 = { alien: "center", value: str };
      }
    }

    if ("con" in re) {
      result.con = { alien: "center", value: re.con };
    }
    if ("kr" in re) {
      result.kr = { alien: "right", value: re.kr.toFixed(1) };
    }
    if ("ri" in re) {
      result.ri = { alien: "right", value: re.ri.toFixed(2) };
    }

    if ("sigmaw" in re && "sigma12" in re) {
      const str: string = re.sigmaw.toFixed(1) + "/" + re.sigma12.toFixed(0);
      result.sigma = { alien: "center", value: str };
      result.sigma_calc.value = re.sigmaw / re.sigma12;
      result.sigma_calc.dividend = re.sigmaw;
      result.sigma_calc.divisor = re.sigma12;
    }
    if ("Ratio" in re) {
      result.Ratio = { alien: "right", value: re.Ratio.toFixed(3) };
    }
    if ("Result" in re) {
      result.Result = { alien: "center", value: re.Result };
    }

    if ("sigmab" in re && "sigma12" in re) {
      const str: string = re.sigmab.toFixed(1) + "/" + re.sigma12.toFixed(0);
      result.sigma2 = { alien: "center", value: str };
    }

    if ("Ratio2" in re) {
      result.Ratio2 = { alien: "right", value: re.Ratio2.toFixed(3) };
    }
    if ("Result2" in re) {
      result.Result2 = { alien: "center", value: re.Result2 };
    }

    return result;
  }
}

import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcSafetyFatigueMomentService } from "./calc-safety-fatigue-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { InputFatiguesService } from "src/app/components/fatigues/fatigues.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-safety-fatigue-moment",
  templateUrl: "./result-safety-fatigue-moment.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultSafetyFatigueMomentComponent implements OnInit {
  public safetyFatigueMomentPages: any[] = new Array();

  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public NA: number; // A列車の回数
  public NB: number; // B列車の回数
  private title = this.translate.instant("result-safety-fatigue-moment.safe_ff_bend_vrfy_rslt");
  public page_index = 'ap_3';
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcSafetyFatigueMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private fatigue: InputFatiguesService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    const trainCount: number[] = this.calc.getTrainCount();
    this.NA = trainCount[0];
    this.NB = trainCount[1];

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("SafetyFatigueMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("SafetyFatigueMoment", this.safetyFatigueMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("SafetyFatigueMoment");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.safetyFatigueMomentPages = this.setSafetyFatiguePages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public setSafetyFatiguePages(OutputData: any): any[] {
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
          const fatigueInfo = this.fatigue.getCalcData(position.index);
          for (const side of ["上側引張", "下側引張"]) {

            const res = OutputData.filter(
              (e) => e.index === position.index && e.side === side
            );
            if (res == null || res.length < 1) {
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
            // res[0]
            // res[1]
            // res[2] = 疲労限の断面力に対する解析結果
            const section = this.result.getSection('Md', res[0], safety);
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;
            const steel = section.steel

            const titleColumn = this.result.getTitleString(section.member, position, side)
            const fck: any = this.helper.getFck(safety);

            const column: any = this.getResultString(
              this.calc.calcFatigue(
                res, Ast, steel, safety, fatigueInfo)
            );

            let SRC_pik = "";
            // 優先順位は、I型下側 ＞ H型左側 ＞ H型右側 ＞ I型上側
            if (this.helper.toNumber(section.steel.fsy_compress.fsy) !== null) SRC_pik = "fsy_compress" ;
            if (this.helper.toNumber(section.steel.fsy_right.fsy) !== null) SRC_pik = "fsy_right" ;
            if (this.helper.toNumber(section.steel.fsy_left.fsy) !== null) SRC_pik = "fsy_left" ;
            if (this.helper.toNumber(section.steel.fsy_tension.fsy) !== null) SRC_pik = "fsy_tension" ;

            /////////////// タイトル ///////////////
            column['title1'] = { alien: 'center', value: titleColumn.title1 };
            column['title2'] = { alien: 'center', value: titleColumn.title2 };
            column['title3'] = { alien: 'center', value: titleColumn.title3 };
            ///////////////// 形状 /////////////////
            column['B'] = this.result.alien(this.result.numStr(shape.B,1));
            column['H'] = this.result.alien(this.result.numStr(shape.H,1));
            column['Bt'] = this.result.alien(shape.Bt);
            column['t'] = this.result.alien(shape.t);
            ///////////////// 鉄骨情報 /////////////////
            column['steel_I_tension'] = this.result.alien(section.steel.I.tension_flange);
            column['steel_I_web'] = this.result.alien(section.steel.I.web);
            column['steel_I_compress'] = this.result.alien(section.steel.I.compress_flange);
            column['steel_H_tension'] = this.result.alien(section.steel.H.left_flange);
            column['steel_H_web'] = this.result.alien(section.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
            column['Ast'] = this.result.alien(this.result.numStr(section.Ast.Ast), 'center');
            column['AstString'] = this.result.alien(section.Ast.AstString, 'center');
            column['dst'] = this.result.alien(this.result.numStr(section.Ast.dst, 1), 'center');
            column['tcos'] = this.result.alien(this.result.numStr((section.Ast.tension!==null)?section.Ast.tension.cos: 1, 3), "center");
            /////////////// 圧縮鉄筋 ///////////////
            column['Asc'] = this.result.alien(this.result.numStr(section.Asc.Asc), 'center');
            column['AscString'] = this.result.alien(section.Asc.AscString, 'center');
            column['dsc'] = this.result.alien(this.result.numStr(section.Asc.dsc ,1), 'center');
            column['ccos'] = this.result.alien(this.result.numStr((section.Asc.compress!==null)?section.Asc.compress.cos: 1, 3), "center");
            /////////////// 側面鉄筋 ///////////////
            column['Ase'] = this.result.alien(this.result.numStr(section.Ase.Ase), 'center');
            column['AseString'] = this.result.alien(section.Ase.AseString, 'center');
            column['dse'] = this.result.alien(this.result.numStr(section.Ase.dse, 1), 'center');
            /////////////// コンクリート情報 ///////////////
            column['fck'] = this.result.alien(fck.fck.toFixed(1), 'center');
            column['rc'] = this.result.alien(fck.rc.toFixed(2), 'center');
            column['fcd'] = this.result.alien(fck.fcd.toFixed(1), 'center');
            /////////////// 鉄筋情報 ///////////////
            column['fsy'] = this.result.alien(this.result.numStr(section.Ast.fsy, 1), 'center');
            column['rs'] = this.result.alien(section.Ast.rs.toFixed(2), 'center');
            column['fsd'] = this.result.alien(this.result.numStr(section.Ast.fsd, 1), 'center');
            column['fsu'] = this.result.alien(section.Ast.fsu, 'center');
            /////////////// 鉄骨情報 ///////////////
            if(SRC_pik in section.steel){
              column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
            } else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');
            column['rs2'] = column.rs;
            /////////////// flag用 ///////////////
            column['steelFlag'] = (section.steel.flag);
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
                this.isSRC = true;
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
            } else if (aa === "steelFlag" || aa === "CFTFlag"){
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

  private getResultString(re: any): any {
    const result: any = {
      Mdmin: { alien: "center", value: "-" },
      Ndmin: { alien: "center", value: "-" },
      sigma_min: { alien: "center", value: "-" },

      Mrd: { alien: "center", value: "-" },
      Nrd: { alien: "center", value: "-" },
      sigma_rd: { alien: "center", value: "-" },

      fsr200: { alien: "center", value: "-" },
      ratio200: { alien: "center", value: "-" },

      k: { alien: "center", value: "-" },
      ar: { alien: "center", value: "-" },
      N: { alien: "center", value: "-" },

      NA: { alien: "center", value: "-" },
      NB: { alien: "center", value: "-" },

      SASC: { alien: "center", value: "-" },
      SBSC: { alien: "center", value: "-" },

      r1: { alien: "center", value: "-" },
      r2: { alien: "center", value: "-" },

      rs: { alien: "center", value: "-" },
      frd: { alien: "center", value: "-" },

      ri: { alien: "center", value: "-" },
      ratio: { alien: "center", value: "-" },
      result: { alien: "center", value: "-" },

      MdGen: { alien: "center", value: "-" },
      NdGen: { alien: "center", value: "-" },
      sigma_max_s: { alien: "center", value: "-" },
      sigma_min_s: { alien: "center", value: "-" },
      sigma_fud: { alien: "center", value: "-" },
      welding_joint: { alien: "center", value: "-" },
      class_s: { alien: "center", value: "-" },
      sigma_cod: { alien: "center", value: "-" },
      fai_s: { alien: "center", value: "-" },
      Cr: { alien: "center", value: "-" },
      Ct: { alien: "center", value: "-" },
      sigma_cod2: { alien: "center", value: "-" },
      ri_s: { alien: "center", value: "-" },
      ratio_s: { alien: "center", value: "-" },
      result_s: { alien: "center", value: "-" },
    };

    if ("Mdmin" in re) {
      result.Mdmin = { alien: "right", value: (Math.round(re.Mdmin*10)/10).toFixed(1) };
    }
    if ("Ndmin" in re) {
      result.Ndmin = { alien: "right", value: (Math.round(re.Ndmin*10)/10).toFixed(1) };
    }
    if ("sigma_min" in re) {
      result.sigma_min = { alien: "right", value: re.sigma_min.toFixed(2) };
    }

    if ("Mrd" in re) {
      result.Mrd = { alien: "right", value: (Math.round(re.Mrd*10)/10).toFixed(1) };
    }
    if ("Nrd" in re) {
      result.Nrd = { alien: "right", value: (Math.round(re.Nrd*10)/10).toFixed(1) };
    }
    if ("sigma_rd" in re) {
      result.sigma_rd = { alien: "right", value: re.sigma_rd.toFixed(2) };
    }

    if ("fsr200" in re) {
      result.fsr200 = { alien: "right", value: re.fsr200.toFixed(2) };
    }
    if ("ratio200" in re) {
      result.ratio200.value = re.ratio200.toFixed(3);
    }

    if ("k" in re) {
      result.k = { alien: "right", value: re.k.toFixed(2) };
    }
    if ("ar" in re) {
      result.ar = { alien: "right", value: re.ar.toFixed(3) };
    }
    if ("N" in re) {
      result.N = { alien: "right", value: re.N.toFixed(0) };
    }

    if ("NA" in re) {
      result.NA = { alien: "right", value: re.NA.toFixed(2) };
    }
    if ("NB" in re) {
      result.NB = { alien: "right", value: re.NB.toFixed(2) };
    }
    if ("SASC" in re) {
      result.SASC = { alien: "right", value: re.SASC.toFixed(3) };
    }
    if ("SBSC" in re) {
      result.SBSC = { alien: "right", value: re.SBSC.toFixed(3) };
    }
    if ("r1" in re) {
      result.r1 = { alien: "right", value: re.r1.toFixed(2) };
    }
    if ("r2" in re) {
      result.r2 = { alien: "right", value: re.r2.toFixed(3) };
    }
    if ("rs" in re) {
      result.rs = { alien: "right", value: re.rs.toFixed(2) };
    }
    if ("frd" in re) {
      result.frd = { alien: "right", value: re.frd.toFixed(2) };
    }
    if ("ri" in re) {
      result.ri = { alien: "right", value: re.ri.toFixed(2) };
    }
    let ratio = 0;
    if ("ratio" in re) {
      result.ratio.value = re.ratio.toFixed(3).toString() + ((re.ratio < 1) ? ' < 1.00' : ' > 1.00');
      ratio = re.ratio;
    }
    if (ratio < 1) {
      result.result.value = "OK";
    } else {
      result.result.value = "NG";
    }

    // 鉄骨の疲労限の情報
    if ("MdGen" in re) {
      result.MdGen = { alien: "right", value: (Math.round(re.MdGen*10)/10).toFixed(1) };
    }
    if ("NdGen" in re) {
      result.NdGen = { alien: "right", value: (Math.round(re.NdGen*10)/10).toFixed(1) };
    }
    if ("sigma_max_s" in re) {
      result.sigma_max_s = { alien: "right", value: re.sigma_max_s.toFixed(2) };
    }
    if ("sigma_min_s" in re) {
      result.sigma_min_s = { alien: "right", value: re.sigma_min_s.toFixed(2) };
    }
    if ("sigma_fud" in re) {
      result.sigma_fud = { alien: "right", value: re.sigma_fud.toFixed(2) };
    }
    if ("welding_joint" in re) {
      result.welding_joint = { alien: "right", value: re.welding_joint };
    }
    if ("class_s" in re) {
      result.class_s = { alien: "right", value: re.class_s };
    }
    if ("sigma_cod" in re) {
      result.sigma_cod = { alien: "right", value: re.sigma_cod.toFixed(2) };
    }
    if ("fai_s" in re) {
      result.fai_s = { alien: "right", value: re.fai_s.toFixed(2) };
    }
    if ("Cr" in re) {
      result.Cr = { alien: "right", value: re.Cr.toFixed(3) };
    }
    if ("Ct" in re) {
      result.Ct = { alien: "right", value: re.Ct.toFixed(3) };
    }
    if ("sigma_cod2" in re) {
      result.sigma_cod2 = { alien: "right", value: re.sigma_cod2.toFixed(2) };
    }
    if ("ri_s" in re) {
      result.ri_s = { alien: "right", value: re.ri_s.toFixed(1) };
    }
    let ratio_s = 0;
    if ("ratio_s" in re) {
      result.ratio_s = { alien: "right", value: re.ratio_s.toFixed(3) };
      ratio_s = re.ratio_s;
    }
    if (ratio_s < 1) {
      result.result_s.value = "OK";
    } else {
      result.result_s.value = "NG";
    }

    return result;
  }
}

import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcServiceabilityMomentService } from "./calc-serviceability-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-serviceability-moment",
  templateUrl: "./result-serviceability-moment.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultServiceabilityMomentComponent implements OnInit {
  public title: string = "耐久性の照査";
  public page_index = "ap_5";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public serviceabilityMomentPages: any[] = new Array();
  public isJREAST: boolean = false;
  public isJRTT: boolean = false;
  public isSRC: boolean = false;
  
  constructor(
    private http: HttpClient,
    private calc: CalcServiceabilityMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("serviceabilityMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("serviceabilityMoment", this.serviceabilityMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("serviceabilityMoment");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.serviceabilityMomentPages = this.setServiceabilityPages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public setServiceabilityPages(
    OutputData: any,
    title: string = null,
    safetyID: number = this.calc.safetyID
  ): any[] {
    const result: any[] = new Array();

    let isDurability = true;
    if (title === null) {
      title= this.translate.instant("result-serviceability-moment.d_bend_vrfy_rslt");
      isDurability = false;
    }
    this.isJREAST = false;
    this.isJRTT = false;

    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1==0){
      if(speci2===2 || speci2===5){
        this.isJREAST = true;
      }
      if(speci2===1){
        this.isJRTT = true;
      }
    }

    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {
      const groupeName = this.points.getGroupeName(ig);

      page = {
        caption: title,
        g_name: groupeName,
        columns: new Array(),
        SRCFlag : false,
      };

      const safety = this.calc.getSafetyFactor(groupe[ig][0].g_id, safetyID);

      let SRCFlag = false;
      for (const m of groupe[ig]) {
        for (const position of m.positions) {
          for (const side of ["上側引張", "下側引張"]) {
            const res = OutputData.filter(
              (e) => e.index === position.index && e.side === side
            );
            if (res == null || res.length < 2) {
              continue;
            }

            if (page.columns.length > 4) {
              page.SRCFlag = SRCFlag;
              result.push(page);
              page = {
                caption: title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag : false,
              };
              SRCFlag = false;
            }

            /////////////// まず計算 ///////////////
            const section = this.result.getSection("Md", res[0], safety);
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString( section.member, position, side );
            const fck: any = this.helper.getFck(safety);

            const column: any = this.getResultString(
              this.calc.calcWd(
                res,
                section,
                fck,
                safety,
                isDurability,
                this.isJRTT,
                this.isJREAST
              )
            );

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
            column['Bt'] = this.result.alien(shape.Bt);
            column['t'] = this.result.alien(shape.t);
            ///////////////// 鉄骨情報 /////////////////
            column['steel_I_tension'] = this.result.alien(section.steel.I.tension_flange);
            column['steel_I_web'] = this.result.alien(section.steel.I.web);
            column['steel_I_compress'] = this.result.alien(section.steel.I.compress_flange);
            column['steel_H_tension'] = this.result.alien(section.steel.H.left_flange);
            column['steel_H_web'] = this.result.alien(section.steel.H.web);
            /////////////// 引張鉄筋 ///////////////
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
            column['Ase'] = this.result.alien(this.result.numStr(section.Ase.Ase), "center");
            column['AseString'] = this.result.alien(section.Ase.AseString, "center");
            column['dse'] = this.result.alien(this.result.numStr(section.Ase.dse, 1), "center");
            /////////////// コンクリート情報 ///////////////
            column['fck'] = this.result.alien(fck.fck.toFixed(1), "center");
            column['rc'] = this.result.alien(fck.rc.toFixed(2), "center");
            column['fcd'] = this.result.alien(fck.fcd.toFixed(1), "center");
            /////////////// 鉄筋情報 ///////////////
            column['fsy'] = this.result.alien(this.result.numStr(section.Ast.fsy, 1), "center");
            column['rs'] = this.result.alien(section.Ast.rs.toFixed(2), "center");
            column['fsd'] = this.result.alien(this.result.numStr(section.Ast.fsd, 1), "center");
            /////////////// 鉄骨情報 ///////////////
            if ( SRC_pik in  section.steel){
              column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
            } else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');

            /////////////// flag用 ///////////////
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

  // 計算と印刷用
  public getResultString(re: any): any {
    const result = {
      con: { alien: "center", value: "-" },

      Mhd: { alien: "center", value: "-" },
      Nhd: { alien: "center", value: "-" },
      sigma_b: { alien: "center", value: "-" },

      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      sigma_c: { alien: "center", value: "-" },
      sigma_s: { alien: "center", value: "-" },

      Pt: { alien: "center", value: "-" },
      Mpd: { alien: "center", value: "-" },
      Npd: { alien: "center", value: "-" },
      Mrd: { alien: "center", value: "-" },
      Nrd: { alien: "center", value: "-" },
      rd_ratio: { alien: "center", value: "-" },
      EsEc: { alien: "center", value: "-" },
      sigma_se: { alien: "center", value: "-" },
      c: { alien: "center", value: "-" },
      Cs: { alien: "center", value: "-" },
      fai: { alien: "center", value: "-" },

      ecu: { alien: "center", value: "-" },
      k1: { alien: "center", value: "-" },
      k2: { alien: "center", value: "-" },
      n: { alien: "center", value: "-" },
      k3: { alien: "center", value: "-" },
      k4: { alien: "center", value: "-" },

      Wd: { alien: "center", value: "-" },
      Wlim: { alien: "center", value: "-" },

      ri: { alien: "center", value: "-" },
      ratio: { alien: "center", value: "-" },
      result: { alien: "center", value: "-" },

      ////////// summary_table用 //////////
      sigma_b_ratio: { value: 0, dividend: 0, divisor: 1 },
      sigma_c_ratio: { value: 0, dividend: 0, divisor: 1 },
      sigma_s_ratio: { value: 0, dividend: 0, divisor: 1 },
      WdWlim: { value: 0, dividend: 0, divisor: 1 },
    };

    // 環境条件
    if ("con" in re) {
      result.con.value = re.con;
    }

    // 永久作用
    if ("Md" in re) {
      result.Md = { alien: "right", value: (Math.round(re.Md*10)/10).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: (Math.round(re.Nd*10)/10).toFixed(1) };
    }

    // 圧縮応力度の照査
    if ("Sigmac" in re && "fcd04" in re) {
      if (re.Sigmac < re.fcd04) {
        result.sigma_c.value =
          re.Sigmac.toFixed(2) + " < " + re.fcd04.toFixed(1);
      } else {
        result.sigma_c.value =
          re.Sigmac.toFixed(2) + " > " + re.fcd04.toFixed(1);
        result.result.value = "(0.4fcd) NG";
      }
      result.sigma_c_ratio.dividend = re.Sigmac;
      result.sigma_c_ratio.divisor  = re.fcd04;
      result.sigma_c_ratio.value = re.Sigmac / re.fcd04;
    }

    // 縁応力の照査
    if ("Mhd" in re) {
      result.Mhd = { alien: "right", value: (Math.round(re.Mhd*10)/10).toFixed(1) };
    }
    if ("Nhd" in re) {
      result.Nhd = { alien: "right", value: (Math.round(re.Nhd*10)/10).toFixed(1) };
    }
    //少し先に鉄筋量の出力の準備をしておく
    if ("Pt" in re) {
      if (re.Pt < 0.50){
        result.Pt = { alien: "center", value: re.Pt.toFixed(2) + " < 0.50 (%)"};
      } else {
        result.Pt = { alien: "center", value: re.Pt.toFixed(2) + " > 0.50 (%)"};
      }
    }
    // 縁応力度
    if ("Sigmab" in re && "Sigmabl" in re) {
      if (re.Sigmab < re.Sigmabl) {
        let SigmabVal: number = re.Sigmab;
        if (SigmabVal < 0) {
          SigmabVal = 0;
        }
        result.sigma_b.value =
          SigmabVal.toFixed(2) + " < " + re.Sigmabl.toFixed(2);
        result.sigma_b_ratio.dividend = SigmabVal;
        result.sigma_b_ratio.divisor  = re.Sigmabl;
        result.sigma_b_ratio.value = SigmabVal / re.Sigmabl;

        // 鉄筋応力度の照査
        if ("Sigmas" in re && "sigmal1" in re) {
          if (re.Sigmas < 0) {
            result.sigma_s.value = this.translate.instant("calculation.full_comp");
            if (result.result.value === "-") {
              result.result.value = "OK";
            }
          } else if (re.Sigmas < re.sigmal1) {
            result.sigma_s.value =
              re.Sigmas.toFixed(1) + " < " + re.sigmal1.toFixed(1);
            if (result.result.value === "-") {
              result.result.value = "OK";
            }
          } else {
            result.sigma_s.value =
              re.Sigmas.toFixed(1) + " > " + re.sigmal1.toFixed(1);
            result.result.value = "NG";
          }
          result.sigma_s_ratio.dividend = re.Sigmas;
          result.sigma_s_ratio.divisor  = re.sigmal1;
          result.sigma_s_ratio.value = re.Sigmas / re.sigmal1;
        }
        if (!this.isJRTT){
          return result;
        } else {
          if (re.Pt < 0.50){
            return result
          }
        }
      } else {
        result.sigma_b.value =
          re.Sigmab.toFixed(2) + " > " + re.Sigmabl.toFixed(2);
        result.sigma_b_ratio.dividend = re.Sigmab;
        result.sigma_b_ratio.divisor  = re.Sigmabl;
        result.sigma_b_ratio.value = re.Sigmab / re.Sigmabl;
      }
    }

    // ひび割れ幅の照査
    if ("Md" in re) {
      result.Mpd = { alien: "right", value: (Math.round(re.Md*10)/10).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Npd = { alien: "right", value: (Math.round(re.Nd*10)/10).toFixed(1) };
    }
    if ("Mrd" in re) {
      result.Mrd = { alien: "right", value: (Math.round(re.Mrd*10)/10).toFixed(1) };
    }
    if ("Nrd" in re) {
      result.Nrd = { alien: "right", value: (Math.round(re.Nrd*10)/10).toFixed(1) };
    }
    if ("rd_ratio" in re) {
      let value = re.rd_ratio.toFixed(2);
      if(re.rd_ratio < 0.25){
        value += ' ＜ 0.25';
      }else{
        value += ' ≧ 0.25';
      }
      result.rd_ratio = { alien: "right", value };
    }
    if ("EsEc" in re) {
      result.EsEc = { alien: "right", value: re.EsEc.toFixed(2) };
    }

    if ("sigma_se" in re) {
      result.sigma_se = { alien: "right", value: re.sigma_se.toFixed(1) };
    }
    if ("c" in re) {
      result.c = { alien: "right", value: re.c.toFixed(1) };
    }
    if ("Cs" in re) {
      result.Cs = { alien: "right", value: re.Cs.toFixed(1) };
    }
    if ("fai" in re) {
      result.fai = { alien: "right", value: re.fai.toFixed(0) };
    }
    if ("ecu" in re) {
      result.ecu = { alien: "right", value: re.ecu.toFixed(0) };
    }

    if ("k1" in re) {
      result.k1 = { alien: "right", value: re.k1.toFixed(2) };
    }
    if ("k2" in re) {
      result.k2 = { alien: "right", value: re.k2.toFixed(3) };
    }
    if ("n" in re) {
      result.n = { alien: "right", value: re.n.toFixed(3) };
    }
    if ("k3" in re) {
      result.k3 = { alien: "right", value: re.k3.toFixed(3) };
    }
    if ("k4" in re) {
      result.k4 = { alien: "right", value: re.k4.toFixed(2) };
    }
    if ("Wd" in re) {
      result.Wd = { alien: "right", value: re.Wd.toFixed(3) };
      result.WdWlim.dividend = re.Wd;
    }
    // 制限値
    if ("Wlim" in re) {
      result.Wlim = { alien: "right", value: re.Wlim.toFixed(3) };
      result.WdWlim.divisor = re.Wlim;
    }
    if ("Wd" in re && "Wlim" in re) {
      result.WdWlim.value = re.Wd / re.Wlim;
    }
    if ("ri" in re) {
      result.ri.value = re.ri.toFixed(2);
    }
    if ("ratio" in re) {
      result.ratio = { 
        alien: "center",
        value: re.ratio.toFixed(3).toString() + ((re.ratio < 1) ? ' < 1.00' : ' > 1.00'),
      }
    }

    if (re.ratio < 1) {
      if (result.result.value === "-") {
        result.result.value = "OK";
      }
    } else {
      result.result.value = "NG";
    }

    return result;
  }

  private setbasicInfo(info) {
    let basicInfo : number;
    for (let i = 0; i < info.specification2_list.length; i++) {
      const target = info.specification2_list[i];
      if (target.selected) {
        basicInfo = i;
        break;
      }
    }
    return basicInfo
  };

}

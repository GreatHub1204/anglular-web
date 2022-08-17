import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CalcRestorabilityMomentService } from './calc-restorability-moment.service';
import { SetPostDataService } from '../set-post-data.service';
import { ResultDataService } from '../result-data.service';
import { InputDesignPointsService } from 'src/app/components/design-points/design-points.service';
import { CalcSummaryTableService } from '../result-summary-table/calc-summary-table.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { UserInfoService } from 'src/app/providers/user-info.service';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-result-restorability-moment',
  templateUrl: './result-restorability-moment.component.html',
  styleUrls: ['../result-viewer/result-viewer.component.scss']
})
export class ResultRestorabilityMomentComponent implements OnInit {

  public title = "復旧性（地震時以外）曲げモーメントの照査";
  public page_index = "ap_8";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public restorabilityMomentPages: any[] = new Array();

  constructor(
    private http: HttpClient,
    private calc: CalcRestorabilityMomentService,
    private post: SetPostDataService,
    private result: ResultDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private translate: TranslateService
    ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = '';

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("restorabilityMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("restorabilityMoment", this.restorabilityMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("restorabilityMoment");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.restorabilityMomentPages = this.setRestorabilityPages(OutputData);
      return true;
    } catch(e) {
      this.err = e.toString();
      return false;
    }
  }


  // 出力テーブル用の配列にセット
  public setRestorabilityPages( OutputData: any,
                                title: string = this.translate.instant("result-restorability-moment.r_ex_bend_vrfy_rslt"),
                                DesignForceList: any = this.calc.DesignForceList,
                                safetyID = this.calc.safetyID ): any[] {
    const result: any[] = new Array();
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

            const res = OutputData.find(
              (e) => e.index === position.index && e.side === side
            );
            if (res == null || res.length < 1) {
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
            const section = this.result.getSection('Md', res, safety);
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString(section.member, position, side)
            const fck: any = this.helper.getFck(safety);

            const column: any = this.getResultString(
               this.calc.getResultValue(
              res, safety, DesignForceList
            ));

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
            /////////////// 鉄骨情報 ///////////////
            if(SRC_pik in section.steel){
              column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
            } else {
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');

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
    const result = {

      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      ecu: { alien: "center", value: "-" },
      es: { alien: "center", value: "-" },
      x: { alien: "center", value: "-" },
      My: { alien: "center", value: "-" },
      rb: { alien: "center", value: "-" },
      Myd: { alien: "center", value: "-" },
      ri: { alien: "center", value: "-" },
      ratio: { alien: "center", value: "-" },
      result: { alien: "center", value: "-" },
    };


    // 断面力
    if ("Md" in re) {
      result.Md = { alien: "right", value: Math.abs((Math.round(re.Md*10)/10)).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: (Math.round(re.Nd*10)/10).toFixed(1) };
    }
    if ("εcu" in re) {
      result.ecu = { alien: "right", value: re.εcu.toFixed(5) };
    }
    if ("εs" in re) {
      result.es = { alien: "right", value: re.εs.toFixed(5) };
    }
    if ("x" in re) {
      result.x = { alien: "right", value: re.x.toFixed(1) };
    }
    if ("My" in re) {
      result.My = { alien: "right", value: re.My.toFixed(1) };
    }

    // 耐力
    if ("rb" in re) {
      result.rb = { alien: "right", value: re.rb.toFixed(2) };
    }
    if ("Myd" in re) {
      result.Myd = { alien: "right", value: re.Myd.toFixed(1) };
    }
    if ("ri" in re) {
      result.ri = { alien: "right", value: re.ri.toFixed(2) };
    }
    if ("ratio" in re) {
      result.ratio = { 
        alien: "center",
        value: re.ratio.toFixed(3).toString() + ((re.ratio < 1) ? ' < 1.00' : ' > 1.00')
      }
    }
    if (re.ratio < 1) {
      result.result.value = "OK";
    } else {
      result.result.value = "NG";
    }

    return result;
  }

}


import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcSafetyShearForceService } from "./calc-safety-shear-force.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputDesignPointsService } from "src/app/components/design-points/design-points.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-safety-shear-force",
  templateUrl: "./result-safety-shear-force.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultSafetyShearForceComponent implements OnInit {
  public title: string = "安全性（破壊）";
  public page_index = "ap_2";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyShearForcePages: any[] = new Array();
  public isJREAST: boolean = false;
  public isSRC: boolean = false;

  constructor(
    private http: HttpClient,
    private calc: CalcSafetyShearForceService,
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
      this.summary.setSummaryTable("safetyShearForce");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("safetyShearForce", this.safetyShearForcePages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("safetyShearForce");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.safetyShearForcePages = this.getSafetyPages(OutputData);
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

  // 出力テーブル用の配列にセット
  public getSafetyPages(
    OutputData: any,
    title: string = this.translate.instant("result-safety-shear-force.safe_d_shear_vrfy_rslt"),
    DesignForceList: any = this.calc.DesignForceList,
    safetyID: number = this.calc.safetyID
  ): any[] {
    const result: any[] = new Array();

    this.isJREAST = false;
    const speci2 = this.basic.get_specification2();
    if(speci2===2 || speci2===5){
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
        SRCFlag : false,
        
      };

      const safety = this.calc.getSafetyFactor(g[0].g_id, safetyID);

      let SRCFlag = false;
      for (const m of g) {
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
                caption: title,
                g_name: groupeName,
                columns: new Array(),
                SRCFlag : false,
              };
              SRCFlag = false;
            }

            /////////////// まず計算 ///////////////
            const section = this.result.getSection("Vd", res, safety);
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString( section.member, position, side );
            const fck: any = this.helper.getFck(safety);

            const column: any = this.getResultString(
              this.calc.calcVmu( res, section, fck, safety, position.La, force )
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
            column['tan'] = this.result.alien(( section.tan === 0 ) ? '-' : section.tan, "center");
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
            // column['Ase'] = this.result.alien(this.result.numStr(Ast.Ase), "center");
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
            if ( SRC_pik in section.steel) {
              column['fsy_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsy, 1), 'center');
              column['fsd_steel'] = this.result.alien(this.result.numStr(section.steel[SRC_pik].fsd, 1), 'center');
            }else{
              column['fsy_steel'] = { alien: "center", value: "-" };
              column['fsd_steel'] = { alien: "center", value: "-" };
            }
            column['rs_steel'] = this.result.alien(section.steel.rs.toFixed(2), 'center');
            /////////////// 鉄骨情報 ///////////////
            column['fwyd3'] = this.result.alien(this.result.numStr(fwyd3, 0), 'center');
            if (section.CFTFlag) {
              column['fwyd3'] = this.result.alien(this.result.numStr(section.steel["fsvy_Iweb"].fvyd, 1), 'center');
            }
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

      Md: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      Vd: { alien: "center", value: "-" },
      La: { alien: "center", value: "-" },

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

      fvcd: { alien: "center", value: "-" },
      Bd: { alien: "center", value: "-" },
      Bp: { alien: "center", value: "-" },
      Mu: { alien: "center", value: "-" },
      Mo: { alien: "center", value: "-" },
      Bn: { alien: "center", value: "-" },
      ad: { alien: "center", value: "-" },
      Ba: { alien: "center", value: "-" },
      pw: { alien: "center", value: "-" },
      Bw: { alien: "center", value: "-" },
      rbc: { alien: "center", value: "-" },
      Vcd: { alien: "center", value: "-" },
      rbs: { alien: "center", value: "-" },
      Vsd: { alien: "center", value: "-" },
      Vsd2: { alien: "center", value: "-" },
      Vyd: { alien: "center", value: "-" },
      Vdd: { alien: "center", value: "-" },
      ri: { alien: "center", value: "-" },
      Vyd_Ratio: { alien: "center", value: "-" },
      Vyd_Result: { alien: "center", value: "-" },
      fwcd: { alien: "center", value: "-" },
      Vwcd: { alien: "center", value: "-" },
      Vwcd_Ratio: { alien: "center", value: "-" },
      Vwcd_Result: { alien: "center", value: "-" },
    };

    // 断面力
    if ("Md" in re) {
      result.Md = { alien: "right", value: (Math.round(re.Md*10)/10).toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: (Math.round(re.Nd*10)/10).toFixed(1) };
    }
    if ("Vhd" in re) {
      // tanθc + tanθt があるとき
      const sVd: string =
      (Math.round((re.Vd - re.Vhd)*10)/10).toFixed(1) + "(" + (Math.round(re.Vd*10)/10).toFixed(1) + ")";
      result.Vd = { alien: "right", value: sVd };
    } else {
      result.Vd = { alien: "right", value: (Math.round(re.Vd*10)/10).toFixed(1) };
    }

    if ("La" in re) {
      result.La = { alien: "right", value: re.La.toFixed(0) };
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

    if ("fvcd" in re) {
      result.fvcd = { alien: "right", value: re.fvcd.toFixed(3) };
    }
    if ("fdd" in re) {
      result.fvcd = { alien: "right", value: re.fdd.toFixed(3) };
    }

    if ("Bd" in re) {
      result.Bd = { alien: "right", value: re.Bd.toFixed(3) };
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
    if ("ad" in re) {
      result.ad = { alien: "right", value: re.ad.toFixed(3) };
    }
    if ("Ba" in re) {
      result.Ba = { alien: "right", value: re.Ba.toFixed(3) };
    }
    if ("pw" in re) {
      result.pw = { alien: "right", value: re.pw.toFixed(5) };
    }
    if ("Bw" in re) {
      result.Bw = { alien: "right", value: re.Bw.toFixed(3) };
    }

    if ("rbc" in re) {
      result.rbc = { alien: "right", value: re.rbc.toFixed(2) };
    }

    if ("Vcd" in re) {
      result.Vcd = { alien: "right", value: re.Vcd.toFixed(1) };
    }
    if ("Vdd" in re) {
      result.Vcd = { alien: "right", value: re.Vdd.toFixed(1) };
    }

    if ("rbs" in re) {
      result.rbs = { alien: "right", value: re.rbs.toFixed(2) };
    }
    if ("Vsd" in re) {
      result.Vsd = { alien: "right", value: re.Vsd.toFixed(1) };
    }
    // Vsd2 : 鉄骨の情報があれば鉄骨の設計せん断耐力、無ければ折り曲げ鉄筋の設計せん断耐力
    if ("Vsd2" in re) {
      result.Vsd2 = { alien: "right", value: re.Vsd2.toFixed(1) };
    }

    if ("Vyd" in re) {
      result.Vyd = { alien: "right", value: re.Vyd.toFixed(1) };
    }
    if ("Vdd" in re) {
      result.Vdd = { alien: "right", value: re.Vdd.toFixed(1) };
    }

    if ("ri" in re) {
      result.ri = { alien: "right", value: re.ri.toFixed(2) };
    }

    if ("Vyd_Ratio" in re) {
      result.Vyd_Ratio = { 
        alien: "center",
        value: re.Vyd_Ratio.toFixed(3).toString() + ((re.Vyd_Ratio < 1) ? ' < 1.00' : ' > 1.00'),
      }
    }
    if ("Vyd_Result" in re) {
      result.Vyd_Result = { alien: "center", value: re.Vyd_Result };
    }

    if ("fwcd" in re) {
      result.fwcd = { alien: "right", value: re.fwcd.toFixed(3) };
    }
    if ("Vwcd" in re) {
      result.Vwcd = { alien: "right", value: re.Vwcd.toFixed(1) };
    }
    if ("Vwcd_Ratio" in re) {
      result.Vwcd_Ratio.value = re.Vwcd_Ratio.toFixed(3).toString() + ((re.Vwcd_Ratio < 1) ? ' < 1.00' : ' > 1.00')
    }
    if ("Vwcd_Result" in re) {
      result.Vwcd_Result = { alien: "center", value: re.Vwcd_Result };
    }

    return result;
  }
}

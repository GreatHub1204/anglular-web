import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { InputDesignPointsService } from 'src/app/components/design-points/design-points.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { UserInfoService } from 'src/app/providers/user-info.service';
import { ResultDataService } from '../result-data.service';
import { CalcSummaryTableService } from '../result-summary-table/calc-summary-table.service';
import { SetPostDataService } from '../set-post-data.service';
import { CalcMinimumReinforcementService } from './calc-minimum-reinforcement.service';

@Component({
  selector: 'app-result-minimum-reinforcement',
  templateUrl: './result-minimum-reinforcement.component.html',
  styleUrls: ['../result-viewer/result-viewer.component.scss']
})
export class ResultMinimumReinforcementComponent implements OnInit {

  public title = "最大・最小鉄筋量の照査";
  public page_index = "ap_12";
  public page_index2 = "ap_13";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public ResultMinimumReinforcementPages: any[] = new Array();

  constructor(
    private http: HttpClient,
    private calc: CalcMinimumReinforcementService,
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
    this.err = '';

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("minimumReinforcement");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.http.post(this.post.URL, inputJson, this.post.options).subscribe(
      (response) => {
        if (response["ErrorException"] === null) {
          this.isFulfilled = this.setPages(response["OutputData"]);
          this.calc.isEnable = true;
        } else {
          this.err = JSON.stringify(response["ErrorException"]);
        }
        this.isLoading = false;
        this.summary.setSummaryTable("minimumReinforcement", this.ResultMinimumReinforcementPages);
        this.user.setUserPoint(response["deduct_points"], response["new_points"]);
      },
      (error) => {
        this.err = 'error!!' + '\n'; 
        let e: any = error;
        while('error' in e) {
          if('message' in e){ this.err += e.message + '\n'; }
          if('text' in e){ this.err += e.text + '\n'; }
          e = e.error;
        }
        if('message' in e){ this.err += e.message + '\n'; }
        if('stack' in e){ this.err += e.stack; }

        this.isLoading = false;
        this.summary.setSummaryTable("minimumReinforcement");
      }
    );

  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.ResultMinimumReinforcementPages = this.setRestorabilityPages(OutputData);
      return true;
    } catch(e) {
      this.err = e.toString();
      return false;
    }
  }


  // 出力テーブル用の配列にセット
  public setRestorabilityPages( OutputData: any,
                                title: string = '最小鉄筋量の照査',
                                title2: string = '最大鉄筋量の照査',
                                DesignForceList: any = this.calc.DesignForceList,
                                safetyID = this.calc.safetyID ): any[] {
    const result: any[] = new Array();
    let page: any;

    const groupe = this.points.getGroupeList();
    for (let ig = 0; ig < groupe.length; ig++) {

      const groupeName = this.points.getGroupeName(ig);
      page = {
        caption: title,
        caption2: title2,
        g_name: groupeName,
        columns: new Array(),
      };

      const safety = this.calc.getSafetyFactor(groupe[ig][0].g_id, safetyID);

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
              result.push(page);
              page = {
                caption: title,
                caption2: title2,
                g_name: groupeName,
                columns: new Array()
              };
            }
            /////////////// まず計算 ///////////////
            const section = this.result.getSection('Md', res, safety);
            const member = section.member;
            const shape = section.shape;
            const Ast = section.Ast;

            const titleColumn = this.result.getTitleString(section.member, position, side)
            const fck: any = this.helper.getFck(safety);

            const resultColumn: any = this.getResultString(
               this.calc.getResultValue(
              res, section, member, safety, fck, DesignForceList
            ));


            const column = {};
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
            /////////////// 最小鉄筋量の照査 ///////////////
            column['dmax'] = resultColumn.dmax;/* this */
            column['fck13'] = resultColumn.fck13;
            column['GF'] = resultColumn.GF;
            column['Ec'] = resultColumn.Ec;
            column['ftk'] = resultColumn.ftk;
            column['lch'] = resultColumn.lch;
            column['k0b'] = resultColumn.k0b;
            column['k1b'] = resultColumn.k1b;
            column['sigma_crd'] = resultColumn.sigma_crd;
            column['I'] = resultColumn.I;
            column['y'] = resultColumn.y;
            column['Nd'] = resultColumn.Nd;/* this */
            column['A'] = resultColumn.A;
            column['Mcrd_N'] = resultColumn.Mcrd_N;
            column['Mcrd_kN'] = resultColumn.Mcrd_kN;/* this */
            // column['fck'] = resultColumn.fck;
            // column['rc'] = resultColumn.rc;
            // column['fcd'] = resultColumn.fcd;
            // column['fsyk'] = resultColumn.fsyk;
            // column['rs'] = resultColumn.rs;
            // column['fsyd'] = resultColumn.fsyd;
            column['ecu'] = resultColumn.ecu;
            column['es'] = resultColumn.es;
            column['x'] = resultColumn.x;
            column['My'] = resultColumn.My;
            column['rb'] = resultColumn.rb;
            column['Myd'] = resultColumn.Myd;
            column['result_Md'] = resultColumn.result_Md;
            /////////////// 最大鉄筋量の照査 ///////////////
            // column['fck'] = resultColumn.fck;
            // column['rc'] = resultColumn.rc;
            // column['fcd'] = resultColumn.fcd;
            column['a_val'] = resultColumn.a_val;
            column['a'] = resultColumn.a;
            column['ecu_val'] = resultColumn.ecu_val;
            column['ecu_max'] = resultColumn.ecu_max;
            column['fsyd'] = resultColumn.fsyd;
            column['Es'] = resultColumn.Es;
            column['esy'] = resultColumn.esy;
            // column['Nd'] = resultColumn.Nd;
            column['sigma_s'] = resultColumn.sigma_s;
            column['d'] = resultColumn.d;
            column['pb'] = resultColumn.pb;
            column['pb075'] = resultColumn.pb075;
            column['pc'] = resultColumn.pc;
            column['result_pc'] = resultColumn.result_pc;
            /////////////// 総括表用 ///////////////
            column['g_name'] = m.g_name;
            column['index'] = position.index;
            column['side_summary'] = side;
            column['shape_summary'] = section.shapeName;
            

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
            } else {
              column[aa] = { alien: 'center', value: '-' };
            }
          }
          page.columns.push(column);
        }
        result.push(page);
      }
    }
    return result;
  }

  private getResultString(re: any): any {
    const result = {

      //最小鉄筋量
      dmax: { alien: "center", value: "-" },
      fck13: { alien: "center", value: "-" },
      GF: { alien: "center", value: "-" },
      Ec: { alien: "center", value: "-" },
      ftk: { alien: "center", value: "-" },
      lch: { alien: "center", value: "-" },
      k0b: { alien: "center", value: "-" },
      k1b: { alien: "center", value: "-" },
      sigma_crd: { alien: "center", value: "-" },
      I: { alien: "center", value: "-" },
      y: { alien: "center", value: "-" },
      Nd: { alien: "center", value: "-" },
      A: { alien: "center", value: "-" },
      Mcrd_N: { alien: "center", value: "-" },
      Mcrd_kN: { alien: "center", value: "-" },
      //fck: { alien: "center", value: "-" },
      //rc: { alien: "center", value: "-" },
      //fcd: { alien: "center", value: "-" },
      //fsyk: { alien: "center", value: "-" },
      //rs: { alien: "center", value: "-" },
      //fsyd: { alien: "center", value: "-" },
      ecu: { alien: "center", value: "-" },
      es: { alien: "center", value: "-" },
      x: { alien: "center", value: "-" },
      My: { alien: "center", value: "-" },
      rb: { alien: "center", value: "-" },
      Myd: { alien: "center", value: "-" },
      result_Md: { alien: "center", value: "-" },

      //最大鉄筋量
      //fck: { alien: "center", value: "-" },
      //rc: { alien: "center", value: "-" },
      //fcd: { alien: "center", value: "-" },
      a_val: { alien: "center", value: "-" },
      a: { alien: "center", value: "-" },
      ecu_val: { alien: "center", value: "-" },
      ecu_max: { alien: "center", value: "-" },
      fsyd: { alien: "center", value: "-" },
      Es: { alien: "center", value: "-" },
      esy: { alien: "center", value: "-" },
      //Nd: { alien: "center", value: "-" },
      sigma_s: { alien: "center", value: "-" },
      d: { alien: "center", value: "-" },
      pb: { alien: "center", value: "-" },
      pb075: { alien: "center", value: "-" },
      pc: { alien: "center", value: "-" },
      result_pc: { alien: "center", value: "-" },

    };


    // 最小鉄筋量
    if ("dmax" in re) {
      result.dmax = { alien: "right", value: re.dmax.toFixed(1) };
    }
    if ("fck13" in re) {
      result.fck13 = { alien: "right", value: re.fck13.toFixed(1) };
    }
    if ("GF" in re) {
      result.GF = { alien: "right", value: re.GF.toFixed(4) };
    }
    if ("Ec" in re) {
      result.Ec = { alien: "right", value: re.Ec.toFixed(1) };
    }
    if ("ftk" in re) {
      result.ftk = { alien: "right", value: re.ftk.toFixed(2) };
    }
    if ("lch" in re) {
      result.lch = { alien: "right", value: re.lch.toFixed(1) };
    }
    if ("k0b" in re) {
      result.k0b = { alien: "right", value: re.k0b.toFixed(2) };
    }
    if ("k1b" in re) {
      result.k1b = { alien: "right", value: re.k1b.toFixed(1) };
    }
    if ("sigma_crd" in re) {
      result.sigma_crd = { alien: "right", value: re.sigma_crd.toFixed(2) };
    }
    if ("I" in re) {
      result.I = { alien: "right", value: re.I.toExponential(3) };
    }
    if ("y" in re) {
      result.y = { alien: "right", value: re.y.toFixed(1) };
    }
    if ("Nd" in re) {
      result.Nd = { alien: "right", value: re.Nd.toFixed(2) };
    }
    if ("A" in re) {
      result.A = { alien: "right", value: re.A.toFixed(0) };
    }
    if ("Mcrd" in re) {
      result.Mcrd_N = { alien: "right", value: re.Mcrd.toExponential(3) };
      result.Mcrd_kN = { alien: "right", value: (re.Mcrd / 10**6).toFixed(1) };
    }
    //if ("fck" in re) {
      //result.fck = { alien: "right", value: re.fck.toFixed(1) };
    //}
    //if ("rc" in re) {
      //result.rc = { alien: "right", value: re.rc.toFixed(1) };
    //}
    //if ("fcd" in re) {
      //result.fcd = { alien: "right", value: re.fcd.toFixed(1) };
    //}
    //if ("fsyd" in re) {
      //result.fsyd = { alien: "right", value: re.fsyd.toFixed(2) };
    //}
    //if ("rs" in re) {
      //result.rs = { alien: "right", value: re.rs.toFixed(1) };
    //}
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
    if ("rb" in re) {
      result.rb = { alien: "right", value: re.rb.toFixed(1) };
    }
    if ("Myd" in re) {
      result.Myd = { alien: "right", value: re.Myd.toFixed(2) };
    }
    if ( "Mcrd" in re && "Myd" in re ) {
      if ( (re.Mcrd / 10**6) < re.Myd ) {
        result.result_Md.value = "OK";
      } else {
        result.result_Md.value = "NG";
      }
    }
    
    // 最大鉄筋量
    //if ("fck" in re) {
      //result.fck = { alien: "right", value: re.fck.toFixed(1) };
    //}
    //if ("rc" in re) {
      //result.rc = { alien: "right", value: re.rc.toFixed(5) };
    //}
    //if ("fcd" in re) {
      //result.fcd = { alien: "right", value: re.fcd.toFixed(5) };
    //}
    if ("a_val" in re) {
      result.a_val = { alien: "right", value: re.a_val.toFixed(3) };
    }
    if ("a" in re) {
      result.a = { alien: "right", value: re.a.toFixed(2) };
    }
    if ("εcu_val" in re) {
      result.ecu_val = { alien: "right", value: re.εcu_val.toFixed(5) };
    }
    if ("εcu_max" in re) {
      result.ecu_max = { alien: "right", value: re.εcu_max.toFixed(5) };
    }
    if ("fsyd" in re) {
      result.fsyd = { alien: "right", value: re.fsyd.toFixed() };
    }
    if ("Es" in re) {
      result.Es = { alien: "right", value: re.Es.toFixed(1) };
    }
    if ("εsy" in re) {
      result.esy = { alien: "right", value: re.εsy.toFixed(5) };
    }
    //if ("Nd" in re) {
      //result.Nd = { alien: "right", value: re.Nd.toFixed(1) };
    //}
    if ("sigma_s" in re) {
      result.sigma_s = { alien: "right", value: re.sigma_s.toFixed(0) };
    }
    if ("d" in re) {
      result.d = { alien: "right", value: re.d.toFixed(0) };
    }
    if ("pb" in re) {
      result.pb = { alien: "right", value: re.pb.toFixed(2) };
      result.pb075 = { alien: "right", value: (re.pb * 0.75).toFixed(2) };
    }
    if ("pc" in re) {
      result.pc = { alien: "right", value: re.pc.toFixed(2) };
    }
    if ( "Mcrd" in re && "Myd" in re ) {
      if ( (re.pb * 0.75) > re.pc ) {
        result.result_pc.value = "OK";
      } else {
        result.result_pc.value = "NG";
      }
    }

    return result;
  }

}

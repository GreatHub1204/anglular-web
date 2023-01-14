import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
import { CalcSafetyMomentService } from '../result-safety-moment/calc-safety-moment.service'

import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { InputCrackSettingsService } from 'src/app/components/crack/crack-settings.service';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { ResultDataService } from '../result-data.service';
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: 'root'
})

export class CalcServiceabilityMomentService {

  // 耐久性 曲げひび割れ
  public DesignForceList: any[];
  public DesignForceList1: any[];
  public DesignForceList2: any[];
  public isEnable: boolean;
  public safetyID: number = 0;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private calc: InputCalclationPrintService,
    private basic: InputBasicInformationService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private crack: InputCrackSettingsService,
    public base: CalcSafetyMomentService,
    private result: ResultDataService,
    private translate: TranslateService
    ) {
    this.DesignForceList = null;
    this.isEnable = false;
    }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void{

    this.isEnable = false;

    this.DesignForceList = new Array();

    // 曲げモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_moment_checked === false) {
      return;
    }

    // 永久荷重
    let No1 = (this.save.isManual()) ? 1 : this.basic.pickup_moment_no(1);
    // 縁応力度検討用
    let No0 = (this.save.isManual()) ? 0 : this.basic.pickup_moment_no(0);

    if(No0===null) No0 = No1;
    if(No1===null) No1 = No0;
    if(No1===null) return;

    this.DesignForceList = this.force.getDesignForceList('Md', No1);
    this.DesignForceList1 = this.force.getDesignForceList('Md', No0);

    // 変動作用において 最小の永久作用を用いる
    this.DesignForceList2 = this.force.getDesignForceList('Md', No1, false);
  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Md', this.safetyID, this.DesignForceList, this.DesignForceList1);

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(force1[0], force1[1]);

    // POST 用
    const option = {};
    
    // JR東日本モードの場合 barCenterPosition オプション = true
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1==0 &&(speci2===2 || speci2===5)){
      option['barCenterPosition'] = true;
    }

    const postData = this.post.setInputData('Md', '応力度', this.safetyID, option,
    force2[0], force2[1]);

    return postData;
  }

  public getSafetyFactor(g_id: any, safetyID: number) {
    return this.safety.getCalcData('Md', g_id, safetyID);
  }

  public calcWd(
    res: any, section: any,
    fc: any, safety: any,
    isDurability: boolean,
    speci2Info_TT: boolean,
    speci2Info: boolean,
    limit100: boolean): any {

    const resMin = res[0]; // 永久作用
    const resMax = res[1]; // 永久＋変動作用

    const crackInfo = this.crack.getCalcData(resMin.index);
    const member: any = section.member;

    const result = {};

    // 環境条件
    let conNum: number = 1;
    switch (resMin.side) {
      case '上側引張':
        conNum = this.helper.toNumber(crackInfo.con_u);
        break;
      case '下側引張':
        conNum = this.helper.toNumber(crackInfo.con_l);
        break;
    }
    if (conNum === null) { conNum = 1; }

    // 制限値
    let sigmal1: number = 140;
    let Wlim: number = 0.005;

    switch (conNum) {
      case 1:
        sigmal1 = 140;
        Wlim = 0.005;
        result['con'] = this.translate.instant("calculation.gen_env");
        break;
      case 2:
        sigmal1 = 120;
        Wlim = 0.004;
        result['con'] = this.translate.instant("calculation.corr_env");
        break;
      case 3:
        sigmal1 = 100;
        Wlim = 0.0035;
        result['con'] = this.translate.instant("calculation.severe_corr");
        break;
    }

    const fcd: number = fc.fcd;

    // 永久作用
    const Md: number = resMin.ResultSigma.Md;
    result['Md'] = Md;

    const Nd: number = resMin.ResultSigma.Nd;
    result['Nd'] = Nd;


    // 圧縮応力度の照査
    const Sigmac: number = this.getSigmac(resMin.ResultSigma.sc);
    if (Sigmac === null) { return result; }
    result['Sigmac'] = Sigmac;

    // 制限値
    const fcd04: number = 0.4 * fcd;
    result['fcd04'] = fcd04;

    // 縁応力の照査
    const Mhd: number = resMax.ResultSigma.Md;
    result['Mhd'] = Mhd;

    const Nhd: number = resMax.ResultSigma.Nd;
    result['Nhd'] = Nhd;

    // 縁応力度
    const struct = this.result.getStructuralVal(
      section.shapeName, member, "Md", resMin.index);
    const Sigmab: number = this.getSigmab(Mhd, Nhd, resMin.side, struct);
    if (Sigmab === null) { return result; }
    result['Sigmab'] = Sigmab;

    // 制限値
    let ri: number = safety.safety_factor.ri;
    result['ri'] = ri;
    
    // 円形の制限値を求める時は換算矩形で求める
    const VydBH = section.shape;
    const Sigmabl: number = this.getSigmaBl(VydBH.H, fcd);
    result['Sigmabl'] = Sigmabl;

    const Sigmas: number = this.getSigmas(resMin.ResultSigma);
    if (Sigmas === null) { return result; }

    // 鉄筋比
    let SectionalArea: number;
    let pt: number;
    let As: number = section.Ast.Ast;
    // 有効断面積を算出
    switch (section.shapeName) {
      case 'Circle':            // 円形
        SectionalArea = section.shape.Hw * section.shape.Hw;
        As = As / 4;
        pt = As / SectionalArea;
        break;
      case 'Ring':              // 円環
        SectionalArea = section.shape.Hw**2 - section.shape.Bw ** 2;
        As = As / 4;
        pt = As / SectionalArea;
        break;
      case 'Rectangle':         // 矩形
      case 'Tsection':          // T形
      case 'InvertedTsection':  // 逆T形
        SectionalArea = section.shape.B * (section.shape.H - section.Ast.dst);
        pt = section.Ast.Ast / SectionalArea;
        break;
      case 'HorizontalOval':    // 水平方向小判形
        SectionalArea = section.shape.Bw * (section.shape.H - section.Ast.dst);
        pt = section.Ast.Ast / SectionalArea;
        break;
      case 'VerticalOval':      // 鉛直方向小判形
        SectionalArea = section.shape.B * (section.shape.Hw - section.Ast.dst);
        pt = section.Ast.Ast / SectionalArea;
        break;
    }
    result['Pt'] = pt * 100;

    let JRTT05: boolean = false;
    if('JRTT05' in crackInfo)
      JRTT05 = crackInfo.JRTT05;

    if(!JRTT05){
      result['Sigmas'] = Sigmas;
      result['sigmal1'] = sigmal1;
      if (Sigmab < Sigmabl) {
        if ((speci2Info_TT && pt < 0.0050) || !speci2Info_TT){
            const ratio: number = ri * Sigmab / Sigmabl;
            result['ratio'] = ratio;
            return result;
        }
      }
    }

    // ひび割れ幅の照査
    const Es: number = section.Ast.Es;
    const Ec: number = fc.Ec;
    result['EsEc'] = Es / Ec;

    const fai: number = section.Ast.tension.rebar_dia;
    result['fai'] = fai;

    let c: number = section.Ast.tension.dsc - (section.Ast.tension.rebar_dia / 2); //ひび割れ幅算出用 純かぶり
    let c_lim: number = c; //制限値算出用 純かぶり
    if (speci2Info_TT){
      c = Math.min(c, 100);
      c_lim = c;
    }else if(limit100){
      c_lim = Math.min(c, 100);
    }
    result['c'] = c;

    let Cs: number = section.Ast.tension.rebar_ss;
    result['Cs'] = Cs;

    let ecu: number = (resMin.side === '上側引張') ? this.helper.toNumber(crackInfo.ecsd_u) : 
                                                    this.helper.toNumber(crackInfo.ecsd_l) ;
    if (ecu === null) { ecu = 450; }


    const k1: number = (section.Ast.tension.mark === 'D') ? 1 : 1.3;
    result['k1'] = k1;

    const k2: number = 15 / (fcd + 20) + 0.7;
    result['k2'] = k2;

    let n: number = section.Ast.tension.rebar_n / section.Ast.tension.line;

    let k3: number = (5 * (n + 2)) / (7 * n + 8);

    let k4: number = (crackInfo.k4 == null) ? 0.85 : crackInfo.k4;

    let Sigmase: number = Sigmas;
    result['sigma_se'] = Sigmase;

    // JR東日本の場合
    if( speci2Info === true ) {
      if( isDurability === false ){
        let Mrd: number =  Mhd - Md;
        let Nrd: number =  Nhd - Nd;
        let Mpd: number  = Md;
        let Npd: number  = Nd;
        const p = this.DesignForceList2.find((e) => e.index === resMin.index);
        if(p !== undefined){
          const f = p.designForce.find((e) => e.side === resMin.side );
          if(f !== undefined){
            Mpd = (resMin.side==='上側引張') ? -f.Md : f.Md;
            Npd = f.Nd;
            Mrd = Mhd - Mpd;
            Nrd = Nhd - Npd;
          }
        }
        // Ｍrd／(Ｍpd+Ｍrd)
        result['Mpd'] = Mpd;
        result['Npd'] = Npd;
        result['Mrd'] = Mrd;
        result['Nrd'] = Nrd;
        const rd_ratio = Mrd / Mhd;
        result['rd_ratio'] = rd_ratio;
        ecu = (rd_ratio < 0.25) ? 150 : 300;
      }
      n = 1;
      k3 = 1;
      k4 = 0.85;
    }

    result['ecu'] = ecu;
    result['n'] = n;
    result['k3'] = k3;
    result['k4'] = k4;

    const w1: number = 1.1 * k1 * k2 * k3 * k4;
    const w2: number = 4 * c + 0.7 * (Cs - fai);
    const w3: number = (Sigmase / (Es * 1000)) + (ecu / 1000000);
    const Wd: number = w1 * w2 * w3;
    result['Wd'] = Wd;

    // 制限値
    if (isDurability === false) {
      Wlim = Wlim * c_lim;
    } else {
      Wlim = 0.3;
    }
    result['Wlim'] = Wlim;



    const ratio: number = ri * Wd / Wlim;
    result['ratio'] = ratio;

    return result;
  }


  // 鉄筋の引張応力度を返す　(引張応力度がプラス+, 圧縮応力度がマイナス-)
  public getSigmas(ResultSigma: any, target_index: number = null): number {

    const sigmaSt: any[] = ResultSigma.st;

    if (sigmaSt === null) {
      return null;
    }
    if (sigmaSt.length < 1) {
      return 0;
    }

    try {
      let st: number = 0;
      // 最外縁の鉄筋の応力度を用いる
      let maxDepth: number = 0;
      for (const steel of sigmaSt) {
        if (maxDepth < steel.Depth) {
          if (target_index === null || steel.index === target_index){
            st = steel.s;
            maxDepth = steel.Depth;
          }
        }
      }
      return -st;

    } catch{
      return null;
    }
  }

  // コンクリートの圧縮応力度を返す　(圧縮応力度がプラス+, 引張応力度がマイナス-)
  private getSigmac(sigmaSc: any[]): number {

    if (sigmaSc === null) {
      return null;
    }
    if (sigmaSc.length < 1) {
      return 0;
    }

    let result: number = null;
    if (sigmaSc.length === 1) {
      result = sigmaSc[0].s;
    } else {
      const point1: any = sigmaSc[0];
      const point2: any = sigmaSc[1];
      const S: number = point1.s - point2.s;
      const DD: number = point2.Depth - point1.Depth;
      result = S / DD * point2.Depth + point2.s;
    }
    return result;

  }

  // 縁応力度を返す　(引張応力度がプラス+, 圧縮応力度がマイナス-)
  private getSigmab(Mhd: number, Nhd: number, side: string, struct: any): number {

    const I: number = struct.I;
    const A: number = struct.A;
    const Md: number = Math.abs(Mhd * 1000000);
    const Nd: number = Nhd * 1000;
    let e: number;
    switch (side) {
      case '上側引張':
        e = struct.eu;
        break;
      case '下側引張':
        e = struct.el;
        break;
    }
    const Z = I / e;
    const result = Md / Z - Nd / A;
    return result;

  }

  // 縁応力度の制限値を返す
  private getSigmaBl(H: number, ffck: number): number {

    const linear = (x, y) => {
      return ( x0: number ) => {
        const index = x.reduce((pre: any, current: number, i: any) => current <= x0 ? i : pre, 0); // 数値が何番目の配列の間かを探す
        const i = index === x.length - 1 ? x.length - 2 : index;                 // 配列の最後の値より大きい場合は、外挿のために、最後から2番目をindexにする
        return (y[i + 1] - y[i]) / (x[i + 1] - x[i]) * (x0 - x[i]) + y[i];       // 線形補間の関数を返す
      };
    };

    // コンクリート強度は 24以下はない
    let fck: number = ffck;
    if (ffck < 24) {　fck = 24; }
    if (ffck > 80) {  fck = 80; }

    const x0 = [24, 27, 30, 40, 50, 60, 80];
    const y025 = [3.9, 4.1, 4.4, 5.2, 5.8, 6.5, 7.6];
    const y050 = [2.9, 3.1, 3.3, 3.9, 4.5, 5.0, 5.9];
    const y100 = [2.2, 2.4, 2.6, 3.1, 3.5, 4.0, 4.7];
    const y200 = [1.8, 1.9, 2.1, 2.5, 2.9, 3.2, 3.9];

    // コンクリート強度の線形補間関数を作成
    let result: number = null;
    if (H > 2000) {
      const linear200 = linear(x0, y200);
      result = linear200(fck);

    } else {

      // 線形補間関数を作成
      let y: number[];
      const linear025 = linear(x0, y025);
      const linear050 = linear(x0, y050);
      const linear100 = linear(x0, y100);
      const linear200 = linear(x0, y200);
      y = [linear025(fck), linear050(fck), linear100(fck), linear200(fck)];

      // 断面高さの線形補間関数を作成
      const x = [250, 500, 1000, 2000];
      const linearH = linear(x, y);
      result = linearH(H);
    }

    return result;
  }


}

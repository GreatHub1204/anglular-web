import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
import { CalcServiceabilityMomentService } from '../result-serviceability-moment/calc-serviceability-moment.service';

import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputFatiguesService } from 'src/app/components/fatigues/fatigues.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { SaveDataService } from 'src/app/providers/save-data.service';

@Injectable({
  providedIn: 'root'
})

export class CalcSafetyFatigueMomentService {

  // 安全性（疲労破壊）曲げモーメント
  public DesignForceList: any[];  // 永久+変動作用
  public DesignForceList1: any[]; // 疲労現
  public DesignForceList2: any[]; // 変動応力
  public DesignForceList3: any[]; // 永久作用
  public isEnable: boolean;
  public safetyID: number = 1;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private fatigue: InputFatiguesService,
    private post: SetPostDataService,
    private base: CalcServiceabilityMomentService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService) {
    this.DesignForceList = null;
    this.DesignForceList3 = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void {

    this.isEnable = false;

    this.DesignForceList = new Array();

    // 曲げモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_moment_checked === false) {
      return;
    }

    // 疲労現
    const No2 = (this.save.isManual()) ? 2 : this.basic.pickup_moment_no(2);
    this.DesignForceList1 = this.force.getDesignForceList(
      'Md', No2);
    // 永久作用
    const No3 = (this.save.isManual()) ? 3 : this.basic.pickup_moment_no(3);
    this.DesignForceList3 = this.force.getDesignForceList(
      'Md', No3, false);
    // 永久+変動作用
    const No4 = (this.save.isManual()) ? 4 : this.basic.pickup_moment_no(4);
    this.DesignForceList = this.force.getDesignForceList(
      'Md', No4);

    // 変動応力
    this.DesignForceList2 = this.force.getLiveload(this.DesignForceList3, this.DesignForceList);

  }

   // サーバー POST用データを生成する
  public setInputData(): any {

    // 列車本数の入力がない場合は処理を抜ける
    if (this.helper.toNumber(this.fatigue.train_A_count) === null &&
      this.helper.toNumber(this.fatigue.train_B_count) === null) {
      return null;
    }

    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Md', this.safetyID, this.DesignForceList, this.DesignForceList2, this.DesignForceList3, this.DesignForceList1);

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(force1[0], force1[1], force1[2], force1[3]);

    // 有効な入力行以外は削除する
    this.deleteFatigueDisablePosition(force2);

    // POST 用
    const option = {};

    const postData = this.post.setInputData( 'Md', '応力度', this.safetyID, option, 
    force2[2], force2[1], force2[3]);
    
    return postData;
  }

   // 疲労破壊の照査の対象外の着目点を削除する
  private deleteFatigueDisablePosition(force: any) {

    for (let ip = force[0].length - 1; ip >= 0; ip--) {
      const pos: any = force[0][ip];

      const force0 = pos.designForce;

      const info = this.fatigue.getCalcData(pos.index);
      for (let i = force0.length - 1; i >= 0; i--) {
        // 疲労に用いる係数を取得する
        const fat = (force0[i].side==="上側引張" ) ? info.upper : info.bottom;
        // 係数に１つも有効な数値がなければ削除
        let enable = false;
        for(const k of Object.keys(fat)){
          if(fat[k] !== null){
            enable = true;
            break;
          }
        }
        if((enable === false) ||(force0[i].Md === 0)) {
          for(const f of force){
            f[ip].designForce.splice(i, 1);
          }
        }else{
          force0['fatigue'] = fat;
        }
      }

      if (pos.designForce.length < 1) {
        for(const f of force){
          f.splice(ip, 1);
        }
      }
    }
  }

  public getSafetyFactor(g_id: any) {
    return this.safety.getCalcData('Md', g_id, this.safetyID);
  }

  public calcFatigue(
    res: any, Ast: any, steel: any, safety: any, tmpFatigue: any, option: any = {} ): any {

    // 運輸機構モードの場合 k=0.12を固定とする
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1==0 && speci2===1){
      option['k12'] = true; 
    }

    // 応力度
    let resMin: any = res[0];
    let resMax: any;
    if (res.length < 2) {
      resMax = {
        ResultSigma: {
          fi: 0,
          Md: 0,
          Nd: 0,
          sc: new Array(),
          st: new Array(),
          x: 0,
        }
      };
    } else {
      resMax = res[1];
    }
    let resGen: any = res[2];

    const result: any = {};   
    let Mdmin = resMin.ResultSigma.Md;;
    let Ndmin = this.helper.toNumber(resMin.ResultSigma.Nd);
    let sigma_min: number = this.base.getSigmas(resMin.ResultSigma);

    let Mrd = resMax.ResultSigma.Md;
    let Nrd = this.helper.toNumber(resMax.ResultSigma.Nd);
    let sigma_rd: number = this.base.getSigmas(resMax.ResultSigma);

    if (sigma_min === null) { return result; }
    if (sigma_rd === null) { return result; }

    if(sigma_rd === 0){
      // 永久作用>変動作用ならば、永久作用と変動作用を入れ替える
      [Mdmin, Mrd] = [Mrd, Mdmin];
      [Ndmin, Nrd] = [Nrd, Ndmin];
      [sigma_min, sigma_rd] = [sigma_rd, sigma_min];
    }


    result['Mdmin'] = Mdmin;
    result['Ndmin'] = Ndmin;
    result['sigma_min'] = sigma_min;

    result['Mrd'] = Mrd;
    result['Nrd'] = Nrd;
    result['sigma_rd'] = sigma_rd;

    // f200 の計算
    let rs = this.helper.toNumber(safety.safety_factor.rs);
    if (rs === null) { rs = 1.05; }
    result['rs'] = rs;

    let k = 0.12;

    const fai: number = Ast.tension.rebar_dia;

    const fsu: number = this.helper.toNumber(Ast.fsu);

    let inputFatigue: any;
    switch (resMin.side) {
      case '上側引張':
        inputFatigue = tmpFatigue.upper;
        break;
      case '下側引張':
        inputFatigue = tmpFatigue.bottom;
        break;
    }

    let r1: number = this.helper.toNumber(inputFatigue.r1_1);
    if (r1 === null) { r1 = 1; }
    result['r1'] = r1;

    let ar: number = 3.09 - 0.003 * fai;

    let reference_count: number = this.helper.toNumber(this.fatigue.reference_count);
    if (reference_count === null) {
      reference_count = 2000000;
    }
    const tmp201: number = Math.pow(10, ar) / Math.pow(reference_count, k);
    const tmp202: number = 1 - sigma_min / fsu;
    const fsr200: number = r1 * tmp201 * tmp202 / rs;
    if(option['k12'] === false){
      result['fsr200'] = fsr200;
    }

    let ri: number = safety.safety_factor.ri;
    result['ri'] = ri;

    let rb = this.helper.toNumber(safety.safety_factor.rb);
    if (rb === null) { rb = 1; }

    const ratio200: number = ri * sigma_rd / (fsr200 / rb);
    if(option['k12'] === false){
      result['ratio200'] = ratio200;
      if (ratio200 < 1) {
        k = 0.06;
        ar = 2.71 - 0.003 * fai;
      } else {
        k = 0.12;
        ar = 3.09 - 0.003 * fai;
      }
    } else {
      k = 0.12;
      ar = 3.09 - 0.003 * fai;
    }
    result['ar'] = ar;
    result['k'] = k;

    // 標準列車荷重観山の総等価繰返し回数 N の計算
    let T: number;
    if ('service_life' in this.fatigue) {
      T = this.helper.toNumber(this.fatigue.service_life);
      if (T === null) { return result; }
    } else {
      return result;
    }

    const j = this.getTrainCount();
    const jA = j[0];
    const jB = j[1];

    let SASC: number = this.helper.toNumber(inputFatigue.SA);
    if (SASC === null) {
      SASC = 1;
    } else {
      result['SASC'] = SASC;
    }
    let SBSC: number = this.helper.toNumber(inputFatigue.SB);
    if (SBSC === null) {
      SBSC = 1;
    } else {
      result['SBSC'] = SBSC;
    }
    let a: number = this.helper.toNumber(inputFatigue.A);
    if (a === null) {
      a = 1;
    } else {
      result['a'] = Math.min(a, 1);
    }
    let b: number = this.helper.toNumber(inputFatigue.B);
    if (b === null) {
      b = 1;
    } else {
      result['b'] = b;
    }
    let NA = 0;
    let NB = 0;
    if (k === 0.06) {
      NA = this.helper.toNumber(inputFatigue.NA06);
      NB = this.helper.toNumber(inputFatigue.NB06);
    } else {
      NA = this.helper.toNumber(inputFatigue.NA12);
      NB = this.helper.toNumber(inputFatigue.NB12);
    }
    if (NA === null) {
      NA = 0;
    } else {
      result['NA'] = NA;
    }
    if (NB === null) {
      NB = 0;
    } else {
      result['NB'] = NB;
    }

    const tmpN1: number = 365 * T * jA * NA * Math.pow(SASC, 1 / k);
    const tmpN2: number = 365 * T * jB * NB * Math.pow(SBSC, 1 / k);
    const N: number = tmpN1 + tmpN2;
    result['N'] = Math.round(N / 100) * 100;

    if (ratio200 < 1 && N <= reference_count) {
      return result;
    }

    // frd の計算
    const tmpR21: number = Math.pow(a, 1 / k);
    const tmpR22: number = Math.pow(1 - a, 1 / k);
    const tmpR23: number = (tmpR21 + tmpR22) * ((1 - b) + b);
    const r2: number = Math.pow(1 / tmpR23, k);
    result['r2'] = r2;

    const tmpfrd1: number = Math.pow(10, ar) / Math.pow(N, k);
    const tmpfrd2: number = 1 - sigma_min / fsu;
    const frd: number = r1 * r2 * tmpfrd1 * tmpfrd2 / rs;
    result['frd'] = frd;

    const ratio: number = ri * sigma_rd / (frd / rb);
    result['ratio'] = ratio;

    // 鉄骨の疲労限の計算
    if (steel.flag) this.FatigueSteel(resMin, resGen, result, steel, inputFatigue, safety);

    return result;
  }

  // 列車本数を返す関数
  public getTrainCount(): number[] {
    const result = new Array(2);
    let jA = 0;
    if ('train_A_count' in this.fatigue) {
      jA = this.helper.toNumber(this.fatigue.train_A_count);
      if (jA === null) { jA = 0; }
    }
    let jB = 0;
    if ('train_B_count' in this.fatigue) {
      jB = this.helper.toNumber(this.fatigue.train_B_count);
      if (jB === null) { jB = 0; }
    }
    result[0] = jA;
    result[1] = jB;
    return result;
  }

    // 鉄骨の疲労限の計算
  public FatigueSteel (resMin, resGen, result, steel, inputFatigue, safety) {
    const ra = 1.0
    const sigma_max_s = this.base.getSigmas(resGen.ResultSigma, 0);
    const sigma_min_s = this.base.getSigmas(resMin.ResultSigma, 0);
    const sigma_fud = ra * (sigma_max_s - sigma_min_s);

    const class_s: string = inputFatigue.Class.toUpperCase();
    
    let sigma_cod: number = 0;
    if (class_s === 'A') {
      sigma_cod = 190;
    } else if (class_s === 'B') {
      sigma_cod = 155;
    } else if (class_s === 'C') {
      sigma_cod = 115;
    } else if (class_s === 'D') {
      sigma_cod = 84;
    } else if (class_s === 'E') {
      sigma_cod = 62;
    } else if (class_s === 'F') {
      sigma_cod = 46;
    } else if (class_s === 'G') {
      sigma_cod = 32;
    } else {
      console.log("強度等級の情報がありません。または誤っています。")
    }
    const welding_joint: string = (inputFatigue.weld) ? "溶接継手" : "非溶接継手";

    const fai_s = sigma_min_s / (sigma_max_s - sigma_min_s);
    let Cr: number;
    if (welding_joint === "溶接継手") {
      if (fai_s >= -0.5) {
        Cr = 1.0;
      } else if ( -0.5 < fai_s && fai_s < -1.0) {
        Cr = 13 / (16 + 6 * fai_s);
      } else {
        Cr = 1.3;
      } 
    } else {
      if (fai_s >= 0) {
        Cr = 1.0;
      } else if (0 > fai_s && fai_s > -1) {
        Cr = 3 / (3 + fai_s);
      } else {
        return result;
      }
    }
    const t = steel.I.value.thicknessC;
    //const t = 22;
    const Ct = (t > 25) ? (25 / t) ** (1/4) : 1.0;
    const sigma_cod2 = sigma_cod * Cr * Ct ;

    const ri_s = safety.safety_factor.ri;
    const ratio_s = ri_s * sigma_fud / sigma_cod2;

    result['MdGen'] = resGen.ResultSigma.Md;
    result['NdGen'] = resGen.ResultSigma.Nd;
    result['sigma_max_s'] = sigma_max_s;
    result['sigma_min_s'] = sigma_min_s;
    result['sigma_fud'] = sigma_fud;
    result['class_s'] = class_s;
    result['sigma_cod'] = sigma_cod;
    result["welding_joint"] = welding_joint;
    result["fai_s"] = fai_s;
    result['Cr'] = Cr;
    result['Ct'] = Ct;
    result['sigma_cod2'] = sigma_cod2;
    result['ri_s'] = ri_s;
    result["ratio_s"] = ratio_s;
  }

}

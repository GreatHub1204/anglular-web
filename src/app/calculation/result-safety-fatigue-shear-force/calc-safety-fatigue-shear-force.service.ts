import { SaveDataService } from '../../providers/save-data.service';
import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
import { CalcSafetyShearForceService } from '../result-safety-shear-force/calc-safety-shear-force.service';

import { Injectable, ViewChild } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputFatiguesService } from 'src/app/components/fatigues/fatigues.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { CalcSafetyFatigueMomentService } from '../result-safety-fatigue-moment/calc-safety-fatigue-moment.service';
import { InputCrackSettingsService } from 'src/app/components/crack/crack-settings.service';

@Injectable({
  providedIn: 'root'
})

export class CalcSafetyFatigueShearForceService {

  // 安全性（疲労破壊）せん断力
  public DesignForceList: any[];  // 永久+変動作用
  public DesignForceList2: any[]; // 変動応力
  public DesignForceList3: any[]; // 永久作用
  public isEnable: boolean;
  public safetyID: number = 1;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private crack: InputCrackSettingsService,
    private moment: CalcSafetyFatigueMomentService,
    private base: CalcSafetyShearForceService,
    private fatigue: InputFatiguesService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService) {
    this.DesignForceList = null;
    this.DesignForceList2 = null;
    this.DesignForceList3 = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void {

    this.isEnable = false;

    this.DesignForceList = new Array();

    // せん断力が計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_shear_force === false) {
      return;
    }

    // 列車本数の入力がない場合は処理を抜ける
    if (this.helper.toNumber(this.fatigue.train_A_count) === null &&
      this.helper.toNumber(this.fatigue.train_B_count) === null) {
      return;
    }

    // 最小応力
    const No3 = (this.save.isManual()) ? 3 : this.basic.pickup_shear_force_no(3);
    this.DesignForceList3 = this.force.getDesignForceList(
      'Vd', No3, false);
    // 最大応力
    const No4 = (this.save.isManual()) ? 4 : this.basic.pickup_shear_force_no(4);
    this.DesignForceList = this.force.getDesignForceList(
      'Vd', No4);

     // 変動応力
    this.DesignForceList2 = this.force.getLiveload(this.DesignForceList3, this.DesignForceList);

  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Vd', this.safetyID, this.DesignForceList, this.DesignForceList3, this.DesignForceList2);

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(force1[0], force1[1], force1[2]);

    // 有効な入力行以外は削除する
    this.deleteFatigueDisablePosition(force2);

    // POST 用
    const postData = [];
    for(const a of [force2[1], force2[2]]){
      for(const b of a){
        for(const c of b.designForce){
          postData.push({
            index: b.index,
            side: c.side,
            Nd: c.Nd,
            Md: c.Md,
            Vd: c.Vd,
            Reactions: [{
              M: { Mi: 0 } // Vcd の算定で用いるβn=1とするため 0でよい
            }]
          });
        }
      }
    }
    return postData;
  }

  // 疲労破壊の照査の対象外の着目点を削除する
  private deleteFatigueDisablePosition(force: any) {

    for (let ip = force[0].length - 1; ip >= 0; ip--) {
      const pos: any = force[0][ip];

      const force0 = pos.designForce;

      // 疲労に用いる係数を取得する
      const info = this.fatigue.getCalcData(pos.index);
      for (let i = force0.length - 1; i >= 0; i--) {
        // 係数に１つも有効な数値がなければ削除
        let enable = false;
        for(const k of Object.keys(info.share)){
          if(info.share[k] !== null){
            enable = true;
            break;
          }
        }
        if((enable === false) ||(force0[i].Vd === 0)) {
          for(const f of force){
            f[ip].designForce.splice(i, 1);
          }
        } else {
          force0['fatigue'] = info.share;
        }
      }

      if (pos.designForce.length < 1) {
        for(const f of force){
          f.splice(ip, 1);
        }
      }
    }
  }

  //
  public getSafetyFactor(g_id: any) {
    return this.safety.getCalcData('Vd', g_id, this.safetyID);
  }

  public calcFatigue( res: any, section: any, fc: any, safety: any, tmpFatigue: any, option: any = {} ): any {

    // 運輸機構モードの場合 k=0.12を固定とする
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1==0 && speci2===1){
      option['k12'] = true; 
    }

    const resMin: any = res[0];
    const resMax: any = res[1];

    // 疲労の Vcd を計算する時は βn=1
    const DesignForceList = { Md: resMin.Md, Vd: resMin.Vd, Nd: 0};
    const result: any = this.base.calcVmu(res[0], section, fc, safety, null, DesignForceList);

    // 最小応力
    let Vpd: number = this.helper.toNumber(resMin.Vd);
    if (Vpd === null) { return result; }
    Vpd = Math.abs(Vpd);
    result.Vpd = Vpd;

    let Mpd: number = this.helper.toNumber(resMin.Md);
    if (Mpd !== null) {
      Mpd = Math.abs(Mpd);
      result['Mpd'] = Mpd;
    }

    const Npd: number = this.helper.toNumber(resMin.Nd);
    if (Npd !== null) {
      result['Npd'] = Npd;
    }

    // 変動応力
    let Vrd: number = this.helper.toNumber(resMax.Vd);
    if (Vrd === null) { return result; }
    Vrd = Math.abs(Vrd);
    result['Vrd'] = Vrd;

    let Mrd: number = this.helper.toNumber(resMax.Md);
    if (Mrd !== null) {
      Mrd = Math.abs(Mrd);
      result['Mrd'] = Mrd;
    }

    const Nrd: number = this.helper.toNumber(resMax.Nd);
    if (Nrd !== null) {
      result['Nrd'] = Nrd;
    }

    // せん断補強鉄筋の設計応力度
    const crackInfo = this.crack.getCalcData(resMin.index); // 環境条件
    let kr: number = this.helper.toNumber(crackInfo.kr);
    if (kr === null) { kr = 0.5; }
    result['kr'] = kr;

    // 鉄骨の計算に用いる係数ar
    let ar_steel = 1;
    if ('Zs' in section.steel) { 
      const Zs = section.steel.Zs;
      ar_steel = (section.Ast.Ast * result.z) / (Zs + section.Ast.Ast * result.z);
      result['Zs'] = Zs;
      result['ar_steel'] = ar_steel;
    }

    // スターラップの永久応力度
    const tmpWrd1: number = ar_steel * ( Vpd + Vrd ) - kr * result.Vcd;

    let tmpWrd2: number = 0;
    if (result.Aw != null){
      tmpWrd2 += (result.Aw * result.z) / result.Ss;
    }
    if (section.Asb.Asb !== null){
      tmpWrd2 += (result.Asb * result.z * (Math.cos(Math.PI * result.deg2 / 180) 
                                        +  Math.sin(Math.PI * result.deg2 / 180)) ** 3) / result.Ss2;
    }
    const tmpWrd3: number = ar_steel * Vpd + result.Vcd;
    const tmpWrd4: number = ar_steel * (Vpd + Vrd) + result.Vcd;
    let sigma_min: number = (tmpWrd1 / tmpWrd2) * (tmpWrd3 / tmpWrd4);
    if (sigma_min === null) { return result; }
    sigma_min = sigma_min * 1000;
    result['sigma_min'] = sigma_min;
    const _sigma_min = Math.max(sigma_min, 0);

    // スターラップの変動応力度
    let sigma_rd: number = (tmpWrd1 / tmpWrd2) * (ar_steel * Vrd / tmpWrd4);
    if (sigma_rd === null) { return result; }
    sigma_rd = sigma_rd * 1000;
    result['sigma_rd'] = sigma_rd;
    const _sigma_rd = Math.max(sigma_rd, 0);

    // f200 の計算
    let rs = this.helper.toNumber(safety.safety_factor.rs);
    if (rs === null) { rs = 1.05; }
    result['rs'] = rs;

    let k = 0.12;

    let fai: number = this.helper.toNumber(section.Aw.stirrup_dia);
    if (fai === null) { 
      fai = this.helper.toNumber(section.Asb.bending_dia);
    }
    if (fai === null) { return result; }

    let fwud: number = this.helper.toNumber(section.Aw.fwud);
    if (fwud == null) {
      fwud = this.helper.toNumber(section.Asb.fwud);
    }
    if (fwud === null) { return result; }
    result['fwud'] = fwud;

    const inputFatigue: any = tmpFatigue.share;

    let r1: number = this.helper.toNumber(inputFatigue.r1_2);
    if (r1 === null) { r1 = 0.65; }
    result['r1'] = r1;

    let ar: number = 3.09 - 0.003 * fai;

    let reference_count: number = this.helper.toNumber(this.fatigue.reference_count);
    if (reference_count === null) {
      reference_count = 2000000;
    }
    const tmp201: number = Math.pow(10, ar) / Math.pow(reference_count, k);
    const tmp202: number = 1 - _sigma_min / fwud;
    const fsr200: number = r1 * tmp201 * tmp202 / rs;
    if(option['k12'] === false){
      result['fsr200'] = fsr200;
    }

    const ri: number = safety.safety_factor.ri;
    result['ri'] = ri;

    let rb = this.helper.toNumber(safety.safety_factor.rbs);
    if (rb === null) { rb = 1; }

    const ratio200: number = ri * _sigma_rd / (fsr200 / rb);
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
    result['k']  = k;
    result['ar']  = ar;

    // 標準列車荷重観山の総等価繰返し回数 N の計算
    let T: number = this.helper.toNumber(this.fatigue.service_life);
    if (T === null) { return result; }

    const j = this.getTrainCount();
    const jA = j[0];
    const jB = j[1];

    let SASC: number = this.helper.toNumber(inputFatigue.SA);
    if (SASC === null) {
      SASC = 1;
    } else if(jA > 0) {
      result['SASC'] = SASC;
    }
  
    let SBSC: number = this.helper.toNumber(inputFatigue.SB);
    if (SBSC === null) {
      SBSC = 1;
    } else if(jB > 0){
      result['SBSC'] = SBSC;
    }

    let a: number = this.helper.toNumber(inputFatigue.A);
    if (a === null) {
      a = 1;
    } else {
      result['a'] = a;
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
    } else if(jA > 0){
      result['NA'] = NA;
    }
    if (NB === null) {
      NB = 0;
    } else if(jB > 0){
      result['NB'] = NB;
    }

    const tmpN1: number = 365 * T * jA * NA * Math.pow(SASC, 1 / k);
    const tmpN2: number = 365 * T * jB * NB * Math.pow(SBSC, 1 / k);
    const N: number = tmpN1 + tmpN2;
    result['N'] = Math.round(N / 100) * 100;

    // frd の計算
    const tmpR21: number = Math.pow(a, 1 / k);
    const tmpR22: number = Math.pow(1 - a, 1 / k);
    const tmpR23: number = (tmpR21 + tmpR22) * ((1 - b) + b);
    const r2: number = Math.pow(1 / tmpR23, k);
    result['r2'] = r2;

    const tmpfrd1: number = Math.pow(10, ar) / Math.pow(N, k);
    const tmpfrd2: number = 1 - _sigma_min / fwud;
    const frd: number = r1 * r2 * tmpfrd1 * tmpfrd2 / rs;
    result['frd'] = frd;

    if (ratio200 < 1 && N <= reference_count) {
      return result;
    }

    const ratio: number = ri * _sigma_rd / (frd / rb);
    if(ratio > 0){
      result['ratio'] = ratio;
    }

    // 折り曲げ鉄筋の情報があれば、まとめて計算する。
    if (section.Asb.Asb !== null) { 
      this.bend(section, result, inputFatigue, reference_count, rb, fai);
    };

    return result;

  }

  private bend( section, result, inputFatigue, reference_count, rb, fai){
    
    const Vpd = result.Vpd;
    const Vrd = result.Vrd;
    const kr = result.kr;
    const rs = result.rs;
    const ri = result.ri;
    
    // 折り曲げ鉄筋の永久応力度
    const SumCosSin = Math.cos(Math.PI * result.deg2 / 180) + Math.sin(Math.PI * result.deg2 / 180);
    const tmpWrd1: number = Vpd + Vrd - kr * result.Vcd;
    let tmpWrd2 = 0;
    if(result.Aw != null){
      tmpWrd2 += (result.Aw * result.z) / (result.Ss * SumCosSin**2);
    }
    if(result.Asb != null){
      tmpWrd2 += (result.Asb * result.z * SumCosSin) / result.Ss2;
    }
    const tmpWrd3: number = Vpd + result.Vcd;
    const tmpWrd4: number = Vpd + Vrd + result.Vcd;
    let sigma_min2: number = (tmpWrd1 / tmpWrd2) * (tmpWrd3 / tmpWrd4);
    if (sigma_min2 === null) { return result; }
    sigma_min2 = sigma_min2 * 1000;
    result['sigma_min2'] = sigma_min2;
    const _sigma_min2 = Math.max(sigma_min2, 0);

    // 折り曲げ鉄筋の変動応力度
    let sigma_rd2: number = (tmpWrd1 / tmpWrd2) * (Vrd / tmpWrd4);
    if (sigma_rd2 === null) { return result; }
    sigma_rd2 = sigma_rd2 * 1000;
    result['sigma_rd2'] = sigma_rd2;
    const _sigma_rd2 = Math.max(sigma_rd2, 0);
    
    // 折り曲げ鉄筋のf200 の計算
    let k2 = 0.12;

    const fai2: number = this.helper.toNumber(section.Asb.bending_dia);
    if (fai2 === null) { return result; }

    const fwud2: number = this.helper.toNumber(section.Asb.fwud);
    if (fwud2 === null) { return result; }
    result['fwud2'] = fwud2;

    let r12: number = this.helper.toNumber(inputFatigue.r1_3);
    if (r12 === null) { r12 = 1.00; }
    result['r12'] = r12;

    let ar2: number = 3.09 - 0.003 * fai2;

    const tmp203: number = Math.pow(10, ar2) / Math.pow(reference_count, k2);
    const tmp204: number = 1 - _sigma_min2 / fwud2;
    const fsr2002: number = r12 * tmp203 * tmp204 / rs;
    result['fsr2002'] = fsr2002;

    const ratio2002: number = ri * _sigma_rd2 / (fsr2002 / rb);
    result['ratio2002'] = ratio2002;

    if (ratio2002 < 1) {
      k2 = 0.06;
      ar2 = 2.71 - 0.003 * fai;
    } else {
      k2 = 0.12;
      ar2 = 3.09 - 0.003 * fai;
    }
    result['k2']  = k2;
    result['ar2']  = ar2;

    // frd2（折り曲げ鉄筋） の計算
    const a = result.a;
    const b = result.b;
    const N = result.N;
    const r2 = result.r2;
    const ratio200 = result.ratio200;

    if (section.Asb.Asb !== null){
      const tmpR21_b: number = Math.pow(a, 1 / k2);
      const tmpR22_b: number = Math.pow(1 - a, 1 / k2);
      const tmpR23_b: number = (tmpR21_b + tmpR22_b) * ((1 - b) + b);
      const r2_b: number = Math.pow(1 / tmpR23_b, k2);
      result['r2'] = r2;

      const tmpfrd1_b: number = Math.pow(10, ar2) / Math.pow(N, k2);
      const tmpfrd2_b: number = 1 - _sigma_min2 / fwud2;
      const frd2: number = r12 * r2_b * tmpfrd1_b * tmpfrd2_b / rs;
      result['frd2'] = frd2;

      if (ratio200 < 1 && N <= reference_count) {
        return result;
      }

      const ratio2: number = ri * _sigma_rd2 / (frd2 / rb);
      if(ratio2 > 0){
        result['ratio2'] = ratio2;
      }
    }
  }

  // 列車本数を返す関数
  public getTrainCount(): number[] {
    return this.moment.getTrainCount();
  }

}

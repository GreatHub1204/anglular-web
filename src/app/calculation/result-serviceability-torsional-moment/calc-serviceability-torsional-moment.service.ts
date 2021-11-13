import { Injectable } from '@angular/core';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputCrackSettingsService } from 'src/app/components/crack/crack-settings.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { CalcSafetyShearForceService } from '../result-safety-shear-force/calc-safety-shear-force.service';
import { CalcSafetyTorsionalMomentService } from '../result-safety-torsional-moment/calc-safety-torsional-moment.service';
import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';

@Injectable({
  providedIn: 'root'
})
export class CalcServiceabilityTorsionalMomentService {

  // 耐久性 せん断ひび割れ
  public DesignForceList: any[];  // せん断ひび割れ検討判定用
  public DesignForceList1: any[]; // 永久荷重
  public isEnable: boolean;
  public safetyID: number = 0;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private crack: InputCrackSettingsService,
    private base: CalcSafetyTorsionalMomentService) {
    this.DesignForceList = null;
    this.isEnable = false;
    }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void{

    this.isEnable = false;

    this.DesignForceList= new Array();

    // ねじりモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_torsional_moment === false) {
      return;
    }

    // せん断ひび割れ検討判定用
    // せん断ひび割れにの検討における Vcd は １つ目の ピックアップ（永久＋変動）の Mu を使う
    const No0 = (this.save.isManual()) ? 0 : this.basic.pickup_torsional_moment_no(0);
    this.DesignForceList = this.force.getDesignForceList(
      'Mt', No0);
    // 永久荷重
    const No1 = (this.save.isManual()) ? 1 : this.basic.pickup_torsional_moment_no(1);
    this.DesignForceList1 = this.force.getDesignForceList(
      'Mt', No1);

  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if (this.DesignForceList.length < 1 ) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Mt', this.safetyID, this.DesignForceList1, this.DesignForceList);

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(force1[0], force1[1]);

    // POST 用
    const option = {};

    // 曲げ Mud 用
    const postData1 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force1[0]
    );

    // 曲げ Mud' 用
    const force3 = JSON.parse(JSON.stringify({ temp: force1[0] })).temp;
    for (const d1 of force3) {
      for (const d2 of d1.designForce) {
        d2.side = d2.side === "上側引張" ? "下側引張" : "上側引張"; // 上下逆にする
      }
    }
    const postData2 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force3
    );
    for (const d1 of postData2) {
      d1.side =
        d1.side === "上側引張" ? "下側引張の反対側" : "上側引張の反対側"; // 逆であることを明記する
      d1.memo = "曲げ Mud' 用";
    }

    // せん断 Mu 用
    const postData3 = this.post.setInputData(
      "Vd",
      "耐力",
      this.safetyID,
      option,
      force2[0]
    );

    for (const d1 of postData3) {
      d1.Nd = 0.0;
      d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
      d1.memo = "せん断 Mu 用";
    }

    const postData = postData1.concat(postData2, postData3);
    return postData;
  }

  public getSafetyFactor(target: string, g_id: any, safetyID: number) {
    return this.safety.getCalcData(target, g_id, safetyID);
  }

  public calcSigma(
    OutputData, res, sectionM, sectionV, fck, safetyM, safetyV, La, force): any {

    // せん断ひび割れ検討判定用
    let force0 = this.DesignForceList.find(
      (v) => v.index === res.index
    ).designForce.find((v) => v.side === res.side);
    if(force0 === undefined){
      force0 = { Md: 0, Nd: 0, Vd: 0}
    }

    // 永久荷重
    const force1 = this.DesignForceList1.find(
      (v) => v.index === res.index
    ).designForce.find((v) => v.side === res.side);
    // せん断耐力
    const result: any = this.base.calcMtud(
      OutputData, res, sectionM, sectionV, fck, safetyM, safetyV, La, force);

      // 変動荷重
    let force2 = { Md: 0, Nd: 0, Vd: 0};

    let Vd: number = Math.abs(force0.Vd);
    result['Vd'] = Vd;

    let Vpd: number = this.helper.toNumber(force1.Vd);
    if (Vpd === null) { Vpd = 0; }
    Vpd = Math.abs(Vpd);
    result['Vpd'] = Vpd;

    let Vrd: number = this.helper.toNumber(force2.Vd);
    if (Vrd === null || Vrd === 0) { Vrd = Vd - Vpd; }
    Vrd = Math.abs(Vrd);
    result['Vrd'] = Vrd;

    let Vcd07: number = 0.7 * result.Vcd;
    result['Vcd07'] = Vcd07;

    if (Vd <= Vcd07) {
      result['Result'] = 'OK';
      return result;
    }

    // 環境条件
    const crackInfo = this.crack.getTableColumn(res.index);

    let conNum: number = this.helper.toNumber(crackInfo.con_s);
    if (conNum === null) { conNum = 1; }

    // 制限値
    let sigma12: number = 120;
    switch (conNum) {
      case 1:
        sigma12 = (sectionM.Aw.fwyd !== 235) ? 120 : 100;
        result['con'] = '一般の環境';
        break;
      case 2:
        sigma12 = (sectionM.Aw.fwyd !== 235) ? 100 : 80;
        result['con'] = '腐食性環境';
        break;
      case 3:
        sigma12 = (sectionM.Aw.fwyd !== 235) ? 80 : 60;
        result['con'] = '厳しい腐食';
        break;
    }
    result['sigma12'] = sigma12;

    // 鉄骨の計算に用いる係数ar
    let ar = 1;
    if ('Zs' in sectionM.steel) { 
      const Zs = sectionM.steel.Zs;
      ar = (sectionM.Ast.Ast * result.z) / (Zs + sectionM.Ast.Ast * result.z);
      result['Zs'] = Zs;
      result['ar'] = ar;
    }

    // せん断補強鉄筋の設計応力度
    let kr: number = this.helper.toNumber(crackInfo.kr);
    if (kr === null) { kr = 0.5; }
    result['kr'] = kr;

    let VpdVrd_krVcd_s: number = (ar * (Vpd + Vrd) - kr * result.Vcd) * result.Ss;
    let AwZsinCos: number = result.Aw * result.z * result.sinCos;
    const VpdVcd: number = ar * Vpd + result.Vcd;
    const VpdVrdVcd: number = ar * (Vpd + Vrd) + result.Vcd;
    //折り曲げ鉄筋があれば、AwZsinCosの値を変更する。
    if (result.Asb !== undefined) {
      const SumCosSin = Math.cos(Math.PI * result.deg2 / 180) + Math.cos(Math.PI * result.deg2 / 180);
      VpdVrd_krVcd_s = (Vpd + Vrd - kr * result.Vcd)
      AwZsinCos = result.Aw * result.z / result.Ss + result.Asb * result.z * SumCosSin ** 3 / result.Ss2;
    }

    const sigmaw = (VpdVrd_krVcd_s / AwZsinCos) * (VpdVcd / VpdVrdVcd) * 1000;
    result['sigmaw'] = sigmaw;

    // 安全率
    const Ratio: number = result.ri * sigmaw / sigma12;
    result['Ratio'] = Ratio;

    let Result: string = 'NG';
    if (Ratio < 1) {
      Result = 'OK';
    }
    result['Result'] = Result;

    //折り曲げ鉄筋の設計応力度
    if(result.Asb !== undefined){

      const SumCosSin = Math.cos(Math.PI * result.deg2 / 180) + Math.cos(Math.PI * result.deg2 / 180);
      AwZsinCos = result.Aw * result.z / (result.Ss * SumCosSin ** 2) + result.Asb * result.z * SumCosSin / result.Ss2;

      const sigmab = (VpdVrd_krVcd_s / AwZsinCos) * (VpdVcd / VpdVrdVcd) * 1000;
      result['sigmab'] = sigmab;

      // 安全率
      const Ratio2: number = result.ri * sigmab / sigma12;
      result['Ratio2'] = Ratio2;

      let Result2: string = 'NG';
      if (Ratio2 < 1) {
        Result2 = 'OK';
      }
      result['Result2'] = Result2;
    }

    return result;

  }


}

import { SaveDataService } from "../../providers/save-data.service";
import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";

import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputSafetyFactorsMaterialStrengthsService } from "src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
import { absoluteFrom } from "@angular/compiler-cli/src/ngtsc/file_system";

@Injectable({
  providedIn: 'root'
})
export class CalcSafetyTorsionalMomentService {
  // 安全性（破壊）せん断力
  public DesignForceList: any[];
  public isEnable: boolean;
  public safetyID: number = 2;

  constructor(
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private save: SaveDataService,
    private helper: DataHelperModule,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private calc: InputCalclationPrintService,
    private vmu: CalcSafetyShearForceService,
    private basic: InputBasicInformationService
  ) {
    this.DesignForceList = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void {
    this.isEnable = false;

    this.DesignForceList = new Array();

    // せん断力が計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_torsional_moment === false) {
      return;
    }

    const No5 = (this.save.isManual()) ? 5 : this.basic.pickup_torsional_moment_no(5);
    this.DesignForceList = this.force.getDesignForceList(
      "Mt", No5 );
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable('Mt', this.safetyID, this.DesignForceList);

    // POST 用
    const option = {};

    // 曲げ Mud 用
    const postData1 = this.post.setInputData( "Md", "耐力", this.safetyID, option, force[0] );

    // 曲げ Mud' 用
    const force2 = JSON.parse(
      JSON.stringify({ temp: force[0] })
    ).temp;
    for(const d1 of force2){
      for(const d2 of d1.designForce){
        d2.side = (d2.side === '上側引張') ? '下側引張' : '上側引張'; // 上下逆にする
      }
    }
    const postData2 = this.post.setInputData( "Md", "耐力", this.safetyID, option, force2 );
    for(const d1 of postData2){
      d1.side = (d1.side === '上側引張') ? '下側引張の反対側' : '上側引張の反対側'; // 逆であることを明記する
      d1.memo = "曲げ Mud' 用";
    }

    // せん断 Mu 用
    const postData3 = this.post.setInputData( "Vd", "耐力", this.safetyID, option, force[0] );
    for(const d1 of postData3){
      d1.Nd = 0.0;
      d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
      d1.memo = 'せん断 Mu 用';
    }


    // POST 用
    const postData = postData1.concat(postData2, postData3);
    return postData;
  }

  public getSafetyFactor(target: string, g_id: any, safetyID: number) {
    return this.safety.getCalcData(target, g_id, safetyID);
  }

  // 変数の整理と計算
  public calcMtud(
    OutputData: any, 
    res1: any, 
    sectionM: any, 
    sectionV: any, 
    fc: any,
    safetyM: any,
    safetyV: any,
    Laa: number,
    force: any
  ){

    // 曲げ Mud' 用
    const res2 = OutputData.find(
      (e) => e.index === res1.index && e.side === (res1.side + 'の反対側')
    );
    
    // せん断 Mu 用
    const res3 = OutputData.find(
      (e) => e.index === (-1 * res1.index) && e.side === res1.side
    );

    let result = {};
    if (!(res3 === undefined || res3.length < 1)) {
      result = this.vmu.calcVmu(res3, sectionV, fc, safetyV, null, force)
    }

    if(!('Mt' in force)){
      return result;
    }
    result['Mt'] = force.Mt;

    // 部材係数
    const resultData1 = res1.Reactions[0];
    const resultData2 = res2.Reactions[0];
    const safety_factor = safetyM.safety_factor;

    result['rb'] = safety_factor.M_rb;
    result['Mud'] = resultData1.M.Mi;
    result['Mudd'] = resultData2.M.Mi;

    // Kt
    const bw: number = sectionV.shape.B;
    const h: number = sectionV.shape.H;

    let Nd: number = this.helper.toNumber(force.Nd);
    if (Nd === null) {
      Nd = 0;
    }

    const sigma_nt = (Nd*1000) / (h * bw); // (N/mm2)

    // コンクリート材料
    const fck: number = this.helper.toNumber(fc.fck);
    if (fck === null) {
      return result;
    }
    let rc: number = this.helper.toNumber(fc.rc);
    if (rc === null) {
      rc = 1;
    }
    const ftk = 0.23 * Math.pow(fck, 2/3);
    const ftd = ftk / rc;
    result['ftd'] = ftd;

    const Bnt = Math.sqrt(1-Math.abs(sigma_nt) / ftd);
    result['Bnt'] = Bnt;


    return result;

  }


}

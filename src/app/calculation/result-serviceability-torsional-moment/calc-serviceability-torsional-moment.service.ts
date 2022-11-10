import { Injectable } from "@angular/core";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputCrackSettingsService } from "src/app/components/crack/crack-settings.service";
import { InputSafetyFactorsMaterialStrengthsService } from "src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { SaveDataService } from "src/app/providers/save-data.service";
import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
import { CalcSafetyTorsionalMomentService } from "../result-safety-torsional-moment/calc-safety-torsional-moment.service";
import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class CalcServiceabilityTorsionalMomentService {
  // 耐久性 せん断ひび割れ
  public DesignForceList: any[]; // せん断ひび割れ検討判定用
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
    private vmu: CalcSafetyShearForceService,
    private base: CalcSafetyTorsionalMomentService,
    private translate: TranslateService
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

    // ねじりモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_torsional_moment === false) {
      return;
    }

    // せん断ひび割れ検討判定用
    // せん断ひび割れにの検討における Vcd は １つ目の ピックアップ（永久＋変動）の Mu を使う
    const No0 = this.save.isManual()
      ? 0
      : this.basic.pickup_torsional_moment_no(0);
    this.DesignForceList = this.force.getDesignForceList("Mt", No0);
    // 永久荷重
    const No1 = this.save.isManual()
      ? 1
      : this.basic.pickup_torsional_moment_no(1);
    this.DesignForceList1 = this.force.getDesignForceList("Mt", No1);
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable(
      "Mt",
      this.safetyID,
      this.DesignForceList1,
      this.DesignForceList
    );

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
    OutputData,
    res,
    sectionM,
    sectionV,
    fck,
    safetyM,
    safetyV,
    La,
    force
  ): any {
    // せん断ひび割れ検討判定用
    let force0 = this.DesignForceList.find(
      (v) => v.index === res.index
    ).designForce.find((v) => v.side === res.side);
    if (force0 == null) {
      force0 = { Md: 0, Nd: 0, Vd: 0, Mt: 0 };
    }

    // 永久荷重
    const force1 = this.DesignForceList1.find(
      (v) => v.index === res.index
    ).designForce.find((v) => v.side === res.side);
    // せん断耐力
    const result: any = this.base.calcMtud(
      OutputData,
      res,
      sectionM,
      sectionV,
      fck,
      safetyM,
      safetyV,
      La,
      force0,
      true
    );

    // 変動荷重
    let force2 = { Md: 0, Nd: 0, Vd: 0 };

    const Mthd = Math.abs(force0.Mt);
    result["Mthd"] = Mthd;
    const Mtpd = Math.abs(force1.Mt);
    result["Mtpd"] = Mtpd;
    let Vhd = Math.abs(force0.Vd);
    if (Vhd === null) {
      Vhd = 0;
    }
    result["Vhd"] = Vhd;
    let Vpd = Math.abs(force1.Vd);
    if (Vpd === null) {
      Vpd = 0;
    }
    result["Vpd"] = Vpd;

    if (!(result.Mtud1 in result)) {
      // ② 設計曲げモーメントが同時に作用する場合の設計ねじり耐力
      // Ｍtud1	=	Ｍtcd・{ 0.2＋0.8・(1‐γi・Ｍd／Ｍud)1/2 }
      const Mtud1 = (1 - (result.ri * result.Md) / result.Mud) > 0 ? result.Mtcd * (0.2 + 0.8 * Math.pow(1 - (result.ri * result.Md) / result.Mud, 0.5)) : 0;

      // ③ 設計せん断力が同時に作用する場合の設計ねじり耐力
      // Ｍtud2	=	Ｍtcd・( 1‐0.8・γi・Ｖd／Ｖud )
      const Mtud2 = result.Mtcd * (1 - (0.8 * result.ri * result.Vd) / result.Vyd);

      result["Mtud1"] = Mtud1;
      result["mtud2"] = Mtud2;
    }

    result["Mtud"] = result.Mtud1 > result.Mtud2 ? result.Mtud2 : result.Mtud1;

    let Mtud07: number = 0.7 * result.Mtud;
    result["Mtud07"] = Mtud07;

    if (Mthd <= Mtud07) {
      // せん断 Mu 用
      const res3 = OutputData.find(
        (e) => e.index === -1 * res.index && e.side === res.side
      );

      let result2 = {};
      if (!(res3 == null || res3.length < 1)) {
        result2 = this.vmu.calcVmu(res3, sectionV, fck, safetyV, null, force);
      }
      result2["Mt"] = result.Mt;
      result2["fvcd"] = result.fvcd;
      result2["Bd"] = result.Bd;
      result2["pc"] = result.pc;
      result2["Bp"] = result.Bp;
      result2["Mo"] = result.Mo;
      result2["Bn"] = result.Bn;
      result2["Vcd"] = result.Vcd;
      result2["Vsd"] = result.Vsd;
      result2["Vyd"] = result.Vyd;
      result2["fwcd"] = result.fwcd;
      result2["Mtcd"] = result.Mtcd;
      result2["Mud"] = result.Mud;

      result2["V_rbc"] = result.V_rbc;
      result2["V_rbs"] = result.V_rbs;
      result2["T_rbt"] = result.T_rbt;
      result2["Vyd"] = result.Vyd;
      result2["ftd"] = result.ftd;
      result2["ri"] = result.ri;
      result2["sigma_nd"] = result.sigma_nd;
      result2["Bnt"] = result.Bnt;
      result2["Kt"] = result.Kt;
      result2["Mtud1"] = result.Mtud1;
      result2["Mtud2"] = result.Mtud2;
      result2["Mtud"] = result.Mtud;
      result2["comMtud07"] =
        Math.round(result.Mthd * 10) / 10 +
        "<" +
        Math.round(result.Mtud07 * 10) / 10;
      result2["Mthd"] = Mthd;
      result2["Mtpd"] = Mtpd;
      result2["Vhd"] = Vhd;
      result2["Vpd"] = Vpd;
      result2["comMtud07_Ratio"] = Math.round(result.Mthd * 10) / 10 +
        "≦" +
        Math.round(result.Mtud07 * 10) / 10;
      result2["comMtud07_Result"] = "検討省略";

      return result2 ;
    } else {
      result["comMtud07_Ratio"] =
        Math.round(result.Mthd * 10) / 10 +
        ">" +
        (Math.round(result.Mtud07 * 10) / 10).toFixed(1);
      result["comMtud07_Result"] = "省略不可";
    }
    result["Mt1"] = result.Mtcd * (1 - (0.8 * result.Vpd) / result.Vyd);
    result["Mt2"] =
      (result.Mtyd * (1 - result.Vpd / result.Vyd)) +
      ((0.2 * result.Mtcd * result.Vpd) / result.Vyd);
    let sigma_wpd =
      ((result.Mtpd - 0.7 * result.Mt1) / (result.Mt2 - 0.7 * result.Mt1)) * result.fwyd;
    result["sigma_wpd"] = sigma_wpd;

    // 鋼材の種類
    if(sectionV.Asc!=null){
      const Asc = sectionV.Asc;
      if(Asc.compress != null){
        result["steel_type"] = Asc.compress.mark === "D"?"異形鉄筋":"丸鋼";　// 修正が必要
      }
    }

    // 環境条件
    const crackInfo = this.crack.getCalcData(res.index);

    let conNum: number = this.helper.toNumber(crackInfo.con_s);
    if (conNum === null) { conNum = 1; }

    // 制限値
    let sigma_12: number = 120;
    switch (conNum) {
      case 1:
        sigma_12 = (sectionV.Aw.fwyd !== 235) ? 120 : 100;
        result['con'] = this.translate.instant("calculation.gen_env");
        break;
      case 2:
        sigma_12 = (sectionV.Aw.fwyd !== 235) ? 100 : 80;
        result['con'] = this.translate.instant("calculation.corr_env");
        break;
      case 3:
        sigma_12 = (sectionV.Aw.fwyd !== 235) ? 80 : 60;
        result['con'] = this.translate.instant("calculation.severe_corr");
        break;
    }
    result['sigma_12'] = sigma_12;


    // 安全率
    const Ratio2: string = (result.ri * sigma_wpd / sigma_12 <= 1) ? 
    (result.ri * sigma_wpd / sigma_12).toFixed(3) + "≦ 1.000" :
    (result.ri * sigma_wpd / sigma_12).toFixed(3) + "> 1.000";
    result['sigma_Ratio'] = Ratio2;

    let Result2: string = 'NG';
    if (result.ri * sigma_wpd / sigma_12 <= 1) {
      Result2 = 'OK';
    }
    result['sigma_Result'] = Result2;


    return result;
  }
}

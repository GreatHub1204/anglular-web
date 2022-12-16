import { SaveDataService } from "../../providers/save-data.service";
import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";

import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputSafetyFactorsMaterialStrengthsService } from "src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { ShearStrengthService } from "src/app/components/shear/shear-strength.service";

@Injectable({
  providedIn: "root",
})
export class CalcSafetyShearForceService {
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
    private basic: InputBasicInformationService,
    private shear: ShearStrengthService
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
    if (this.calc.print_selected.calculate_shear_force === false) {
      return;
    }

    const No5 = (this.save.isManual()) ? 5 : this.basic.pickup_shear_force_no(5);
    this.DesignForceList = this.force.getDesignForceList(
      "Vd", No5);
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Vd', this.safetyID, this.DesignForceList);

    // POST 用
    const option = {};

    const postData = this.post.setInputData("Vd", "耐力", this.safetyID, option,
      force1[0]);

    return postData;
  }

  public getSafetyFactor(g_id: any, safetyID: number) {
    return this.safety.getCalcData("Vd", g_id, safetyID);
  }

  // 変数の整理と計算
  public calcVmu(
    res: any,
    section: any,
    fc: any,
    safety: any,
    shearkInfo: any,
    force: any
  ): any {

    const result: any = {}; // 印刷用

    // 仕様
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();


    // 断面力
    let Md1: number = 0;
    if (force !== void 0) {
      Md1 = this.helper.toNumber(force.Md);
    }
    let Md = Math.abs(Md1);
    if (Md !== 0) {
      result["Md"] = Md;
    }

    let Nd: number = 0;
    if(force != null){
      Nd = this.helper.toNumber(force.Nd);
    }
    if (Nd != 0) {
      result["Nd"] = Nd;
    }

    let Vd: number = 0
    if(force !== null){
      Vd = Math.abs(this.helper.toNumber(force.Vd));
    }
    if (Vd === null) {
      return result;
    }
    Vd = Math.abs(Vd);
    result["Vd"] = Vd;

    // 換算断面
    const h: number = section.shape.H;
    result["H"] = h;
    let hw2 = null; //小判型における換算断面の幅
    if (section.shape.Hw !== null) {
      hw2 = section.shape.Hw
    }

    const bw: number = section.shape.B;
    result["B"] = bw;
    let bw2 = null; //小判型における換算断面の幅
    if (section.shape.Bw !== null) {
      bw2 = section.shape.Bw
    }

    // 有効高さ
    const dsc = section.Ast.dst;
    let d: number = (hw2 === null) ? h - dsc : hw2 - dsc;;
    result["d"] = d;

    //  tanθc + tanθt
    const tan: number = section.tan;
    let Vhd: number = 0;
    if (tan !== null && tan !== 0) {
      Vhd = (-Md1 / d * 1000) * tan;
      result["Vhd"] = Vhd;
    }

    // せん断スパン
    let La = Number.MAX_VALUE;
    if(shearkInfo != null){
      La = this.helper.toNumber(shearkInfo.La);
      if (La == null) {
        La = Number.MAX_VALUE;
      } else {
        if (La === 1) {
          La = Math.abs(Md / Vd) * 1000; // せん断スパン=1 は せん断スパンを自動で計算する
        }
        result["La"] = La;
      }
    }

    // 引張鉄筋比
    let pc: number;
    if (section.shape.Bw === null) {
      pc = section.Ast.Ast / (section.shape.B * d);
    } else {
      pc = section.Ast.Ast / (section.shape.Bw * d);
    }

    // コンクリート材料
    const fck: number = this.helper.toNumber(fc.fck);
    if (fck === null) {
      return result;
    }
    result["fck"] = fck;

    let rc: number = this.helper.toNumber(fc.rc);
    if (rc === null) {
      rc = 1;
    }
    result["rc"] = rc;

    let fcd: number = this.helper.toNumber(fc.fcd);
    if (fcd === null) {
      fcd = fck;
    }
    result["fcd"] = fcd;

    // 帯鉄筋
    let Aw: number = this.helper.toNumber(section.Aw.Aw);
    let fwyd: number = this.helper.toNumber(section.Aw.fwyd);
    let deg: number = this.helper.toNumber(section.Aw.deg);
    if (deg === null) { deg = 90; }
    let Ss: number = this.helper.toNumber(section.Aw.Ss);
    if (Ss === null) { Ss = Number.MAX_VALUE; }
    if (Aw === null || fwyd === null) {
      Aw = 0;
      fwyd = 0;
    } else {

      if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
        // 令和5年 RC標準
        fwyd = Math.min(fwyd, 25 * fcd, 800);
      }

      result["Aw"] = Aw;
      result["AwString"] = section.Aw.AwString;
      result["fwyd"] = section.Aw.fwyd;
      result["deg"] = deg;
      result["Ss"] = Ss;
    }

    // 折り曲げ鉄筋
    let Asb: number = this.helper.toNumber(section.Asb.Asb);
    let fwyd2: number = this.helper.toNumber(section.Asb.fwyd);
    let deg2: number = this.helper.toNumber(section.Asb.deg);
    if (deg2 === null) { deg2 = 90; }
    let Ss2: number = this.helper.toNumber(section.Asb.Ss);
    if (Ss2 === null) { Ss2 = Number.MAX_VALUE; }
    if (Asb === null || fwyd2 === null) {
      Asb = 0;
      fwyd2 = 0;
    } else {
      result["Asb"] = Asb;
      result["AsbString"] = section.Asb.AsbString;
      result["fwyd2"] = section.Asb.fwyd;
      result["deg2"] = deg2;
      result["Ss2"] = Ss2;
    }

    // 鉄筋材料
    let fsy: number = this.helper.toNumber(section.Ast.fsy);
    if (fsy !== null) {
      result["fsy"] = fsy;
    }

    let rs: number = this.helper.toNumber(section.Ast.rs);
    if (rs === null) {
      rs = 1;
    }
    result["rs"] = rs;

    result["fsyd"] = fsy / rs;

    let rVcd: number = this.helper.toNumber(fc.rVcd);;
    if (rVcd === null) {
      rVcd = 1;
    }

    // 鉄骨情報
    // CFT の場合：section.steel.thickness
    let web_I_height = this.helper.toNumber(section.steel.I.value.heightW);
    let web_I_thickness = this.helper.toNumber(section.steel.I.value.thicknessW);
    let fsvyd_IWeb = null;
    let Asv = null;
    if(web_I_thickness !== null){
      Asv = web_I_height * web_I_thickness;
      fsvyd_IWeb = ('fsvy_Iweb' in section.steel) ? this.helper.toNumber(section.steel.fsvy_Iweb.fvyd) : null;

      if (section.shapeName === "Circle") {
        web_I_height = this.helper.toNumber(section.shape.H); // 鋼材高さ
        web_I_thickness = this.helper.toNumber(section.steel.I.tension_flange);; // 鋼材厚さ
        const H = section.member.B;
        const B = H - web_I_thickness * 2;
        const Hw = ((-1 - Math.PI / 4) * H ** 2 + 2 * H * B - (1 - Math.PI / 4) * B ** 2) / (2 * B - 2 * H);
        const Bw = Hw - web_I_thickness * 2;
        Asv = (Hw ** 2 - Bw ** 2) / 2 //鋼材断面積
      }
    }

    //result['Hw'] = ( (-1-Math.PI/4)*H**2 + 2*H*result['B'] - (1-Math.PI/4)*result['B']**2)/(2*result['B'] - 2*H);
    //result['Bw'] = result['Hw'] - result['H'] + result['B'];

    // 部材係数
    const Mu = res.Reactions[0].M.Mi;
    result["Mu"] = Mu;

    // せん断耐力の照査
    let V_rbc: number = 1;
    V_rbc = this.helper.toNumber(safety.safety_factor.V_rbc);
    if (V_rbc === null) {
      V_rbc = 1;
    }

    const Vwcd: any = this.calcVwcd(fcd, (bw2 === null) ? bw : bw2, d, V_rbc);
    for (const key of Object.keys(Vwcd)) {
      result[key] = Vwcd[key];
    }


    if (La / d >= 2) {

      result["rbc"] = V_rbc;

      let V_rbs: number = this.helper.toNumber(safety.safety_factor.V_rbs);
      if (V_rbs === null) {
        V_rbs = 1;
      }
      result["rbs"] = V_rbs;

      if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
        // 令和5年 RC標準
        let pw: number = Aw / (bw * Ss);
        const pff = pw * fwyd / fcd;

        if (0.1 < pff) {
          // pw・fwyd/f'cd≦0.1とするのがよいので
          // Aw の上限値とする
          pw = 0.1 * fcd / fwyd;
          Aw = 0.1 * bw * Ss * fcd / fwyd;
          result["pw"] = pw;
        }

      }

      const Vyd: any = this.calcVyd(
        fcd, d, pc, Nd, h,
        Mu, bw, V_rbc, rVcd, deg, deg2,
        Aw, Asb, fwyd, fwyd2, Ss, Ss2, V_rbs,
        web_I_height, web_I_thickness, fsvyd_IWeb, Asv);

      for (const key of Object.keys(Vyd)) {
        result[key] = Vyd[key];
      }

    } else {
      // La / d < 2 の場合
      let V_rbs: number = this.helper.toNumber(safety.safety_factor.rbs);
      if (V_rbs === null) {
        V_rbs = 1;
      }
      result["rbs"] = V_rbs;

      if (speci1 === 0 && (speci2 === 2 || speci2 === 5)) {
        // JR東日本の場合
        result["rbc"] = V_rbc;

        const Vydd = this.calcVydd(
          fcd, d, La, pc, Nd, h, hw2,
          Mu, bw, bw2, V_rbc, rVcd, deg, deg2,
          Aw, Asb, fwyd, fwyd2, Ss, Ss2)

        for (const key of Object.keys(Vydd)) {
          result[key] = Vydd[key];
        }

      } else {

        // 標準のディープビーム式
        V_rbc = this.helper.toNumber(safety.safety_factor.rbd);
        if (V_rbc === null) {
          V_rbc = 1.2;
        }
        result["rbc"] = V_rbc;
  
        let fixed_end = false; // 両端固定梁で令和5年 RC標準で導入された概念
        let L: number = -1.0;
        if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
          // 令和5年 RC標準改定
          if(shearkInfo.L != null){
            if(shearkInfo.fixed_end != null)
            fixed_end = shearkInfo.fixed_end;
            L = shearkInfo.L;
          }
        }

        let Vdd: any = {};
        if (fixed_end === false) {
          Vdd = this.calcVdd(fcd, d, Aw, bw, Ss, La, Nd, h, Mu, pc, V_rbc);

        } else {

          if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
            // 令和5年 RC標準
            const pw: number = Aw / (bw * Ss);
            const pff = pw * fwyd / fcd;
            if (0.1 < pff) {
              // pw・fwyd/f'cd≦0.1とするのがよいので
              // Aw の上限値とする
              Aw = 0.1 * bw * Ss * fcd / fwyd;
            }
          }

          L = (L/h < 1.5) ? 1.5 * h : L;
          result["L"] = L;

          Vdd = this.calcVasud(
            fcd, d, pc, Nd, h,
            Mu, bw, V_rbc, rVcd, deg, deg2,
            Aw, Asb, fwyd, fwyd2, Ss, Ss2, V_rbs,
            web_I_height, web_I_thickness, fsvyd_IWeb, Asv, L);
        }
        for (const key of Object.keys(Vdd)) {
          result[key] = Vdd[key];
        }

      }

    }


    let ri: number = this.helper.toNumber(safety.safety_factor.ri);
    if (ri === null) {
      ri = 1;
    }
    result["ri"] = ri;

    let Vyd_Ratio: number = 0;
    if ("Vyd" in result) {
      Vyd_Ratio = (ri * (result.Vd - Vhd)) / result.Vyd;
    } else if ("Vdd" in result) {
      Vyd_Ratio = (ri * (result.Vd - Vhd)) / result.Vdd;
    }
    result["Vyd_Ratio"] = Vyd_Ratio;

    let Vyd_Result: string = "NG";
    if (Vyd_Ratio < 1) {
      Vyd_Result = "OK";
    }
    result["Vyd_Result"] = Vyd_Result;

    let Vwcd_Ratio: number = 0;
    if ("Vwcd" in result) {
      Vwcd_Ratio = (ri * (result.Vd - Vhd)) / result.Vwcd;
    }
    result["Vwcd_Ratio"] = Vwcd_Ratio;

    let Vwcd_Result: string = "NG";
    if (Vwcd_Ratio < 1) {
      Vwcd_Result = "OK";
    }
    result["Vwcd_Result"] = Vwcd_Result;

    return result;
  }

  // 標準せん断耐力
  private calcVyd(
    fcd: number, d: number, pc: number, Nd: number, H: number,
    Mu: number, B: number, V_rbc: number, rVcd: number, deg: number, deg2: number,
    Aw: number, Asb: number, fwyd: number, fwyd2: number, Ss: number, Ss2: number, V_rbs: number,
    web_I_height: number, web_I_thickness: number, fsvyd_IWeb: number, Asv): any {
    const result = {};

    let fvcd: number = 0.2 * Math.pow(fcd, 1 / 3);
    fvcd = Math.min(fvcd, 0.72);
    result["fvcd"] = fvcd;

    let Bd: number = Math.pow(1000 / d, 1 / 4);
    Bd = Math.min(Bd, 1.5);
    result["Bd"] = Bd;

    result["pc"] = pc;

    let Bp: number = Math.pow(100 * pc, 1 / 3);
    Bp = Math.min(Bp, 1.5);
    result["Bp"] = Bp;

    //M0 = NDD / AC * iC / Y
    let Mo: number = (Nd * H) / 6000;
    result["Mo"] = Mo;

    let Bn: number;
    if (Mu <= 0) {
      Bn = 1;
    } else if (Nd > 0) {
      Bn = 1 + (2 * Mo) / Mu;
      Bn = Math.min(Bn, 2);
    } else {
      Bn = 1 + (4 * Mo) / Mu;
      Bn = Math.max(Bn, 0);
    }
    result["Bn"] = Bn;

    let Vcd = (Bd * Bp * Bn * fvcd * B * d) / V_rbc;
    Vcd = Vcd / 1000;
    Vcd = Vcd * rVcd; // 杭の施工条件
    result["Vcd"] = Vcd;

    //スターラップの設計せん断耐力
    const _vsd = this.calcVsd(d, deg, deg2, Aw, Asb, fwyd, fwyd2, Ss, Ss2, V_rbs,
      web_I_height, web_I_thickness, fsvyd_IWeb, Asv);
    for (const key of Object.keys(_vsd)) {
      result[key] = _vsd[key];
    }
    let Vsd = _vsd.Vsd;
    result["Vsd"] = Vsd;

    let Vyd: number = Vcd + Vsd;

    // 折り曲げ鉄筋か、鉄骨
    if ('Vsd2' in  _vsd) {
      const Vsd2: number = result['Vsd2'];
      Vyd += Vsd2;
    }

    result["Vyd"] = Vyd;

    return result;
  }

  //スターラップの設計せん断耐力
  private calcVsd(
    d: number, deg: number, deg2: number, Aw: number, Asb: number,
    fwyd: number, fwyd2: number, Ss: number, Ss2: number, V_rbs: number,
    web_I_height: number, web_I_thickness: number, fsvyd_IWeb: number, Asv: number): any {
    const result = {};

    let z: number = d / 1.15;
    result["z"] = z;

    let sinCos: number =
      Math.sin(this.helper.Radians(deg)) +
      Math.cos(this.helper.Radians(deg));
    result["sinCos"] = sinCos;

    let Vsd =
      (((Aw * fwyd * sinCos) / Ss) * z) / V_rbs;
    Vsd = Vsd / 1000;
    result["Vsd"] = Vsd;

    //鉄骨鋼材の情報があれば鉄骨鋼材の値、無ければ折り曲げ鉄筋の値を算出する
    if (web_I_height == null) {
      //折り曲げ鉄筋のの設計せん断耐力
      let sinCos2: number =
        Math.sin(this.helper.Radians(deg2)) +
        Math.cos(this.helper.Radians(deg2));

      let Vsd2 = (((Asb * fwyd2 * sinCos2) / Ss2) * z) / V_rbs;

      Vsd2 = Vsd2 / 1000;

      if ( Vsd !== 0 ) {
        // せん断補強鉄筋としてスターラップと折り曲げ鉄筋を併用する場合は, せん断補強鉄筋が受け持つべきせん断耐力の 50%以上を, スターラップに受け持たせることとする【RC標準 7.2.3.2(1)(b)】
        Vsd2 = Math.min(Vsd2, Vsd);
      }

      result["sinCos2"] = sinCos2;
      result["Vsd2"] = Vsd2;

    } else {
      // 鉄鋼鋼材の設計せん断耐力
      const fsvyd = fsvyd_IWeb;
      result['fsvyd'] = fsvyd;

      // hw : 鉄骨腹板の高さ
      const hw = web_I_height;

      // tw : 鉄骨腹板の厚さ
      const tw = web_I_thickness;

      // rb : 部材係数
      const rb = 1.05

      // Vsddの計算
      const Vsdd = fsvyd * Asv / rb / 1000;
      result['Vsd2'] = Vsdd;
    }

    return result;
  }


  // 腹部コンクリートの設計斜め圧縮破壊耐力
  private calcVwcd(fcd: number, B: number, d: number, rbc: number): any {
    const result = {};

    // 仕様
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();

    let fwcd: number = 1.25 * Math.sqrt(fcd);

    if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
      fwcd = Math.min(fwcd, 9.8);
    } else{
      fwcd = Math.min(fwcd, 7.8);
    }
    result["fwcd"] = fwcd;

    let Vwcd = (fwcd * B * d) / rbc;

    Vwcd = Vwcd / 1000;

    result["Vwcd"] = Vwcd;

    return result;
  }

  // 設計せん断圧縮破壊耐力 Vdd
  private calcVdd(fcd: number, d: number, Aw: number,
    B: number, Ss: number, La: number, Nd: number,
    Height: number, Mu: number, pc: number, rbc: number): any {

    const result = {};

    // 仕様
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();

    let fdd: number = 0.19 * Math.sqrt(fcd);
    result["fdd"] = fdd;

    let Bd: number = Math.pow(1000 / d, 1 / 4);
    Bd = Math.min(Bd, 1.5);
    result["Bd"] = Bd;

    let alpha: number = 1.0;
    if (speci1 === 0 && (speci2 === 3 || speci2 === 4)) {
      alpha = 1.14;
      result["alpha"] = alpha;
    }


    let pw: number = Aw / (B * Ss);
    result["pw"] = pw;
    if (pw < 0.002) {
      pw = 0;
    }

    //せん断スパン比
    let ad: number = La / d;
    result["ad"] = ad;

    let Bw: number =
      (4.2 * Math.pow(100 * pw, 1 / 3) * (ad - 0.75)) / Math.sqrt(fcd);
    Bw = Math.max(Bw, 0);
    result["Bw"] = Bw;

    //M0 = NDD / AC * iC / Y
    let Mo: number = (Nd * Height) / 6000;
    result["Mo"] = Mo;

    let Bn: number;
    if (Mu <= 0) {
      Bn = 1;
    } else if (Nd > 0) {
      Bn = 1 + (2 * Mo) / Mu;
      Bn = Math.min(Bn, 2);
    } else {
      Bn = 1 + (4 * Mo) / Mu;
      Bn = Math.max(Bn, 0);
    }
    result["Bn"] = Bn;

    result["pc"] = pc;

    let Bp: number = (1 + Math.sqrt(100 * pc)) / 2;
    Bp = Math.min(Bp, 1.5);
    result["Bp"] = Bp;

    let Ba: number = 5 / (1 + Math.pow(ad, 2));
    result["Ba"] = Ba;

    let Vdd =
      ((Bd * Bn + Bw) * Bp * Ba * alpha * fdd * B * d) / rbc;

    Vdd = Vdd / 1000;

    result["Vdd"] = Vdd;

    return result;
  }

  // 令和5年 RC標準 両端固定梁の場合のせん断耐力
  private calcVasud(
    fcd: number, d: number, pc: number, Nd: number, H: number,
    Mu: number, B: number, V_rbc: number, rVcd: number, deg: number, deg2: number,
    Aw: number, Asb: number, fwyd: number, fwyd2: number, Ss: number, Ss2: number, V_rbs: number,
    web_I_height: number, web_I_thickness: number, fsvyd_IWeb: number, Asv: number,
    L: number): any {
    const result = {};

    let fvcd: number = 0.2 * Math.pow(fcd, 1 / 3);
    fvcd = Math.min(fvcd, 0.72);
    const focd = 17.4 * fvcd;
    result["fvcd"] = fvcd;
    result["focd"] = focd;

    let Bd: number = Math.pow(1000 / d, 1 / 4);
    Bd = Math.min(Bd, 1.5);
    result["Bd"] = Bd;

    result["pc"] = pc;

    let Bp: number = Math.pow(100 * pc, 1 / 3);
    Bp = Math.min(Bp, 1.5);
    result["Bp"] = Bp;

    let pw: number = Aw / (B * Ss);
    const pff = pw * fwyd / fcd;
    if (0.1 < pff) {
      // pw・fwyd/f'cd≦0.1とするのがよいので
      // Aw の上限値とする
      pw = 0.1* fcd / fwyd;
      Aw = pw * B * Ss;
    }
    result["pw"] = pw;

    let Bw: number = -30 * Math.pow(pff, 2) + 1.3;
    result["Bw"] = Bw;

    //  tanθc
    const tan: number = H / (2 * L);
    result["tan"] = tan;

    //
    const hc: number = 0.5 * H;
    result["hc"] = hc;

    //M0 = NDD / AC * iC / Y
    let Mo: number = (Nd * H) / 6000;
    result["Mo"] = Mo;

    let Bn: number;
    if (Mu <= 0) {
      Bn = 1;
    } else if (Nd > 0) {
      Bn = 1 + (2 * Mo) / Mu;
      Bn = Math.min(Bn, 2);
    } else {
      Bn = 1 + (4 * Mo) / Mu;
      Bn = Math.max(Bn, 0);
    }
    result["Bn"] = Bn;

    let Vcd = Bd * Bp * Bn * Bw * focd * B * hc * tan / V_rbc;
    Vcd = Vcd / 1000;
    Vcd = Vcd * rVcd; // 杭の施工条件
    result["Vcd"] = Vcd;

    //スターラップの設計せん断耐力
    const _vsd = this.calcVsd(d, deg, deg2, Aw, Asb, fwyd, fwyd2, Ss, Ss2, V_rbs,
      web_I_height, web_I_thickness, fsvyd_IWeb, Asv);
    for (const key of Object.keys(_vsd)) {
      result[key] = _vsd[key];
    }
    let Vsd = _vsd.Vsd;
    result["Vsd"] = Vsd;

    let Vyd: number = Vcd + Vsd;

    // 折り曲げ鉄筋か、鉄骨
    if ('Vsd2' in  _vsd) {
      const Vsd2: number = result['Vsd2'];
      Vyd += Vsd2;
    }

    result["Vyd"] = Vyd;

    return result;
  }

  // JR東日本式せん断耐力
  private calcVydd(
    fcd: number, d: number, La: number, pc: number, Nd: number, H: number, Hw: number,
    Mu: number, B: number, Bw: number, rbc: number, rVcd: number, deg: number, deg2: number,
    Aw: number, Asb: number, fwyd: number, fwyd2: number, Ss: number, Ss2: number): any {

    const result = {};

    let fvcd: number = Math.pow(fcd, 1 / 3);
    result["fvcd"] = fvcd;

    let Ba: number = Math.pow(La / d, -1.166)
    Ba = Math.min(Ba, 2.244);
    result["Ba"] = Ba;

    let Bd: number = Math.pow(1000 / d, 1 / 4);
    Bd = Math.min(Bd, 1.5);
    result["Bd"] = Bd;

    //let Bp: number = (1 + Math.pow(100 * pc, 1/3)) / 2;
    let Bp: number = (0 + Math.pow(100 * pc, 1 / 3));
    Bp = Math.min(Bp, 1.5);
    result["Bp"] = Bp;

    //M0 = NDD / AC * iC / Y
    let Mo: number = (Hw === null) ? (Nd * H) / 6000 : (Nd * Hw) / 6000;
    result["Mo"] = Mo;

    let Bn: number;
    if (Mu <= 0) {
      Bn = 1;
    } else if (Nd > 0) {
      Bn = 1 + (2 * Mo) / Mu;
      Bn = Math.min(Bn, 2);
    } else {
      Bn = 1 + (4 * Mo) / Mu;
      Bn = Math.max(Bn, 0);
    }
    result["Bn"] = Bn;

    //せん断スパン比
    let ad: number = La / d;
    result["ad"] = ad;

    //let Bw: number = (4.2 * Math.pow(100 * pw, 1 / 3) * (ad - 0.75)) / Math.sqrt(fcd);
    //Bw = Math.max(Bw, 0);
    //result["Bw"] = Bw;

    // Vcddの算出
    const Vcdd: number = (Bw === null) ? 0.65 * Ba * fvcd * Bd * Bp * Bn * B * d / rbc :
      0.65 * Ba * fvcd * Bd * Bp * Bn * Bw * d / rbc;
    result["Vdd"] = Vcdd / 1000;

    let Bs: number = (La / d < 0) ? 0.0 : (La / d > 1) ? 1.0 : 2 * (La / d - 0.5);
    const rb = 1.1;

    //スターラップの設計せん断耐力 Vsd
    let z: number = d / 1.15;
    //result["z"] = z;

    let sinCos: number =
      Math.sin(this.helper.Radians(deg)) +
      Math.cos(this.helper.Radians(deg));
    //result["sinCos"] = sinCos;

    let Vsd = (((Aw * fwyd * sinCos) / Ss) * z) / rb;
    result['Vsd'] = Vsd / 1000;

    //折り曲げ鉄筋のの設計せん断耐力 Vsd2
    let sinCos2: number =
      Math.sin(this.helper.Radians(deg2)) +
      Math.cos(this.helper.Radians(deg2));
    //result["sinCos2"] = sinCos2;

    let Vsd2 = (((Asb * fwyd2 * sinCos2) / Ss2) * z) / rb;
    result["Vsd2"] = Vsd2 / 1000;

    // せん断補強鉄筋としてスターラップと折り曲げ鉄筋を併用する場合は, せん断補強鉄筋が受け持つべきせん断耐力の 50%以上を, スターラップに受け持たせることとする【RC標準 7.2.3.2(1)(b)】
    Vsd2 = Math.min(Vsd2, Vsd);

    // Vsddの算出
    const Vsdd: number = Bs * (Vsd + Vsd2);

    // 設計せん断耐力の算出
    let Vydd = Vcdd + Vsdd;
    Vydd = Vydd / 1000;
    result["Vyd"] = Vydd;

    return result;// 設計せん断圧縮破壊耐力に比べ、fddとpcの情報が欠落
  }

}

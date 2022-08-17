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
  providedIn: "root",
})
export class CalcSafetyTorsionalMomentService {
  // 安全性（破壊）ねじりモーメント
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

    // ねじりモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_torsional_moment === false) {
      return;
    }

    const No5 = this.save.isManual()
      ? 5
      : this.basic.pickup_torsional_moment_no(5);
    this.DesignForceList = this.force.getDesignForceList("Mt", No5);
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable(
      "Mt",
      this.safetyID,
      this.DesignForceList
    );

    // POST 用
    const option = {};

    // 曲げ Mud 用
    const postData1 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force[0]
    );

    // 曲げ Mud' 用
    const force2 = JSON.parse(JSON.stringify({ temp: force[0] })).temp;
    for (const d1 of force2) {
      for (const d2 of d1.designForce) {
        d2.side = d2.side === "上側引張" ? "下側引張" : "上側引張"; // 上下逆にする
      }
    }
    const postData2 = this.post.setInputData(
      "Md",
      "耐力",
      this.safetyID,
      option,
      force2
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
      force[0]
    );
    for (const d1 of postData3) {
      d1.Nd = 0.0;
      d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
      d1.memo = "せん断 Mu 用";
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
    force: any,
    omit_flg = false // 検討省略する場合でも以降の計算を続けるか？
  ) {
    // 曲げ Mud' 用
    const res2 = OutputData.find(
      (e) => e.index === res1.index && e.side === res1.side + "の反対側"
    );

    // せん断 Mu 用
    const res3 = OutputData.find(
      (e) => e.index === -1 * res1.index && e.side === res1.side
    );

    let result = {};
    if (!(res3 == null || res3.length < 1)) {
      result = this.vmu.calcVmu(res3, sectionV, fc, safetyV, null, force);
    }else{
      result["Md"] = 0;
      result["Nd"] = 0;
      result["Vd"] = 0;
    }

    if (force === void 0) {
      return result;
    }

    if (!('Mt' in force)) {
      return result;
    }
    const Mt = Math.abs(force.Mt);
    result["Mt"] = Mt;

    // 部材係数
    const resultData1 = res1.Reactions[0];
    const resultData2 = res2.Reactions[0];
    const safetyM_factor = safetyM.safety_factor;
    const safetyV_factor = safetyV.safety_factor;

    const M_rb: number = safetyM_factor.M_rb;
    const V_rbc: number = safetyV_factor.V_rbc;
    const V_rbs: number = safetyV_factor.V_rbs;
    const T_rbt: number = safetyV_factor.T_rbt;
    result["T_rbt"] = T_rbt;
    result["V_rbc"] = V_rbc;
    result["V_rbs"] = V_rbs;
    const Mud = resultData1.M.Mi / M_rb;
    result["Mud"] = Mud;
    const Mudd = resultData2.M.Mi / M_rb;
    result["Mudd"] = Mudd;

    const Vud = result["Vyd"];
    const bw: number = sectionV.shape.B;
    const h: number = sectionV.shape.H;

    // 有効高さ
    let dst = this.helper.toNumber(sectionM.Ast.dst);
    if (dst === null) {
      dst = 0;
    }
    const d: number = h - dst;

    // コンクリート材料
    const fck: number = this.helper.toNumber(fc.fck);
    if (fck === null) {
      return result;
    }
    let rc: number = this.helper.toNumber(fc.rc);
    if (rc === null) {
      rc = 1;
    }
    const fcd = fck / rc;

    const ftk = 0.23 * Math.pow(fck, 2 / 3);
    const ftd = ftk / rc;
    result["ftd"] = ftd;

    let ri: number = 0;
    ri = this.helper.toNumber(safetyV_factor.ri);
    if (ri === null) {
      ri = 1;
    }
    result["ri"] = ri;

    let Nd: number = this.helper.toNumber(force.Nd);
    if (Nd === null) {
      Nd = 0;
    }

    let Md: number = this.helper.toNumber(force.Md);
    if (Md === null) {
      Md = 0;
    }
    Md = Math.abs(Md);

    let Vd: number = this.helper.toNumber(force.Vd);
    if (Vd === null) {
      Vd = 0;
    }
    Vd = Math.abs(Vd);

    // ① 設計純ねじり耐力
    const sigma_nd = (Nd * 1000) / (h * bw); // (N/mm2)
    result["sigma_nd"] = sigma_nd;

    const Bnt = Math.sqrt(1 - Math.abs(sigma_nd) / ftd);
    result["Bnt"] = Bnt;

    //Kt = b^2・d／{3.1＋1.8／( d／b )}
    const Kt = (Math.pow(bw, 2) * h) / (3.1 + 1.8 / (h / bw)); // mm^3
    // const Kt = kt / Math.pow(1000, 3); // m^3
    result["Kt"] = Kt;

    // Ｍtcd	=	βnt・Ｋt・ftd／γb
    const Mtcd = (Bnt * Kt * ftd) / T_rbt / 1000000;
    result["Mtcd"] = Mtcd;

    const Mtcd_Ratio: number = (ri * Mt) / Mtcd;
    result["Mtcd_Ratio"] = Mtcd_Ratio;

    if (result["Mtcd_Ratio"] < 0.2) {
      result['Mtcd_Result'] = "検討省略";
      if(!omit_flg){
        return result; 
      } 
    } else {
      result['Mtcd_Result'] = "省略不可";
    }

    // ② 設計曲げモーメントが同時に作用する場合の設計ねじり耐力
    // Ｍtud1	=	Ｍtcd・{ 0.2＋0.8・(1‐γi・Ｍd／Ｍud)1/2 }
    const riMdMud = 1 - (ri * Md) / Mud;
    let Mtud1 = 0;
    let Mtud1_Ratio: number = 99.999;
    if( riMdMud > 0 ){
      Mtud1 = Mtcd * (0.2 + 0.8 * Math.pow(riMdMud, 0.5));
      Mtud1_Ratio = (ri * Mt) / Mtud1;
    }

    // ③ 設計せん断力が同時に作用する場合の設計ねじり耐力
    // Ｍtud2	=	Ｍtcd・( 1‐0.8・γi・Ｖd／Ｖud )
    const Mtud2 = Mtcd * (1 - (0.8 * ri * Vd) / Vud);
    const Mtud2_Ratio: number = (ri * Mt) / Mtud2;

    // if (Math.max(Mtud1_Ratio, Mtud2_Ratio) < 0.5) {
    // 安全率が 0.5 以下なら 最小ねじり補強筋を配置して検討省略する
    result['Mtud1'] = Mtud1;
    result['Mtud1_Ratio'] = Mtud1_Ratio;
    result['Mtud1_Result'] = Mtud1_Ratio <= 0.5 ? "検討省略" : "省略不可";

    result['Mtud2'] = Mtud2;
    result['Mtud2_Ratio'] = Mtud2_Ratio;
    result['Mtud2_Result'] = Mtud2_Ratio <= 0.5 ? "検討省略" : "省略不可";

    if(!omit_flg && Mtud1_Ratio<= 0.5 && Mtud2_Ratio <= 0.5 ){
      return result; 
    }

    // return result; //1114
    // }

    // 2) ねじり補強鉄筋がある場合の設計ねじり耐力

    // ① 設計斜め圧縮破壊耐力
    // fwcd =	1.25・(f'cd)1/2
    const fwcd = 1.25 * Math.pow(fcd, 0.5);
    result["fwcd"] = fwcd;

    // Ｍtcud	=	Ｋt・fwcd／ γb
    const Mtcud = (Kt * fwcd) / T_rbt / 1000000;
    const Mtcud_Ratio: number = (ri * Mt) / Mtcud;
    result["Mtcud"] = Mtcud;
    result["Mtcud_Ratio"] = Mtcud_Ratio;

    // ② 設計ねじり耐力

    /// 引張鉄筋の情報
    const tension = sectionM["Ast"]["tension"];
    let dt = 0;
    let Ast_dia = 0;
    let Ast = 0;
    let fsyt = 0;
    if (!(tension === null)) {
      dt = this.helper.toNumber(tension["dsc"]);
      if (dt === null) {
        dt = 0;
      } else {
        Ast_dia = this.helper.toNumber(tension["rebar_dia"]);
        Ast = this.helper.toNumber(sectionM["Ast"]["Ast"]);
        fsyt = this.helper.toNumber(sectionM["Ast"]["fsd"]);
      }
    }

    /// 圧縮鉄筋の情報
    const compress = sectionM["Asc"]["compress"];
    let dc = 0;
    let Asc_dia = 0;
    let Asc = 0;
    let fsyc = 0;
    if (!(compress === null)) {
      dc = this.helper.toNumber(compress["dsc"]);
      Asc_dia = 0;
      if (dc === null) {
        dc = 0;
      } else {
        Asc_dia = this.helper.toNumber(compress["rebar_dia"]);
        Asc = this.helper.toNumber(sectionM["Asc"]["Asc"]);
        fsyc = this.helper.toNumber(compress["fsy"]["fsy"] / compress.rs);
      }
    }

    /// 側面鉄筋の情報
    const sidebar = sectionM["Ase"]["sidebar"];
    let de = 0;
    let Ase_dia = 0;
    let Ase = 0;
    let fsye = 0;
    if (!(sidebar === null)) {
      de = this.helper.toNumber(sidebar["cover2"]);
      if (de === null) {
        de = 0;
      } else {
        Ase_dia = this.helper.toNumber(sidebar["side_dia"]);
        Ase = this.helper.toNumber(sectionM["Ase"]["Ase"]);
        fsye = this.helper.toNumber(sidebar["fsy"]["fsy"] / sidebar.rs);
      }
    }
    // ねじり用側面かぶり
    if(de === 0 && 'side_cover' in sectionM){
      de = this.helper.toNumber(sectionM["side_cover"]);
      if (de === null) {
        de = 0;
      }
    }

    // 折り曲げ鉄筋
    const Asb = sectionV["Asb"];
    let Atsb = 0;
    if (!(Asb === null)) {
      Atsb = this.helper.toNumber(Asb.Asb);
    }

    // スターラップ
    const Aw = sectionV["Aw"];
    let stirrup_dia = 0;
    let Atw = 0;
    let Ss = Number.MAX_VALUE;
    let fwyd = 0;
    if (!(Aw === null)) {
      stirrup_dia = this.helper.toNumber(Aw["stirrup_dia"]);
      if (stirrup_dia === null) {
        stirrup_dia = 0;
      } else {
        Atw = this.helper.toNumber(Aw.Aw) / 2;
        Ss = this.helper.toNumber(Aw.Ss);
        fwyd = this.helper.toNumber(Aw.fwyd);
      }
    }

    // 純かぶりと鉄筋辺長
    const dtt = Math.max(dt - Ast_dia / 2 - stirrup_dia / 2, 0);
    const dct = Math.max(dc - Asc_dia / 2 - stirrup_dia / 2, 0);
    const det = Math.max(de - Math.max(Asc_dia, Ast_dia) / 2 - stirrup_dia / 2, 0);
    let d0: number = h - dtt - dct; // 鉄筋長辺
    let b0: number = bw - det * 2; // 鉄筋短辺
    if (d0 < b0) {
      [d0, b0] = [b0, d0];
    }
    result["bo"] = b0;
    result["do"] = d0;

    const Am = (b0 * d0) / Math.pow(1000, 2);

    result["Am"] = b0 * d0;

    // ql	=	ΣAtl・fiyd／u
    let Atl = Ast + Asc + Ase * 2;
    let ΣAtl_fiyd = Ast * fsyt + Asc * fsyc + Ase * 2 * fsye;

    // 鉄骨 I型配置 を考慮する ----------------------------------------------------------------
    const I = sectionM.steel.I.value;
    let I_tension_width       = this.helper.toNumber(I.widthT);
    let I_tension_thickness   = this.helper.toNumber(I.thicknessT);
    let I_compress_width      = this.helper.toNumber(I.widthC);
    let I_compress_thickness  = this.helper.toNumber(I.thicknessC);
    let I_web_height          = this.helper.toNumber(I.heightW);
    let I_web_thickness       = this.helper.toNumber(I.thicknessW);
    I_tension_width       = (I_tension_width===null)? 0: I_tension_width
    I_tension_thickness   = (I_tension_thickness===null)? 0: I_tension_thickness
    I_compress_width      = (I_compress_width===null)? 0: I_compress_width
    I_compress_thickness  = (I_compress_thickness===null)? 0: I_compress_thickness
    I_web_height          = (I_web_height===null)? 0: I_web_height
    I_web_thickness       = (I_web_thickness===null)? 0: I_web_thickness

    let fsy_tension = ('fsy_tension' in sectionM.steel) ? this.helper.toNumber(sectionM.steel.fsy_tension.fsy) : null;
    let fsy_compress = ('fsy_compress' in sectionM.steel) ? this.helper.toNumber(sectionM.steel.fsy_compress.fsy) : null;
    let fsy_Iweb = ('fsy_Iweb' in sectionM.steel) ? this.helper.toNumber(sectionM.steel.fsy_Iweb.fsy) : null;
    fsy_tension   = (fsy_tension===null)? 0: fsy_tension
    fsy_compress  = (fsy_compress===null)? 0: fsy_compress
    fsy_Iweb      = (fsy_Iweb===null)? 0: fsy_Iweb

    // スターラップ Atw に鉄骨を加算
    const _Atw = I_web_thickness * Ss * fsy_Iweb / fwyd
    Atw += _Atw;

    // 軸方向鉄筋 Atl に追加
    const tension_Atl   = (fsy_tension !== 0 )?   I_tension_width * I_tension_thickness : 0;
    const compress_Atl  = (fsy_compress !== 0 )?  I_compress_width * I_compress_thickness : 0;
    const web_Atl       = (fsy_Iweb !== 0 )?      I_web_height * I_web_thickness : 0;

    Atl += (tension_Atl + compress_Atl + web_Atl)

    const tension_ΣAtl_fiyd = tension_Atl * fsy_tension;
    const compress_ΣAtl_fiyd = compress_Atl * fsy_compress;
    const web_ΣAtl_fiyd = web_Atl * fsy_Iweb;

    ΣAtl_fiyd += (tension_ΣAtl_fiyd + compress_ΣAtl_fiyd + web_ΣAtl_fiyd)

    // ------------------------------------------------------------------------------------------

    // qw	=	Ａtw・fwyd／s
    let qw = (Atw * fwyd) / Ss;

    const u = 2 * (b0 + d0);
    let ql = ΣAtl_fiyd / u; //345追加
    const _ql = 1.25 * qw;
    const _qw = 1.25 * ql;
    if (qw > _qw) {
      qw = _qw;
    }
    if (ql > _ql) {
      ql = _ql;
    }
    result["Atw"] = Atw;
    result["Atl"] = Atl;
    result["u"] = u;
    result["qw"] = qw;
    result["ql"] = ql;

    // Ｍtyd	=	2・Ａm・(qw・ql)1/2 / γb
    const Mtyd = (2 * Am * Math.pow(qw * ql, 0.5)) / T_rbt;
    result["Mtyd"] = Mtyd;

    // ③ 設計曲げモーメントが同時に作用する場合の設計ねじり耐力
    const Mtu_min = Math.min(Mtcud, Mtyd);
    result["Mtu_min"] = Mtu_min;

    let Mtud = 0;
    if (Mud >= Mudd) {
      if (ri * Md <= Mud - Mudd) {
        // (a) Ｍud ≧ Ｍ'ud かつ γi･Ｍd ≦ Ｍud‐Ｍ'ud の場合
        // Ｍtud	=	Ｍtu.min
        Mtud = Mtu_min;
      } else {
        // (b) Ｍud ≧ Ｍ'ud かつ Ｍud-Ｍ'ud ≦ γi･Ｍd ≦ Ｍud の場合
        // Ｍtud =	( Ｍtu.min-0.2･Ｍtcd )・( (Ｍud-γi･Ｍd)／Ｍ'ud )1/2 ＋0.2・Ｍtcd
        const MudriMdMudd = (Mud - ri * Md) / Mudd;
        if( MudriMdMudd > 0 ) {
          Mtud =(Mtu_min - 0.2 * Mtcd) * Math.pow(MudriMdMudd, 1 / 2) + 0.2 * Mtcd;
        }
      }
    } else {
      // (c) Ｍud ＜ Ｍ'ud かつ γi･Ｍd ≦ Ｍud の場合
      // Ｍtud	=	( Ｍtu.min-0.2･Ｍtcd )・( 1-γi･Ｍd／Ｍud )1/2 ＋0.2・Ｍtcd
      const riMdMud = 1 - (ri * Md) / Mud;
      if( riMdMud > 0 ) {
        Mtud = (Mtu_min - 0.2 * Mtcd) * Math.pow(riMdMud, 1 / 2) + 0.2 * Mtcd;
      }
    }
    result["Mtud3"] = Mtud;

    let Mtud_Ratio: number = 99.999;
    if( Mtud != 0 ) {
      Mtud_Ratio = (ri * Mt) / Mtud;
    }
    result["Mtud3_Ratio"] = Mtud_Ratio;
    result["Mtud3_Result"] = Mtud_Ratio > 1 ? "NG" : "OK"

    // ④ 設計せん断力が同時に作用する場合の設計ねじり耐力
    // Ｍtud	=	Ｍtu.min・( 1-γi･Ｖd／Ｖud )＋0.2・Ｍtcd・γi･Ｖd／Ｖud
    const Mtvd =
      Mtu_min * (1 - (ri * Vd) / Vud) + (0.2 * Mtcd * ri * Vd) / Vud;
    result["Mtud4"] = Mtvd;

    const Mtvd_Ratio: number = (ri * Mt) / Mtvd;
    result["Mtud4_Ratio"] = Mtvd_Ratio;
    result["Mtud4_Result"] = Mtvd_Ratio > 1 ? "NG" : "OK";

    // 計算結果
    result["Result"] = Math.max(Mtud_Ratio, Mtvd_Ratio) > 1 ? "NG" : "OK";

    return result;
  }
}

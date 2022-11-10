import { Injectable } from "@angular/core";
import { DataHelperModule } from "../providers/data-helper.module";
import { InputBarsService } from "../components/bars/bars.service";
import { InputSteelsService } from "../components/steels/steels.service";
import { SetPostDataService } from "./set-post-data.service";
import { InputDesignPointsService } from "../components/design-points/design-points.service";
import { InputMembersService } from "../components/members/members.service";
import { SetRectService } from "./shape-data/set-rect.service";
import { SetCircleService } from "./shape-data/set-circle.service";
import { SetHorizontalOvalService } from "./shape-data/set-horizontal-oval.service";
import { SetVerticalOvalService } from "./shape-data/set-vertical-oval.service";
import { SaveDataService } from "../providers/save-data.service";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class ResultDataService {
  constructor(
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private post: SetPostDataService,
    private helper: DataHelperModule,
    private circle: SetCircleService,
    private rect: SetRectService,
    private hOval: SetHorizontalOvalService,
    private vOval: SetVerticalOvalService,
    private translate: TranslateService) { }

  // 表題の共通した行
  public getTitleString(member: any, position: any, side: string): any {
    // 照査表における タイトル１行目を取得
    let strPos = "";
    if (this.helper.toNumber(position.position) !== null) {
      strPos = position.position.toFixed(3);
    }
    let title1: string = member.m_no.toFixed(0);
    if(!this.save.isManual()){
      const key: string = this.translate.instant("calculation.member");
      title1 += key;
    } else {
      title1 = "No" + title1;
    }
    if (member.m_len > 0) {
      title1 += "(" + strPos + ")";
    }

    // 照査表における タイトル２行目を取得
    const title2: string = position.p_name; // + side;

    // 照査表における タイトル３行目を取得
    const bar = this.bars.getCalcData(position.index);

    let title3: string = '';
    const key: string = this.translate.instant("calculation.tention");
    if (side === '上側引張') {
      title3 = bar.rebar1.title + key;
    } else {
      title3 = bar.rebar2.title + key;
    }

    return {
      title1,
      title2,
      title3,
    };
  }

  // value が null なら center 寄せ の -
  public alien(value: any, alien: string = "right"): any {
    let result: object;
    if (value === null) {
      result = { alien: "center", value: "-" };
    } else {
      result = { alien, value };
    }
    return result;
  }

  // 整数なら Fixed(0), 少数なら dim で指定した少数で丸める
  public numStr(dst: number, dim: number = 2): string {

    if (dst === null) {
      return null;
    }

    return dst.toFixed(Number.isInteger(dst) ? 0 : dim)
  }

  // 照査表における 断面の文字列を取得
  public getSteelStruct(target: string, res: any, safety: any): any {
    const section = this.getSection(target, res, safety);

    const steel: any = this.steel.getCalcData(res.index); // 鉄骨
    if (steel === null) {
      return section;
    }

    // 断面係数を追加
    let steel_A = 0;
    let steel_Ay = 0;
    let I = 0;
    const Zs_data = {
      Ic: {
        b: steel.I.lower_width,
        h: steel.I.lower_thickness,
        yi: steel.I.upper_thickness + steel.I.web_height + steel.I.lower_thickness / 2,
        A: null,
        Io: null,
      },
      Iw: {
        b: steel.I.web_thickness,
        h: steel.I.web_height,
        yi: steel.I.upper_thickness + steel.I.web_height / 2,
        A: null,
        Io: null,
      },
      It: {
        b: steel.I.upper_width,
        h: steel.I.upper_thickness,
        yi: steel.I.upper_thickness / 2,
        A: null,
        Io: null,
      },
      Hl: {
        b: steel.H.left_thickness,
        h: steel.H.left_width,
        yi: null,
        A: null,
        Io: null,
      },
      Hw: {
        b: steel.H.web_height,
        h: steel.H.web_thickness,
        yi: null,
        A: null,
        Io: null,
      },
      Hr: {
        b: steel.H.right_thickness,
        h: steel.H.right_width,
        yi: null,
        A: null,
        Io: null,
      },
      IH: {
        b: steel.I.web_thickness,
        h: steel.H.web_thickness,
        yi: null,
        A: null,
        Io: null,
      }
    }
    // H型鋼の中心位置を調整
    let yi: number = 0
    if (Zs_data.IH.b !== null) {
      if (steel.H.left_width >= steel.H.right_width) {
        yi = steel.H.left_cover - steel.I.upper_cover + steel.H.left_width / 2;
      } else {
        yi = steel.H.left_cover - steel.I.upper_cover + steel.H.right_width / 2;
      }
    } else {
      if (steel.H.left_width >= steel.H.right_width) {
        yi = steel.H.left_width / 2;
      } else {
        yi = steel.H.right_width / 2;
      }
    }
    Zs_data.Hl.yi = yi;
    Zs_data.Hw.yi = yi;
    Zs_data.Hr.yi = yi;
    Zs_data.IH.yi = yi;

    // 総断面積の算出
    for (let key of Object.keys(Zs_data)) {
      Zs_data[key].A = Zs_data[key].b * Zs_data[key].h;
      if (key !== 'IH') {
        steel_A += Zs_data[key].A;
        steel_Ay += Zs_data[key].A * Zs_data[key].yi;
      } else {
        steel_A -= Zs_data[key].A;
        steel_Ay -= Zs_data[key].A * Zs_data[key].yi;
      }
    }
    if (steel_A === 0) { return section };
    const ye = steel_Ay / steel_A;
    // 断面係数の算出
    for (let key of Object.keys(Zs_data)) {
      Zs_data[key].Io = (Zs_data[key].b * Zs_data[key].h ** 3) / 12;
      const Ayeyi = Zs_data[key].A * (ye - Zs_data[key].yi) ** 2;
      if (key !== 'IH') {
        I += (Zs_data[key].Io + Ayeyi);
      } else {
        I -= (Zs_data[key].Io + Ayeyi);
      }
    }
    const Zs = I / ye;
    section.steel["Zs"] = Zs;

    return section
  }

  public getSection(target: string, res: any, safety: any): any {

    const result = {
      member: null,
      shapeName: null,
      shape: {
        B: null,
        H: null,
        Bt: null,
        t: null,
        Bw: null, // 換算断面情報
        Hw: null, // 換算断面情報
        B_summary: null, // 総括表用
        H_summary: null,  // 総括表用
      },
      CFTFlag: false,
    };

    const index = res.index;
    const side = res.side;

    const position = this.points.getCalcData(index);

    // 部材情報
    const member = this.members.getCalcData(position.m_no);
    result.member = member;

    // 断面形状
    const shapeName = this.post.getShapeName(member, side);
    result.shapeName = shapeName;

    // 断面情報
    let section: any;
    switch (shapeName) {
      case 'Circle':            // 円形
        if (target === 'Md') {
          section = this.circle.getCircleShape(member, index, safety, {});
          result['Ast'] = this.getAst(section, safety, target);
          result.shape.H = section.H;
          result.shape.B = section.B;
          result.shape.Hw = section.Hw;
        } else {
          section = this.circle.getCircleVdShape(member, index, safety);
          result['Ast'] = this.getAstCircleVd(section, safety);
          result.shape.H = section.H;
          result.shape.B = section.B;
          result.shape.Hw = section.Hw;
          result.shape.Bw = section.Bw;
        }
        result.shape.B_summary = section.B_summary;
        result.shape.H_summary = section.H_summary;
        // CFTの判定用のフラグ
        if ('steel' in section) {
          result.CFTFlag = true;
        }
        break;

      case 'Ring':              // 円環
        if (target === 'Md') {
          section = this.circle.getRingShape(member, index, safety, {});
          result['Ast'] = this.getAst(section, safety, target);
        } else {
          result['Ast'] = this.getAstCircleVd(section, safety,);
          section = this.circle.getRingVdShape(member, index, safety);
        }
        result.shape.H = section.H;
        result.shape.B = section.B;
        result.shape.B_summary = section.B_summary;
        result.shape.H_summary = section.H_summary;
        break;

      case 'Rectangle':         // 矩形
        section = this.rect.getRectangleShape(member, target, index, side, safety, {});
        result['Ast'] = this.getAst(section, safety, target);
        result['Ase'] = this.getAse(section);
        if('side_cover' in section){
          result['side_cover'] = section.side_cover
        }
        result.shape.H = section.H;
        result.shape.B = section.B;
        break;

      case 'Tsection':          // T形
      case 'InvertedTsection':  // 逆T形
        section = this.rect.getTsectionShape(member, target, index, side, safety, {});
        result['Ast'] = this.getAst(section, safety, target);
        result['Ase'] = this.getAse(section);
        if('side_cover' in section){
          result['side_cover'] = section.side_cover
        }
        result.shape.H = section.H;
        result.shape.B = section.B;
        result.shape.Bt = section.Bt;
        result.shape.t = section.t;
        break;

      case 'HorizontalOval':    // 水平方向小判形
        section = this.hOval.getShape(member, index, side, safety, {});
        result['Ast'] = this.getAst(section, safety, target);
        result.shape.H = section.H;
        result.shape.B = section.B;
        result.shape.Bw = section.Bw;
        result.shape.B_summary = section.B_summary;
        result.shape.H_summary = section.H_summary;
        break;

      case 'VerticalOval':      // 鉛直方向小判形
        section = this.vOval.getShape(member, index, side, safety, {});
        result['Ast'] = this.getAst(section, safety, target);
        result.shape.H = section.H;
        result.shape.Hw = section.Hw;
        result.shape.B = section.B;
        result.shape.B_summary = section.B_summary;
        result.shape.H_summary = section.H_summary;
        break;

      default:
        throw ("断面形状：" + shapeName + " は適切ではありません。");
    }

    result['Asc'] = this.getAsc(section);
    result['Ase'] = this.getAse(section);

    result['steel'] = this.getSteel(section, safety, side, target);

    // せん断の場合 追加でパラメータを設定する
    if (target === 'Vd') {
      const vmuSection = this.getVmuSection(section, safety);
      for (const key of Object.keys(vmuSection)) {
        result[key] = vmuSection[key];
      }
    }

    return result;
  }

  // せん断照査表における 断面の文字列を取得
  private getVmuSection(section: any, safety: any): any {

    const result = {
      tan: (this.helper.toNumber(section.tan) !== null) ? this.helper.toNumber(section.tan) : 0,
      Aw: {   // スターラップ
        stirrup_dia: null,
        stirrup_n: null,

        Aw: null,
        AwString: null,
        deg: null,
        Ss: null,

        fwyd: null,
        fwud: null,
        rs: null,
      },
      Asb: {    // 折り曲げ鉄筋
        bending_dia: null,
        bending_n: null,

        Asb: null,
        AsbString: null,
        deg: null,
        Ss: null,

        fwyd: null,
        fwud: null,
        rs: null,
      }
    };

    // スターラップ -------------------------------------------------------------------------
    // 鉄筋径
    if (this.helper.toNumber(section.stirrup.stirrup_dia) != null) {
      result.Aw.stirrup_dia = Math.abs(section.stirrup.stirrup_dia);

      // 異形鉄筋:D, 丸鋼: R
      let mark1 = section.stirrup.stirrup_dia > 0 ? "D" : "R";

      // 鉄筋本数
      result.Aw.stirrup_n = this.helper.toNumber(section.stirrup.stirrup_n);
      if (result.Aw.stirrup_n === null) {
        result.Aw.stirrup_n = 0;
      }

      result.Aw.Ss = this.helper.toNumber(section.stirrup.stirrup_ss);
      if (result.Aw.Ss === null) {
        result.Aw.Ss = Number.MAX_VALUE;
      }

      const fwyd1 = this.helper.getFsyk(result.Aw.stirrup_dia, safety.material_bar, "stirrup");
      if (fwyd1.fsy === 235) {
        // 鉄筋強度が 235 なら 丸鋼
        mark1 = "R";
      }

      const dia1: string = mark1 + result.Aw.stirrup_dia;
      const As1: number = this.bars.getAs(dia1);

      result.Aw.Aw = As1 * result.Aw.stirrup_n;
      if (!(result.Aw.Aw === 0)) {
        const key: string = this.translate.instant("calculation.number");
        result.Aw.AwString = dia1 + "-" + this.numStr(result.Aw.stirrup_n, 3) + key;
      }

      result.Aw.fwyd = fwyd1.fsy;
      result.Aw.fwud = fwyd1.fsu;
      result.Aw.rs = safety.safety_factor.rs;
    }

    // 折り曲げ鉄筋 -------------------------------------------------------------------------
    // 鉄筋径
    if (this.helper.toNumber(section.bend.bending_dia) != null) {

      result.Asb.bending_dia = Math.abs(section.bend.bending_dia);

      // 異形鉄筋:D, 丸鋼: R
      let mark2 = section.bend.bending_dia > 0 ? "D" : "R";

      // 鉄筋本数
      result.Asb.bending_n = this.helper.toNumber(section.bend.bending_n);
      if (result.Asb.bending_n === null) {
        result.Asb.bending_n = 0;
      }

      result.Asb.Ss = this.helper.toNumber(section.bend.bending_ss);
      if (result.Asb.Ss === null) {
        result.Asb.Ss = Number.MAX_VALUE;
      }

      result.Asb.deg = this.helper.toNumber(section.bend.bending_angle);
      if (result.Asb.deg === null) {
        result.Asb.deg = 45;
      }

      const fwyd2 = this.helper.getFsyk(result.Asb.bending_dia, safety.material_bar, "stirrup");
      if (fwyd2.fsy === 235) {
        // 鉄筋強度が 235 なら 丸鋼
        mark2 = "R";
      }

      const dia2: string = mark2 + result.Asb.bending_dia;
      const As2: number = this.bars.getAs(dia2);

      result.Asb.Asb = As2 * result.Asb.bending_n;
      if (!(result.Asb.Asb === 0)) {
        const key: string = this.translate.instant("calculation.number");
        result.Asb.AsbString = dia2 + "-" + this.numStr(result.Asb.bending_n, 3) + key;
      }

      result.Asb.fwyd = fwyd2.fsy;
      result.Asb.fwud = fwyd2.fsu;
      result.Asb.rs = safety.safety_factor.rs;
    }

    return result;

  }

  private getAstCircleVd(section: any, safety: any): any {

    const result = {
      tension: null,
      Ast: null,
      AstString: null,
      dst: null,
      fsy: null,
      fsd: null,
      fsu: null,
      rs: null,
      Es: 200
    }

    if (!('tension' in section)) {
      result.rs = safety.safety_factor.rs;
      return result;
    }

    result.tension = section.tension;
    result.fsy = section.tension.fsy.fsy;
    result.fsu = section.tension.fsy.fsu;
    result.rs = section.tension.rs;
    result.fsd = Math.round(result.fsy / result.rs * 10) / 10;


    const mark = section.tension.mark === "R" ? "φ" : "D";
    const AstDia = mark + section.tension.rebar_dia;
    let rebar_n = section.tension.rebar_n;

    const Astx: number = this.bars.getAs(AstDia) * rebar_n * section.tension.cos;

    result.Ast = Astx;
    const key: string = this.translate.instant("calculation.number");
    result.AstString = AstDia + "-" + this.numStr(rebar_n, 3) + key;
    result.dst = section.tension.dsc;

    return result;

  }

  private getAst(section: any, safety: any, target: string): any {

    const result = {
      tension: null,
      Ast: null,
      AstString: null,
      dst: null,
      fsy: null,
      fsd: null,
      fsu: null,
      rs: null,
      Es: 200
    }

    if (!('tension' in section)) {
      return result;
    }

    result.tension = section.tension;
    result.fsy = section.tension.fsy.fsy;
    result.fsu = section.tension.fsy.fsu;
    if (target === 'Md') {
      result.rs = safety.safety_factor.M_rs;
    } else {
      result.rs = safety.safety_factor.V_rs;
    }

    result.fsd = Math.round(result.fsy / result.rs * 10) / 10;


    const mark = section.tension.mark === "R" ? "φ" : "D";
    const AstDia = mark + section.tension.rebar_dia;
    let rebar_n = section.tension.rebar_n;

    const Astx: number = this.bars.getAs(AstDia) * rebar_n * section.tension.cos;

    result.Ast = Astx;
    const key: string = this.translate.instant("calculation.number");
    result.AstString = AstDia + "-" + this.numStr(rebar_n, 3) + key;
    result.dst = this.helper.getBarCenterPosition(section.tension);

    return result;

  }

  private getAsc(section: any): any {

    const result = {
      compress: null,
      Asc: null,
      AscString: null,
      dsc: null,
    }

    if (!('compress' in section)) {
      return result;
    }

    result.compress = section.compress;

    const mark = section.compress.mark === "R" ? "φ" : "D";
    const AstDia = mark + section.compress.rebar_dia;
    let rebar_n = section.compress.rebar_n;

    const Astx: number = this.bars.getAs(AstDia) * rebar_n * section.compress.cos;

    result.Asc = Astx;
    const key: string = this.translate.instant("calculation.number");
    result.AscString = AstDia + "-" + this.numStr(rebar_n, 3) + key;
    result.dsc = this.helper.getBarCenterPosition(section.compress);

    return result;

  }

  private getAse(section: any): any {

    const result = {
      Ase: null,
      AseString: null,
      dse: null,
      de: null,
      sidebar: null
    }

    if (!('sidebar' in section)) {
      return result;
    }
    result.sidebar = section.sidebar;

    const mark = section.sidebar.mark === "R" ? "φ" : "D";
    const AstDia = mark + section.sidebar.side_dia;
    const rebar_n = section.sidebar.n;

    const Astx: number = this.bars.getAs(AstDia) * rebar_n;

    result.Ase = Astx;
    const key: string = this.translate.instant("calculation.number");
    result.AseString = AstDia + "-" + this.numStr(rebar_n, 3) + key;

    const cover = section.sidebar.cover;
    const cover2 = section.sidebar.cover2;
    const space = section.sidebar.space;

    result.dse = cover + (space * (rebar_n - 1)) / 2;
    result.de = cover2;
    return result;

  }

  private getSteel(section: any, safety: any, side: string, mark: string): any {

    const result = {
      I: {
        tension_flange: null,
        web: null,
        compress_flange: null,
        value: {},
        title: 'I',
      },
      H: {
        left_flange: null,
        web: null,
        right_flange: null,
        title: 'I',
      },
      fsy_tension: { fsy: null, fsd: null },
      fsy_Iweb: { fsy: null, fsd: null },
      fsy_compress: { fsy: null, fsd: null },
      fsy_left: { fsy: null, fsd: null },
      fsy_Hweb: { fsy: null, fsd: null },
      fsy_right: { fsy: null, fsd: null },
      rs: safety.safety_factor.S_rs,
      flag: false,
    }
    if (!('steel' in section)) {
      return result;
    }

    if ('I' in section.steel) {
      // 矩形の鉄骨
      this.getRectSteel(section, result, mark);
    } else {
      // 円形の鉄骨
      this.getCircleSteel(section, result, mark);
      // 円形鉄骨の仮想矩形の断面積が欲しい
    }


    return result
  }

  // 円形の鉄骨情報
  private getCircleSteel(section: any, result: any, mark: string): void {

    const thickness = this.helper.toNumber(section.steel.thickness);
    if (thickness === null) {
      return;
    }
    if (thickness === 0) {
      return;
    }

    result.flag = true;

    result.I.tension_flange = thickness;

    const fsy = this.helper.toNumber(section.steel.fsy.fsy);
    const rs = this.helper.toNumber(section.steel.rs);
    if (fsy !== null && rs !== null) {
      result.fsy_tension.fsy = fsy;
      result.fsy_tension.fsd = fsy / rs;
    }


    if (mark !== 'Vd') {
      return;
    }

    result['fsvy_Iweb'] = {
      fsvy: null,
      fvyd: null
    }
    const fvy = this.helper.toNumber(section.steel.fvy.fvy);
    if (fvy !== null && rs !== null) {
      result['fsvy_Iweb'] = {
        fsvy: fvy,
        fvyd: fvy / rs
      }
    }

    return result


  }

  // 矩形の鉄骨情報
  private getRectSteel(section: any, result: any, mark: string): void {

    // I配置鉄骨
    let target = section.steel.I;

    if (target.tension_thickness !== null && target.tension_width !== null) {
      result.I.tension_flange = target.tension_width.toString()
        + "×"
        + target.tension_thickness.toString();
      result.flag = true;
      result.I.value['widthT'] = target.tension_width;
      result.I.value['thicknessT'] = target.tension_thickness;
    }
    if (target.compress_thickness !== null && target.compress_width !== null) {
      result.I.compress_flange = target.compress_width.toString()
        + "×"
        + target.compress_thickness.toString();
      result.flag = true;
      result.I.value['widthC'] = target.compress_width;
      result.I.value['thicknessC'] = target.compress_thickness;
    }


    if (target.web_thickness !== null && target.web_height !== null) {
      result.I.web = target.web_height.toString()
        + "×"
        + target.web_thickness.toString();
      result.flag = true;
      result.I.value['heightW'] = target.web_height;
      result.I.value['thicknessW'] = target.web_thickness;
    }

    for (const key of ['fsy_tension', 'fsy_compress']) {
      if (target[key] !== null && target[key].fsy !== null) {
        result[key].fsy = target[key].fsy;
        result[key].fsd = target[key].fsy / result.rs;
      }
    }
    if (target.fsy_web !== null && target.fsy_web.fsy !== null) {
      result.fsy_Iweb.fsy = target.fsy_web.fsy;
      result.fsy_Iweb.fsd = target.fsy_web.fsy / result.rs;
    }


    // H配置鉄骨
    target = section.steel.H;
    if (target.left_thickness !== null && target.left_width !== null) {
      result.H.left_flange = target.left_width.toString()
        + "×"
        + target.left_thickness.toString();
      result.flag = true;
    }
    if (target.web_thickness !== null && target.web_height !== null) {
      result.H.web = target.web_height.toString()
        + "×"
        + target.web_thickness.toString();
      result.flag = true;
    }
    if (target.right_thickness !== null && target.right_width !== null) {
      result.H.right_flange = target.right_width.toString()
        + "×"
        + target.right_thickness.toString();
      result.flag = true;
    }

    for (const key of ['fsy_left', 'fsy_right']) {
      if (target[key] !== null && target[key].fsy !== null) {
        result[key].fsy = target[key].fsy;
        result[key].fsd = target[key].fsy / result.rs;
      }
    }
    if (target.fsy_web !== null && target.fsy_web.fsy !== null) {
      result.fsy_Hweb.fsy = target.fsy_web.fsy;
      result.fsy_Hweb.fsd = target.fsy_web.fsy / result.rs;
    }

    if (mark !== 'Vd') {
      return result
    }

    result['fsvy_Iweb'] = {
      fsvy: null,
      fvyd: null
    }
    if (section.steel.I.fvy_web !== null) {
      result['fsvy_Iweb'] = {
        fsvy: section.steel.I.fvy_web.fvy,
        fvyd: (section.steel.I.fvy_web.fvy === null) ? null :
          section.steel.I.fvy_web.fvy / result.rs
      }
    }

    result['fsvy_Hweb'] = {
      fsvy: null,
      fvyd: null
    }
    if (section.steel.H.fvy_web !== null) {
      result['fsvy_Hweb'] = {
        fsvy: section.steel.H.fvy_web.fvy,
        fvyd: (section.steel.H.fvy_web.fvy === null) ? null :
          section.steel.H.fvy_web.fvy / result.rs
      }
    }

    return result
  }

  // 断面積と断面係数
  public getStructuralVal(shapeName: string, member: any,
    target: string, index: number): any {

    const result = {};

    let shape: any;
    let h: number, b: number, bf: number, hf: number;
    let a1: number, a2: number, a3: number, a4: number, a5: number, a6: number;
    let x: number, e1: number, e2: number;
    let Area: number, circleArea: number, rectArea: number;

    switch (shapeName) {
      case 'Circle':            // 円形
        shape = this.circle.getSection(member);
        h = shape.H;
        result['A'] = Math.pow(h, 2) * Math.PI / 4;
        result['I'] = Math.pow(h, 4) * Math.PI / 64;
        result['eu'] = h / 2;
        result['el'] = h / 2;
        break;

      case 'Ring':              // 円環
        shape = this.circle.getSection(member);
        h = shape.H; // 外径
        b = shape.B; // 内径
        result['A'] = (Math.pow(h, 2) - Math.pow(b, 2)) * Math.PI / 4;
        result['I'] = (Math.pow(h, 4) - Math.pow(b, 4)) * Math.PI / 64;
        result['eu'] = h / 2;
        result['el'] = h / 2;
        break;

      case 'Rectangle':         // 矩形
        shape = this.rect.getSection(member, target, index);
        h = shape.H;
        b = shape.B;
        result['A'] = b * h;
        result['I'] = b * Math.pow(h, 3) / 12;
        result['eu'] = h / 2;
        result['el'] = h / 2;
        break;

      case 'Tsection':          // T形
        shape = this.rect.getTSection(member, target, index);
        h = shape.H;
        b = shape.B;
        bf = shape.Bt;
        hf = shape.t;
        x = bf - b;
        result['A'] = h * b + hf * x;
        a1 = b * Math.pow(h, 2) + x * Math.pow(hf, 2);
        a2 = 2 * (b * h + x * hf);
        e1 = a1 / a2;
        e2 = h - e1;
        result['eu'] = e1;
        result['el'] = e2;
        a3 = bf * Math.pow(hf, 3) / 12;
        a4 = bf * hf * Math.pow(e1 - hf / 2, 2);
        a5 = b * Math.pow(h - hf, 3) / 12;
        a6 = b * (h - hf) * Math.pow(e2 - (h - hf) / 2, 2);
        result['I'] = a3 + a4 + a5 + a6;


        break;


      case 'InvertedTsection':  // 逆T形
        shape = this.rect.getSection(member, target, index);
        h = shape.H;
        b = shape.B;
        bf = shape.Bt;
        hf = shape.t;
        x = bf - b;
        result['A'] = h * b + hf * x;
        a1 = b * Math.pow(h, 2) + x * Math.pow(hf, 2);
        a2 = 2 * (b * h + x * hf);
        e1 = a1 / a2;
        e2 = h - e1;
        result['eu'] = e2;
        result['el'] = e1;
        a3 = bf * Math.pow(hf, 3) / 12;
        a4 = bf * hf * Math.pow(e1 - hf / 2, 2);
        a5 = b * Math.pow(h - hf, 3) / 12;
        a6 = b * (h - hf) * Math.pow(e2 - (h - hf) / 2, 2);
        result['I'] = a3 + a4 + a5 + a6;


        break;

      case 'HorizontalOval':    // 水平方向小判形
        shape = this.hOval.getSection(member);
        h = shape.H;
        b = shape.B;
        circleArea = (h ** 2) * Math.PI / 4;
        rectArea = h * (b - h);
        Area = circleArea + rectArea;
        result['A'] = Area;
        result['I'] = (Math.pow(h, 4) * Math.PI / 64) + ((b - h) * Math.pow(h, 3) / 12);
        result['eu'] = h / 2;
        result['el'] = h / 2;
        break;

      case 'VerticalOval':      // 鉛直方向小判形
        shape = this.vOval.getSection(member);
        x = h - b;
        circleArea = (b ** 2) * Math.PI / 4;
        rectArea = b * x;
        Area = circleArea + rectArea;
        a1 = Math.PI * Math.pow(b, 4) / 64;
        a2 = x * Math.pow(b, 3) / 6;
        a3 = Math.PI * Math.pow(x, 2) * Math.pow(b, 2) / 16;
        a4 = b * Math.pow(x, 3) / 12;
        result['A'] = Area;
        result['I'] = a1 + a2 + a3 + a4;
        result['eu'] = h / 2;
        result['el'] = h / 2;

        break;

      default:
        throw ("断面形状：" + member.shape + " は適切ではありません。");
    }

    return result;
  }




}

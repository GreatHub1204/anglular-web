import { Injectable } from '@angular/core';
import { InputBarsService } from 'src/app/components/bars/bars.service';
import { InputSteelsService } from 'src/app/components/steels/steels.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { environment } from 'src/environments/environment';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class SetRectService {

  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) { }

  // 矩形断面の POST 用 データ作成
  public getRectangle(
    target: string, member: any, index: number,
    side: string, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getRectangleShape(member, target, index, side, safety, option)
    const h: number = shape.H;
    const b: number = shape.B;

    const section = {
      Height: h, // 断面高さ
      WTop: b,        // 断面幅（上辺）
      WBottom: b,     // 断面幅（底辺）
      ElasticID: 'c'  // 材料番号
    };
    result.Concretes.push(section);
    result['member'] = shape;

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計
    const result2 = this.getRectBar(shape, safety, side);
    for (const key of Object.keys(result2)) {
      result[key] = result2[key];
    }

    // 配筋が上下対象でなければ、symmetry = false
    const Bars = result['Bars'];
    let j = Bars.length - 1;
    grid_loop:
    for (let i = 0; i < Bars.length; i++) {
      const b1 = Bars[i];
      const b2 = Bars[j];
      const d1 = b1.Depth
      const d2 = section.Height - b2.Depth;
      if (d1 !== d2) {
        result.symmetry = false;
        break;
      }
      for (const key of ['i', 'n', 'ElasticID']) {
        if (d1[key] !== d2[key]) {
          result.symmetry = false;
          break grid_loop;
        }
      }
      j--;
    }
    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsection(
    target: string, member: any, index: number,
    side: string, safety: any, option: any): object {

    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
    };
    result.Concretes.push(section1);

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
    };
    result.Concretes.push(section2);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計
    const result2 = this.getRectBar(shape, safety, side);
    for (const key of Object.keys(result2)) {
      result[key] = result2[key];
    }

    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getInvertedTsection(
    target: string, member: any, index: number,
    side: string, safety: any, option: any): object {

    const result = { symmetry: false, Concretes: [], ConcreteElastic: [] };

    // 断面情報を集計
    const shape = this.getTsectionShape(member, target, index, side, safety, option);
    const h: number = shape.H;
    const b: number = shape.B;
    const bf: number = shape.Bt;
    const hf: number = shape.t;

    const section2 = {
      Height: h - hf,
      WTop: b,
      WBottom: b,
      ElasticID: 'c'
    };
    result.Concretes.push(section2);

    const section1 = {
      Height: hf,
      WTop: bf,
      WBottom: bf,
      ElasticID: 'c'
    };
    result.Concretes.push(section1);

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋情報を集計
    const result2 = this.getRectBar(shape, safety, side);
    for (const key of Object.keys(result2)) {
      result[key] = result2[key];
    }

    return result;
  }

  public getSection(member: any, target: string, index: number) {

    const result = {
      H: null,
      B: null,
      Bt: null,
      t: null,
      tan: null,
      member:null,
    };

    const bar: any = this.bars.getCalcData(index);
    const haunch: number = (target === 'Md') ? bar.haunch_M : bar.haunch_V;

    let h: number = this.helper.toNumber(member.H);
    if (this.helper.toNumber(haunch) !== null) {
      h += haunch * 1;
    }
    result.H = h;

    const b = this.helper.toNumber(member.B);
    result.B = b;

    if (h === null || b === null) {
      throw ('形状の入力が正しくありません');
    }

    result.tan = bar.tan;

    return result
  }

  public getTSection(member: any, target: string, index: number) {

    const result = this.getSection(member, target, index);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result
  }

  // 断面の幅と高さ（フランジ幅と高さ）を取得する
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getRectangleShape(
    member: any, target: string, index: number,
    side: string, safety: any, option: any): any {

    const result = this.getSection(member, target, index);

    const bar: any = this.bars.getCalcData(index); // 鉄筋
    const stl: any = this.steel.getCalcData(index); // 鉄骨

    let tension: any;
    let compress: any;
    switch (side) {
      case "上側引張":
        tension = this.helper.rebarInfo(bar.rebar1);
        compress = this.helper.rebarInfo(bar.rebar2);
        break;
      case "下側引張":
        tension = this.helper.rebarInfo(bar.rebar2);
        compress = this.helper.rebarInfo(bar.rebar1);
        break;
    }
    if (tension !== null) {
      if (tension.rebar_ss === null) {
        tension.rebar_ss = result.B / tension.line;
      }
      if ('barCenterPosition' in option) {
        if (option.barCenterPosition) {
          // 多段配筋を１段に
          tension.dsc = this.helper.getBarCenterPosition(tension, 1);
          tension.line = tension.rebar_n;
          tension.n = 1;
        }
      }

      // tension
      const fsyt = this.helper.getFsyk(
        tension.rebar_dia,
        safety.material_bar,
        "tensionBar"
      );
      if (fsyt.fsy === 235) tension.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
      tension['fsy'] = fsyt;

      if('M_rs' in safety.safety_factor){
        tension['rs'] = safety.safety_factor.M_rs;
      } else if('V_rs' in safety.safety_factor){
        tension['rs'] = safety.safety_factor.V_rs;
      }

      // 登録
      result['tension'] = tension;
    }

      // compres
    if (safety.safety_factor.range >= 2 && compress !== null) {
      const fsyc = this.helper.getFsyk(
        compress.rebar_dia,
        safety.material_bar,
        "tensionBar"
      );
      if (fsyc.fsy === 235) compress.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
      compress['fsy'] = fsyc;

      if('M_rs' in safety.safety_factor){
        compress['rs'] = safety.safety_factor.M_rs;
      } else if('V_rs' in safety.safety_factor){
        compress['rs'] = safety.safety_factor.V_rs;
      }

      result['compress'] = compress;
    }

    // sidebar
    if (safety.safety_factor.range >= 3) {
      if (compress === null) { compress = { dsc: 0 } }
      const sidebar: any = this.helper.sideInfo(bar.sidebar1,bar.sidebar2, tension.dsc, compress.dsc, result.H);
      if (sidebar !== null) {
        const fsye = this.helper.getFsyk(
          sidebar.rebar_dia,
          safety.material_bar,
          "sidebar"
        );
        if (fsye.fsy === 235) sidebar.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
        sidebar['fsy'] = fsye;

        if('M_rs' in safety.safety_factor){
          sidebar['rs'] = safety.safety_factor.M_rs;
        } else if('V_rs' in safety.safety_factor){
          sidebar['rs'] = safety.safety_factor.V_rs;
        }

        result['sidebar'] = sidebar;
      }
    }
    // ねじり用側面かぶり
    const side_cover: number = this.helper.toNumber(bar.sidebar2.side_cover);
    if(side_cover !== null){
      result['side_cover'] = side_cover;
    }
    //
    result['stirrup'] = bar.stirrup;
    result['bend'] = bar.bend;

    // steel
    const steel = {
      I: {
        position: null,
        tension_thickness: null,
        tension_width: null,
        compress_thickness: null,
        compress_width: null,
        web_thickness: null,
        web_height: null,
        fsy_tension: null,
        fsy_web: null,
        fsy_compress: null,
        fvy_web: null // せん断強度
      },
      H: {
        position: null,
        left_thickness: null,
        left_width: null,
        right_thickness: null,
        right_width: null,
        web_thickness: null,
        web_height: null,
        fsy_left: null,
        fsy_web: null,
        fsy_right: null,
        fvy_web: null,
      },
      rs: null
    };

    if(stl !== null){

      steel.rs = safety.safety_factor.S_rs;

      // 横向き
      for (const key of ['left', 'right']) {
        const key1 = key + '_thickness';
        const key2 = key + '_width';

        const thickness = stl.H[key1];
        steel.H[key1] = thickness;
        steel.H[key2] = stl.H[key2];

        steel.H['fsy_' + key] = this.helper.getFsyk2(
          thickness,
          safety.material_steel,
        );
      }
      steel.H.web_thickness = stl.H.web_thickness;
      steel.H.web_height = stl.H.web_height;
      steel.H.fsy_web = this.helper.getFsyk2(
        steel.H.web_thickness,
        safety.material_steel,
      );


      // 縦向きのH鋼
      switch (side) {
        case "上側引張":

          steel.I.tension_thickness = stl.I.upper_thickness;
          steel.I.tension_width = stl.I.upper_width;
          steel.I.compress_thickness = stl.I.lower_thickness;
          steel.I.compress_width = stl.I.lower_width;

          const I_Height = stl.I.upper_thickness + stl.I.web_height + stl.I.lower_thickness;
          steel.I.position = result.H - (stl.I.upper_cover + I_Height);

          let H_Height = 0;
          if (stl.H.left_width !== null) {
            H_Height = stl.H.left_width;
          }
          if (stl.H.right_width !== null) {
            H_Height = Math.max(H_Height, stl.H.right_width);
          }
          if (H_Height !== 0) {
            steel.H.position = result.H - (stl.H.left_cover + H_Height);
          }

          steel.I.fsy_tension = this.helper.getFsyk2(
            stl.I.upper_thickness,
            safety.material_steel,
          );
          steel.I.fsy_compress = this.helper.getFsyk2(
            stl.I.lower_thickness,
            safety.material_steel,
          );
          break;

        case "下側引張":
          steel.I.tension_thickness = stl.I.lower_thickness;
          steel.I.tension_width = stl.I.lower_width;
          steel.I.compress_thickness = stl.I.upper_thickness;
          steel.I.compress_width = stl.I.upper_width;

          steel.I.position = stl.I.upper_cover;

          steel.H.position = stl.H.left_cover;

          steel.I.fsy_tension = this.helper.getFsyk2(
            stl.I.lower_thickness,
            safety.material_steel,
          );
          steel.I.fsy_compress = this.helper.getFsyk2(
            stl.I.upper_thickness,
            safety.material_steel,
          );
          break;
      }
      steel.I.web_thickness = stl.I.web_thickness;
      steel.I.web_height = stl.I.web_height;
      steel.I.fsy_web = this.helper.getFsyk2(
        steel.I.web_thickness,
        safety.material_steel,
      );


      // web のせん断強度
      for (const key of ['I', 'H']) {
        steel[key].fvy_web = this.helper.getFsyk2(
          stl[key].web_thickness,
          safety.material_steel,
          'fvy'
        );
      }
    }

    result['steel'] = steel;


    return result;
  }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getTsectionShape(
    member: any, target: string, index: number,
    side: string, safety: any, option: any): any {

    const result = this.getRectangleShape(member, target, index, side, safety, option);

    let bf = this.helper.toNumber(member.Bt);
    let hf = this.helper.toNumber(member.t);
    if (bf === null) { bf = result.B; }
    if (hf === null) { hf = result.H; }
    result['Bt'] = bf;
    result['t'] = hf;

    return result;
  }

  // 矩形、Ｔ形断面の 鉄筋のPOST用 データを登録する。
  private getRectBar(section: any, safety: any, side: string): any {

    const result = {
      Bars: new Array(),
      Steels: new Array(),
      SteelElastic: new Array(),
    };

    const h: number = section.H; // ハンチを含む高さ
    const tension: any = section.tension;

    const tensionBar = this.getCompresBar(tension, safety);
    const tensionBarList = tensionBar.Bars;
    // 有効な入力がなかった場合は null を返す.
    if (tensionBarList.length < 1) {
      return null;
    }

    // 鉄筋強度の入力
    for (const elastic of tensionBar.SteelElastic) {
      if (result.SteelElastic.find(
        (e) => e.ElasticID === elastic.ElasticID) == null) {
        result.SteelElastic.push(elastic);
      }
    }

    // 圧縮鉄筋 をセットする
    let compresBarList: any[] = new Array();
    if ('compress' in section) {
      const compress: any = section.compress;
      const compresBar = this.getCompresBar(compress, safety);
      compresBarList = compresBar.Bars;

      // 鉄筋強度の入力
      for (const elastic of compresBar.SteelElastic) {
        if (result.SteelElastic.find(
          (e) => e.ElasticID === elastic.ElasticID) == null) {
          result.SteelElastic.push(elastic);
        }
      }
    }

    // 側方鉄筋 をセットする
    let sideBarList = new Array();
    if ('sidebar' in section) {
      const sideInfo: any = section.sidebar;
      const sideBar = this.getSideBar(
        sideInfo,
        safety
      );
      sideBarList = sideBar.Bars;
      // 鉄筋強度の入力
      for (const elastic of sideBar.SteelElastic) {
        result.SteelElastic.push(elastic);
      }
    }

    // 鉄筋の登録 --------------------------------------- 
    let index = 1;
    // 圧縮鉄筋の登録
    for (const Asc of compresBarList) {
      Asc.n = Asc.n;
      Asc.Depth = Asc.Depth;
      Asc['index'] = index++;
      result.Bars.push(Asc);
    }

    // 側面鉄筋の登録
    for (const Ase of sideBarList) {
      Ase.n = Ase.n;
      Ase['index'] = index++;
      result.Bars.push(Ase);
    }

    // 引張鉄筋の登録
    for (const Ast of tensionBarList) {
      Ast.n = Ast.n;
      Ast.Depth = h - Ast.Depth;
      Ast.IsTensionBar = true;
      Ast['index'] = index++;
      result.Bars.push(Ast);
    }

    // 鉄骨の登録 --------------------------------------- 
    const steel = this.getSteel(section, side);
    for (const key of Object.keys(steel)) {
      for (const value of steel[key]) {
        result[key].push(value);
      }
    }

    return result;
  }

  // 矩形、Ｔ形断面における 上側（圧縮側）の 鉄筋情報を生成する関数
  private getCompresBar(barInfo: any, safety: any): any {
    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    // 鉄筋強度の入力
    const rs = barInfo.rs;

    const fsy = barInfo.fsy;
    const id = "t" + fsy.id;

    result.SteelElastic.push({
      fsk: fsy.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    // 鉄筋径
    const dia: string = barInfo.mark + barInfo.rebar_dia;

    // 鉄筋情報を登録
    let rebar_n = barInfo.rebar_n;
    const dsc = barInfo.dsc / barInfo.cos;
    const space = barInfo.space / barInfo.cos;
    for (let i = 0; i < barInfo.n; i++) {
      const dst: number = dsc + i * space;
      const Steel1 = {
        Depth: dst,
        i: dia,
        n: Math.min(barInfo.line, rebar_n * barInfo.cos),
        IsTensionBar: false,
        ElasticID: id,
      };
      result.Bars.push(Steel1);
      rebar_n = rebar_n - barInfo.line;
    }

    return result;
  }

  // 矩形、Ｔ形断面における 側面鉄筋 の 鉄筋情報を生成する関数
  private getSideBar(barInfo: any, safety: any): any {

    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    if (barInfo === null) {
      return result; // 側方鉄筋の入力が無い場合
    }

    // 鉄筋強度
    const fsy1 = barInfo.fsy;
    const id = "s" + fsy1.id;

    // 鉄筋径
    let dia: string = barInfo.mark + barInfo.side_dia;

    // 鉄筋情報を登録
    for (let i = 0; i < barInfo.n; i++) {
      const Steel1 = {
        Depth: barInfo.cover + i * barInfo.space,
        i: dia,
        n: barInfo.line,
        IsTensionBar: false,
        ElasticID: id,
      };
      result.Bars.push(Steel1);
    }

    // 鉄筋強度の入力
    const rs = barInfo.rs;

    result.SteelElastic.push({
      fsk: fsy1.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    return result;
  }

  // 矩形、Ｔ形断面における 鉄骨情報を生成する関数
  private getSteel(section: any, side: string): any {
    const result = {
      Steels: new Array(),
      SteelElastic: new Array(),
    };

    let defaultID = 'st';

    // I 鉄骨の入力 ---------------------------------------------------
    const I: any = {
      UpperT: section.steel.I.compress_thickness,
      UpperW: section.steel.I.compress_width,
      BottomT: section.steel.I.tension_thickness,
      BottomW: section.steel.I.tension_width,
      WebT: section.steel.I.web_thickness,
      WebH: section.steel.I.web_height,
    }

    let I_flag = false;
    for (const key of Object.keys(I)) {
      const value = this.helper.toNumber(I[key]);
      if (value === null) {
        I[key] = 0;
      } else {
        I_flag = true;
      }
    }
    if (I_flag === true) {
      I['Df'] = this.helper.toNumber(section.steel.I.position);
      if (I['Df'] === null) {
        I['Df'] = 0;
      }

      const sectionI = [];

      // かぶり部分
      if (I.Df > 0) {
        // 最初の1つめ の鉄骨材料を登録する
        for(const fsy of [section.steel.I.fsy_tension.fsy, section.steel.I.fsy_compress.fsy, section.steel.I.fsy_web.fsy,
                          section.steel.H.fsy_left.fsy, section.steel.H.fsy_right.fsy,section.steel.H.fsy_web.fsy ]){
          if (this.helper.toNumber(fsy) !== null) {
            result.SteelElastic.push({
              ElasticID: defaultID,
              Es: 200,
              fsk: section.steel.I.fsy_tension.fsy,
              rs: section.steel.rs
            });
            break;
          }
        }
        sectionI.push({
          Height: I.Df,  // 断面高さ
          WTop: 0,        // 断面幅（上辺）
          WBottom: 0,     // 断面幅（底辺）
          ElasticID: defaultID // 材料番号
        })
      }

      // 圧縮側フランジ
      if(result.SteelElastic.length === 0) defaultID = 'sc';
      if (I.UpperT > 0) {
        const fsk = section.steel.I.fsy_compress.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.UpperT,  // 断面高さ
          WTop: I.UpperW,        // 断面幅（上辺）
          WBottom: I.UpperW,     // 断面幅（底辺）
          ElasticID
        })
      }

      // 腹板
      if(result.SteelElastic.length === 0) defaultID = 'sw';
      if (I.WebH > 0) {
        const fsk = section.steel.I.fsy_web.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.WebH,  // 断面高さ
          WTop: I.WebT,        // 断面幅（上辺）
          WBottom: I.WebT,     // 断面幅（底辺）
          ElasticID: ElasticID // 材料番号
        })
      }

      // 引張側フランジ
      if(result.SteelElastic.length === 0) defaultID = 'st';
      if (I.BottomT > 0) {
        const fsk = section.steel.I.fsy_tension.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        sectionI.push({
          Height: I.BottomT,  // 断面高さ
          WTop: I.BottomW,        // 断面幅（上辺）
          WBottom: I.BottomW,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })

      }

      result.Steels.push(sectionI);
    }

    // H 鉄骨の入力 ---------------------------------------------------
    const H: any = {
      LeftT: section.steel.H.left_thickness,
      LeftW: section.steel.H.left_width,
      RightT: section.steel.H.right_thickness,
      RightW: section.steel.H.right_width,
      WebT: section.steel.H.web_thickness,
      WebH: section.steel.H.web_height - I.WebT,
    }
    let H_flag = false;

    for (const key of Object.keys(H)) {
      const value = this.helper.toNumber(H[key]);
      if (value === null) {
        H[key] = 0;
      } else {
        H_flag = true;
      }
    }
    if (H_flag === true) {
      const Df = this.helper.toNumber(section.steel.H.position);
      if (Df === null) {
        H['LeftDf'] = 0;
        H['RightDf'] = 0;
      } else {
        H['LeftDf'] = Df;
        H['RightDf'] = Df;
      }
      const sectionHeight = section.H; // 断面高さ

      if (H.LeftW > H.RightW) {
        H.RightDf += (H.LeftW - H.RightW) / 2;
        H.WebDf = H.RightDf + (H.RightW - H.WebT) / 2;
      } else {
        H.LeftDf += (H.RightW - H.LeftW) / 2;
        H.WebDf = H.LeftDf + (H.LeftW - H.WebT) / 2;
      }
      if (side === "上側引張") {
        H.WebDf = sectionHeight - H.WebDf;
      }

      // H 鉄骨の左側フランジ ---------------------------------------------------
      if(result.SteelElastic.length === 0) defaultID = 'sl';
      const HsectionLeft = [];
      if (H.LeftT > 0) {
        // かぶり部分
        if (H.LeftDf > 0) {
          HsectionLeft.push({
            Height: H.LeftDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_left.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: defaultID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 左フランジ
        HsectionLeft.push({
          Height: H.LeftW,  // 断面高さ
          WTop: H.LeftT,        // 断面幅（上辺）
          WBottom: H.LeftT,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionLeft);
      }
      // H 鉄骨の右側フランジ ---------------------------------------------------
      if(result.SteelElastic.length === 0) defaultID = 'sr';
      const HsectionRight = [];
      if (H.RightT > 0) {
        // かぶり部分
        if (H.RightDf > 0) {
          HsectionRight.push({
            Height: H.RightDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_right.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // 右フランジ
        HsectionRight.push({
          Height: H.RightW,  // 断面高さ
          WTop: H.RightT,        // 断面幅（上辺）
          WBottom: H.RightT,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionRight);
      }
      // H 鉄骨のウェブ ----------------------------------------------------------
      if(result.SteelElastic.length === 0) defaultID = 'sw';
      const HsectionWeb = [];
      if (H.WebT > 0) {
        // かぶり部分
        if (H.WebDf > 0) {
          HsectionWeb.push({
            Height: H.WebDf,  // 断面高さ
            WTop: 0,        // 断面幅（上辺）
            WBottom: 0,     // 断面幅（底辺）
            ElasticID: defaultID // 材料番号
          })
        }
        // 材料
        const fsk = section.steel.H.fsy_web.fsy;
        const e = result.SteelElastic.find(v => v.fsk === fsk);
        let ElasticID = defaultID;
        if (e == null) {
          result.SteelElastic.push({
            ElasticID: ElasticID,
            Es: 200,
            fsk: fsk,
            rs: section.steel.rs
          });
        } else {
          ElasticID = e.ElasticID;
        }
        // ウェブ
        HsectionWeb.push({
          Height: H.WebT,  // 断面高さ
          WTop: H.WebH,        // 断面幅（上辺）
          WBottom: H.WebH,     // 断面幅（底辺）
          ElasticID, // 材料番号
          IsTensionBar: true
        })
        result.Steels.push(HsectionWeb);
      }
    }
    return result;

  }


}

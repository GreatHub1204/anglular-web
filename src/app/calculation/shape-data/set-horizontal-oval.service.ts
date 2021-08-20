import { Injectable } from '@angular/core';
import { InputBarsService } from 'src/app/components/bars/bars.service';
import { InputSteelsService } from 'src/app/components/steels/steels.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class SetHorizontalOvalService {

  constructor(
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) { }

  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getHorizontalOval(member: any, index: number,side: string, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic:[] };

    const RCOUNT = 100;

    // 断面情報を集計
    const section = this.getShape(member, index, side, safety, option);
    const h: number = section.H;
    const b: number = section.B;

    const steps = 180 / RCOUNT;

    let olddeg = 0;
    for (let deg = steps; Math.round(deg * 10) / 10 <= 180; deg += steps) {
      const section = {
        Height: (Math.cos(this.helper.Radians(olddeg)) - Math.cos(this.helper.Radians(deg))) * h / 2, // 断面高さ
        WTop: b - h + Math.sin(this.helper.Radians(olddeg)) * h, // 断面幅（上辺）
        WBottom: b - h + Math.sin(this.helper.Radians(deg)) * h, // 断面幅（底辺
        ElasticID: 'c'                                    // 材料番号
      };
      result.Concretes.push(section);
      olddeg = deg;
    }

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    // 鉄筋
    const result2 = this.getHorizontalOvalBar(section, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    return result;
  }

  // 断面の幅と高さを取得する
  public getShape(member: any, index: number, side: string, safety: any, option: any): any {

    const result = this.getSection(member)

    const bar: any = this.bars.getCalcData(index);
  
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
    if(tension === null){
      throw("引張鉄筋情報がありません");
    }
    if(tension.rebar_ss === null){
      tension.rebar_ss = (result.B - result.H) / tension.line;
    }
    if( 'barCenterPosition' in option ){
      if(option.barCenterPosition){
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
    if (fsyt.fsy === 235)  tension.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
    tension['fsy'] = fsyt;
    tension['rs'] = safety.safety_factor.rs;;
    
    // 登録
    result['tension'] = tension;

    // compres
    if (safety.safety_factor.range >= 2) {
      if(compress !== null){
        const fsyc = this.helper.getFsyk(
          compress.rebar_dia,
          safety.material_bar,
          "tensionBar"
        );
        if (fsyc.fsy === 235) compress.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
        compress['fsy'] = fsyc;
        compress['rs'] = safety.safety_factor.rs;
        result['compress'] = compress;
      }
    }
    if (compress === null) {
      compress = tension;
      result['compress'] = tension;
    }

    // sidebar
    if (safety.safety_factor.range >= 3) {
      const sidebar: any = this.helper.sideInfo(bar.sidebar, tension.dsc, compress.dsc, result.H);
      if(sidebar !== null){
        const fsye = this.helper.getFsyk(
          sidebar.rebar_dia,
          safety.material_bar,
          "sidebar"
        );
        if (fsye.fsy === 235) sidebar.mark = "R"; // 鉄筋強度が 235 なら 丸鋼
        sidebar['fsy'] = fsye;
        sidebar['rs'] = safety.safety_factor.rs;
        result['sidebar'] = sidebar;
      }
    }

    result['stirrup'] = bar.stirrup;
    result['bend'] = bar.bend;

    /*/ steel --------------------------- 小判形は鉄骨に対応しない
    const stl = this.steel.getCalcData(index);
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
    let side = '上側引張'; // ← 仮 上側、下側区別する場合はここに
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

    result['steel'] = steel;
    */
    return result;

  }

  
  public getSection(member){
    
    const result = {
      H: null,
      B: null,
      Bw: null
    };

    let h: number = this.helper.toNumber(member.H);
    result.H = h;

    const b = this.helper.toNumber(member.B);
    result.B = b;

    if (h === null || b === null) {
      throw('形状の入力が正しくありません');
    }

    //小判型の断面積Sと簡略化した矩形断面の幅Bw
    const S = (Math.PI * (h/2)**2) / 2 + h*(b - h) + (Math.PI * (h/2)**2) / 2;
    const Bw = S / h;
    result.Bw = Bw

    return result
  }


  private getHorizontalOvalBar(section: any, safety: any ): any {
    const result = {
      Bars: new Array(),
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
      if (
        result.SteelElastic.find((e) => e.ElasticID === elastic.ElasticID) ===
        undefined
      ) {
        result.SteelElastic.push(elastic);
      }
    }

    // 圧縮鉄筋 をセットする
    let compresBarList: any[] = new Array();
    let sideBarList = new Array();
    if ('compress' in section) {
      const compress: any = section.compress;
      const compresBar = this.getCompresBar(compress, safety);
      compresBarList = compresBar.Bars;

      // 鉄筋強度の入力
      for (const elastic of compresBar.SteelElastic) {
        if (
          result.SteelElastic.find((e) => e.ElasticID === elastic.ElasticID) ===
          undefined
        ) {
          result.SteelElastic.push(elastic);
        }
      }

      // 側方鉄筋 をセットする
      let sideBar: any;
      if ('sidebar' in section) {
        const sideInfo: any = section.sidebar;
        sideBar = this.getSideBar(
          sideInfo,
          safety,
          tension,
          compress,
          h
        );
        sideBarList = sideBar.Bars;
        // 鉄筋強度の入力
        for (const elastic of sideBar.SteelElastic) {
          result.SteelElastic.push(elastic);
        }
      }   
    }

    // 圧縮鉄筋の登録
    for (const Asc of compresBarList) {
      Asc.n = Asc.n;
      Asc.Depth = Asc.Depth;
      result.Bars.push(Asc);
    }

    // 側面鉄筋の登録
    for (const Ase of sideBarList) {
      Ase.n = Ase.n;
      result.Bars.push(Ase);
    }

    // 引張鉄筋の登録
    // let cosAst: number = tension.cos;

    for (const Ast of tensionBarList) {
      Ast.n = Ast.n;// * cosAst;
      Ast.Depth = h - Ast.Depth;// / cosAst;
      Ast.IsTensionBar = true;
      result.Bars.push(Ast);
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
    let dia: string = barInfo.mark + barInfo.rebar_dia;

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

  private getSideBar(
    barInfo: any, safety: any, tensionBar: any, compresBar: any, height: number ): any {
    
    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    // 鉄筋径の入力が ない場合は スキップ
    if (barInfo.side_dia === null) {
      return new Array();
    }
    // 鉄筋段数
    const n = barInfo.n;
    if (n === 0) {
      return new Array(); // 鉄筋段数の入力が 0 の場合は スキップ
    }

    // 主鉄筋のかぶり
    let dst = tensionBar.dsc;
    let dsc = compresBar.dsc;

    // 鉄筋配置直径
    const Rt: number = height - (dst + dsc);

    // 鉄筋配置弧の長さ
    const arcLength: number = (Rt * Math.PI) / 2;

    // 側方鉄筋スタート位置
    /*let dse = barInfo.cover;
    if (this.helper.toNumber(dse) === null) {
      dse = arcLength / (n + 1);
    }*/

    // 鉄筋間隔
    /*let space = barInfo.space;
    if (this.helper.toNumber(space) === null) {
      space = arcLength / (n + 1);
    }*/

    // 弧の長さより長くなってしまった場合は調整する
    /*if (dse + space * n > arcLength) {
      space = (arcLength - dse * 2) / (n - 1);
    }*/

    // 1段当りの本数
    const line = 2;

    // 鉄筋強度
    const fsy = barInfo.fsy;
    const id = "s" + fsy.id;
    // 鉄筋強度の入力
    const rs = safety.safety_factor.rs;

    // 鉄筋径
    let dia: string = barInfo.mark + barInfo.side_dia;

    // 鉄筋情報を登録
    /*const start_deg: number = (360 * dse) / (Math.PI * Rt); // 鉄筋配置開始角度
    const steps_deg: number = (360 * space) / (Math.PI * Rt); // 鉄筋配置角度
    const end_deg: number = start_deg + steps_deg * (n - 1); // 鉄筋配置終了角度*/
    const steps_deg: number = 180 / (barInfo.n + 1); // 鉄筋配置角度
    const start_deg: number = steps_deg;  // 鉄筋配置開始角度
    const end_deg: number = steps_deg * barInfo.n; // 鉄筋配置終了角度
    for (let deg = start_deg; deg <= end_deg; deg += steps_deg) {

      //const dt = Rt / 2 - (Math.cos(this.helper.Radians(deg)) * Rt) / 2 + dsc;
      const dt = height / 2 - Rt / 2 * Math.cos(this.helper.Radians(deg))

      const Steel1 = {
        Depth: dt,
        i: dia,
        n: line,
        IsTensionBar: false,
        ElasticID: id,
      };
      result.Bars.push(Steel1);

    }

    result.SteelElastic.push({
      fsk: fsy.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    return result;
  }

}

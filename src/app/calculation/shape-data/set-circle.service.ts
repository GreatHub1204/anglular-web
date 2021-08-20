import { Injectable } from '@angular/core';
import { retry } from 'rxjs/operators';
import { InputBarsService } from 'src/app/components/bars/bars.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputSteelsService } from 'src/app/components/steels/steels.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class SetCircleService {

  constructor(
    private basic: InputBasicInformationService,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private helper: DataHelperModule
  ) { }

  // 円形断面の POST 用 データ作成
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }  
  public getCircle(member: any, index: number, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic:[] };

    const RCOUNT = 100;

    // 断面情報を集計
    const section = this.getCircleShape(member, index, safety, option);
    const h = section.H;

    const x1: number = h / RCOUNT;
    let b1 = 0;
    for (let i = 1; i <= RCOUNT; i++) {
      const x2: number = x1 * i;
      const b2: number = this.getCircleWidth(h, x2);
      result.Concretes.push({
        Height: x1,     // 断面高さ
        WTop: b1,       // 断面幅（上辺）
        WBottom: b2,    // 断面幅（底辺）
        ElasticID: 'c'  // 材料番号
      });
      b1 = b2;
    }

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    const result2 = this.getCircleBar(section, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    return result;
  }

  // 円環断面の POST 用 データ作成
  public getRing(member: any, index: number, safety: any, option: any): any {

    const result = { symmetry: true, Concretes: [], ConcreteElastic:[] };

    const RCOUNT = 100;

    // 断面情報を集計
    const section = this.getRingShape(member, index, safety, option);
    let h: number = section.H; // 外径
    let b: number = section.B; // 内径
    const x1: number = h / RCOUNT;
    const x3: number = (h - b) / 2;

    let b1 = 0;
    let b3 = 0;
    for (let i = 1; i <= RCOUNT; i++) {
      const x2 = x1 * i;
      const x4 = x2 - x3;
      const b2 = this.getCircleWidth(h, x2);
      let b4: number;
      if (x2 < x3) {
        b4 = 0;
      } else if (x2 > x3 + b) {
        b4 = 0;
      } else {
        b4 = this.getCircleWidth(b, x4);
      }

      result.Concretes.push({
        Height: x1,       // 断面高さ
        WTop: b1 - b3,    // 断面幅（上辺）
        WBottom: b2 - b4, // 断面幅（底辺）
        ElasticID: 'c'    // 材料番号
      });
      b1 = b2;
      b3 = b4;
    }

    result.ConcreteElastic.push(this.helper.getConcreteElastic(safety));

    const result2 = this.getCircleBar(section, safety);
    for(const key of Object.keys(result2)){
      result[key] = result2[key];
    }

    return result;
  }

  // 円形の 鉄筋のPOST用 データを登録する。
  private getCircleBar(section: any, safety: any ): any {

    const result = {
      Bars: new Array(),
      SteelElastic: new Array(),
    };

    // 鉄筋配置
    const h: number = section.H;
    const tension = section.tension;
    const fsy = section.tension.fsy;
    const id = "s" + fsy.id;

    // 鉄筋の位置
    result.Bars = this.getBars(tension, h, id);
    // 基準となる 鉄筋強度
    const rs = section.tension.rs;

    // 鉄筋強度の入力
    result.SteelElastic.push({
      fsk: fsy.fsy / rs,
      Es: 200,
      ElasticID: id,
    });

    return result;
  }

  private getBars(tension: any, h: number, id: string){

    const Bars = [];

    const dia: string = tension.mark + tension.rebar_dia;
    let _rebar_n: number = tension.rebar_n;
    let _line: number = this.helper.toNumber(tension.line);
    if(_line === null){
      _line = tension.rebar_n;
    }

    let index = 1;
    for (let i = 0; i < tension.n; i++) {
      const Depth = tension.dsc + i * tension.space;
      const Rt: number = h - Depth * 2; // 鉄筋直径
      const num = (_rebar_n > _line) ? _line : _rebar_n; // 鉄筋本数
      const steps: number = 360 / num; // 鉄筋角度間隔
      //設計条件「円形断面で鉄筋を頂点に1本配置する」と鉄筋本数を条件に分岐、真上を0°として計算
      const target_condition = this.basic.conditions_list.find(element => element['id'] === 'JR-003');
      const bar_start_point = ((num % 2 === 0) === target_condition['selected']) ? 0: steps / 2;

      for (let j = 0; j < num; j++) {
        const deg = j * steps + bar_start_point;
        const dst = Rt / 2 - (Math.cos(this.helper.Radians(deg)) * Rt) / 2 + Depth;
        if( deg === 135 || deg === 225){
          // ちょうど 45° 半分引張鉄筋
          for(const tensionBar of [true, false]){
            Bars.push({
              Depth: dst, // 深さ位置
              i: dia, // 鋼材
              n: 0.5, // 鋼材の本数
              IsTensionBar: tensionBar, // 鋼材の引張降伏着目Flag
              ElasticID: id, // 材料番号
              index: index++
            });      
          }
        } else {
          const tensionBar: boolean = deg >= 135 && deg <= 225 ? true : false;
          Bars.push({
            Depth: dst, // 深さ位置
            i: dia, // 鋼材
            n: 1, // 鋼材の本数
            IsTensionBar: tensionBar, // 鋼材の引張降伏着目Flag
            ElasticID: id, // 材料番号
            index: index++
          });
        }
      }

      _rebar_n -= _line;
    }

    return Bars
  }

  // 断面情報を集計
  public getCircleShape(member: any, index: number, safety: any, option: any){

    const result = this.getSection(member);
    
    const bar = this.bars.getCalcData(index);

    const tension = this.helper.rebarInfo(bar.rebar1);
    if(tension === null){
      throw ("引張鉄筋情報がありません");
    }
    if(tension.rebar_ss === null || tension.rebar_ss === 0){
      const D = result.H - tension.dsc * 2;
      tension.rebar_ss = D / tension.line;
    }
    if( 'barCenterPosition' in option ){
      if(option.barCenterPosition){
        // 多段配筋を１段に
        tension.dsc = this.helper.getBarCenterPosition(tension, 1);
        tension.line = tension.rebar_n;
        tension.n = 1;
      }
    }

    const fsy = this.helper.getFsyk(
      tension.rebar_dia,
      safety.material_bar,
      "tensionBar"
    );
    tension['fsy'] = fsy;
    tension['rs'] = safety.safety_factor.rs;;

    // 鉄筋径
    if (fsy.fsy === 235) {
      // 鉄筋強度が 235 なら 丸鋼
      tension.mark = "R";
    }
    result['tension'] = tension;
    result['stirrup'] = bar.stirrup;
    result['bend'] = bar.bend;

    /*/ steel --------------------------- 円形は鉄骨に対応しない
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

  // 断面情報を集計
  public getCircleVdShape(member: any, index: number, safety: any){

    const result = {};

    // 円形としての情報を取得
    const section = this.getCircleShape(member, index, safety, {});
    for(const key of Object.keys(section)){
      result[key] = section[key]
    }

    // 換算矩形
    const Area = Math.pow(section.H, 2) * Math.PI / 4;
    const h = Math.sqrt(Area);
    result['H'] = h;
    result['B'] = h;

    // 換算矩形としての鉄筋位置
    const tension = section.tension;
    const Bars = this.getBars(tension, section.H, null);
    let d = 0.0, n = 0;
    for(const s of Bars){
      if(s.IsTensionBar === true){ 
        //=135°～225°の範囲にある鉄筋
        d += s.Depth * s.n;
        n += s.n;
      }
    }
    const dh = (section.H - h)/2;
    const dsc = d / n;
    tension.dsc = h - dsc + dh;
    tension.rebar_n = n;

    return result;
  }


  // 円環断面情報を集計
  // option: {
  //  barCenterPosition: 多段配筋の鉄筋を重心位置に全ての鉄筋があるものとす
  // }
  public getRingShape(member: any, index: number, safety: any, option: any): any{

    const result = {};

    // 円形としての情報を取得
    const section = this.getCircleShape(member, index, safety, option);
    for(const key of Object.keys(section)){
      result[key] = section[key]
    }

    return result;
  }

  public getSection(member: any): any{
    
    const result = {};

    let H = this.helper.toNumber(member.H);
    if (H === null) {
      H = this.helper.toNumber(member.B);
    }
    if (H === null) {
      throw('円形の径の入力が正しくありません');
    }
    result['H'] = H; // 外径
    result['B'] = this.helper.toNumber(member.B); // 内径

    //換算した断面の1辺の長さ
    if (this.helper.toNumber(member.H) === null || this.helper.toNumber(member.B) === null) {
      result['Hw'] = Math.sqrt(Math.PI * (H / 2)**2);
      result['Bw'] = null;
    } else {
      result['Hw'] = ( (-1-Math.PI/4)*H**2 + 2*H*result['B'] - (1-Math.PI/4)*result['B']**2)/(2*result['B'] - 2*H);
      result['Bw'] = result['Hw'] - result['H'] + result['B'];
    }

    return result;
  }

  // 円環断面情報を集計
  public getRingVdShape(member: any, index: number, safety: any){

    const result = {};

    // 円環としての情報を取得
    const section = this.getRingShape(member, index, safety, {});
    for(const key of Object.keys(section)){
      result[key] = section[key]
    }

    // 換算矩形
    let h = section.H;
    let b = section.B;
    const Area1 = Math.pow(h, 2) * Math.PI / 4;
    const Area2 = Area1 - (b ** 2) * Math.PI / 4;
    result['H'] = Math.sqrt(Area1),
    result['B'] = h - Math.sqrt((h ** 2) - Area2)

    // 換算矩形としての鉄筋位置
    const tension = section.tension;
    const Bars = this.getBars(tension, section.H, null);
    let d = 0.0, n = 0;
    for(const s of Bars){
      if(s.IsTensionBar === true){
        d += s.Depth;
        n += s.n;
      }
    }
    const dsc = h - (d / n);
    tension.dsc = dsc;

    return result;

  }

  // 円の頂部からの距離を指定してその円の幅を返す
  private getCircleWidth(R: number, positionFromVertex: number): number {

    const a = R / 2;
    const x = positionFromVertex;

    const c = Math.sqrt((a ** 2) - ((a - x) ** 2));

    return Math.abs(2 * c);

  }


}

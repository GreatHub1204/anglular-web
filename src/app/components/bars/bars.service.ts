import { Injectable } from '@angular/core';
import { DataHelperModule } from '../../providers/data-helper.module';
import { InputDesignPointsService } from '../design-points/design-points.service';
import { InputBasicInformationService } from '../basic-information/basic-information.service';

@Injectable({
  providedIn: 'root'
})
export class InputBarsService {

  // 鉄筋情報
  private bar_list: any[];
  private jp_rebar_List: any[];
  private ph_rebar_List: any[];

  constructor(
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private basic: InputBasicInformationService) {
      this.jp_rebar_List = [
        { 'D': 10, 'As': 71.33 },
        { 'D': 13, 'As': 126.7 },
        { 'D': 16, 'As': 198.6 },
        { 'D': 19, 'As': 286.5 },
        { 'D': 22, 'As': 387.1 },
        { 'D': 25, 'As': 506.7 },
        { 'D': 29, 'As': 642.4 },
        { 'D': 32, 'As': 794.2 },
        { 'D': 35, 'As': 956.6 },
        { 'D': 38, 'As': 1140 },
        { 'D': 41, 'As': 1340 },
        { 'D': 51, 'As': 2027 }
      ];
      this.ph_rebar_List = [
        { 'D': 10, 'As': 78.54 },
        { 'D': 12, 'As': 113.10 },
        { 'D': 16, 'As': 201.06 },
        { 'D': 20, 'As': 314.16 },
        { 'D': 25, 'As': 490.88 },
        { 'D': 28, 'As': 615.75 },
        { 'D': 32, 'As': 804.25 },
        { 'D': 36, 'As': 1017.88 },
        { 'D': 40, 'As': 1256.64 },
        { 'D': 50, 'As': 1963.50 }
      ];
      this.clear();
  }

  public clear(): void {
    this.bar_list = new Array();
  }

  public get rebar_List(): any[] {
    const speci1 = this.basic.get_specification1();
    if(speci1 == 1){
      return this.ph_rebar_List;
    }
    return this.jp_rebar_List;
  }
    // 鉄筋の公称断面積を含む情報
    public getRebar(Dia: number): any {
      const result = this.rebar_List.find( (value) => {
        return value.D === Dia;
      });
      return result;
    }
  
    // 次に太い鉄筋
    public getNextRebar(Dia: any): any {
      let result = undefined;
      const d: number = this.helper.toNumber(Dia);
      if (d === null) { return undefined };
      for (let i = 0; i < this.rebar_List.length - 1; i++){
        if (d === this.rebar_List[i].D) {
          result = this.rebar_List[i + 1];
          break;
        }
      }
      return result;
    }
  
    // 次に細い鉄筋
    public getPreviousRebar(Dia: any): any {
      let result = undefined;
      const d: number = this.helper.toNumber(Dia);
      if (d === null) { return undefined };
      for (let i = 1; i < this.rebar_List.length; i++) {
        if (d === this.rebar_List[i].D) {
          result = this.rebar_List[i - 1];
          break;
        }
      }
      return result;
    }

      // 鉄筋の断面積
  public getAs(strAs: string): number {
    let result: number = 0;
    if (strAs.indexOf("φ") >= 0) {
      const fai: number = this.helper.toNumber(strAs.replace("φ", ""));
      if (fai === null) {
        return 0;
      }
      result = (fai ** 2 * Math.PI) / 4;
    } else if (strAs.indexOf("R") >= 0) {
      const fai: number = this.helper.toNumber(strAs.replace("R", ""));
      if (fai === null) {
        return 0;
      }
      result = (fai ** 2 * Math.PI) / 4;
    } else if (strAs.indexOf("D") >= 0) {
      const fai: number = this.helper.toNumber(strAs.replace("D", ""));
      if (fai === null) {
        return 0;
      }
      let reverInfo = this.rebar_List.find((value) => {
        return value.D === fai;
      });
      if (reverInfo === undefined) {
        return 0;
      }
      result = reverInfo.As;
    } else {
      result = this.helper.toNumber(strAs);
      if (result === null) {
        return 0;
      }
    }
    return result;
  }


  // 鉄筋情報
  private default_bars(id: number): any {
    const result = this.default(id);
    result['m_no'] = null;
    result['position'] = null;
    result['g_name'] = null;
    result['p_name'] = null;
    result['b'] = null;
    result['h'] = null;
    return result;
  }

  private default(id: number): any {
    return {
      index: id,
      haunch_M: null,
      haunch_V: null,
      rebar1: this.default_rebar('上側'),
      rebar2: this.default_rebar('下側'),
      sidebar1: this.default_sidebar(),
      sidebar2: this.default_sidebar(),
      stirrup: this.default_stirrup(),
      bend: this.default_bend(),
      tan: null
    };
  }

  private default_rebar(title: string): any {
    return {
      title: title,
      rebar_dia: null,
      rebar_n: null,
      rebar_cover: null,
      rebar_lines: null,
      rebar_space: null,
      rebar_ss: null,
      cos: null,
      enable: true
    };
  }

  private default_sidebar(): any {
    return {
      side_dia: null,
      side_n: null,
      side_cover: null,
      side_ss: null
    };
  }

  private default_stirrup(): any {
    return {
      stirrup_dia: null,
      stirrup_n: null,
      stirrup_ss: null
    };
  }

  private default_bend(): any {
    return {
      bending_dia: null,
      bending_n: null,
      bending_ss: null,
      bending_angle: null
    };
  }

  public getTableColumns(): any[] {

    const table_datas: any[] = new Array();

    // グリッド用データの作成
    const groupe_list = this.points.getGroupeList();
    for (let i = 0; i < groupe_list.length; i++) {
      const table_groupe = [];
      // 部材
      for (const member of groupe_list[i]) {
        // 着目点
        let count = 0;
        for (let k = 0; k < member.positions.length; k++) {
          const pos = member.positions[k];
          if (!this.points.isEnable(pos)) {
            continue;
          }
          
          // barデータに（部材、着目点など）足りない情報を追加する
          const data: any = this.getTableColumn(pos.index);
          data.m_no = member.m_no;
          data.b = member.B;
          data.h = member.H;
          data.position = pos.position;
          data.g_name = pos.g_name;
          data.p_name = pos.p_name;

          if("sidebar" in data){
            data["sidebar1"] = data["sidebar"]; 
          }

          // データを2行に分ける
          const column1 = {};
          const column2 = {};
          column1['m_no'] = (count === 0) ? data.m_no : ''; // 最初の行には 部材番号を表示する
          // 1行目
          column1['index'] = data.index;
          const a: number = this.helper.toNumber(data.position);
          column1['position'] = (a === null) ? '' : a.toFixed(3);
          column1['g_name'] = data['g_name'];
          column1['p_name'] = data['p_name'];
          column1['bh'] = data['b'];
          column1['haunch_height'] = data['haunch_M'];

          column1['design_point_id'] = data['rebar1'].title;
          column1['rebar_dia'] = data['rebar1'].rebar_dia;
          column1['rebar_n'] = data['rebar1'].rebar_n;
          column1['rebar_cover'] = data['rebar1'].rebar_cover;
          column1['rebar_lines'] = data['rebar1'].rebar_lines;
          column1['rebar_space'] = data['rebar1'].rebar_space;
          column1['rebar_ss'] = data['rebar1'].rebar_ss;
          column1['cos'] = data['rebar1'].cos;
          column1['enable'] = data['rebar1'].enable;

          column1['side_dia'] = data['sidebar1'].side_dia;
          column1['side_n'] = data['sidebar1'].side_n;
          column1['side_cover'] = data['sidebar1'].side_cover;
          column1['side_ss'] = data['sidebar1'].side_ss;

          column1['stirrup_dia'] = data['stirrup'].stirrup_dia;
          column1['stirrup_n'] = data['stirrup'].stirrup_n;
          column1['stirrup_ss'] = data['stirrup'].stirrup_ss;

          column1['tan'] = data['tan'];

          column1['bending_dia'] = data['bend'].bending_dia;
          column1['bending_n'] = data['bend'].bending_n;
          column1['bending_ss'] = data['bend'].bending_ss;
          column1['bending_angle'] = data['bend'].bending_angle;

          table_groupe.push(column1);

          // 2行目
          column2['bh'] = data['h'];
          column2['haunch_height'] = data['haunch_V'];

          column2['design_point_id'] = data['rebar2'].title;
          column2['rebar_dia'] = data['rebar2'].rebar_dia;
          column2['rebar_n'] = data['rebar2'].rebar_n;
          column2['rebar_cover'] = data['rebar2'].rebar_cover;
          column2['rebar_lines'] = data['rebar2'].rebar_lines;
          column2['rebar_space'] = data['rebar2'].rebar_space;
          column2['rebar_ss'] = data['rebar2'].rebar_ss;
          column2['cos'] = data['rebar2'].cos;
          column2['enable'] = data['rebar2'].enable;
          if("sidebar2" in data){ 
            column2['side_cover'] = data['sidebar2'].side_cover;
          }

          table_groupe.push(column2);
          count++;
        }
      }
      table_datas.push(table_groupe);
    }

    
    return table_datas;
  }

  public getTableColumn(index: any): any {

    let result = this.bar_list.find((value) => value.index === index);
    if (result === undefined) {
      result = this.default_bars(index);
      this.bar_list.push(result);
    }
    return result;
  }

  public getCalcData(index: any): any {

    let result = null;

    const bar_list = JSON.parse(
      JSON.stringify({
        temp: this.bar_list,
      })
    ).temp;

    const positions = this.points.getSameGroupePoints(index);
    const start = positions.findIndex(v => v.index === index);

    for (let ip = start; ip >= 0; ip--) {
      const pos = positions[ip];
      if (!this.points.isEnable(pos)) {
        continue; // 計算対象ではなければスキップ
      }
      // barデータに（部材、着目点など）足りない情報を追加する
      const data: any = bar_list.find((v) => v.index === pos.index);
      if (data === undefined) {
        continue;
      }
      if (result === null) {
        // 当該入力行 の情報を入手
        result = this.default(index);
        for (const key of Object.keys(result)) {
          if (['rebar1', 'rebar2', 'sidebar1', 'sidebar2', 'stirrup', 'bend'].includes(key)) {
            for (const k of Object.keys(result[key])) {
              if (k in data[key]) {
                result[key][k] = data[key][k];
              }
            }
          } else {
            result[key] = data[key];
          }
        }
      }
      // 当該入力行より上の行
      let endFlg = true;
      for (const key of ['rebar1', 'rebar2', 'sidebar1', 'sidebar2', 'stirrup']) {
        const rebar = data[key];
        const re = result[key];
        for (const k of Object.keys(re)) {
          if (k === 'cos' || k === 'enable' || k === 'title') continue;
          if (re[k] === null && k in rebar) {
            re[k] = this.helper.toNumber(rebar[k]);
            endFlg = false; // まだ終わらない
          }
        }
      }
      if (endFlg === true) {
        // 全ての値に有効な数値(null以外)が格納されたら終了する
        break;
      }
    }

    return result;
  }


  public setTableColumns(table_datas: any[]) {

    this.bar_list = new Array();

    for (let i = 0; i < table_datas.length; i += 2) {
      const column1 = table_datas[i];
      const column2 = table_datas[i + 1];

      const b = this.default_bars(column1.index);
      b.g_name = column1.g_name;
      b.position = column1.position;
      b.m_no = column1.m_no;
      b.p_name = column1.p_name;
      b.b = column1.bh;
      b.h = column2.bh;
      b.haunch_M = column1.haunch_height;
      b.haunch_V = column2.haunch_height;

      b.rebar1.title = column1.design_point_id;
      b.rebar1.rebar_dia = column1.rebar_dia;
      b.rebar1.rebar_n = column1.rebar_n;
      b.rebar1.rebar_cover = column1.rebar_cover;
      b.rebar1.rebar_lines = column1.rebar_lines;
      b.rebar1.rebar_space = column1.rebar_space;
      b.rebar1.rebar_ss = column1.rebar_ss;
      b.rebar1.cos = column1.cos;
      b.rebar1.enable = column1.enable;

      b.rebar2.title = column2.design_point_id;
      b.rebar2.rebar_dia = column2.rebar_dia;
      b.rebar2.rebar_n = column2.rebar_n;
      b.rebar2.rebar_cover = column2.rebar_cover;
      b.rebar2.rebar_lines = column2.rebar_lines;
      b.rebar2.rebar_space = column2.rebar_space;
      b.rebar2.rebar_ss = column2.rebar_ss;
      b.rebar2.cos = column2.cos;
      b.rebar2.enable = column2.enable;

      b.sidebar1.side_dia = column1.side_dia;
      b.sidebar1.side_n = column1.side_n;
      b.sidebar1.side_cover = column1.side_cover;
      b.sidebar1.side_ss = column1.side_ss;

      b.sidebar2.side_cover = column2.side_cover;

      b.stirrup.stirrup_dia = column1.stirrup_dia;
      b.stirrup.stirrup_n = column1.stirrup_n;
      b.stirrup.stirrup_ss = column1.stirrup_ss;

      b.bend.bending_dia = column1.bending_dia;
      b.bend.bending_n = column1.bending_n;
      b.bend.bending_ss = column1.bending_ss;
      b.bend.bending_angle = column1.bending_angle;

      b.tan = column1.tan;

      for (const key1 of Object.keys(b)) {
        const value1 = b[key1];
        if (['rebar1', 'rebar2', 'sidebar1', 'sidebar2', 'stirrup', 'bend'].includes(key1)) {
          for (const key2 of Object.keys(value1)) {
            const value2 = value1[key2];
            if (value2 === undefined) {
              value1[key2] = null;
            }
          }
        } else if (value1 === undefined) {
          b[key1] = null;
        }
      }
      this.bar_list.push(b);
    }
  }

  public setPickUpData() {

  }

  public getSaveData(): any[] {
    return this.bar_list;
  }

  public setSaveData(bar: any) {
    this.bar_list = bar;
  }

  public getGroupeName(i: number): string {
    return this.points.getGroupeName(i);
  }

  public matchBarSize(dia: any): number {

    let result: number = null;
    const temp = this.helper.toNumber(dia);
    for (const d of this.rebar_List) {
      if (d.D === temp) {
        result = temp;
        break;
      }
    }
    return result;
  }

}

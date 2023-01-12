import { newArray } from "@angular/compiler/src/util";
import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputDesignPointsService } from "../design-points/design-points.service";

@Injectable({
  providedIn: "root",
})
export class InputCrackSettingsService {


  // 部材情報
  public crack_list: any[];

  constructor(
    private helper: DataHelperModule,
    private points: InputDesignPointsService) {
    this.clear();
  }
  public clear(): void {
    this.crack_list = new Array();
  }

  // ひび割れ情報
  public default_crack(id: number): any {
    return {
      index: id,
      m_no: null,
      g_name: null,
      p_name: null,
      con_u: null,
      con_l: null,
      con_s: null,
      vis_u: false,
      vis_l: false,
      ecsd_u: null,
      ecsd_l: null,
      kr: null,
      k4: null,
      JRTT05: false, // 縁応力度が制限値以内の場合でもひび割れ幅を計算するフラグ
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
          data.m_no = (count === 0) ? member.m_no: ''; // 最初の行には 部材番号を表示する
          data.b = member.B;
          data.h = member.H;
          data.position = pos.position;
          data.g_name = pos.g_name;
          data.p_name = pos.p_name;
          data.g_id = member.g_id;

          table_groupe.push(data);
          count++;
        }
      }
      table_datas.push(table_groupe);
    }
    return table_datas;
  }

  public getTableColumn(index: any): any {

    let result = this.crack_list.find((value) => value.index === index);
    if (result == null) {
      result = this.default_crack(index);
      this.crack_list.push(result);
    }
    return result;
  }

  public getCalcData(index: number): any{

    // indexに対応する行を探す
    let target = this.crack_list.find((value) => value.index === index);
    if(target == undefined){
      target = this.default_crack(index);
    }
    // リターンするデータ(result)をクローンで生成する
    const result = JSON.parse(
      JSON.stringify({
        temp: target,
      })
    ).temp;

    // データ(result)を書き換える
    for (let ip = result.index; ip >= 0; ip--) { 

      const data = this.crack_list.find((value) => value.index === ip);
      if(data == undefined){
        continue;
      }
      // 当該入力行より上の行
      let endFlg = true;
      const check_list = ['con_l', 'con_s', 'con_u', 'ecsd_u', 'ecsd_l', 'kr', 'k4', 'JRTT05'];
      for (const key of check_list){
        if (result[key] == null && key in data) {
          result[key] = this.helper.toNumber(data[key]);
          endFlg = false; // まだ終わらない
        }
      }
      if( endFlg === true){
        // 全ての値に有効な数値(null以外)が格納されたら終了する
        break;
      }

    }
    return result;
  }

  public setTableColumns(table_datas: any[]) {

    this.crack_list = new Array();

    for (const column of table_datas) {
      const b = this.default_crack(column.index);
      b.m_no =   column.m_no;
      b.g_name = column.g_name;
      b.p_name = column.p_name;
      b.con_u =  column.con_u;
      b.con_l =  column.con_l;
      b.con_s =  column.con_s;
      b.vis_u =  column.vis_u;
      b.vis_l =  column.vis_l;
      b.ecsd_u = column.ecsd_u;
      b.ecsd_l = column.ecsd_l;
      b.kr =     column.kr;
      b.k4 =     column.k4;
      b.JRTT05 = column.JRTT05;
      this.crack_list.push(b);
    }
  }

  public setPickUpData() {

  }

  public getSaveData(): any[] {
    return this.crack_list;
  }

  public setSaveData(crack: any) {
    ////////// 情報追加による調整コード //////////
    for (const value of crack) {
      if (value.ecsd_u == null && value.ecsd_l == null) {
        if (value.ecsd !== null) {
          value['ecsd_u'] = value.ecsd;
          value['ecsd_l'] = value.ecsd;
        } else {
          value['ecsd_u'] = null;
          value['ecsd_l'] = null;
        }
        delete value['ecsd'];
      }
      if (value.k4 == undefined) {
        let flag: boolean = true;
        for (const key of ['con_l', 'con_s', 'con_u', 'ecsd_u', 'ecsd_l', 'kr', 'JRTT05']) {
          if (value[key] === null || value[key] == null) {
            flag = false;
            break;
          }
        }
        if (flag) {
          value['k4'] = 0.85;
        }
      }
    }
    //////////          //////////
    this.crack_list = crack;
  }

  public getGroupeName(i: number): string {
    return this.points.getGroupeName(i);
  }

}

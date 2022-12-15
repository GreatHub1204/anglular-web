import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputDesignPointsService } from '../design-points/design-points.service';

@Injectable({
  providedIn: 'root'
})
export class ShearStrengthService {

  
  // 部材情報
  public shear_list: any[];

  constructor(
    private helper: DataHelperModule,
    private points: InputDesignPointsService) {
    this.clear();
  }
  public clear(): void {
    this.shear_list = new Array();
  }

  // せん断耐力情報
  public default_shear(id: number): any {
    return {
      index: id,
      m_no: null,
      g_name: null,
      p_name: null,
      La: null,
      fixed_end: null
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

    let result = this.shear_list.find((value) => value.index === index);
    if (result == null) {
      result = this.default_shear(index);
      this.shear_list.push(result);
    }
    return result;
  }

  public getCalcData(index: number): any{

    // indexに対応する行を探す
    let target = this.shear_list.find((value) => value.index === index);
    if(target == undefined){
      target = this.default_shear(index);
    }
    // リターンするデータ(result)をクローンで生成する
    const result = JSON.parse(
      JSON.stringify({
        temp: target,
      })
    ).temp;

    // データ(result)を書き換える
    for (let ip = result.index; ip >= 0; ip--) {
      const data = this.shear_list.find((value) => value.index === ip);
      if(data == undefined){
        continue;
      }
      // 当該入力行より上の行
      let endFlg = true;
      const shear_list = ['La', 'fixed_end'];
      for (const key of shear_list){
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

    this.shear_list = new Array();

    for (const column of table_datas) {
      const b = this.default_shear(column.index);
      b.m_no =      column.m_no;
      b.g_name =    column.g_name;
      b.p_name =    column.p_name;
      b.La =        column.La;
      b.fixed_end = column.fixed_end;
      this.shear_list.push(b);
    }
  }

  public setPickUpData() {

  }

  public getSaveData(): any[] {
    return this.shear_list;
  }

  public setSaveData(shear: any) {

    this.clear();
    for(const data of shear){
      const tmp = this.default_shear(data.index);
      for(const key of Object.keys(tmp)){
        if(key in data){
          tmp[key] = data[key];
        }
      }
      this.shear_list.push(tmp);
    }
  }

  public getGroupeName(i: number): string {
    return this.points.getGroupeName(i);
  }

}

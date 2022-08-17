import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { InputMembersService } from '../members/members.service';

@Injectable({
  providedIn: 'root'
})
export class InputDesignPointsService {

  // 着目点情報
  private position_list: any[];
  // { index, m_no, p_id, position, p_name, isMyCalc, isVyCalc, isMzCalc, isVzCalc, isMtCalc, La },

  constructor(
    private members: InputMembersService) {
    this.clear();
  }

  public clear(): void {
    // 部材, 着目点 入力画面に関する初期化
    this.position_list = new Array();
  }

  public getTableColumn(index: number): any {
    let result = this.getCalcData(index);

    if(result == null){
      result = this.default_position(index);
      this.position_list.push(result);
    }

    return result;
  }

  public getCalcData(index: number): any {
    return this.position_list.find((value)=> value.index === index);
  }

  public getSaveData(): any[] {
    return this.position_list;
  }

  public setSaveData(points: any): void{

    this.clear();
    for(const data of points){
      const tmp = this.default_position(data.index);
      for(const key of Object.keys(tmp)){
        if(key in data){
          tmp[key] = data[key];
        }
      }
      this.position_list.push(tmp);
    }
  }
  
  public setTableColumns(points: any): void{

    for(const data of points){
      const tmp = this.default_position(data.index);
      const i = this.position_list.findIndex((value) => value.index === data.index);
      if( i >= 0 ){
        const pos = this.position_list[i];
        for(const key of Object.keys(tmp)){
          if(key in pos){
            tmp[key] = pos[key];
          }
        }
      }
      for(const key of Object.keys(tmp)){
        if(key in data){
          tmp[key] = data[key];
        }
      }
      if( i >= 0 ){
        this.position_list[i] = tmp;
      } else {
        this.position_list.push(tmp);
      }
    }
  }

  public getTableColumns(isManual = false): any[] {

    const table_datas: any[] = new Array();

    // グリッド用データの作成
    for( const groupe of this.getGroupeList(isManual)){
      const columns = [];
      for ( const member of groupe) {
        const position = member.positions;
        if (position.length === 0) {
          // マニュアルモードでしかここにこないハズ
          // position が 0行 だったら 空のデータを1行追加する
          const column = this.default_position(member.m_no);
          column.m_no = member.m_no;
          column.g_name = member.g_name;
          columns.push(column);
        } else {
          // index を振りなおす
          for (const column of member.positions){
            // column.index = index;
            columns.push(column);
          }
        }
      }
      table_datas.push(columns)
    }

    return table_datas;
  }

  // グループ別 部材情報
  //  [{m_no, m_len, g_no, g_id, g_name, shape, B, H, Bt, t,
  //   positions:[
  //    { index, m_no, g_name, position, p_name, isMyCalc, isVyCalc, isMzCalc, isVzCalc, isMtCalc, La },
  //    ...
  //   }, ...
  public getGroupeList(isManual = false): any[] {

    const groupe_list: any[] = this.members.getGroupeList();

    for(const groupe of groupe_list) {

      for ( const member of groupe) {
        member['positions'] = new Array();

        // 同じ要素番号のものを探す
        let position: any[] = this.position_list.filter(
          item => item.m_no === member.m_no );

        // マニュアルモードの場合 部材番号＝インデックス で見つかる場合がある
        if(position.length === 0 && isManual){
          position = this.position_list.filter(
            item => item.index === member.m_no );
            for(const pos of position){
              pos.m_no = member.m_no;
              member.positions.push(pos);
            }
        } else {
          // 対象データが無かった時に処理
          for(const pos of position){
            member.positions.push(pos);
          }
        }

      }

    }

    return JSON.parse(
      JSON.stringify({
        temp: groupe_list
      })
    ).temp;

  }

  // 同じグループの着目点リストを取得する
  public getSameGroupePoints(index: number): any[] {

    const result = []

    const target = this.getCalcData(index);
    for(const m of this.members.getSameGroupeMembers(target.m_no)){
      for(const p of this.position_list.filter(v=>v.m_no === m.m_no)){
        result.push(p)
      }
  }

    return result;
  }

  public getGroupeName(i: number): string {
    return this.members.getGroupeName(i);
  }

  // 着目点情報
  public default_position(id: number): any {
    return {
      index: id,
      m_no: null,
      position: null,
      p_name: null,
      p_id: null,
      isMyCalc: false,
      isVyCalc: false,
      isMzCalc: false,
      isVzCalc: false,
      isMtCalc: false,
      La: null
    };
  }

  // pick up ファイルをセットする関数
  public setPickUpData(pickup_data: Object) {
    const keys: string[] = Object.keys(pickup_data);
    const positions: any[] = pickup_data[keys[0]];

    // 初期化する
    const old_position_list = this.position_list.slice(0, this.position_list.length);
    this.position_list = new Array();

    for(const pos of positions){
      // 今の入力を踏襲
      const old_point = old_position_list.find((value) => value.index === pos.index);
      const new_point = this.default_position(pos.index);
      if (old_point !== undefined) {
        for(const key of Object.keys(new_point)){
          if(key in old_point){
            new_point[key] = old_point[key];
          }
        }
      }
      for(const key of Object.keys(new_point)){
        if(key in pos){
          new_point[key] = pos[key];
        }
      }
      // 部材長をセットする
      this.position_list.push(new_point);
    }

  }

  // 算出点に何か入力されたタイミング
  // 1行でも計算する断面が存在したら true
  public designPointChange(position_list: any = this.position_list): boolean{
    for(const columns of position_list){
      if ( this.isEnable(columns)){
        return true;
      }
    }
    return false;
  }

  public isEnable(data: any): boolean {

    for(const key of ['isMyCalc', 'isVyCalc', 'isMzCalc', 'isVzCalc', 'isMtCalc']){
      if(key in data){
        if(data[key] === true){
          return true;
        }  
      }
    }
    return false;
  }

  // 断面力手入力モードの時 部材・断面の入力が変更になったら
  // 算出点データも同時に生成されなければならない
  public setManualData():void {
    const data = [];
    for(const g of this.getTableColumns(true)){
      for(const p of g){
          p.isMzCalc = true;
          p.isVyCalc = true;
          p.isMtCalc = true;
          data.push(p);
      }
    }
    this.setTableColumns(data);
  }
}

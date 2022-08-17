import { Injectable } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: 'root'
})
export class InputMembersService  {
 

  // 部材情報
  private member_list: any[];

  constructor(private translate: TranslateService) {
    this.clear();
  }
  public clear(): void {
    this.member_list = new Array();
  }

  // 部材情報
  public default_member(m_no: number): any {
    // メモ:
    // g_no: 表面上の(member.component だけで用いる)グループ番号
    // g_id: 本当のグループ番号
    return {
      m_no: m_no,
      m_len: null,
      g_no: null,
      g_id: '',
      g_name: '',
      shape: '',
      B: null,
      H: null,
      Bt: null,
      t: null,
      n: null
    };
  }

  // member_list から 指定行 のデータを返す関数
  public getTableColumns(m_no: number): any {

    let result = this.getData(m_no);
    // 対象データが無かった時に処理
    if (result !== undefined) {
      if(result.g_no === null){
        result.g_id = '';
      }
      result.shape = this.changeLanguageShape(result.shape);
    } else {
      result = this.default_member(m_no);
      this.member_list.push(result);
    }
    return result;
  }

  public getCalcData(m_no: number){
    const result = this.getData(m_no);
    return JSON.parse(
      JSON.stringify({
        temp: result
      })
    ).temp; 
  }

  public getData(m_no: number){
    return this.member_list.find( (item) => item.m_no === m_no );
  }

  // 同じグループの部材リストを取得する
  public getSameGroupeMembers(m_no: number): any{

    const m = this.getCalcData(m_no);

    if (!('g_id' in m) || m.g_id == null || m.g_id === null || m.g_id.trim().length === 0) {
      return [];
    }

    return this.member_list.filter(v=>v.g_id === m.g_id);
  }

  public setTableColumns(table_datas: any, isManual: boolean = false) {
 
    // 断面力手入力モードの場合に適用する
    this.member_list = new Array();

    if (!isManual) {
      // 断面力手入力モードじゃない場合
      for (const column of table_datas) {
        if (this.isEnable(column)) {
          if (column.g_no === null) {
            column.g_id = '';
          }
          column.shape = this.changeShapeKey(column.shape);
          this.member_list.push(column)
        } else {
          const def = this.default_member(column.m_no);
          def.m_len = column.m_len;
          this.member_list.push(def);
        }
      }
    } else {
      for (const column of table_datas) {
        if (this.isEnable(column)) {
          // グループNo の入力がない入力行には、仮のグループid をつける
          if (column.g_no === null) {
            column.g_id = 'blank'; //'row' + column.m_no; //仮のグループid
          }
          column.shape = this.changeShapeKey(column.shape);
          this.member_list.push(column)
        }
      }
    }
  }

  // 各国の言語で表現した形状から形状情報を一元化（日本語化）する
  public changeShapeKey(value: string): string {
    let result = '';
    if (value === null)          
      return result;

    const key = value.trim();
    switch (key) {
      case this.translate.instant("members.rectangle"):
        result = '矩形';
        break;
      case this.translate.instant("members.t_shape"):
        result = 'T形';
        break;
      case this.translate.instant("members.r_shape"):
        result = '円形';
        break;
      case this.translate.instant("members.oval"):
        result = '小判';
        break;
      default:
        result = '';
    }
    return result;
  }

  // 形状情報を各国の言語に変換する
  public changeLanguageShape(key: string): string {
    
    let result = '';
    if (key === null)          
      return result;

    const value = key.trim();
    switch (value) {
      case '1':
      case 'RC-矩形':
      case '矩形':
        result = this.translate.instant("members.rectangle"); //'矩形';
        break;
      case '2':
      case 'RC-T形':
      case 'T形':
        result = this.translate.instant("members.t_shape"); //'T形';
        break;
      case '3':
      case 'RC-円形':
      case '円形':
        result = this.translate.instant("members.r_shape"); //'円形';
        break;
      case '4':
      case 'RC-小判':
      case '小判':
        result = this.translate.instant("members.oval"); //'小判';
        break;
      default:
        result = '';
    }
    return result;
  }

  /// pick up ファイルをセットする関数
  public setPickUpData(pickup_data: Object) {
    const keys: string[] = Object.keys(pickup_data);
    const members: any[] = pickup_data[keys[0]];

    // 部材リストを作成する
    const old_member_list = this.member_list.slice(0, this.member_list.length);
    this.member_list = new Array();

    // 部材番号のもっとも大きい数
    let n = 0;
    members.forEach((v,i,a) => {
      n = Math.max(n, v.m_no);
    });
    for(let m_no = 1; m_no <= n; m_no++){
      // 同じ部材番号を抽出
      const tar = members.filter((v,i,a) => v.m_no === m_no);
      if(tar.length === 0){
        continue;
      }
      let pos = 0;
      tar.forEach((v,i,a) => {
        pos = Math.max(pos, v.position);
      });
      // 今の入力を踏襲
      let new_member = old_member_list.find((value) => value.m_no === m_no);
      if (new_member == null) {
        new_member = this.default_member(m_no);
      }
      // 部材長をセットする
      new_member.m_len = pos;
      this.member_list.push(new_member);
    }

  }


  // 部材に何か入力されたタイミング
  // 1行でも有効なデータ存在したら true
  public checkMemberEnables(member_list: any = this.member_list): boolean {
    for(const columns of member_list){
      if ( this.isEnable(columns)){
        return true;
      }
    }
    return false;
  }

  // 有効なデータ存在したら true
  public isEnable(columns) {
    if(columns.g_name !== null && columns.g_name !== undefined){
      if(columns.g_name.trim().length > 0){
        return true;
      }
    }
    if(columns.shape !== null && columns.shape !== undefined){
      if(columns.shape.trim().length > 0){
        return true;
      }
    }
    if(columns.B !== null && columns.B !== undefined){
      return true;
    }
    if(columns.H !== null && columns.H !== undefined){
      return true;
    }
    if(columns.Bt !== null && columns.Bt !== undefined){
      return true;
    }
    if(columns.t !== null && columns.t !== undefined){
      return true;
    }

    return false;
  }

  public getGroupeName(i: number): string {
    const groupe = this.getGroupeList();

    const target = groupe[i];
    const first = target[0];
    let result: string = '';
    if(first.g_name === null){
      result = first.g_id;
    } else if(first.g_name === ''){
      result = first.g_id;
    } else {
      result = first.g_name;
    }
    if(result === ''){
      result = 'No' + i;
    }
    return result;
  }

  // グループ別 部材情報{m_no, m_len, g_no, g_id, g_name, shape, B, H, Bt, t} の配列
  public getGroupeList(): any[] {

    // 全てのグループ番号をリストアップする
    const id_list: string[] =  this.getGroupes();

    // グループ番号順に並べる
    id_list.sort();

    // グループ番号を持つ部材のリストを返す
    const result = new Array();
    for (const id of id_list) {
      // グループ番号を持つ部材のリスト
      const members: any[] = this.member_list.filter(
        item => item.g_id === id);
      result.push(members);
    }
    return JSON.parse(
      JSON.stringify({
        temp: result
      })
    ).temp;
  }

  public getGroupes(): string[] {
    const id_list: string[] =  new Array();
    for (const m of this.member_list) {
      if (!('g_id' in m) || m.g_id == null || m.g_id === null || m.g_id.trim().length === 0) {
        continue;
      }

      if (id_list.find((value)=>value===m.g_id) == null) {
        id_list.push(m.g_id);
      }
    }
    return id_list;
  }

  public getSaveData():any{
    const result = [];
    for(const m of this.member_list){
      const def = this.default_member(m.m_no);
      for(const k of Object.keys(def)){
        if(k in m){
          def[k] = m[k];
        }
      }
      result.push(def)
    }
    return result;
  }

  public setSaveData(members: any) {

    this.clear();
    for(const m of members){
      const def = this.default_member(m.m_no);
      for(const k of Object.keys(def)){
        if(k in m){
          def[k] = m[k];
        }
      }
      this.member_list.push(def)
    }
  }

}

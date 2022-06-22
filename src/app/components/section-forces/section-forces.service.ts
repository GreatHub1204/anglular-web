import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputBasicInformationService } from '../basic-information/basic-information.service';
import { InputDesignPointsService } from '../design-points/design-points.service';
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: 'root'
})
export class InputSectionForcesService  {

  private force: any[];

  constructor(
    private helper: DataHelperModule,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private translate: TranslateService
    ) {
    this.clear();
  }
  public clear(): void {
    this.force = new Array();
  }

  public getColumnHeaders1(): any {
    const result: object[] = [
      { 
        title: this.translate.instant("section-forces.p_name"),
        align: 'left', dataType: 'string', dataIndx: 'p_name', frozen: true, sortable: false, width: 250 }
    ];

    let old: string = null;
    let head: any = null;
    for(const m of this.basic.pickup_moment){
      const titles = m.title.split(' ');
      if(old !== titles[0]){
        if( head !== null){
          result.push(head);
        }
        head = { title: titles[0], align: 'center', colModel:[] }
        old = titles[0];
      }
      const key = 'Md' + m.id;
      head.colModel.push(
        { title: titles[1], align: 'center', colModel: [
          { title: 'Md<br/>(kN・m)',  dataType: 'float', 'format': '#.00', dataIndx: key + '_Md', sortable: false, width: 100 },
          { title: 'Nd<br/>(kN)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Nd', sortable: false, width: 100 }
        ]
      })
    }
    if( head !== null){
      result.push(head);
    }

    return result;
  }

  public getColumnHeaders2(): any {
    const result: object[] = [
      { 
        title: this.translate.instant("section-forces.p_name"),
        align: 'left', dataType: 'string', dataIndx: 'p_name', frozen: true, sortable: false, width: 250 },
      { 
        title: this.translate.instant("section-forces.s_len"),
        dataType: "float", dataIndx: "La", sortable: false, width: 140 },
      ];

    let old: string = null;
    let head: any = null;
    for(const s of this.basic.pickup_shear_force){
      const titles = s.title.split(' ');
      if(old !== titles[0]){
        if( head !== null){
          result.push(head);
        }
        head = { title: titles[0], align: 'center', colModel:[] }
        old = titles[0];
      }
      const key = 'Vd' + s.id;
      head.colModel.push(
        { title: titles[1], align: 'center', colModel: [
          { title: 'Vd<br/>(kN)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Vd', sortable: false, width: 100 },
          { title: 'Md<br/>(kN・m)', dataType: 'float', 'format': '#.00', dataIndx: key + '_Md', sortable: false, width: 100 },
          { title: 'Nd<br/>(kN)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Nd', sortable: false, width: 100 }
        ]
      })
    }
    if( head !== null){
      result.push(head);
    }

    return result;
  }

  public getColumnHeaders3(): any {
    const result: object[] = [
      { 
        title: this.translate.instant("section-forces.p_name"),
        align: 'left', dataType: 'string', dataIndx: 'p_name', sortable: false, width: 250 },
      ];

    let old: string = null;
    let head: any = null;
    for(const s of this.basic.pickup_torsional_moment){
      const titles = s.title.split(' ');
      if(old !== titles[0]){
        if( head !== null){
          result.push(head);
        }
        head = { title: titles[0], align: 'center', colModel:[] }
        old = titles[0];
      }
      const key = 'Mt' + s.id;
      head.colModel.push(
        { title: titles[1], align: 'center', colModel: [
          { title: 'Mt<br/>(kN・m)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Mt', sortable: false, width: 100 },
          { title: 'Md<br/>(kN・m)', dataType: 'float', 'format': '#.00', dataIndx: key + '_Md', sortable: false, width: 100 },
          { title: 'Vd<br/>(kN)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Vd', sortable: false, width: 100 },
          { title: 'Nd<br/>(kN)',    dataType: 'float', 'format': '#.00', dataIndx: key + '_Nd', sortable: false, width: 100 }
        ]
      })
    }
    if( head !== null){
      result.push(head);
    }

    return result;
  }
  // １行 のデフォルト値
  public default_column(index: number): any {

    const rows: any = {
      index,
    };

    for(const m of this.basic.pickup_moment){
      const key = 'Md' + m.id;
      rows[key + '_Md'] = null;
      rows[key + '_Nd'] = null;
    }

    for(const s of this.basic.pickup_shear_force){
      const key = 'Vd' + s.id;
      rows[key + '_Vd'] = null;
      rows[key + '_Md'] = null;
      rows[key + '_Nd'] = null;
    }

    for(const s of this.basic.pickup_torsional_moment){
      const key = 'Mt' + s.id;
      rows[key + '_Mt'] = null;
      rows[key + '_Md'] = null;
      rows[key + '_Vd'] = null;
      rows[key + '_Nd'] = null;
    }

    return rows;
  }


  // 曲げモーメント moment_force から 指定行 のデータを返す関数
  public getTable1Columns(index: number): any {

    let result = this.force.find( (item) => item.index === index );

    // 対象データが無かった時に処理
    if (result === undefined) {
      result = this.default_column(index);
      this.force.push(result);
    }

    //
    const design_point = this.points.getTableColumn(index);
    const p_name: string = (design_point !== undefined) ? design_point.p_name: '';
    const La: number = (design_point !== undefined) ? design_point.La: null;

    result['p_name'] = p_name;
    result['La'] = La;
    return result;

  }

  // ファイル
  public setTableColumns(table_datas: any[]) {
    this.clear();
    for (const data of table_datas) {
      const new_colum = this.default_column(data.index);
      let flg = false;
      for(const key of Object.keys(new_colum)){
        if(key in data) {
          const value = this.helper.toNumber(data[key]);
          if(value !== null){
            new_colum[key] = value;
            flg = true;
          }
        }
      }
      if( flg === true){
        this.force.push(new_colum);
      }
      //
      const position = this.points.getCalcData(new_colum.index);
      position.p_name = data.p_name;
      position.La = data.La;
    }
  }

  public getSaveData(): any{
    return this.force;
  }

  public setSaveData(force: any) {
    this.force = force;
  }


}

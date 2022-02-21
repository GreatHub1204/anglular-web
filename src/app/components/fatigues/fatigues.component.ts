import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { InputFatiguesService } from './fatigues.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { AppComponent } from 'src/app/app.component';
import { SaveDataService } from 'src/app/providers/save-data.service';

@Component({
  selector: 'app-fatigues',
  templateUrl: './fatigues.component.html',
  styleUrls: ['./fatigues.component.scss', '../subNavArea.scss']
})
export class FatiguesComponent implements OnInit, OnDestroy, AfterViewInit {
  
  public train_A_count: number;
  public train_B_count: number;
  public service_life: number;

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[]= new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private fatigues: InputFatiguesService,
    private save: SaveDataService) { }

  ngOnInit() {

    const fatigues = this.fatigues.getSaveData();

    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;

    this.setTitle(this.save.isManual());

    this.table_datas = this.fatigues.getTableColumns();

    // グリッドの設定
    this.options = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders,
        dataModel: { data: this.table_datas[i] },
        freezeCols: (this.save.isManual()) ? 4 : 5,
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      this.groupe_name.push( this.fatigues.getGroupeName(i));
    }

  }

  ngAfterViewInit(){
    this.activeButtons(0);  
  }

  private setTitle(isManual: boolean): void{
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];
    } else {
      this.columnHeaders = [
        { title: '部材<br/>番号', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: '位置', dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];
    }

    // 共通する項目
    this.columnHeaders.push(
      { title: '算出点名', dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: '断面<br/>B<br/>H', align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, frozen: true, sortable: false, width: 85, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: '位置', align: 'center', dataType: 'string', dataIndx: 'design_point_id', editable: false, frozen: true, sortable: false, width: 40, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      {
        title: '曲げ用', align: 'center', colModel: [
          { title: 'SA/SC', dataType: 'float', format: '#.000', dataIndx: 'M_SA', sortable: false, width: 70 },
          { title: 'SB/SC', dataType: 'float', format: '#.000', dataIndx: 'M_SB', sortable: false, width: 70 },
          {
            title: 'k=0.06', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'M_NA06', sortable: false, width: 70 },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'M_NB06', sortable: false, width: 70 }
            ]
          },
          {
            title: 'k=0.12', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'M_NA12', sortable: false, width: 70 },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'M_NB12', sortable: false, width: 70 }
            ]
          },
          {
            title: '複線補正r2', align: 'center', colModel: [
              { title: 'α', dataType: 'float', format: '#.000', dataIndx: 'M_A', sortable: false, width: 70 },
              { title: 'β', dataType: 'float', format: '#.000', dataIndx: 'M_B', sortable: false, width: 70 }
            ]
          },
          {
            title: '曲げ加工 r1', align: 'center', colModel: [
              { title: '軸鉄筋', dataType: 'float', format: '#.00', dataIndx: 'M_r1_1', sortable: false, width: 60 }
            ]
          },
          { title: '強度等級', align: 'center', dataType: 'string', dataIndx: 'M_Class', sortable: false, width: 50 },
          { title: '溶接継手', align: 'center', dataType: 'bool', dataIndx: 'M_weld', type: 'checkbox', sortable: false, width: 40 },
        ]
      },
      {
        title: 'せん断用', align: 'center', colModel: [
          { title: 'SA/SC', dataType: 'float', format: '#.000', dataIndx: 'V_SA', sortable: false, width: 70 },
          { title: 'SB/SC', dataType: 'float', format: '#.000', dataIndx: 'V_SB', sortable: false, width: 70 },
          {
            title: 'k=0.06', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'V_NA06', sortable: false, width: 70 },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'V_NB06', sortable: false, width: 70 }
            ]
          },
          {
            title: 'k=0.12', align: 'center', colModel: [
              { title: 'NA', dataType: 'float', format: '#.00', dataIndx: 'V_NA12', sortable: false, width: 70 },
              { title: 'NB', dataType: 'float', format: '#.00', dataIndx: 'V_NB12', sortable: false, width: 70 }
            ]
          },
          {
            title: '複線補正r2', align: 'center', colModel: [
              { title: 'α', dataType: 'float', format: '#.000', dataIndx: 'V_A', sortable: false, width: 70 },
              { title: 'β', dataType: 'float', format: '#.000', dataIndx: 'V_B', sortable: false, width: 70 }
            ]
          },
          {
            title: '曲げ加工 r1', align: 'center', colModel: [
              { title: '帯筋', dataType: 'float', format: '#.00', dataIndx: 'V_r1_2', sortable: false, width: 60 },
              { title: '折曲げ', dataType: 'float', format: '#.00', dataIndx: 'V_r1_3', sortable: false, width: 60 }
            ]
          },
        ]
      }
    );
  }
 
  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }
 
  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    const table_datas = [];
    for(const g of this.table_datas){
      for(const e of g){
        table_datas.push(e);
      }
    }
    this.fatigues.setTableColumns({
      table_datas,
      train_A_count: this.train_A_count,
      train_B_count: this.train_B_count,
      service_life: this.service_life
    });
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 230;
    return containerHeight;
  }

  public activePageChenge(id: number): void {
    this.activeButtons(id);
 
    this.options = this.option_list[id];
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("fig" + i);
      if (data != null) {
        if(i === id){
          data.classList.add("is-active");
        } else if (data.classList.contains("is-active")) {
            data.classList.remove("is-active");
        }
      }
    }
  }

}

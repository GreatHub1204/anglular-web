import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { InputBarsService } from './bars.service';
import { SheetComponent } from '../sheet/sheet.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import pq from 'pqgrid';

@Component({
  selector: 'app-bars',
  templateUrl: './bars.component.html',
  styleUrls: ['./bars.component.scss', '../subNavArea.scss']
})
export class BarsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private beamHeaders: object[] = new Array();
  // private columnHeaders: object[] = new Array();
  // private pileHeaders: object[] = new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private bars: InputBarsService,
    private save: SaveDataService) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    this.table_datas = this.bars.getTableColumns();

    // グリッドの設定
    this.option_list = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      const op = {
        showTop: false,
        reactive: true,
        sortable: false,
        locale: "jp",
        height: this.tableHeight().toString(),
        numberCell: { show: false }, // 行番号
        colModel: this.beamHeaders,
        dataModel: { data: this.table_datas[i] },
        change: (evt, ui) => {
          for (const property of ui.updateList) {
            for (const key of Object.keys(property.newRow)) {
              const old = property.oldRow[key];
              if(property.newRow[key] === undefined){
                continue; // 削除した場合 何もしない
              }
              if (key === 'rebar_dia' || key === 'side_dia' || key === 'stirrup_dia') {
                // 鉄筋径の規格以外は入力させない
                const value0 = this.bars.matchBarSize(property.newRow[key]);
                const j = property.rowIndx;
                if( value0 === null ) {
                  this.table_datas[i][j][key] = old;
                }
              }
            }
          }
        }
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      this.groupe_name.push( this.bars.getGroupeName(i));
    }


  }

  ngAfterViewInit(){
    this.activeButtons(0);
  }

  private setTitle(isManual: boolean): void{
    if (isManual) {
      // 断面力手入力モードの場合
      this.beamHeaders = [
        { title: '', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];
    } else {
      this.beamHeaders = [
        { title: '部材<br/>番号', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: '位置', dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, sortable: false, width: 110, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];    
    }
    // 共通する項目
    this.beamHeaders.push(
      { title: '算出点名', dataType: 'string', dataIndx: 'p_name', editable: false, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: '断面<br/>B<br/>H', align: 'center', dataType: 'float', dataIndx: 'bh', editable: false, sortable: false, width: 85, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: 'ハンチ高', align: 'center', colModel: [
        { title: '曲げ', align: 'center', colModel: [
          { title: 'せん断', align: 'center', dataType: 'float', dataIndx: 'haunch_height', sortable: false, width: 85 },
        ]}
      ]},
      { title: '位置', align: 'center', dataType: 'string', dataIndx: 'design_point_id', editable: true, sortable: false, width: 40 },
      {
        title: '軸方向鉄筋', align: 'center', colModel: [
          { title: '鉄筋径', dataType: 'integer', dataIndx: 'rebar_dia', sortable: false, width: 70 },
          { title: '本数', dataType: 'float', dataIndx: 'rebar_n', sortable: false, width: 70 },
          { title: 'かぶり1<br/>断目', dataType: 'float', dataIndx: 'rebar_cover', sortable: false, width: 70 },
          { title: 'ならび<br/>本数', dataType: 'float', dataIndx: 'rebar_lines', sortable: false, width: 70 },
          { title: 'アキ', dataType: 'float', dataIndx: 'rebar_space', sortable: false, width: 70 },
          { title: '間隔', dataType: 'float', dataIndx: 'rebar_ss', sortable: false, width: 70 }
        ]
      },
      {
        title: '側方鉄筋', align: 'center', colModel: [
          { title: '鉄筋径', dataType: 'integer', dataIndx: 'side_dia', sortable: false, width: 70 },
          { title: '本数片', dataType: 'float', dataIndx: 'side_n', sortable: false, width: 70 },
          { title: '上端位置', dataType: 'float', dataIndx: 'side_cover', sortable: false, width: 70 },
          { title: '間隔', dataType: 'float', dataIndx: 'side_ss', sortable: false, width: 70 }
        ]
      },
      {
        title: 'せん断補強鉄筋', align: 'center', colModel: [
          { title: '鉄筋径', dataType: 'integer', dataIndx: 'stirrup_dia', sortable: false, width: 70 },
          { title: '本数', dataType: 'float', dataIndx: 'stirrup_n', sortable: false, width: 70 },
          { title: '間隔', dataType: 'float', dataIndx: 'stirrup_ss', sortable: false, width: 70 }
        ]
      },
      { title: '主鉄筋の斜率', dataType: 'float', dataIndx: 'cos', sortable: false, width: 85 },
      { title: 'tanγ+tanβ', dataType: 'float', dataIndx: 'tan', sortable: false, width: 85 },
      {
        title: '折曲げ鉄筋', align: 'center', colModel: [
          { title: '鉄筋径', dataType: 'integer', dataIndx: 'bending_dia', sortable: false, width: 70 },
          { title: '本数', dataType: 'float', dataIndx: 'bending_n', sortable: false, width: 70 },
          { title: '間隔', dataType: 'float', dataIndx: 'bending_ss', sortable: false, width: 70 },
          { title: '角度', dataType: 'float', dataIndx: 'bending_angle', sortable: false, width: 70 }
        ]
      },
      { title: '処理', align: 'center', dataType: 'bool', dataIndx: 'enable', type: 'checkbox', sortable: false, width: 40 },
    );
  }

  public getGroupeName(i: number): string {
    return this.groupe_name[i];
  }

  ngOnDestroy() {
    this.saveData();
  }
  public saveData(): void {
    const a = [];
    for(const g of this.table_datas){
      for(const e of g){
        a.push(e);
      }
    }
    this.bars.setTableColumns(a);
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
      const data = document.getElementById("bar" + i);
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

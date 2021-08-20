import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { InputDesignPointsService } from './design-points.service';
import { SaveDataService } from '../../providers/save-data.service';
import { AppComponent } from 'src/app/app.component';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';

@Component({
  selector: 'app-design-points',
  templateUrl: './design-points.component.html',
  styleUrls: ['./design-points.component.scss', '../subNavArea.scss']
})
export class DesignPointsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[] = [];
  // このページで表示するデータ
  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private points: InputDesignPointsService,
    private save: SaveDataService,
    private app: AppComponent) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    this.table_datas = this.points.getTableColumns();

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
        colModel: this.columnHeaders,
        dataModel: { data: this.table_datas[i] },
        change: (evt, ui) => {
          for (const property of ui.updateList) {
            for (const key of Object.keys(property.newRow)) {
              if (property.newRow[key]===true) {
                const target = this.table_datas[i][property.rowIndx];
                if (key === 'isMyCalc') { target['isMzCalc'] = false; }
                if (key === 'isMzCalc') { target['isMyCalc'] = false; }
                if (key === 'isVyCalc') { target['isVzCalc'] = false; }
                if (key === 'isVzCalc') { target['isVyCalc'] = false; }
              }
            }
          }
          // 何か変更があったら判定する
          let flg = false;
          for(const datas of this.table_datas){
            if(this.points.designPointChange(datas) === true){
              flg = true;
              break;
            }
          }
          this.app.designPointChange(flg);
        }
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      this.groupe_name.push( this.points.getGroupeName(i));
    }

  }

  ngAfterViewInit(){
    this.activeButtons(0);
  }

  private setTitle(isManual: boolean): void{
    if (isManual) {
      // 断面力手入力モードの場合
      this.columnHeaders = [
        { title: "", align: "left", dataType: "string", dataIndx: "m_no", sortable: false, width: 70, editable: false, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: "算出点名", dataType: "string", dataIndx: "p_name", sortable: false, width: 250 },
        { title: "せん断スパン長(mm)", dataType: "float", dataIndx: "La", sortable: false, width: 140 },
      ];
    } else {
      // ピックアップファイルを使う場合
      this.columnHeaders = [
        { title: "部材番号", align: "left", dataType: "string", dataIndx: "m_no", sortable: false, width: 70, editable: false, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: "算出点", dataType: "string", dataIndx: "p_id", sortable: false, width: 85, editable: false, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: "位置", dataType: "float", format: "#.000", dataIndx: "position", sortable: false, width: 110, editable: false, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: "算出点名", dataType: "string", dataIndx: "p_name", sortable: false, width: 250 },
      ];
      if (this.save.is3DPickUp()) {
        // 3次元ピックアップファイルの場合
        this.columnHeaders.push(
          { title: '曲げ照査', align: 'center', colModel: [
            { title: "y軸周り", align: "center", dataType: "bool", dataIndx: "isMyCalc", type: 'checkbox', sortable: false, width: 120 },
            { title: "z軸周り", align: "center", dataType: "bool", dataIndx: "isMzCalc", type: 'checkbox', sortable: false, width: 120 },
          ]},
          { title: 'せん断照査', align: 'center', colModel: [
            { title: "y軸方向", align: "center", dataType: "bool", dataIndx: "isVyCalc", type: 'checkbox', sortable: false, width: 120 },
            { title: "z軸方向", align: "center", dataType: "bool", dataIndx: "isVzCalc", type: 'checkbox', sortable: false, width: 120 }
          ]},
        );
      } else {
        // 2次元ピックアップファイルの場合
        this.columnHeaders.push(
          { title: "曲げ照査", align: "center", dataType: "bool", dataIndx: "isMzCalc", type: 'checkbox', sortable: false, width: 120 },
          { title: "せん断照査", align: "center", dataType: "bool", dataIndx: "isVyCalc", type: 'checkbox', sortable: false, width: 120 }
        );
      }
      this.columnHeaders.push(
        { title: "せん断スパン長(mm)", dataType: "float", dataIndx: "La", sortable: false, width: 140 }
      );
    }
  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    const a = [];
    for(const g of this.table_datas){
      for(const p of g){
          a.push(p);
      }
    }
    if(this.save.isManual()){
      this.points.setSaveData(a);
    } else {
      this.points.setTableColumns(a);
    }
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
      const data = document.getElementById("pos" + i);
      if (data != null) {
        if(i === id){
          data.classList.add("is-active");
        } else if (data.classList.contains("is-active")) {
            data.classList.remove("is-active");
        }
      }
    }
  }

  // タブのヘッダ名
  public getGroupeName(i: number): string{
    return this.groupe_name[i];
  }

}


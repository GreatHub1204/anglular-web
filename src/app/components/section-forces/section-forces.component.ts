import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { InputSectionForcesService } from './section-forces.service';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';

@Component({
  selector: 'app-section-forces',
  templateUrl: './section-forces.component.html',
  styleUrls: ['./section-forces.component.scss']
})
export class SectionForcesComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private force: InputSectionForcesService) { }

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  private ROWS_COUNT = 0;
  private table_datas: any[] = [];

  // 曲げモーメントのグリッド設定変数
  private columnHeaders1: object[];

  // せん断力のグリッド設定変数
  private columnHeaders2: object[];

  // ねじりモーメントのグリッド設定変数
  private columnHeaders3: object[];


  ngOnInit() {
    // データを登録する
    this.ROWS_COUNT = this.rowsCount();
    this.loadData(this.ROWS_COUNT);

    this.columnHeaders1 = this.force.getColumnHeaders1();
    this.columnHeaders2 = this.force.getColumnHeaders2();
    this.columnHeaders3 = this.force.getColumnHeaders3();

    // グリッドの初期化 --------------------------------------
    this.options = {
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      height: this.tableHeight().toString(),
      numberCell: { show: true }, // 行番号
      colModel: this.columnHeaders1,
      dataModel: { data: this.table_datas },
      freezeCols: 1,
      beforeTableView:(evt, ui) => {
        const dataV = this.table_datas.length;
        if (ui.initV == null) {
          return;
        }
        if (ui.finalV >= dataV - 1) {
          this.loadData(dataV + this.ROWS_COUNT);
          this.grid.refreshDataAndView();
        }
      }
    };


  }

  ngAfterViewInit(){
    this.activeButtons(0);
    // this.grid.refreshDataAndView();
  }

  // 指定行row まで、曲げモーメント入力データを読み取る
  private loadData(row: number): void {
    for (let i = this.table_datas.length + 1; i <= row; i++) {
      const column = this.force.getTable1Columns(i);
      this.table_datas.push(column);
    }
  }


  ngOnDestroy(): void {
    this.saveData();
  }
  public saveData(): void {
    this.force.setTableColumns(this.table_datas);
  }


  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 160;
    return containerHeight;
  }

  // 表高さに合わせた行数を計算する
  private rowsCount(): number {
    const containerHeight = this.tableHeight();
    return Math.round(containerHeight / 30);
  }

  public activePageChenge(id: number): void {

    if(id === 0) {
      this.options.colModel = this.columnHeaders1;
    } else if (id === 1) {
      this.options.colModel = this.columnHeaders2;
    } else if (id === 2) {
      this.options.colModel = this.columnHeaders3;
    } else {
      return;
    }
    this.activeButtons(id);
    this.grid.options = this.options;
    this.grid.refreshDataAndView();
  }

  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.table_datas.length; i++) {
      const data = document.getElementById("foc" + i);
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

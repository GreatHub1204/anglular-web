import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import pq from 'pqgrid';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { SheetComponent } from '../sheet/sheet.component';
import { InputCrackSettingsService } from './crack-settings.service';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-crack-settings',
  templateUrl: './crack-settings.component.html',
  styleUrls: ['./crack-settings.component.scss', '../subNavArea.scss']
})
export class CrackSettingsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[]= new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private crack: InputCrackSettingsService,
    private save: SaveDataService,
    public helper: DataHelperModule,
    private translate: TranslateService
    ) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    this.table_datas = this.crack.getTableColumns();

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
        freezeCols: (this.save.isManual()) ? 2 : 3,
      };
      this.option_list.push(op);
    }
    this.options = this.option_list[0];

    // タブのタイトルとなる
    this.groupe_name = new Array();
    for( let i =0; i < this.table_datas.length; i++){
      this.groupe_name.push( this.crack.getGroupeName(i));
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
        { 
          title: this.translate.instant("crack-settings.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { 
          title: this.translate.instant("crack-settings.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];    
    }

    // 共通する項目
    this.columnHeaders.push(
      { 
        title: this.translate.instant("crack-settings.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      {
        title: this.translate.instant("crack-settings.env"),
        align: 'center', colModel: [
          { 
            title: this.translate.instant("crack-settings.top"),
            dataType: 'integer', dataIndx: 'con_u', sortable: false, width: 60 },
          { 
            title: this.translate.instant("crack-settings.under"),
            dataType: 'integer', dataIndx: 'con_l', sortable: false, width: 60 },
          { 
            title: this.translate.instant("crack-settings.shear"),
            dataType: 'integer', dataIndx: 'con_s', sortable: false, width: 60 }
        ]
      },
      {
        title: this.translate.instant("crack-settings.crack"),
        align: 'center', colModel: [
          { 
            title: this.translate.instant("crack-settings.top"),
            align: 'center', dataType: 'integer', dataIndx: 'ecsd_u', sortable: false, width: 70 },
          { 
            title: this.translate.instant("crack-settings.under"),
            align: 'center', dataType: 'integer', dataIndx: 'ecsd_l', sortable: false, width: 70 }
        ]
      },
      { 
        title: this.translate.instant("crack-settings.shear_kr"),
        dataType: 'float', format: '#.0', dataIndx: 'kr', sortable: false, width: 70 },
      { 
        title: 'k4', align: 'center', dataType: 'float', format: '#.00', dataIndx: 'k4', sortable: false, width: 70 },
      {
        title: this.translate.instant("crack-settings.exterior"),
        align: 'center', colModel: [
          { 
            title: this.translate.instant("crack-settings.top"),
            align: 'center', dataType: 'bool', dataIndx: 'vis_u', type: 'checkbox', sortable: false, width: 50 },
          { 
            title: this.translate.instant("crack-settings.under"),
            align: 'center', dataType: 'bool', dataIndx: 'vis_l', type: 'checkbox', sortable: false, width: 50 }
        ]
      },
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
    this.crack.setTableColumns(a);
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
      const data = document.getElementById("crk" + i);
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

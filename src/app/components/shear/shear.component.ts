import { Component, OnInit, ViewChild } from '@angular/core';
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { TranslateService } from '@ngx-translate/core';
import { ShearStrengthService } from './shear-strength.service';

@Component({
  selector: 'app-shear',
  templateUrl: './shear.component.html',
  styleUrls: ['./shear.component.scss', '../subNavArea.scss']
})
export class ShearComponent implements OnInit {

  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;

  // データグリッドの設定変数
  private option_list: pq.gridT.options[] = new Array();
  private columnHeaders: object[]= new Array();

  public table_datas: any[];
  // タブのヘッダ名
  public groupe_name: string[];

  constructor(
    private shear: ShearStrengthService,
    private save: SaveDataService,
    public helper: DataHelperModule,
    private translate: TranslateService
    ) { }

  ngOnInit() {

    this.setTitle(this.save.isManual());

    this.table_datas = this.shear.getTableColumns();

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
      this.groupe_name.push( this.shear.getGroupeName(i));
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
          title: this.translate.instant("shear-strength.m_no"),
          align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, frozen: true, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        {
          title: this.translate.instant("shear-strength.position"),
          dataType: 'float', format: '#.000', dataIndx: 'position', editable: false, frozen: true, sortable: false, width: 110, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];
    }

    // 共通する項目
    this.columnHeaders.push(
      {
        title: this.translate.instant("shear-strength.p_name"),
        dataType: 'string', dataIndx: 'p_name', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } 
      },
      {
        title: this.translate.instant("shear-strength.s_len"),
        dataType: "float",  dataIndx: "La", sortable: false,  width: 140
      },
      {
        title: this.translate.instant("shear-strength.fixed_end"),
        align: 'center', dataType: 'bool', dataIndx: 'fixed_end', type: 'checkbox', sortable: false, width: 50 
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
    const a = [];
    for(const g of this.table_datas){
      for(const e of g){
        a.push(e);
      }
    }
    this.shear.setTableColumns(a);
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
      const data = document.getElementById("shr" + i);
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

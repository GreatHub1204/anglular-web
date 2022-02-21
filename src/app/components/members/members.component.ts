import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { InputMembersService } from './members.service';
import { SheetComponent } from '../sheet/sheet.component';
import { AppComponent } from 'src/app/app.component';
import { SaveDataService } from 'src/app/providers/save-data.service';
import pq from 'pqgrid';
import { InputDesignPointsService } from '../design-points/design-points.service';

@Component({
  selector: 'app-members',
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})


export class MembersComponent implements OnInit, AfterViewInit, OnDestroy {

  // データグリッドの設定変数
  @ViewChild('grid') grid: SheetComponent;
  public options: pq.gridT.options;
  private columnHeaders: object[] = new Array();
  // このページで表示するデータ
  private ROWS_COUNT = 0;
  private table_datas: any[] = new Array();

  constructor(
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private save: SaveDataService,
    private app: AppComponent) { }


  ngOnInit() {

    this.setTitle(this.save.isManual());

    // グリッドの基本的な オプションを登録する
    this.options = {
      showTop: false,
      reactive: true,
      sortable: false,
      locale: 'jp',
      height: this.tableHeight().toString(),
      width: 'auto',
      numberCell: { show: false }, // 行番号
      colModel: this.columnHeaders,
      change: (evt, ui) => {
        for (const property of ui.updateList) {
          for (const key of Object.keys(property.newRow)) {
            const old = property.oldRow[key];
            let value = property.newRow[key];
            const i = property.rowIndx;

            if (key === 'g_no') {
              // 他の共通断面
              if (value === undefined || value === null ) {
                this.table_datas[i].g_id = '';
                continue;
              }
              // 初期値は対象にしない
              for (let j = 0; j < this.table_datas.length; j++) {
                if (property.rowIndx === j) { continue; }                      // 同じ行は比較しない
                const targetColumn = this.table_datas[j];
                const target = targetColumn.g_no;
                if (target === null) { continue; } // 初期値は対象にしない
                if (target === value) {
                  if (targetColumn.g_name !== '' || targetColumn.g_name !== undefined) {
                    this.table_datas[i].g_name = targetColumn.g_name;
                    break;
                  }
                }
              }
              this.table_datas[i].g_id = value.toString();

            } else if (this.table_datas[i].g_no === null) {
              this.table_datas[i].g_id = 'blank';//'row' + this.table_datas[i].m_no; //仮のグループid
            }

            if (key === 'g_name') {
              // 他の共通断面

              if (value === undefined || value === null) { continue; }         // 初期値は対象にしない
              value = value.trim();
              if (value === '') { continue; }
              for (let j = 0; j < this.table_datas.length; j++) {
                const targetColumn = this.table_datas[j];
                if (property.rowIndx === j) {
                  targetColumn.g_name = value;
                  continue;
                }                      // 同じ行は比較しない
                if (targetColumn.g_no === null) { continue; } // 初期値は対象にしない
                const row = property.rowIndx;
                const changesColumn = this.table_datas[row];
                if (targetColumn.g_no === changesColumn.g_no) {
                  targetColumn.g_name = value;
                }
              }

            }

            if (key === 'shape') {
              let value = property.newRow[key];
              const row = property.rowIndx;
              if (value === null) { continue; }         // 初期値は対象にしない
              value = value.trim();
              switch (value) {
                case '1':
                case 'RC-矩形':
                case '矩形':
                    this.table_datas[row].shape = '矩形';
                  break;
                case '2':
                case 'RC-T形':
                case 'T形':
                      this.table_datas[row].shape = 'T形';
                  break;
                case '3':
                case 'RC-円形':
                case '円形':
                  this.table_datas[row].shape = '円形';
                  break;
                case '4':
                case 'RC-小判':
                case '小判':
                    this.table_datas[row].shape = '小判';
                  break;
                case '11':
                  this.table_datas[row].shape = '矩形鋼';
                  break;
                case '12':
                  this.table_datas[row].shape = 'T形鋼';
                  break;
                case '13':
                  this.table_datas[row].shape = '鋼管';
                  break;
                default:
                  this.table_datas[row].shape = '';
              }
            }

          }
        }

        // 何か変更があったら判定する
        const flg: boolean = this.members.checkMemberEnables(this.table_datas)
        this.app.memberChange(flg);

      }
    };

    // データを読み込む
    if (this.save.isManual() === true) {
      // 断面手入力モードの場合は、無限行
      this.ROWS_COUNT = this.rowsCount();
      this.options['beforeTableView'] = (evt, ui) => {
        const dataV = this.table_datas.length;
        if (ui.initV == null) {
          return;
        }
        if (ui.finalV >= dataV - 1) {
          this.loadData(dataV + this.ROWS_COUNT);
          this.grid.refreshDataAndView();
        }
      }
      this.loadData(this.ROWS_COUNT);

    } else {
      // ピックアップファイルを使う場合
      this.table_datas = this.members.getSaveData();
    }

    // データを登録する
    this.options['dataModel'] = { data: this.table_datas };
  }


  private setTitle(isManual: boolean): void {

    if (isManual) {
      // 断面力手入力モードの場合の項目
      this.columnHeaders = [];
    } else {
      // ピックアップファイルを使う場合の項目
      this.columnHeaders = [
        { title: '部材<br/>番号', align: 'center', dataType: 'integer', dataIndx: 'm_no', editable: false, sortable: false, width: 60, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
        { title: '部材長', dataType: 'float', format: '#.000', dataIndx: 'm_len', editable: false, sortable: false, width: 90, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      ];
    }

    this.columnHeaders.push(
      { title: 'グループNo', align: 'center', dataType: 'float', dataIndx: 'g_no', sortable: false, width: 85 },
      { title: '部材名', align: 'center', dataType: 'string', dataIndx: 'g_name', sortable: false, width: 110 },
      { title: '断面形状', dataType: 'string', dataIndx: 'shape', sortable: false, width: 80 },
      {
        title: '断面(mm)', align: 'center', colModel: [
          { title: 'B', dataType: 'float', dataIndx: 'B', width: 70 },
          { title: 'H', dataType: 'float', dataIndx: 'H', width: 70 },
          { title: 'Bt', dataType: 'float', dataIndx: 'Bt', width: 70 },
          { title: 't', dataType: 'float', dataIndx: 't', width: 70 }
        ]
      },
      { title: '部材数', align: 'center', dataType: 'float', dataIndx: 'n', sortable: false, width: 80 },
    );

  }


  // 指定行row 以降のデータを読み取る
  private loadData(row: number): void {
    for (let i = this.table_datas.length + 1; i <= row; i++) {
      const column = this.members.getTableColumns(i);
      this.table_datas.push(column);
    }
  }

  ngAfterViewInit(){
    this.grid.refreshDataAndView();
  }

  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    this.members.setTableColumns(this.table_datas, this.save.isManual());
    if(this.save.isManual()){
      // 断面力手入力モードの時 部材・断面の入力があったら
      // 算出点データも同時に生成されなければならない
      this.points.setManualData();
    }
  }

  // 表の高さを計算する
  private tableHeight(): number {
    let containerHeight = window.innerHeight;
    containerHeight -= 100;
    return containerHeight;
  }

  // 表高さに合わせた行数を計算する
  private rowsCount(): number {
    const containerHeight = this.tableHeight();
    return Math.round(containerHeight / 30);
  }

}

import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ViewChild, AfterViewInit } from '@angular/core';
import { InputSafetyFactorsMaterialStrengthsService } from './safety-factors-material-strengths.service'
import { SheetComponent } from '../sheet/sheet.component';
import pq from 'pqgrid';
import { InputMembersService } from '../members/members.service';
import { visitAll } from '@angular/compiler';
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-safety-factors-material-strengths',
  templateUrl: './safety-factors-material-strengths.component.html',
  styleUrls: ['./safety-factors-material-strengths.component.scss', '../subNavArea.scss']
})
export class SafetyFactorsMaterialStrengthsComponent
  implements OnInit, OnDestroy, AfterViewInit {

  // 安全係数
  @ViewChild('grid1') grid1: SheetComponent;
  public options1: pq.gridT.options;
  private option1_list: pq.gridT.options[] = new Array();
  private columnHeaders1: object[] = [];
  private table1_datas: any[];

  // 鉄筋材料強度
  @ViewChild('grid2') grid2: SheetComponent;
  public options2: pq.gridT.options;
  private option2_list: pq.gridT.options[] = new Array();
  private columnHeaders2: object[] = [];
  private table2_datas: any[];

  // コンクリート材料強度
  @ViewChild('grid3') grid3: SheetComponent;
  public options3: pq.gridT.options;
  private option3_list: pq.gridT.options[] = new Array();
  private columnHeaders3: object[] = [];
  private table3_datas: any[];

  // 鉄骨 - 安全係数
  @ViewChild('grid4') grid4: SheetComponent;
  public options4: pq.gridT.options;
  private option4_list: pq.gridT.options[] = new Array();
  private columnHeaders4: object[] = [];
  private table4_datas: any[];

  // 鉄骨材料強度
  @ViewChild('grid5') grid5: SheetComponent;
  public options5: pq.gridT.options;
  private option5_list: pq.gridT.options[] = new Array();
  private columnHeaders5: object[] = [];
  private table5_datas: any[];    // 鉄骨材料強度

  // 杭の施工条件
  public options6: any[]; // 杭の施工条件
  public pile_factor_list: any[] = new Array();
  public pile_factor_select_id: string;

  // タブのヘッダ名
  private current_index: number;
  private groupe_list: any[];
  public groupe_name: string[];

  constructor(
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private members: InputMembersService,
    private translate: TranslateService
    ) { }

  ngOnInit() {

    this.setTitle();

    const safety = this.safety.getTableColumns();

    this.groupe_list = safety.groupe_list;
    this.groupe_name = new Array();

    // 配列を作成
    this.table1_datas = new Array();      // 安全係数
    this.table2_datas = new Array();      // 鉄筋材料
    this.table3_datas = new Array();      // コンクリート材料
    this.table4_datas = new Array();      // 鉄骨材料
    this.table5_datas = new Array();      // 鉄骨材料
    this.pile_factor_list = new Array();  // 杭の施工条件

    // 入力項目を作成
    for ( let i = 0; i < safety.groupe_list.length; i++){
      const groupe = safety.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;
      this.groupe_name.push(this.members.getGroupeName(i));

      // 安全係数
      const bar = [], steel =[];
      for(const col of safety.safety_factor[id]){

        if (col.id === 8) continue; // 最小鉄筋量の安全係数は、編集しない

        bar.push({
          id: col.id, title: col.title,
          M_rc: col.M_rc, M_rs: col.M_rs, M_rbs: col.M_rbs,
          V_rc: col.V_rc, V_rs: col.V_rs, V_rbc: col.V_rbc, V_rbs: col.V_rbs, V_rbv: col.V_rbv,
          T_rbt:col.T_rbt,
          ri: col.ri, range: col.range
        });
        steel.push({
          id: col.id, title: col.title,
          S_rs: col.S_rs, S_rb: col.S_rb
        });
      }
      this.table1_datas.push(bar);
      this.table4_datas.push(steel);
      // 鉄筋材料
      const f1 = safety.material_bar[id][0]; // D25以下
      const f2 = safety.material_bar[id][1]; // D29以上
      this.table2_datas.push([
        { 
          title: this.translate.instant("safety-factors-material-strengths.rebar_ax"),
          fsy1: f1.tensionBar.fsy, fsy2: f2.tensionBar.fsy, fsu1: f1.tensionBar.fsu, fsu2: f2.tensionBar.fsu },
        { 
          title: this.translate.instant("safety-factors-material-strengths.rebar_la"),
          fsy1: f1.sidebar.fsy,    fsy2: f2.sidebar.fsy,    fsu1: f1.sidebar.fsu,    fsu2: f2.sidebar.fsu },
        { 
          title: this.translate.instant("safety-factors-material-strengths.stirrup"),
          fsy1: f1.stirrup.fsy,   fsy2: f2.stirrup.fsy,    fsu1: f1.stirrup.fsu,    fsu2: f2.stirrup.fsu },
      ]);

      // 鉄骨材料
      const s1 = safety.material_steel[id][0]; // t16以下
      const s2 = safety.material_steel[id][1]; // t40以下
      const s3 = safety.material_steel[id][2]; // t40以上
      this.table5_datas.push([
        { 
          title: this.translate.instant("safety-factors-material-strengths.tys"),
          SRCfsyk1: s1.fsyk,  SRCfsyk2: s2.fsyk,  SRCfsyk3: s3.fsyk  },
        { 
          title: this.translate.instant("safety-factors-material-strengths.sys"),
          SRCfsyk1: s1.fsvyk, SRCfsyk2: s2.fsvyk, SRCfsyk3: s3.fsvyk },
        { 
          title: this.translate.instant("safety-factors-material-strengths.ts"),
          SRCfsyk1: s1.fsuk,  SRCfsyk2: s2.fsuk,  SRCfsyk3: s3.fsuk  }
      ]);

      // コンクリート材料
      const concrete = safety.material_concrete[id];
      this.table3_datas.push([{
        title: this.translate.instant("safety-factors-material-strengths.fck"),
        value: concrete.fck
      },{
        title: this.translate.instant("safety-factors-material-strengths.max_ca"),
        value: concrete.dmax
      }]);

      // 杭の施工条件
      this.pile_factor_list.push(safety.pile_factor[id]);

      // グリッドの設定
      this.option1_list.push({
        width: 1100,
        height: 280,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders1,
        dataModel: { data: this.table1_datas[i] },
        freezeCols: 1,
      });
      this.option2_list.push({
        width: 550,
        height: 200,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders2,
        dataModel: { data: this.table2_datas[i] },
        freezeCols: 1,
      });
      this.option3_list.push({
        width: 550,
        height: 105,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders3,
        dataModel: { data: this.table3_datas[i] },
        freezeCols: 1,
      });
      this.option4_list.push({
        width: 410,
        height: 205,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders4,
        dataModel: { data: this.table4_datas[i] },
        freezeCols: 1,
      });
      this.option5_list.push({
        width: 570,
        height: 140,
        showTop: false,
        reactive: true,
        sortable: false,
        locale: 'jp',
        numberCell: { show: false }, // 行番号
        colModel: this.columnHeaders5,
        dataModel: { data: this.table5_datas[i] },
        freezeCols: 1,
      });
    }

    this.current_index = 0;
    this.options1 = this.option1_list[0];
    this.options2 = this.option2_list[0];
    this.options3 = this.option3_list[0];
    this.options4 = this.option4_list[0];
    this.options5 = this.option5_list[0];
    this.options6 = this.pile_factor_list[0];
    this.pile_factor_select_id = this.getPileFactorSelectId();

  }

  ngAfterViewInit(){
    this.activeButtons(0);
  }

  private setTitle(): void {
    this.columnHeaders1 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { 
        title: this.translate.instant("safety-factors-material-strengths.b_safe"),
        align: 'center', colModel: [
        { title: 'γc',  dataType: 'float', 'format':'#.00', dataIndx: 'M_rc', sortable: false, width: 70 },
        { title: 'γs',  dataType: 'float', 'format':'#.00', dataIndx: 'M_rs', sortable: false, width: 70 },
        { title: 'γbs', dataType: 'float', 'format':'#.00', dataIndx: 'M_rbs', sortable: false, width: 70 }
      ]},
      { 
        title: this.translate.instant("safety-factors-material-strengths.s_safe"),
        align: 'center', colModel: [
        { title: 'γc',  dataType: 'float', 'format':'#.00', dataIndx: 'V_rc', sortable: false, width: 70 },
        { title: 'γs',  dataType: 'float', 'format':'#.00', dataIndx: 'V_rs', sortable: false, width: 70 },
        { title: 'γbc', dataType: 'float', 'format':'#.00', dataIndx: 'V_rbc', sortable: false, width: 70 },
        { title: 'γbs', dataType: 'float', 'format':'#.00', dataIndx: 'V_rbs', sortable: false, width: 70 },
        { title: 'γbd', dataType: 'float', 'format':'#.00', dataIndx: 'V_rbv', sortable: false, width: 70 }
      ]},
      {
        title: this.translate.instant("safety-factors-material-strengths.t_safe"),
        align:'center',colModel:[
        {title:'γbt',dataType:'float', 'format':'#.00', dataIndx: 'T_rbt', sortable: false, width: 70 }
      ]},
      { 
        title: this.translate.instant("safety-factors-material-strengths.γi"),
        dataType: 'float', 'format':'#.00', dataIndx: 'ri', sortable: false, width: 70 },
      { 
        title: this.translate.instant("safety-factors-material-strengths.rsb_arr"),
        dataType: 'string' , dataIndx: 'range', sortable: false, width: 100 },
    ];

    // 鉄筋材料強度
    this.columnHeaders2 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { 
        title: this.translate.instant("safety-factors-material-strengths.ys"),
        align: 'center', colModel: [
        { 
          title: this.translate.instant("safety-factors-material-strengths.d25"),
          dataType: 'float', dataIndx: 'fsy1', sortable: false, width: 70 },
        { 
          title: this.translate.instant("safety-factors-material-strengths.d29"),
          dataType: 'float', dataIndx: 'fsy2', sortable: false, width: 70 }
      ]},
      { 
        title: this.translate.instant("safety-factors-material-strengths.dts"),
        align: 'center', colModel: [
        { 
          title: this.translate.instant("safety-factors-material-strengths.d25"),
          dataType: 'float', dataIndx: 'fsu1', sortable: false, width: 70 },
        { 
          title: this.translate.instant("safety-factors-material-strengths.d29"),
          dataType: 'float', dataIndx: 'fsu2', sortable: false, width: 70 }
      ]},
    ];

    // コンクリート材料強度
    this.columnHeaders3 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 390 },
      { title: '', dataType: 'float', dataIndx: 'value', sortable: false, width: 140 },
    ];

    // 鉄骨 - 安全係数
    this.columnHeaders4 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: 'γs', dataType: 'float', 'format':'#.00', dataIndx: 'S_rs', sortable: false, width: 70 },
      { title: 'γb', dataType: 'float', 'format':'#.00', dataIndx: 'S_rb', sortable: false, width: 70 }
    ];

    // 鉄骨材料強度
    this.columnHeaders5 = [
      { title: '', align: 'left', dataType: 'string', dataIndx: 'title', editable: false, frozen: true, sortable: false, width: 250, style: { 'background': '#f5f5f5' }, styleHead: { 'background': '#f5f5f5' } },
      { title: 't≦16',     dataType: 'float', dataIndx: 'SRCfsyk1', sortable: false, width: 100 },
      { title: '16＜t≦40', dataType: 'float', dataIndx: 'SRCfsyk2', sortable: false, width: 100 },
      { title: '40＜t≦75', dataType: 'float', dataIndx: 'SRCfsyk3', sortable: false, width: 100 }
    ];

  }

  ngOnDestroy(): void {
    this.saveData();
  }
  public saveData(): void {
    const safety_factor = {};
    const material_bar = {};
    const material_steel = {};
    const material_concrete = {};
    const pile_factor = {};

    for (let i = 0; i < this.groupe_list.length; i++) {
      const groupe = this.groupe_list[i];
      const first = groupe[0];
      const id = first.g_id;

      // 安全係数
      const safety_bar = this.table1_datas[i];
      const safety_steel = this.table4_datas[i];
      const factor = [];
      for(let j = 0; j < safety_bar.length; j++){
        const bar = safety_bar[j], steel = safety_steel[j];
        factor.push({
          id: bar.id, title: bar.title,
          M_rc: bar.M_rc, M_rs: bar.M_rs, M_rbs: bar.M_rbs,
          V_rc: bar.V_rc, V_rs: bar.V_rs, V_rbc: bar.V_rbc, V_rbs: bar.V_rbs, V_rbv: bar.V_rbv,
          T_rbt:bar.T_rbt,
          ri: bar.ri, range: bar.range,
          S_rs: steel.S_rs, S_rb: steel.S_rb
        })
      }
      safety_factor[id] = factor;

      // 鉄筋材料
      const bar = this.table2_datas[i];
      material_bar[id] = [{
          tensionBar: { fsy:  bar[0].fsy1, fsu:  bar[0].fsu1 },
          sidebar:    { fsy: bar[1].fsy1,    fsu: bar[1].fsu1 },
          stirrup:    { fsy: bar[2].fsy1,    fsu: bar[2].fsu1 }
        },
        {
          tensionBar: { fsy:  bar[0].fsy2, fsu:  bar[0].fsu2 },
          sidebar:    { fsy: bar[1].fsy2,    fsu: bar[1].fsu2 },
          stirrup:    { fsy: bar[2].fsy2,    fsu: bar[2].fsu2 }
      }];

      // 鉄骨材料
      const steel = this.table5_datas[i];
      material_steel[id] =  [
        {
          fsyk: steel[0].SRCfsyk1,
          fsvyk: steel[1].SRCfsyk1,
          fsuk:  steel[2].SRCfsyk1,
        },
        {
          fsyk: steel[0].SRCfsyk2,
          fsvyk: steel[1].SRCfsyk2,
          fsuk: steel[2].SRCfsyk2,
        },
        {
          fsyk: steel[0].SRCfsyk3,
          fsvyk: steel[1].SRCfsyk3,
          fsuk: steel[2].SRCfsyk3,
        }
      ];

      // コンクリート材料
      const conc = this.table3_datas[i];
      material_concrete[id] =  {
        fck: conc[0].value,
        dmax: conc[1].value
      }

      // 杭の施工条件
      pile_factor[id] = this.pile_factor_list[i];
    }

    this.safety.setTableColumns({
      safety_factor,
      material_bar,
      material_steel,
      material_concrete,
      pile_factor
    })

  }

  // 杭の施工条件を変更を処理する関数
  public setPileFactor(j: number): void {
    const i = this.current_index;
    const pile = this.pile_factor_list[i];
    for(let k = 0; k < pile.length; k++){
      pile[k].selected = (j===k) ? true: false;
    }
    this.pile_factor_select_id = this.getPileFactorSelectId();
  }
  private getPileFactorSelectId(): string {
    const id = this.current_index
    const options6 = this.pile_factor_list[id];
    const result = options6.find((v) => v.selected === true);
    return result.id;
  }


  public activePageChenge(id: number): void {

    this.activeButtons(id);

    this.current_index = id;

    this.options1 = this.option1_list[id];
    this.grid1.options = this.options1;
    this.grid1.refreshDataAndView();
 
    this.options2 = this.option2_list[id];
    this.grid2.options = this.options2;
    this.grid2.refreshDataAndView();
 
    this.options3 = this.option3_list[id];
    this.grid3.options = this.options3;
    this.grid3.refreshDataAndView();
 
    this.options4 = this.option4_list[id];
    this.grid4.options = this.options4;
    this.grid4.refreshDataAndView();
 
    this.options5 = this.option5_list[id];
    this.grid5.options = this.options5;
    this.grid5.refreshDataAndView();

    this.options6 = this.pile_factor_list[id];
    this.pile_factor_select_id = this.getPileFactorSelectId();
  }


  // アクティブになっているボタンを全て非アクティブにする
  private activeButtons(id: number) {
    for (let i = 0; i <= this.groupe_name.length; i++) {
      const data = document.getElementById("saf" + i);
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

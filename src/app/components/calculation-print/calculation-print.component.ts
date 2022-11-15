import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { InputCalclationPrintService } from './calculation-print.service';
import { SaveDataService } from '../../providers/save-data.service';

import { AngularFireAuth } from '@angular/fire/auth';
import { UserInfoService } from 'src/app/providers/user-info.service';
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from 'src/app/providers/data-helper.module';

@Component({
  selector: 'app-calculation-print',
  templateUrl: './calculation-print.component.html',
  styleUrls: ['./calculation-print.component.scss']
})
export class CalculationPrintComponent implements OnInit, OnDestroy {

  // 設計条件
  public print_calculate_checked: boolean;
  public print_section_force_checked: boolean;
  public print_summary_table_checked: boolean;
  // 照査
  public calculate_moment_checked: boolean;
  public calculate_shear_force_checked: boolean;
  public calculate_torsional_moment_checked: boolean;
  // 部材
  public table_datas: any[];

  constructor(
    private calc: InputCalclationPrintService,
    private save: SaveDataService,
    private router: Router,
    private user: UserInfoService,
    public auth: AngularFireAuth,
    private translate: TranslateService,
    private helper: DataHelperModule
     ) { }

  ngOnInit() {

    this.print_calculate_checked = this.calc.print_selected.print_calculate_checked;
    this.print_section_force_checked = this.calc.print_selected.print_section_force_checked;
    this.print_summary_table_checked = this.calc.print_selected.print_summary_table_checked;

    this.calculate_moment_checked = this.calc.print_selected.calculate_moment_checked;
    this.calculate_shear_force_checked = this.calc.print_selected.calculate_shear_force;
    this.calculate_torsional_moment_checked = this.calc.print_selected.calculate_torsional_moment;

    this.table_datas = new Array();
    for ( const data of this.calc.getColumnData()) {
      this.table_datas.push({
        'calc_checked': data.checked,
        'g_name': data.g_name
      });
    }
  }

 
  ngOnDestroy() {
    this.saveData();
  }

  public saveData(): void {
    this.calc.print_selected.print_calculate_checked = this.print_calculate_checked;
    this.calc.print_selected.print_section_force_checked = this.print_section_force_checked;
    this.calc.print_selected.print_summary_table_checked = this.print_summary_table_checked;

    this.calc.print_selected.calculate_moment_checked = this.calculate_moment_checked;
    this.calc.print_selected.calculate_shear_force = this.calculate_shear_force_checked;
    this.calc.print_selected.calculate_torsional_moment = this.calculate_torsional_moment_checked;

    this.calc.setColumnData(this.table_datas);
  }

  // 計算開始
  onClick() {

    this.auth.currentUser.then(user=>{
      if(user === null){
        this.helper.alert(this.translate.instant("calculation-print.p_login"));
        return;
      }
      this.user.clear(user.uid);
      
      this.router.navigate(['/result-viewer']);
    });
  }

  public isManual(): boolean{
    return this.save.isManual();
  }

}

import { Component, OnInit } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { CalcSummaryTableService } from './calc-summary-table.service';

@Component({
  selector: 'app-result-summary-table',
  templateUrl: './result-summary-table.component.html',
  styleUrls: ['./result-summary-table.component.scss']
})
export class ResultSummaryTableComponent implements OnInit {
  //
  public summary_table: any;
  public isSRC: boolean = false;

  constructor(
    private helper: DataHelperModule,
    private calc: CalcSummaryTableService) { }

  ngOnInit() {
    // 初期化
    this.summary_table = new Array();
    this.isSRC = this.calc.isSRC;
    // 総括表の index配列を取得
    const keys = Object.keys(this.calc.summary_table);
    keys.sort(); // 並び変える
    // 並び変えた順に登録
    for(const k of keys){
      this.summary_table.push(this.calc.summary_table[k]);
    }
  }

   /* To copy Text from Textbox */
  public copyInputMessage($tbody) {
    const selBox = document.createElement("textarea");
    selBox.style.position = "fixed";
    selBox.style.left = "0";
    selBox.style.top = "0";
    selBox.style.opacity = "0";
    selBox.value = this.helper.table_To_text($tbody);
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand("copy");
    document.body.removeChild(selBox);
    
    alert("クリップボードにコピーしました!");
  }

}

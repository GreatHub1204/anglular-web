import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcRestorabilityTorsionalMomentService } from "./calc-restorability-torsional-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { ResultSafetyTorsionalMomentComponent } from '../result-safety-torsional-moment/result-safety-torsional-moment.component';
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: 'app-result-restorability-torsional-moment',
  templateUrl:
    '../result-safety-torsional-moment/result-safety-torsional-moment.component.html',
  styleUrls: ["../result-viewer/result-viewer.component.scss"]
})
export class ResultRestorabilityTorsionalMomentComponent implements OnInit {
  public title: string = "復旧性（地震時以外）";
  public page_index = "ap_16";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyTorsionalMomentPages: any[];

  constructor(
    private http: HttpClient,
    private calc: CalcRestorabilityTorsionalMomentService,
    private result: ResultDataService,
    private post: SetPostDataService,
    private base: ResultSafetyTorsionalMomentComponent,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private cd: ChangeDetectorRef,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("restorabilityTorsionalMoment", null);
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    // this.cd.detectChanges();
    // setTimeout(() => {
      this.post.http_post(inputJson).then(
        (response) => {
          this.isFulfilled = this.setPages(response["OutputData"]);
          this.calc.isEnable = true;
          this.summary.setSummaryTable("restorabilityTorsionalMoment", this.safetyTorsionalMomentPages);
        })
      .catch((error) => {
        this.err = 'error!!\n' + error;;
        this.summary.setSummaryTable("restorabilityTorsionalMoment");
      })
      .finally(() => {
        this.isLoading = false;
      });
    // });

  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      // 安全性破壊のページと同じ
      this.safetyTorsionalMomentPages = this.base.getSafetyPages(
        OutputData,
        this.translate.instant("result-restorability-torsional-moment.r_ex_torsion_vrfy_rslt"),
        this.calc.DesignForceList,
        this.calc.safetyID
      );
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }
}

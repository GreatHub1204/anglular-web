import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcDurabilityMomentService } from "./calc-durability-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultServiceabilityMomentComponent } from "../result-serviceability-moment/result-serviceability-moment.component";
import { CalcSafetyMomentService } from "../result-safety-moment/calc-safety-moment.service";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-durability-moment",
  templateUrl:
    "../result-serviceability-moment/result-serviceability-moment.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultDurabilityMomentComponent implements OnInit {
  public title: string = "使用性の検討";
  public page_index = "ap_7";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public serviceabilityMomentPages: any[] = new Array();

  constructor(
    private http: HttpClient,
    private calc: CalcDurabilityMomentService,
    private post: SetPostDataService,
    private base: ResultServiceabilityMomentComponent,
    private summary: CalcSummaryTableService,
    private user: UserInfoService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.isFulfilled = false;
    this.err = "";

    // POST 用データを取得する
    const postData = this.calc.setInputData();
    if (postData === null || postData.length < 1) {
      this.isLoading = false;
      this.summary.setSummaryTable("durabilityMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("durabilityMoment", this.serviceabilityMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("durabilityMoment");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }
  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      // 耐久性のページと同じ
      this.serviceabilityMomentPages = this.base.setServiceabilityPages(
        OutputData,
        this.translate.instant("result-durability-moment.u_bend_vfry_rslt"),
        // "使用性（外観）曲げひび割れの照査結果",
        this.calc.safetyID
      );
      return true;
    } catch (e) {
      this.err = e.toString();
      return false;
    }
  }

}

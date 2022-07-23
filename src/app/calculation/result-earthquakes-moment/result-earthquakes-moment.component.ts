import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { CalcEarthquakesMomentService } from "./calc-earthquakes-moment.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultRestorabilityMomentComponent } from "../result-restorability-moment/result-restorability-moment.component";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-earthquakes-moment",
  templateUrl:
    "../result-restorability-moment/result-restorability-moment.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultEarthquakesMomentComponent implements OnInit {
  public title = "復旧性（地震時）曲げモーメントの照査";
  public page_index = "ap_10";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public restorabilityMomentPages: any[] = new Array();

  constructor(
    private http: HttpClient,
    private calc: CalcEarthquakesMomentService,
    private post: SetPostDataService,
    private base: ResultRestorabilityMomentComponent,
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
      this.summary.setSummaryTable("earthquakesMoment");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("earthquakesMoment", this.restorabilityMomentPages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("earthquakesMoment");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages(OutputData: any): boolean {
    try {
      this.restorabilityMomentPages = this.base.setRestorabilityPages(
        OutputData,
        this.translate.instant("result-earthquakes-moment.r_bend_vrfy_rslt"),
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

import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";

import { CalcEarthquakesShearForceService } from "./calc-earthquakes-shear-force.service";
import { SetPostDataService } from "../set-post-data.service";
import { ResultDataService } from "../result-data.service";
import { ResultSafetyShearForceComponent } from "../result-safety-shear-force/result-safety-shear-force.component";
import { CalcSummaryTableService } from "../result-summary-table/calc-summary-table.service";
import { UserInfoService } from "src/app/providers/user-info.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-result-earthquakes-shear-force",
  templateUrl:
    "../result-safety-shear-force/result-safety-shear-force.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class ResultEarthquakesShearForceComponent implements OnInit {
  public title: string = "復旧性（地震時）";
  public page_index = "ap_11";
  public isLoading = true;
  public isFulfilled = false;
  public err: string;
  public safetyShearForcePages: any[] = new Array();

  constructor(
    private http: HttpClient,
    private calc: CalcEarthquakesShearForceService,
    private result: ResultDataService,
    private post: SetPostDataService,
    private base: ResultSafetyShearForceComponent,
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
      this.summary.setSummaryTable("earthquakesShearForce");
      return;
    }

    // postする
    console.log(this.title, postData);
    const inputJson: string = this.post.getInputJsonString(postData);
    this.post.http_post(inputJson).then(
      (response) => {
        this.isFulfilled = this.setPages(response["OutputData"]);
        this.calc.isEnable = true;
        this.summary.setSummaryTable("earthquakesShearForce", this.safetyShearForcePages);
      })
      .catch((error) => {
        this.err = 'error!!\n' + error;; 
        this.summary.setSummaryTable("earthquakesShearForce");
      })
      .finally(()=>{
        this.isLoading = false;
      });
  }

  // 計算結果を集計する
  private setPages( OutputData: any): boolean {
    try {
      // 安全性破壊のページと同じ
      this.safetyShearForcePages = this.base.getSafetyPages(
        OutputData,
        this.translate.instant("result-earthquakes-shear-force.r_shear_vrfy_rslt"),
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

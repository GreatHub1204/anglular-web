import { SetDesignForceService } from "../set-design-force.service";
import { SetPostDataService } from "../set-post-data.service";

import { Injectable } from "@angular/core";
import { InputBasicInformationService } from "src/app/components/basic-information/basic-information.service";
import { InputCalclationPrintService } from "src/app/components/calculation-print/calculation-print.service";
import { InputCrackSettingsService } from "src/app/components/crack/crack-settings.service";
import { SaveDataService } from "src/app/providers/save-data.service";
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";


@Injectable({
  providedIn: "root",
})
export class CalcDurabilityMomentService {
  // 使用性 曲げひび割れ
  public DesignForceList: any[];
  public DesignForceList1: any[];

  public isEnable: boolean;
  public safetyID: number = 0;

  constructor(
    private save: SaveDataService,
    private crack: InputCrackSettingsService,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService,
    private translate: TranslateService,
    private helper: DataHelperModule
  ) {
    this.DesignForceList = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  public setDesignForces(): void {
    this.isEnable = false;

    this.DesignForceList = new Array();

    // 曲げモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_moment_checked === false) {
      return;
    }

    // 永久荷重
    let No1 = (this.save.isManual()) ? 1 : this.basic.pickup_moment_no(1);
    // 縁応力検討用
    let No0 = (this.save.isManual()) ? 0 :this.basic.pickup_moment_no(0);

    if(No0===null) No0 = No1;
    if(No1===null) No1 = No0;
    if(No1===null) return;

    this.DesignForceList = this.force.getDesignForceList("Md", No1);
    this.DesignForceList1 = this.force.getDesignForceList("Md", No0);

    // 有効なデータかどうか
    const force1 = this.force.checkEnable('Md', this.safetyID, this.DesignForceList, this.DesignForceList1);
    this.DesignForceList = force1[0];
    this.DesignForceList1 = force1[1];

    // 使用性（外観ひび割れ）の照査対象外の着目点を削除する
    this.deleteDurabilityDisablePosition();
  }

  // 使用性（外観ひび割れ）の照査対象外の着目点を削除する
  private deleteDurabilityDisablePosition() {

    // 応急処置にtry文を配置している
    try {
      for (let ip = this.DesignForceList.length - 1; ip >= 0; ip--) {
        const pos: any = this.DesignForceList[ip];
        const info = this.crack.getCalcData(pos.index);

        const force0 = pos.designForce;
        const force1 = this.DesignForceList1[ip].designForce;
        for (let i = force0.length - 1; i >= 0; i--) {
          if(( force0[i].side==="上側引張" && info.vis_u !== true) ||
              (force0[i].side==="下側引張" && info.vis_l !== true) ||
              (force0[i].Md === 0)) {
            force0.splice(i, 1);
            force1.splice(i, 1);
          }
        }

        if (pos.designForce.length < 1) {
          this.DesignForceList.splice(ip, 1);
          this.DesignForceList1.splice(ip, 1);
        }
      }
    } catch (error) {
      this.helper.alert(this.translate.instant("calc-durability-moment.check_crack"));
      console.error(this.translate.instant("calc-durability-moment.changing_error"));
    }
  }

  // サーバー POST用データを生成する
  public setInputData(): any {
    if (this.DesignForceList.length < 1) {
      return null;
    }

    // 複数の断面力の整合性を確認する
    const force2 = this.force.alignMultipleLists(this.DesignForceList, this.DesignForceList1);

    // POST 用
    const option = {};
    // JR東日本モードの場合 barCenterPosition オプション = true
    const speci1 = this.basic.get_specification1();
    const speci2 = this.basic.get_specification2();
    if(speci1===0 && (speci2===2 || speci2===5)){
      option['barCenterPosition'] = true; 
    }

    const postData = this.post.setInputData("Md", "応力度", this.safetyID, option,
    force2[0], force2[1]);
    
    return postData;
  }
}

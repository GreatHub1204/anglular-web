import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';

import { Injectable } from '@angular/core';
import { SaveDataService } from 'src/app/providers/save-data.service';

@Injectable({
  providedIn: 'root'
})

export class CalcEarthquakesShearForceService {
  // 復旧性（地震時）せん断力
  public DesignForceList: any[];
  public isEnable: boolean;
  public safetyID: number = 4;

  constructor(
    private save: SaveDataService,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    private basic: InputBasicInformationService,
    private calc: InputCalclationPrintService) {
    this.DesignForceList = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  public setDesignForces(): void {
    this.isEnable = false;

    this.DesignForceList = new Array();

    // せん断力が計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_shear_force === false) {
      return;
    }

    const No7 = (this.save.isManual()) ? 7 : this.basic.pickup_shear_force_no(7);
    this.DesignForceList = this.force.getDesignForceList(
      'Vd', No7);

  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if (this.DesignForceList.length < 1 ) {
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable('Vd', this.safetyID, this.DesignForceList);

    // POST 用
    const option = {};

    const postData = this.post.setInputData('Vd', '耐力', this.safetyID, option, 
    force[0]);

    return postData;
  }

}

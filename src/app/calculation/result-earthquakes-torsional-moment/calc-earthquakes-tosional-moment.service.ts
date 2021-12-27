import { SaveDataService } from '../../providers/save-data.service';
import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';

import { Injectable } from '@angular/core';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';

@Injectable({
  providedIn: 'root'
})

export class CalcEarthquakesTosionalMomentService {
 // 復旧性（地震時）せん断力
 public DesignForceList: any[];
 public isEnable: boolean;
 public safetyID: number = 4;

 constructor(
   private save: SaveDataService,
   private basic: InputBasicInformationService,
   private calc: InputCalclationPrintService,
   private force: SetDesignForceService,
   private post: SetPostDataService) {
   this.DesignForceList = null;
   this.isEnable = false;
 }

 // 設計断面力の集計
 // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
 // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
 public setDesignForces(): void {

   this.isEnable = false;

   this.DesignForceList = new Array();

   // せん断力が計算対象でない場合は処理を抜ける
   if (this.calc.print_selected.calculate_torsional_moment === false) {
     return;
   }

   const No7 = (this.save.isManual()) ? 7 : this.basic.pickup_torsional_moment_no(7);
   this.DesignForceList = this.force.getDesignForceList(
     'Mt', No7);

 }

 // サーバー POST用データを生成する
 public setInputData(): any {

   if (this.DesignForceList.length < 1) {
     return null;
   }

   // 有効なデータかどうか
   const force = this.force.checkEnable('Mt', this.safetyID, this.DesignForceList);

   // POST 用
   const option = {};
   // 曲げ Mud 用
   const postData1 = this.post.setInputData(
     "Md",
     "耐力",
     this.safetyID,
     option,
     force[0]
   );

   // 曲げ Mud' 用
   const force2 = JSON.parse(JSON.stringify({ temp: force[0] })).temp;
   for (const d1 of force2) {
     for (const d2 of d1.designForce) {
       d2.side = d2.side === "上側引張" ? "下側引張" : "上側引張"; // 上下逆にする
     }
   }
   const postData2 = this.post.setInputData(
     "Md",
     "耐力",
     this.safetyID,
     option,
     force2
   );
   for (const d1 of postData2) {
     d1.side =
       d1.side === "上側引張" ? "下側引張の反対側" : "上側引張の反対側"; // 逆であることを明記する
     d1.memo = "曲げ Mud' 用";
   }

   // せん断 Mu 用
   const postData3 = this.post.setInputData(
     "Vd",
     "耐力",
     this.safetyID,
     option,
     force[0]
   );
   for (const d1 of postData3) {
     d1.Nd = 0.0;
     d1.index *= -1; // せん断照査用は インデックスにマイナスをつける
     d1.memo = "せん断 Mu 用";
   }

   // POST 用
   const postData = postData1.concat(postData2, postData3);

   return postData;
 }
}

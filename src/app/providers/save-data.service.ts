import { Injectable } from "@angular/core";
import { DataHelperModule } from "./data-helper.module";
import { InputBarsService } from "../components/bars/bars.service";
import { InputBasicInformationService } from "../components/basic-information/basic-information.service";
import { InputDesignPointsService } from "../components/design-points/design-points.service";
import { InputFatiguesService } from "../components/fatigues/fatigues.service";
import { InputMembersService } from "../components/members/members.service";
import { InputSafetyFactorsMaterialStrengthsService } from "../components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { InputSectionForcesService } from "../components/section-forces/section-forces.service";
import { InputCalclationPrintService } from "../components/calculation-print/calculation-print.service";
import { InputCrackSettingsService } from "../components/crack/crack-settings.service";
import { InputSteelsService } from "../components/steels/steels.service";
import { ShearStrengthService } from "../components/shear/shear-strength.service";

@Injectable({
  providedIn: "root",
})
export class SaveDataService {
  // ピックアップファイル
  private pickup_filename: string;
  private pickup_data: Object;
  //={
  //  1:[
  //    { index: 1, m_no, p_id, position,
  //      M:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //      S:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //      N:{max:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb },
  //         min:{ Mtd, Mdy, Mdz, Vdy, Vdz, Nd, comb }},
  //    },
  //    { index: 2, m_no, ...
  //  ],
  //  2:[
  //    ...
  // }

  constructor(
    private helper: DataHelperModule,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private shear: ShearStrengthService,
    private crack: InputCrackSettingsService,
    private fatigues: InputFatiguesService,
    private members: InputMembersService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private force: InputSectionForcesService,
    private calc: InputCalclationPrintService
  ) {
    this.clear();
  }

  public clear(): void {
    this.pickup_filename = "";
    this.pickup_data = {};
    this.basic.clear();
    this.members.clear();
    this.shear.clear();
    this.crack.clear();
    this.points.clear();
    this.bars.clear();
    this.fatigues.clear();
    this.safety.clear();
    this.force.clear();
  }

  // 断面力て入力モードかどうか判定する
  public isManual(): boolean {
    if (this.pickup_filename.trim().length === 0) {
      return true;
    } else {
      return false;
    }
  }

  // 3次元解析のピックアップデータかどうか判定する
  public is3DPickUp(): boolean {
    if (this.helper.getExt(this.pickup_filename) === "csv") {
      return true;
    }
    return false;
  }

  // ピックアップファイルを読み込む
  public readPickUpData(str: string, filename: string) {
    try {
      const tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
      // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
      const pickup1 = {};
      let i: number = 0;
      let oldMark: string = '';
      const mode = this.helper.getExt(filename);

      for (let j = 1; j < tmp.length; ++j) {
        const line = tmp[j].trim();
        if (line.length === 0) {
          continue;
        }

        let data: any;
        switch (mode) {
          case "pik":
            data = this.pikFileRead(tmp[j]); // 2次元（平面）解析のピックアップデータ
            break;
          case "csv":
            data = this.csvFileRead(line); // 3次元（立体）解析のピックアップデータ
            break;
          default:
            this.pickup_filename = "";
            this.pickup_data = {};
            return;
        }
        // 最初の行か判定する
        if(data.mark !== oldMark ){
          i = 0;
        }
        oldMark = data.mark;

        // 
        if (!(data.pickUpNo in pickup1)) {
          pickup1[data.pickUpNo] = new Array();
        }
        const pickup2 = pickup1[data.pickUpNo];

        let pickup3 = { index: i + 1, m_no: data.m_no, p_id: data.p_id, position: data.position };
        if( pickup2.length > i){
          pickup3 = pickup2[i];
        } else {
          pickup2.push(pickup3);
        }

        if (!(data.mark in pickup3)) {
          pickup3[data.mark] = {max: {}, min: {}};
        }
        const pickup4 = pickup3[data.mark];

        pickup4.max = {
          Mtd: data.maxMdx,
          Mdy: data.maxMdy,
          Mdz: data.maxMdz,
          Vdy: data.maxVdy,
          Vdz: data.maxVdz,
          Nd: data.maxNd,
          comb: data.maxPickupCase,
        };

        pickup4.min = {
          Mtd: data.minMdx,
          Mdy: data.minMdy,
          Mdz: data.minMdz,
          Vdy: data.minVdy,
          Vdz: data.minVdz,
          Nd: data.minNd,
          comb: data.minPickupCase,
        };

        i += 1;
      }

      this.basic.setPickUpData();
      this.members.setPickUpData(pickup1);
      this.points.setPickUpData(pickup1);
      this.bars.setPickUpData();
      this.steel.setPickUpData();
      this.basic.setPickUpData();
      this.shear.setPickUpData();
      this.crack.setPickUpData();
      this.fatigues.setPickUpData();
      // this.safety.clear();
      this.force.clear();

      this.pickup_filename = filename;
      this.pickup_data = pickup1;
    } catch {
      this.pickup_filename = "";
      this.pickup_data = {};
    }
  }

  // .pik 形式のファイルを 1行読む
  private pikFileRead(line: string): any {
    const mark: string = line.slice(5, 10).trim();
    let ma: string = mark;
    switch (mark) {
      case "M":
        ma = "mz";
        break;
      case "S":
        ma = "fy";
        break;
      case "N":
        ma = "fx";
        break;
    }

    const result = {
      pickUpNo: line.slice(0, 5).trim(),
      mark: ma,
      m_no: this.helper.toNumber(line.slice(10, 15)),
      maxPickupCase: line.slice(15, 20).trim(),
      minPickupCase: line.slice(20, 25).trim(),
      p_id: line.slice(25, 30).trim(),
      position: this.helper.toNumber(line.slice(30, 40)),
      maxMdx: 0,
      maxMdy: 0,
      maxMdz: this.helper.toNumber(line.slice(40, 50)),
      maxVdy: this.helper.toNumber(line.slice(50, 60)),
      maxVdz: 0,
      maxNd: -1 * this.helper.toNumber(line.slice(60, 70)),
      minMdx: 0,
      minMdy: 0,
      minMdz: this.helper.toNumber(line.slice(70, 80)),
      minVdy: this.helper.toNumber(line.slice(80, 90)),
      minVdz: 0,
      minNd: -1 * this.helper.toNumber(line.slice(90, 100)),
    };
    return result;
    // ※ このソフトでは 圧縮がプラス(+)
  }

  // .csv 形式のファイルを 1行読む
  private csvFileRead(tmp: string): any {
    const line = tmp.split(",");
    return {
      pickUpNo: line[0].trim(),
      mark: line[1].trim(),
      m_no: this.helper.toNumber(line[2].trim()),
      maxPickupCase: line[3].trim(),
      minPickupCase: line[4].trim(),
      p_id: line[5].trim(),
      position: this.helper.toNumber(line[6]),
      maxNd: -1 * this.helper.toNumber(line[7]),
      maxVdy: this.helper.toNumber(line[8]),
      maxVdz: this.helper.toNumber(line[9]),
      maxMdx: this.helper.toNumber(line[10]),
      maxMdy: this.helper.toNumber(line[11]),
      maxMdz: this.helper.toNumber(line[12]),
      minNd: -1 * this.helper.toNumber(line[13]),
      minVdy: this.helper.toNumber(line[14]),
      minVdz: this.helper.toNumber(line[15]),
      minMdx: this.helper.toNumber(line[16]),
      minMdy: this.helper.toNumber(line[17]),
      minMdz: this.helper.toNumber(line[18]),
    };
    // ※ このソフトでは 圧縮がプラス(+)
  }

  // ファイルに保存用データを生成
  public getInputText(): string {

    const jsonData = this.getInputJson();

    // string 型にする
    const result: string = JSON.stringify(jsonData);
    return result;
  }

  public getInputJson(): any {
    return {
      // ピックアップ断面力
      pickup_filename: this.pickup_filename,
      pickup_data: this.pickup_data,
      // 設計条件
      basic: this.basic.getSaveData(),
      // 部材情報
      members: this.members.getSaveData(),
      // せん断耐力
      shear: this.shear.getSaveData(),
      // ひび割れ情報
      crack: this.crack.getSaveData(),
      // 着目点情報
      points: this.points.getSaveData(),
      // 鉄筋情報
      bar: this.bars.getSaveData(),
      // 鉄骨情報
      steel: this.steel.getSaveData(),
      // 疲労情報
      fatigues: this.fatigues.getSaveData(),
      // 安全係数情報
      safety: this.safety.getSaveData(),
      // 断面力手入力情報
      force: this.force.getSaveData(),
      // 計算印刷設定
      calc: this.calc.getSaveData()
    };
  }

  // インプットデータを読み込む
  public readInputData(inputText: string) {
    const jsonData: {} = JSON.parse(inputText);
    this.setInputData(jsonData);
  }

  public setInputData(jsonData: any) {
    this.clear();

    // ピックアップ断面力
    if ("pickup_filename" in jsonData) {
      this.pickup_filename = jsonData.pickup_filename;
    }
    if ("pickup_data" in jsonData) {
      this.pickup_data = jsonData.pickup_data;
    } else{
      this.pickup_filename = '';
    }

    // 設計条件
    if ("basic" in jsonData) {
      this.basic.setSaveData(jsonData.basic);
    } else {
      this.basic.clear();
    }
    // 部材情報
    if ("members" in jsonData) {
      this.members.setSaveData(jsonData.members);
    } else {
      this.members.clear();
    }
    // ひび割れ情報
    if ("crack" in jsonData) {
      this.crack.setSaveData(jsonData.crack);
    } else {
      this.crack.clear();
    }
    // 着目点情報
    if ("points" in jsonData) {
      this.points.setSaveData(jsonData.points);
    } else {
      this.points.clear();
    }
    // せん断耐力式
    if ("shear" in jsonData) {
      this.shear.setSaveData(jsonData.shear);
      this.shear.setLaFromPoint();
    } else {
      this.shear.clear();
    }
    // 鉄筋情報
    if ("bar" in jsonData) {
      this.bars.setSaveData(jsonData.bar);
    } else {
      this.bars.clear();
    }
    // 鉄骨情報
    if ("steel" in jsonData) {
      this.steel.setSaveData(jsonData.steel);
    } else {
      this.steel.clear();
    }
    // 疲労情報
    if ("fatigues" in jsonData) {
      this.fatigues.setSaveData(jsonData.fatigues);
    } else {
      this.fatigues.clear();
    }
    // 安全係数情報
    if ("safety" in jsonData) {
      this.safety.setSaveData(jsonData.safety);
    } else {
      this.safety.clear();
    }
    // 断面力手入力情報
    if ("force" in jsonData) {
      this.force.setSaveData(jsonData.force);
    } else {
      this.force.clear();
    }
    // 計算印刷設定
    if ("calc" in jsonData) {
      this.calc.setSaveData(jsonData.calc);
    } else {
      this.calc.clear();
    }
  }

  public getPickUpData(): Object {
    return JSON.parse(
      JSON.stringify({
        temp: this.pickup_data
      })
    ).temp;
  }

  public getPickupFilename(): string{
    return this.pickup_filename;
  }
}

import { Injectable } from "@angular/core";
import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputBarsService } from "../bars/bars.service";
import { InputDesignPointsService } from "../design-points/design-points.service";

@Injectable({
  providedIn: "root",
})
export class InputFatiguesService {
  public train_A_count: number; // A列車本数
  public train_B_count: number; // B列車本数
  public service_life: number; // 耐用年数
  public reference_count: number; // 200万回

  // 疲労情報
  private fatigue_list: any[];

  constructor(
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private bars: InputBarsService
  ) {
    this.clear();
  }
  public clear(): void {
    this.train_A_count = null; // A列車本数
    this.train_B_count = null; // B列車本数
    this.service_life = null; // 耐用年数
    this.reference_count = 2000000;

    this.fatigue_list = new Array();
  }

  // 疲労情報
  public default_fatigue(id: number): any {
    return {
      m_no: null,
      index: id,
      g_name: null,
      p_name: null,
      b: null,
      h: null,
      //itle1: "上側",
      M1: this.default_fatigue_coefficient("Md"),
      V1: this.default_fatigue_coefficient("Vd"),
      //title2: "下側",
      M2: this.default_fatigue_coefficient("Md"),
      V2: this.default_fatigue_coefficient("Vd"),
    };
  }

  private default_fatigue_coefficient(target: string): any {
    const result = {
      SA: null,
      SB: null,
      NA06: null,
      NB06: null,
      NA12: null,
      NB12: null,
      A: null,
      B: null,
    };
    if (target === "Md") {
      result["r1_1"] = null;
      result["r1_3"] = null;
      result["Class"] = null;
      result["weld"] = null;
    } else {
      result["r1_2"] = null;
      result["r1_3"] = null;
    }
    return result;
  }

  public getTableColumns(): any[] {
    const table_datas: any[] = new Array();

    // グリッド用データの作成
    const groupe_list = this.points.getGroupeList();
    for (let i = 0; i < groupe_list.length; i++) {
      const table_groupe = [];
      // 部材
      for (const member of groupe_list[i]) {
        // 着目点
        let count = 0;
        for (let k = 0; k < member.positions.length; k++) {
          const pos = member.positions[k];
          if (!this.points.isEnable(pos)) {
            continue;
          }
          // barデータに（部材、着目点など）足りない情報を追加する
          const data: any = this.getTableColumn(pos.index);

          // データを2行に分ける
          const column1 = {};
          const column2 = {};
          column1["m_no"] = count === 0 ? pos.m_no : ""; // 最初の行には 部材番号を表示する
          // 1行目
          column1["index"] = data.index;
          const a: number = this.helper.toNumber(pos.position);
          column1["position"] = a === null ? "" : a.toFixed(3);
          column1["g_name"] = pos.g_name;
          column1["p_name"] = pos.p_name;
          column1["bh"] = member.B;
          column1["design_point_id"] = data.title1;
          for (const k of Object.keys(data.M1)) {
            column1["M_" + k] = data.M1[k];
          }
          for (const k of Object.keys(data.V1)) {
            column1["V_" + k] = data.V1[k];
          }
          table_groupe.push(column1);

          // 2行目
          column2["bh"] = member.H;
          column2["design_point_id"] = data.title2;
          for (const k of Object.keys(data.M2)) {
            column2["M_" + k] = data.M2[k];
          }
          for (const k of Object.keys(data.V2)) {
            column2["V_" + k] = data.V2[k];
          }
          table_groupe.push(column2);
          count++;
        }
      }
      table_datas.push(table_groupe);
    }
    return table_datas;
  }

  public getTableColumn(index: any): any {
    let result = this.fatigue_list.find((value) => value.index === index);
    const bar = this.bars.getTableColumn(index);
    if (result == null) {
      result = this.default_fatigue(index);
      result.titgle1 = bar.title1;
      this.fatigue_list.push(result);
    }
    result["title1"] = bar.rebar1.title;
    result["title2"] = bar.rebar2.title;

    return result;
  }

  // 計算に用いる値を返す
  public getCalcData(index: number): any {
    const result = {
      upper: this.default_fatigue_coefficient("Md"),
      bottom: this.default_fatigue_coefficient("Md"),
      share: this.default_fatigue_coefficient("Vd"),
    };

    // グリッド用データの作成
    for (const groupe of this.points.getGroupeList()) {
      // 部材
      let startFlg = false;
      for (let im = groupe.length - 1; im >= 0; im--) {
        const member = groupe[im];
        // 着目点
        for (let ip = member.positions.length - 1; ip >= 0; ip--) {
          const pos = member.positions[ip];
          if (pos.index === index) {
            // 当該着目点以上の値を採用値とする
            startFlg = true;
          }
          if (startFlg === false) {
            continue;
          }
          let endFlg = true;
          // barデータに（部材、着目点など）足りない情報を追加する
          const data: any = this.fatigue_list.find(
            (v) => v.index === pos.index
          );
          if (data == null) {
            continue;
          }

          // 曲げ - 上側
          const upper = data.M1;
          for (const k of Object.keys(result.upper)) {
            if (result.upper[k] === null && k in upper) {
              if (k !== "Class" && k !== "weld") {
                result.upper[k] = this.helper.toNumber(upper[k]);
              } else {
                result.upper[k] = upper[k];
              }
              endFlg = false; // まだ終わらない
            }
          }
          // 曲げ - 下側
          const bottom = data.M2;
          for (const k of Object.keys(result.bottom)) {
            if (result.bottom[k] === null && k in bottom) {
              if (k !== "Class" && k !== "weld") {
                result.bottom[k] = this.helper.toNumber(bottom[k]);
              } else {
                result.bottom[k] = bottom[k];
              }
              endFlg = false; // まだ終わらない
            }
          }
          // せん断
          for (const key of ["V1", "V2"]) {
            const share = data[key];
            for (const k of Object.keys(result.share)) {
              if (result.share[k] === null && k in share) {
                result.share[k] = this.helper.toNumber(share[k]);
                endFlg = false; // まだ終わらない
              }
            }
          }

          if (endFlg === true) {
            // 全ての値に有効な数値(null以外)が格納されたら終了する
            return result;
          }
        }
      }
      if (startFlg === true) {
        return result;
      }
    }
    return result;
  }

  public setTableColumns(fatigues: any) {
    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;

    this.fatigue_list = new Array();

    const table_datas = fatigues.table_datas;
    for (let i = 0; i < table_datas.length; i += 2) {
      const column1 = table_datas[i];
      const column2 = table_datas[i + 1];

      const f = this.default_fatigue(column1.index);

      //f.title1 = column1.design_point_id;
      f.M1.SA = column1.M_SA;
      f.M1.SB = column1.M_SB;
      f.M1.NA06 = column1.M_NA06;
      f.M1.NB06 = column1.M_NB06;
      f.M1.NA12 = column1.M_NA12;
      f.M1.NB12 = column1.M_NB12;
      f.M1.A = column1.M_A;
      f.M1.B = column1.M_B;
      f.M1.r1_1 = column1.M_r1_1;
      f.M1.r1_3 = column1.M_r1_3;
      f.M1.Class = column1.M_Class;
      f.M1.weld = column1.M_weld;

      f.V1.SA = column1.V_SA;
      f.V1.SB = column1.V_SB;
      f.V1.NA06 = column1.V_NA06;
      f.V1.NB06 = column1.V_NB06;
      f.V1.NA12 = column1.V_NA12;
      f.V1.NB12 = column1.V_NB12;
      f.V1.A = column1.V_A;
      f.V1.B = column1.V_B;
      f.V1.r1_2 = column1.V_r1_2;
      f.V1.r1_3 = column1.V_r1_3;

      //f.title2 = column2.design_point_id;
      f.M2.SA = column2.M_SA;
      f.M2.SB = column2.M_SB;
      f.M2.NA06 = column2.M_NA06;
      f.M2.NB06 = column2.M_NB06;
      f.M2.NA12 = column2.M_NA12;
      f.M2.NB12 = column2.M_NB12;
      f.M2.A = column2.M_A;
      f.M2.B = column2.M_B;
      f.M2.r1_1 = column2.M_r1_1;
      f.M2.r1_3 = column2.M_r1_3;
      f.M2.Class = column2.M_Class;
      f.M2.weld = column2.M_weld;

      f.V2.SA = column2.V_SA;
      f.V2.SB = column2.V_SB;
      f.V2.NA06 = column2.V_NA06;
      f.V2.NB06 = column2.V_NB06;
      f.V2.NA12 = column2.V_NA12;
      f.V2.NB12 = column2.V_NB12;
      f.V2.A = column2.V_A;
      f.V2.B = column2.V_B;
      f.V2.r1_2 = column2.V_r1_2;
      f.V2.r1_3 = column2.V_r1_3;

      this.fatigue_list.push(f);
    }
  }

  public setPickUpData() {}

  public getSaveData(): any {
    return {
      fatigue_list: this.fatigue_list,
      train_A_count: this.train_A_count,
      train_B_count: this.train_B_count,
      service_life: this.service_life,
    };
  }

  public setSaveData(fatigues: any) {
    this.fatigue_list = fatigues.fatigue_list;
    this.train_A_count = fatigues.train_A_count;
    this.train_B_count = fatigues.train_B_count;
    this.service_life = fatigues.service_life;
  }

  public getGroupeName(i: number): string {
    return this.points.getGroupeName(i);
  }
}

import { Injectable } from "@angular/core";
import { InputCalclationPrintService } from "../components/calculation-print/calculation-print.service";
import { InputDesignPointsService } from "../components/design-points/design-points.service";
import { InputSafetyFactorsMaterialStrengthsService } from "../components/safety-factors-material-strengths/safety-factors-material-strengths.service";
import { InputSectionForcesService } from "../components/section-forces/section-forces.service";
import { DataHelperModule } from "../providers/data-helper.module";
import { SaveDataService } from "../providers/save-data.service";

@Injectable({
  providedIn: "root",
})
export class SetDesignForceService {
  constructor(
    private save: SaveDataService,
    private helper: DataHelperModule,
    private points: InputDesignPointsService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private force: InputSectionForcesService,
    private calc: InputCalclationPrintService
  ) {}

  // 断面力一覧を取得 ////////////////////////////////////////////////////////////////
  public getDesignForceList(
    target: string,
    pickupNo: number,
    isMax: boolean = true
  ): any[] {
    if (this.helper.toNumber(pickupNo) === null) {
      return new Array();
    }
    let result: any[];
    if (this.save.isManual() === true) {
      result = this.fromManualInput(target, pickupNo);
    } else {
      result = this.fromPickUpData(target, pickupNo, isMax);
    }

    return result;
  }

  // 断面力手入力情報から断面力一覧を取得
  private fromManualInput(target: string, pickupNo: number): any[] {
    // 部材グループ・照査する着目点を取得
    const result = this.getEnableMembers(target);

    // 断面力を取得
    const force = this.force.getSaveData();
    if (force.length === 0) {
      return new Array(); // 断面力がない
    }

    // 断面力を追加
    for (let position of result) {
      // 奥行き本数
      const n: number = position.n;

      const targetForce = force.find((value) => value.index === position.index);

      if (targetForce == null) {
        return new Array(); // 存在しない着目点がある
      }

      const key = target + pickupNo;
      const value = { comb: null };
      let flg = false;
      for (const k of ["Mt", "Md", "Nd", "Vd"]) {
        const v = this.helper.toNumber(targetForce[key + "_" + k]);
        if (v === null) {
          value[k] = 0;
        } else {
          value[k] = v;
          flg = true;
        }
      }

      if (flg === false) {
        position["designForce"] = [];
        continue;
      }

      const temp: any = this.getSectionForce(target, n, {
        Mdmax: value,
        Mdmin: value,
        Vdmax: value,
        Vdmin: value,
        Ndmax: value,
        Ndmin: value,
        MtMax: value,
        Mtmin: value,
      });
      position["designForce"] = temp;
      console.log(position);
    }

    return result;
  }

  // ピックアップデータから断面力一覧を取得
  private fromPickUpData(
    target: string,
    pickupNo: number,
    isMax: boolean
  ): any[] {
    // 部材グループ・照査する着目点を取得
    const result = this.getEnableMembers(target);

    // 断面力を取得
    const pick: object = this.save.getPickUpData();

    // 断面力を追加
    const no: string = pickupNo.toString();
    if (!(no in pick)) {
      return new Array(); // ピックアップ番号の入力が不正
    }
    const targetPick = pick[no];

    // 断面力を追加
    for (const position of result) {
      // 奥行き本数
      const n: number = position.n;
      const index = position.index;
      const force = targetPick.find((value) => value.index === index);

      if (force == null) {
        return new Array(); // 存在しない着目点がある
      }

      let mKey1 = "mz",
        mKey2 = "Mdz",
        vKey1 = "fy",
        vKey2 = "Vdy";
      if (
        (target === "Md" && position.isMyCalc === true) ||
        (target === "Vd" && position.isVzCalc === true) ||
        (target === "Mt" &&
          (position.isMyCalc === true || position.isVzCalc === true))
      ) {
        // 3次元ピックアップファイルで、上記条件の場合
        mKey1 = "my";
        mKey2 = "Mdy";
        vKey1 = "fz";
        vKey2 = "Vdz";
      }

      const forceObj = {};
      const k1 = [mKey1, vKey1, "fx"];
      const k2 = ["Md", "Vd", "Nd"];
      if (target === "Mt") {
        k1.push("mx");
        k2.push("Mt");
      }
      for (let i = 0; i < k1.length; i++) {
        for (const k3 of ["max", "min"]) {
          const t = force[k1[i]];
          const m1 = t[k3];
          const k4 = k2[i] + k3;
          const tmp = {
            Md: m1[mKey2],
            Vd: m1[vKey2],
            Nd: m1.Nd,
            comb: m1.comb,
          };
          if (target === "Mt") {
            tmp["Mt"] = m1.Mtd;
          }
          forceObj[k4] = tmp;
        }
      }

      position["designForce"] = this.getSectionForce(
        target,
        n,
        forceObj,
        isMax
      );
    }

    return result;
  }

  // 計算対象の着目点のみを抽出する
  private getEnableMembers(target: string): any[] {
    const groupeList = this.points.getGroupeList();

    // 計算対象ではない着目点を削除する
    for (let i = groupeList.length - 1; i >= 0; i--) {
      // 計算・印刷画面の部材にチェックが入っていなかければ削除
      if (this.calc.calc_checked[i] === false) {
        groupeList.splice(i, 1);
        continue;
      }
      const members = groupeList[i];

      for (let j = members.length - 1; j >= 0; j--) {
        let maxFlag: boolean = false;
        const positions = members[j].positions;

        for (const pos of positions) {
          if (maxFlag === true) {
            pos["enable"] = maxFlag;
          } else {
            switch (target) {
              case "Md": // 曲げモーメントの照査の場合
                pos["enable"] = pos.isMyCalc === true || pos.isMzCalc === true;
                break;
              case "Vd": // せん断力の照査の場合
                pos["enable"] = pos.isVyCalc === true || pos.isVzCalc === true;
                break;
              case "Mt": // ねじりモーメントの照査の場合
                pos["enable"] = pos.isMtCalc === true;
                break;
            }
          }

          let p_name: string = "";
          if (p_name in pos) {
            if (pos.p_name !== null) {
              p_name = pos.p_name.toString().toUpperCase();
            }
          }

          if (pos.enable === true && p_name.indexOf("MAX") >= 0) {
            // 着目点名(p_name) に MAX というキーワードが入っていたら END まで対象とする
            maxFlag = true;
          }

          pos["isMax"] = maxFlag; // MAX 区間中は isMaxフラグを付ける

          if (p_name.indexOf("END") >= 0) {
            maxFlag = false;
          }
        }

        // 不要なポジションを削除する
        for (let k = positions.length - 1; k >= 0; k--) {
          if (positions[k].enable === false) {
            positions.splice(k, 1);
          } else {
            delete positions[k].enable;
          }
        }

        // 照査する着目点がなければ 対象部材を削除
        if (positions.length === 0) {
          members.splice(j, 1);
        }
      }

      // 照査する部材がなければ 対象グループを削除
      if (members.length === 0) {
        groupeList.splice(i, 1);
      }
    }

    // 最後に結合する
    const result = [];
    for (const g of groupeList) {
      for (const m of g) {
        let n: number = this.helper.toNumber(m.n);
        if (n === null) {
          n = 1;
        }
        n = n === 0 ? 1 : Math.abs(n);
        for (const p of m.positions) {
          // 部材の情報を追加する
          p["n"] = n;
          result.push(p);
        }
      }
    }

    return result;
  }

  // 有効なデータかどうか
  public checkEnable(
    target: string,
    safetyID: number,
    ...DesignForceListList: any
  ): any {
    const force = [];
    for (const f of DesignForceListList) {
      force.push([]);
    }

    const groupe_list = this.points.getGroupeList();

    // 安全係数が有効か判定する
    for (const groupe of groupe_list) {
      const safety = this.safety.getSafetyFactor(
        target,
        groupe[0].g_id,
        safetyID
      ); // 安全係数
      let flg = false;
      if (target === "Md") {
        for (const key of ["M_rc", "M_rs", "M_rb"]) {
          if (this.helper.toNumber(safety[key]) === null) {
            flg = true;
            break;
          }
        }
      } else if (target === "Vd") {
        for (const key of ["V_rc", "V_rs", "V_rbc", "V_rbs"]) {
          if (this.helper.toNumber(safety[key]) === null) {
            flg = true;
            break;
          }
        }
      } else {
        // Mt
        for (const key of [
          "M_rc",
          "M_rs",
          "M_rb",
          "V_rc",
          "V_rs",
          "V_rbc",
          "V_rbs",
          "T_rbt"
        ]) {
          if (this.helper.toNumber(safety[key]) === null) {
            flg = true;
            break;
          }
        }
      }
      if (flg) continue;

      // 同じインデックスの断面力を登録する
      for (const member of groupe) {
        for (const position of member.positions) {
          const index = position.index;
          for (let i = 0; i < DesignForceListList.length; i++) {
            const f = DesignForceListList[i].find((e) => e.index === index);
            if (f == null) {
              continue;
            }
            force[i].push(f);
          }
        }
      }
    }

    // 地中Max の 結合
    for (const result of force) {
      for (let ip = result.length - 1; ip >= 0; ip--) {
        if (result[ip].isMax === true) {
          const designForce = [
            { Md: 0, Nd: 0, Vd: 0, Mt: 0, side: "上側引張" },
            { Md: 0, Nd: 0, Vd: 0, Mt: 0, side: "下側引張" },
          ];
          // max 始まりを探す
          let jp = ip;
          for (let i = ip; i >= 0; i--) {
            if (result[jp].isMax === false) break;
            jp--;
          }
          jp++;
          for (let i = ip; i >= jp; i--) {
            for (const force of result[i].designForce) {
              if (target === "Md") {
                if (
                  force.side === "上側引張" &&
                  force[target] <= designForce[0][target]
                ) {
                  designForce[0] = force;
                } else if (force[target] >= designForce[0][target]) {
                  designForce[1] = force;
                }
              } else {
                if (
                  force.side === "上側引張" &&
                  Math.abs(force[target]) > Math.abs(designForce[0][target])
                ) {
                  designForce[0] = force;
                } else if (
                  Math.abs(force[target]) > Math.abs(designForce[1][target])
                ) {
                  designForce[1] = force;
                }
              }
            }
            if (i !== jp) result.splice(i, 1);
          }
          // 値が代入されなかった
          for (let i = designForce.length - 1; i >= 0; i--) {
            if (!("comb" in designForce[i])) {
              designForce.splice(i, 1);
            }
          }
          ip = jp;
          result[ip].designForce = designForce;
        }
      }
    }

    // 該当の断面力の値がない場合に、そのデータをはじく処理
    for (const result of force) {
      for (let ip = result.length - 1; ip >= 0; ip--) {
        const designForce = result[ip].designForce;
        for (let i = designForce.length - 1; i >= 0; i--) {
          const f = designForce[i];
          if(f[target] === 0){
            designForce.splice(i, 1);
          }
        }
      }
    }    

    return force;
  }

  // 複数の断面力表について、
  // 基本の断面力に無いものは削除する,
  // 基本にあってtargetにないものは断面力0値を追加する
  public alignMultipleLists(...DesignForceListList: any): any {
    const force0: any[] = DesignForceListList[0];

    for (let i = 1; i < DesignForceListList.length; i++) {
      // 全ての着目点情報を収集しておく
      const force1 = DesignForceListList[i];

      // ベースケースの複製を作っておく
      const force2 = JSON.parse(JSON.stringify({ temp: force0 })).temp;

      for (let ip = 0; ip < force0.length; ip++) {
        const pos0 = force0[ip];
        const pos2 = force2[ip];

        // 断面力情報をコピー
        for (let i = 0; i < pos0.designForce.length; i++) {
          const d0 = pos0.designForce[i];
          const def = {
            // 下記の　undefined の 場合の空の値
            side: d0.side,
            target: d0.target,
            Md: 0,
            Vd: 0,
            Nd: 0,
            comb: "",
          };

          const pos1 = force1.find((t) => t.index === pos0.index);
          if (pos1 == null) {
            pos2.designForce[i] = def;
            continue;
          }
          const d1 = pos1.designForce.find(
            (t) => t.side === d0.side && t.target === d0.target
          );
          pos2.designForce[i] = d1 !== undefined ? d1 : def;
        }
      }
      DesignForceListList[i] = force2;
    }
    return DesignForceListList;
  }

  // 設計断面力（リスト）を生成する
  private getSectionForce(
    target: string,
    n: number,
    forceObj: any,
    isMax: boolean = true
  ): any[] {
    // 設計断面の数をセット
    const result: any[] = new Array();

    let maxKey: string = target + "max";
    let minKey: string = target + "min";

    if (!(maxKey in forceObj) && !(minKey in forceObj)) {
      return result;
    }
    if (!(maxKey in forceObj)) {
      maxKey = minKey;
    }
    if (!(minKey in forceObj)) {
      minKey = maxKey;
    }

    // 最大の場合と最小の場合登録する
    for (const k of [maxKey, minKey]) {
      const force = forceObj[k];
      const side = force.Md > 0 ? "下側引張" : "上側引張";
      const f = {
        side,
        target,
        Md: force.Md / n,
        Mt: force.Mt / n,
        Vd: force.Vd / n,
        Nd: force.Nd / n,
        comb: force.comb,
      };
      // -------------------------------------------
      let flg = false;
      for (let i = 0; i < result.length; i++) {
        const r = result[i];
        if (r.side === side && r.target === target) {
          flg = true;
          // side が同じ場合値の大きい方を採用する
          if (isMax && Math.abs(r[target]) < Math.abs(f[target])) {
            result[i] = f;
          } else if (!isMax && Math.abs(r[target]) > Math.abs(f[target])) {
            result[i] = f;
          }
        }
      }
      if (flg === false) {
        result.push(f);
      }
      // -------------------------------------------
    }

    return result;
  }

  // 変動荷重として max - min の断面力を生成する
  public getLiveload(
    minDesignForceList: any[],
    maxDesignForceList: any[]
  ): any[] {
    if (maxDesignForceList.length === 0) {
      return null;
    }

    const result = JSON.parse(
      JSON.stringify({
        temp: maxDesignForceList,
      })
    ).temp;

    for (let ip = 0; ip < minDesignForceList.length; ip++) {
      // 最大応力 - 最小応力 で変動荷重を求める
      const minForce: any = minDesignForceList[ip];
      const maxForce: any = result[ip];

      for (let i = 0; i < minForce.designForce.length; i++) {
        if (maxForce.designForce.length === i) {
          break;
        }
        for (const key1 of ["Md", "Vd", "Nd"]) {
          const maxF = maxForce.designForce[i];
          const minF = minForce.designForce[i];
          if (key1 in maxF && key1 in minF) {
            maxF[key1] -= minF[key1];
          }
        }
        maxForce.designForce[i]["comb"] = "-";
      }
    }

    return result;
  }
}

import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class CalcSummaryTableService {
  //
  public summary_table: any;
  public isSRC: boolean = false;

  // 計算終了フラグ
  private summaryDone: any;

  constructor(
    private translate: TranslateService
  ) { }

  public clear() {
    this.summary_table = {};
    // 計算終了フラグ
    this.summaryDone = {
      durabilityMoment: false,
      earthquakesMoment: false,
      earthquakesShearForce: false,
      earthquakesTorsionalMoment:false,
      restorabilityMoment: false,
      restorabilityShearForce: false,
      restorabilityTorsionalMoment: false,
      SafetyFatigueMoment: false,
      safetyFatigueShearForce: false,
      safetyMoment: false,
      safetyShearForce: false,
      safetyTorsionalMoment: false,
      serviceabilityMoment: false,
      serviceabilityShearForce: false,
      serviceabilityTorsionalMoment: false,
      minimumReinforcement: false,
    };
  }

  public setSummaryTable(target: string, value: any = null) {
    if (value === null) {
      this.summaryDone[target] = true;
      return;
    }

    this.setValue(target, value);
    this.summaryDone[target] = true;
  }

  private setValue(target: string, value: any): void {
    if (value === null) {
      return;
    }
    // 鉄骨情報の有無のフラグをリセット
    this.isSRC = false;

    for (const groupe of value) {
      for (const col of groupe.columns) {
        let index: number, side: string, key: string, shape: string;
        let columns: any;

        switch (target) {
          case "durabilityMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.durabilityMoment.Wd = col.Wd.value;
            // summaryのテキスト用
            columns.durabilityMoment.Wlim = col.Wlim.value;
            if (col.Wd.value !== '-' && col.Wlim.value !== '-') {
              columns.durabilityMoment.WdWlim = (col.WdWlim.value < 1) ?
                col.WdWlim.value.toFixed(2) + ' < 1.00' :
                col.WdWlim.value.toFixed(2) + ' > 1.00';
            }
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "earthquakesMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.earthquakesMoment.ri = col.ri.value;
            columns.earthquakesMoment.Md = col.Md.value;
            columns.earthquakesMoment.Nd = col.Nd.value;
            columns.earthquakesMoment.Myd = col.Myd.value;
            columns.earthquakesMoment.ratio = col.ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "earthquakesShearForce":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.earthquakesShearForce.Vd = col.Vd.value;
            columns.earthquakesShearForce.Vyd = col.Vyd.value;
            columns.earthquakesShearForce.Vyd_Ratio = col.Vyd_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "earthquakesTorsionalMoment":
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.earthquakesMoment.ri = col.ri.value;
            columns.earthquakesTorsionalMoment.Md = col.Md.value;
            columns.earthquakesTorsionalMoment.Vd = col.Vd.value;
            columns.earthquakesTorsionalMoment.Mtd = col.Mt.value;
            columns.earthquakesTorsionalMoment.Mtud3_Ratio = col.Mtud3_Ratio.value;
            columns.earthquakesTorsionalMoment.Mtud4_Ratio = col.Mtud4_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "restorabilityMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.restorabilityMoment.ri = col.ri.value;
            columns.restorabilityMoment.Md = col.Md.value;
            columns.restorabilityMoment.Nd = col.Nd.value;
            columns.restorabilityMoment.Myd = col.Myd.value;
            columns.restorabilityMoment.ratio = col.ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "restorabilityShearForce":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.restorabilityShearForce.Vd = col.Vd.value;
            columns.restorabilityShearForce.Vyd = col.Vyd.value;
            columns.restorabilityShearForce.Vyd_Ratio = col.Vyd_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "restorabilityTorsionalMoment":
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.restorabilityMoment.ri = col.ri.value;
            columns.restorabilityTorsionalMoment.Md = col.Md.value;
            columns.restorabilityTorsionalMoment.Vd = col.Vd.value;
            columns.restorabilityTorsionalMoment.Mtd = col.Mt.value;
            columns.restorabilityTorsionalMoment.Mtud3_Ratio = col.Mtud3_Ratio.value;
            columns.restorabilityTorsionalMoment.Mtud4_Ratio = col.Mtud4_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "SafetyFatigueMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.SafetyFatigueMoment.ri = col.ri.value;
            //columns.SafetyFatigueMoment.rb = col.0.value;  rbが存在しないためコメントアウト
            columns.SafetyFatigueMoment.sigma_min = col.sigma_min.value;
            columns.SafetyFatigueMoment.sigma_rd = col.sigma_rd.value;
            columns.SafetyFatigueMoment.fsr200 = col.fsr200.value;
            columns.SafetyFatigueMoment.ratio200 = col.ratio200.value;

            this.summary_table[key] = columns;
            break;

          case "safetyFatigueShearForce":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.safetyFatigueShearForce.sigma_min = col.sigma_min.value;
            columns.safetyFatigueShearForce.sigma_rd = col.sigma_rd.value;
            columns.safetyFatigueShearForce.frd = col.frd.value;
            columns.safetyFatigueShearForce.ratio = col.ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "safetyMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.safetyMoment.ri = col.ri.value;
            columns.safetyMoment.Md = col.Md.value;
            columns.safetyMoment.Nd = col.Nd.value;
            columns.safetyMoment.Mud = col.Mud.value;
            columns.safetyMoment.ratio = col.ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "safetyShearForce":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.safetyShearForce.Vd = col.Vd.value;
            columns.safetyShearForce.Vyd = col.Vyd.value;
            columns.safetyShearForce.Vwcd = col.Vwcd.value;
            columns.safetyShearForce.Vyd_Ratio = col.Vyd_Ratio.value;
            columns.safetyShearForce.Vwcd_Ratio = col.Vwcd_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "safetyTorsionalMoment":// index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.safetyMoment.ri = col.ri.value;
            columns.safetyTorsionalMoment.Md = col.Md.value;
            columns.safetyTorsionalMoment.Vd = col.Vd.value;
            columns.safetyTorsionalMoment.Mtd = col.Mt.value;
            columns.safetyTorsionalMoment.Mtud3_Ratio = col.Mtud3_Ratio.value;
            columns.safetyTorsionalMoment.Mtud4_Ratio = col.Mtud4_Ratio.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;

            break;

          case "serviceabilityMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.serviceabilityMoment.sigma_b = col.sigma_b.value;
            columns.serviceabilityMoment.sigma_c = col.sigma_c.value;
            columns.serviceabilityMoment.sigma_s = col.sigma_s.value;
            columns.serviceabilityMoment.Wd = col.Wd.value;
            columns.serviceabilityMoment.Wlim = col.Wlim.value;
            // summaryのテキスト用
            if (col.sigma_b.value !== '-') {
              columns.serviceabilityMoment.sigma_b_div1 = col.sigma_b_ratio.dividend.toFixed(2);
              columns.serviceabilityMoment.sigma_b_div2 = col.sigma_b_ratio.divisor.toFixed(2);
            }
            if (col.sigma_c.value !== '-') {
              columns.serviceabilityMoment.sigma_c_div1 = col.sigma_c_ratio.dividend.toFixed(2);
              columns.serviceabilityMoment.sigma_c_div2 = col.sigma_c_ratio.divisor.toFixed(2);
            }
            if (col.sigma_s.value !== '-') {
              if (col.sigma_s.value !== this.translate.instant("calculation.full_comp")) {
                columns.serviceabilityMoment.sigma_s_ratio = (col.sigma_s_ratio.value < 1) ?
                  col.sigma_s_ratio.value.toFixed(2) + ' < 1.00' :
                  col.sigma_s_ratio.value.toFixed(2) + ' > 1.00';
                columns.serviceabilityMoment.sigma_s =
                  col.sigma_s_ratio.dividend.toFixed(2) + '/' + col.sigma_s_ratio.divisor.toFixed(0);
              }
            }
            if (col.Wd.value !== '-' && col.Wlim.value !== '-') {
              columns.serviceabilityMoment.WdWlim = (col.WdWlim.value < 1) ?
                col.WdWlim.value.toFixed(2) + ' < 1.00' :
                col.WdWlim.value.toFixed(2) + ' > 1.00';
            }
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "serviceabilityShearForce":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.serviceabilityShearForce.Vcd = col.Vcd.value;
            columns.serviceabilityShearForce.Vcd07 = col.Vcd07.value;
            columns.serviceabilityShearForce.sigma = col.sigma.value;
            // summaryのテキスト用
            if (col.sigma.value !== '-') {
                columns.serviceabilityShearForce.sigma_calc = (col.sigma_calc.value < 1) ? 
                                                              col.sigma_calc.value.toFixed(3) + "＜1.000" : 
                                                              col.sigma_calc.value.toFixed(3) + "＞1.000" ;
            }
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

          case "serviceabilityTorsionalMoment":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            columns.As.AwString = col.AwString.value;
            columns.As.Ss = col.Ss.value;
            // 照査結果
            columns.serviceabilityTorsionalMoment.Mtud = col.Mtud.value;
            columns.serviceabilityTorsionalMoment.comMtud07_Ratio = col.comMtud07_Ratio.value;
            //columns.serviceabilityTorsionalMoment.sigma_Ratio = col.sigma_Ratio.value;
             
            // summaryのテキスト用
            if (col.sigma_Ratio.value !== '-') {
              columns.serviceabilityTorsionalMoment.sigma_Ratio
                = col.sigma_calc.dividend.toFixed(1)
                  + "/"
                  + col.sigma_calc.divisor.toFixed(0);
              columns.serviceabilityTorsionalMoment.sigma_calc  
                = (col.sigma_calc.value < 1) ? 
                  col.sigma_calc.value.toFixed(3) + "＜1.000" : 
                  col.sigma_calc.value.toFixed(3) + "＞1.000" ;
            }
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            
            break;

          case "minimumReinforcement":
            // index と side が同じデータだ既に登録されていればそのデータに追加する
            index = col.index;
            if (index === null) {
              continue;
            }
            side = col.side_summary;
            key = this.zeroPadding(index) + "-" + side;
            columns =
              key in this.summary_table
                ? this.summary_table[key]
                : this.default(index, side);

            // 断面位置
            columns.title.title0 = col.g_name;
            columns.title.title1 = col.title1.value;
            columns.title.title2 = col.title2.value;
            columns.title.title3 = col.title3.value;
            // 断面形状
            columns.shape.name = col.shape_summary;
            columns.shape.B = col.B.value;
            columns.shape.H = col.H.value;
            columns.shape.Bt = col.Bt.value;
            columns.shape.t = col.t.value;
            columns.shape.B_summary = col.B_summary;
            columns.shape.H_summary = col.H_summary;
            // 鉄骨情報
            columns.steel.I_tension = col.steel_I_tension.value;
            columns.steel.I_web = col.steel_I_web.value;
            columns.steel.I_compress = col.steel_I_compress.value;
            columns.steel.H_flange = col.steel_H_tension.value;
            columns.steel.H_web = col.steel_H_web.value;
            columns.steel.CFTFlag = col.CFTFlag;
            // 鉄筋量
            columns.As.AstString = col.AstString.value;
            columns.As.AscString = col.AscString.value;
            columns.As.AseString = col.AseString.value;
            // 照査結果
            columns.minimumReinforcement.dmax = col.dmax.value;
            columns.minimumReinforcement.Nd = col.Nd.value;
            columns.minimumReinforcement.Mcrd = col.Mcrd_kN.value;
            columns.minimumReinforcement.Myd = col.Myd.value;
            columns.minimumReinforcement.result_Md = col.result_Md.value;
            columns.minimumReinforcement.pb = col.pb.value;
            columns.minimumReinforcement.pb075 = col.pb075.value;
            columns.minimumReinforcement.pc = col.pc.value;
            columns.minimumReinforcement.result_pc = col.result_pc.value;
            //鉄骨情報のフラグ
            if (col.steelFlag) this.isSRC = true;

            this.summary_table[key] = columns;
            break;

        }
      }
    }
    console.log(this.summary_table);
  }

  // 初期値
  private default(index: number, side: string): any {
    return {
      index: index,
      side: side,
      title: {
        m_no: "-",
        p_name: "-",
        side: "-",
      },
      shape: {
        name: "-",
        B: "-",
        H: "-",
        Bt: "-",
        t: "-",
        B_summary: "-",
        H_summary: "-",
      },
      steel: {
        I_tension: '-',
        I_web: '-',
        I_compress: '-',
        H_flange: '-',
        H_web: '-',
        CFTFlag: false,
      },
      As: {
        AstString: "-",
        AseString: "-",
        AwString: "-",
        Ss: "-",
      },
      durabilityMoment: {
        Wd: "-",
        Wlim: "-",
        WdWlim: "-",
      },
      earthquakesMoment: {
        ri: "-",
        Md: "-",
        Nd: "-",
        Myd: "-",
        ratio: "-",
      },
      earthquakesShearForce: {
        Vd: "-",
        Vyd: "-",
        Ratio: "-",
      },
      earthquakesTorsionalMoment: {
        Md: "-",
        Vd: "-",
        Mtd: "-",
        Mtud3_Ratio: "-",
        Mtud4_Ratio: "-",
      },
      restorabilityMoment: {
        ri: "-",
        Md: "-",
        Nd: "-",
        Myd: "-",
        ratio: "-",
      },
      restorabilityShearForce: {
        Vd: "-",
        Vyd: "-",
        Vyd_Ratio: "-",
      },
      restorabilityTorsionalMoment: {
        Md: "-",
        Vd: "-",
        Mtd: "-",
        Mtud3_Ratio: "-",
        Mtud4_Ratio: "-",
      },
      SafetyFatigueMoment: {
        ri: "-",
        rb: "-",
        sigma_min: "-",
        sigma_rd: "-",
        fsr200: "-",
        ratio200: "-",
      },
      safetyFatigueShearForce: {
        sigma_min: "-",
        sigma_rd: "-",
        frd: "-",
        ratio: "-",
      },
      safetyMoment: {
        ri: "-",
        Md: "-",
        Nd: "-",
        Mud: "-",
        ratio: "-",
      },
      safetyShearForce: {
        Vd: "-",
        Vyd: "-",
        Vwcd: "-",
        Vyd_Ratio: "-",
        Vwcd_Ratio: "-",
      },
      safetyTorsionalMoment: {
        Md: "-",
        Vd: "-",
        Mtd: "-",
        Mtud3_Ratio: "-",
        Mtud4_Ratio: "-",
      },
      serviceabilityMoment: {
        sigma_b: "-",
        sigma_c: "-",
        sigma_s: "-",
        Wd: "-",
        Wlim: "-",
        sigma_b_div1: "-",
        sigma_b_div2: "-",
        sigma_c_div1: "-",
        sigma_c_div2: "-",
        sigma_s_ratio: "-",
        WdWlim: "-",
      },
      serviceabilityShearForce: {
        Vcd: "-",
        Vcd07: "-",
        sigma: "-",
        sigma_calc: "-",
      },
      serviceabilityTorsionalMoment: {
        Mtud: "-",
        comMtud07_Ratio: "-",
        sigma_Ratio: "-",
        sigma_calc: "-",
      },
      minimumReinforcement: {
        dmax: "-",
        Nd: "-",
        Mcrd: "-",
        Myd: "-",
        pb: "-",
        pb075: "-",
        pc: "-",
      },
      steelFlag: false
    };
  }
  // 全ての項目が終了したかチェックする
  public checkDone(): boolean {
    for (const target of Object.keys(this.summaryDone)) {
      if (this.summaryDone[target] === false) {
        return false;
      }
    }
    return true;
  }

  private zeroPadding(NUM: number, LEN = 9) {
    return (Array(LEN).join('0') + NUM).slice(-LEN);
  }
}

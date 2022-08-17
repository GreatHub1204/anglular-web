import { Component, OnInit } from "@angular/core";
import { CalcSafetyMomentService } from "../result-safety-moment/calc-safety-moment.service";
import { CalcSafetyShearForceService } from "../result-safety-shear-force/calc-safety-shear-force.service";
import { CalcSafetyFatigueMomentService } from "../result-safety-fatigue-moment/calc-safety-fatigue-moment.service";
import { CalcSafetyFatigueShearForceService } from "../result-safety-fatigue-shear-force/calc-safety-fatigue-shear-force.service";
import { CalcServiceabilityMomentService } from "../result-serviceability-moment/calc-serviceability-moment.service";
import { CalcServiceabilityShearForceService } from "../result-serviceability-shear-force/calc-serviceability-shear-force.service";
import { CalcDurabilityMomentService } from "../result-durability-moment/calc-durability-moment.service";
import { CalcRestorabilityMomentService } from "../result-restorability-moment/calc-restorability-moment.service";
import { CalcRestorabilityShearForceService } from "../result-restorability-shear-force/calc-restorability-shear-force.service";
import { CalcEarthquakesMomentService } from "../result-earthquakes-moment/calc-earthquakes-moment.service";
import { CalcEarthquakesShearForceService } from "../result-earthquakes-shear-force/calc-earthquakes-shear-force.service";
import { InputMembersService } from "src/app/components/members/members.service";
import { CalcSafetyTorsionalMomentService } from "../result-safety-torsional-moment/calc-safety-torsional-moment.service";
import { CalcServiceabilityTorsionalMomentService } from "../result-serviceability-torsional-moment/calc-serviceability-torsional-moment.service";
import { CalcRestorabilityTorsionalMomentService } from "../result-restorability-torsional-moment/calc-restorability-torsional-moment.service";
import { CalcEarthquakesTosionalMomentService } from "../result-earthquakes-torsional-moment/calc-earthquakes-tosional-moment.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "app-section-force-list",
  templateUrl: "./section-force-list.component.html",
  styleUrls: ["../result-viewer/result-viewer.component.scss"],
})
export class SectionForceListComponent implements OnInit {
  public pages: object[];

  public isLoading = true;
  public isFulfilled = false;

  private rowCountAtPage: number = 52; // 1ページあたり 65行 --(変更)-> 最大55行程度？
  private rowTitleRowCount: number = 6; // タイトル行は 6行分
  private rowTitleRowCount1: number = 4; // タイトル行は 4行分

  constructor(
    private members: InputMembersService,
    private durabilityMoment: CalcDurabilityMomentService,
    private earthquakesMoment: CalcEarthquakesMomentService,
    private earthquakesShearForce: CalcEarthquakesShearForceService,
    private restorabilityMoment: CalcRestorabilityMomentService,
    private restorabilityShearForce: CalcRestorabilityShearForceService,
    private SafetyFatigueMoment: CalcSafetyFatigueMomentService,
    private safetyFatigueShearForce: CalcSafetyFatigueShearForceService,
    private safetyMoment: CalcSafetyMomentService,
    private safetyShearForce: CalcSafetyShearForceService,
    private serviceabilityMoment: CalcServiceabilityMomentService,
    private serviceabilityShearForce: CalcServiceabilityShearForceService,
    private safetyTorsionalMoment: CalcSafetyTorsionalMomentService,
    private serviceabilityTorsionalMoment: CalcServiceabilityTorsionalMomentService,
    private restorabilityTorsionalMoment: CalcRestorabilityTorsionalMomentService,
    private earthquakesTorsionalMoment: CalcEarthquakesTosionalMomentService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    this.pages = new Array();

    const groupeList = this.members.getGroupeList();
    for (let i = 0; i < groupeList.length; i++) {
      const memberList = groupeList[i];

      // グループタイプ によって 上側・下側の表示を 右側・左側 等にする
      const g_id: string = memberList[0].g_id;
      let upperSideName: string = this.translate.instant("section-force-list.Top");
      let bottomSideName: string = this.translate.instant("section-force-list.Under");
      let upperName: string = this.translate.instant("section-force-list.top");
      let bottomName: string = this.translate.instant("section-force-list.under");
      const g_name: string = this.members.getGroupeName(i);

      let page: any = null;

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      const g_name_moment: string = g_name + this.translate.instant("section-force-list.check_bend");
      let tableType: number = 1;
      let currentRow: number = 0;

      // 使用性,耐久性曲げモーメントの照査
      if (
        this.serviceabilityMoment.DesignForceList.length +
          this.durabilityMoment.DesignForceList.length >
        0
      ) {
        const data = [];
        const title = [];
        if (
          this.serviceabilityMoment.DesignForceList.length > 0 &&
          this.durabilityMoment.DesignForceList.length > 0
        ) {
          // 耐久性と使用性両方照査する場合
          data.push(this.serviceabilityMoment.DesignForceList1);
          title.push(this.translate.instant("section-force-list.d_s_stress"));
          data.push(this.serviceabilityMoment.DesignForceList);
          title.push(this.translate.instant("section-force-list.d_s_pa"));
        } else if (
          this.serviceabilityMoment.DesignForceList.length > 0 &&
          this.durabilityMoment.DesignForceList.length == 0
        ) {
          // 耐久性のみ照査する場合
          data.push(this.serviceabilityMoment.DesignForceList1);
          title.push(this.translate.instant("section-force-list.d_stress"));
          data.push(this.serviceabilityMoment.DesignForceList);
          title.push(this.translate.instant("section-force-list.d_pa"));
        } else {
          // 使用性のみ照査する場合
          data.push(this.durabilityMoment.DesignForceList1);
          title.push(this.translate.instant("section-force-list.u_stress"));
          data.push(this.durabilityMoment.DesignForceList);
          title.push(this.translate.instant("section-force-list.u_pa"));
        }
        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_moment,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      // 安全性（破壊）曲げモーメントの照査
      if (this.safetyMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.safetyMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_moment,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.safe_d")
          );
        }
      }

      // 安全性（疲労破壊）曲げモーメントの照査
      if (this.SafetyFatigueMoment.DesignForceList.length > 0) {
        const data = [];
        const title = [];
        data.push(this.SafetyFatigueMoment.DesignForceList);
          title.push(this.translate.instant("section-force-list.safe_max"));
        data.push(this.SafetyFatigueMoment.DesignForceList3);
          title.push(this.translate.instant("section-force-list.safe_min"));
        data.push(this.SafetyFatigueMoment.DesignForceList2);
          title.push(this.translate.instant("section-force-list.safe_var"));
        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_moment,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      // 復旧性（地震時以外）曲げモーメントの照査
      if (this.restorabilityMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.restorabilityMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_moment,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_ex")
          );
        }
      }

      // 復旧性（地震時）曲げモーメントの照査
      if (this.earthquakesMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.earthquakesMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_moment,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_at")
          );
        }
      }
      if (page !== null) {
        this.pages.push(page);
        page = null;
      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      const g_name_shear: string = g_name + this.translate.instant("section-force-list.check_shear");
      tableType = 2;
      currentRow = 0;

      // 耐久性せん断力に対する照査
      if (this.serviceabilityShearForce.DesignForceList.length > 0) {
        const data = [];
        const title = [];
        // 耐久性のみ照査する場合
        data.push(this.serviceabilityShearForce.DesignForceList);
        title.push(this.translate.instant("section-force-list.d_crack"));
        data.push(this.serviceabilityShearForce.DesignForceList1);
        title.push(this.translate.instant("section-force-list.d_pa"));
        data.push(this.serviceabilityShearForce.DesignForceList2);
        title.push(this.translate.instant("section-force-list.d_fa"));

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      // 安全性（破壊）せん断力に対する照査
      if (this.safetyShearForce.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.safetyShearForce.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.safe_d")
          );
        }
      }

      // 安全性（疲労破壊）せん断力に対する照査
      if (this.safetyFatigueShearForce.DesignForceList.length > 0) {
        const data = [];
        const title = [];
        // 耐久性のみ照査する場合
        data.push(this.safetyFatigueShearForce.DesignForceList);
        title.push(this.translate.instant("section-force-list.safe_max"));
        data.push(this.safetyFatigueShearForce.DesignForceList3);
        title.push(this.translate.instant("section-force-list.safe_min"));
        data.push(this.safetyFatigueShearForce.DesignForceList2);
        title.push(this.translate.instant("section-force-list.safe_var"));

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      // 復旧性（地震時以外）せん断力に対する照査
      if (this.restorabilityShearForce.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.restorabilityShearForce.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_ex")
          );
        }
      }

      // 復旧性（地震時）せん断力に対する照査
      if (this.earthquakesShearForce.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.earthquakesShearForce.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_shear,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_at")
          );
        }
      }

      if (page !== null) {
        this.pages.push(page);
        page = null;
      }
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      const g_name_tosion: string = g_name + this.translate.instant("section-force-list.check_torsion");
      tableType = 3;
      currentRow = 0;

      // ねじりひび割れに対する照査
      if (this.serviceabilityTorsionalMoment.DesignForceList.length > 0) {
        const data = [];
        const title = [];
        // 耐久性のみ照査する場合
        data.push(this.serviceabilityTorsionalMoment.DesignForceList);
        title.push(this.translate.instant("section-force-list.d_torsion"));
        data.push(this.serviceabilityTorsionalMoment.DesignForceList1);
        title.push(this.translate.instant("section-force-list.d_pa"));

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage(
            memberList,
            upperName,
            bottomName,
            data[i]
          );
          if (table.length === 0) {
            continue;
          }
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            title[i]
          );
        }
      }

      // 安全性（破壊）ねじりモーメントに対する照査
      if (this.safetyTorsionalMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.safetyTorsionalMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.safe_d")
          );
        }
      }

      // 復旧性（地震時以外）ねじりモーメントに対する照査
      if (this.restorabilityTorsionalMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.restorabilityTorsionalMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_ex")
          );
        }
      }

      // 復旧性（地震時）ねじりモーメントに対する照査
      if (this.earthquakesTorsionalMoment.DesignForceList.length > 0) {
        const table = this.setPage(
          memberList,
          upperName,
          bottomName,
          this.earthquakesTorsionalMoment.DesignForceList
        );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(
            table,
            currentRow,
            tableType
          );
          currentRow = info.currentRow;
          page = this.setTables(
            info.tableRowsOfPage,
            page,
            g_name_tosion,
            upperSideName,
            bottomSideName,
            tableType,
            this.translate.instant("section-force-list.r_at")
          );
        }
      }

      if (page !== null) {
        this.pages.push(page);
        page = null;
      }
    }

    this.isLoading = false;
    this.isFulfilled = true;
  }

  private setTables(
    rows: any[],
    page: any,
    g_name: string,
    upperSideName: string,
    bottomSideName: string,
    tableType: number,
    title: string
  ): any {
    if (page === null) {
      page = {
        g_name: g_name,
        tables: new Array(),
        tableType: tableType,
      };
    }
    // 最初の１つ目のテーブルは、同じページに
    if (rows[0] !== null) {
      let y: number = 70;
      y += tableType === 1 ? rows[0].length * 16 : rows[0].length * 32;
      page.tables.push({
        title: title,
        upperSideName: upperSideName,
        bottomSideName: bottomSideName,
        rows: rows[0],
        viewBox: "0 0 568 " + y.toString(),
        height: y.toString(),
      });
    }
    // ２つ目以降のテーブル
    for (let i = 1; i < rows.length; i++) {
      // ページを登録
      this.pages.push(page);
      page = {
        g_name: g_name,
        tables: new Array(),
        tableType: tableType,
      };
      // 新しいテーブルを登録
      let y: number = 70;
      y += tableType === 1 ? rows[i].length * 16 : rows[i].length * 32;
      const table: any = {
        title: title,
        upperSideName: upperSideName,
        bottomSideName: bottomSideName,
        rows: rows[i],
        viewBox: "0 0 568 " + y.toString(),
        height: y.toString(),
      };
      page.tables.push(table);
    }
    return page;
  }

  private getTableRowsOfPage(
    targetRows: any[],
    currentRow: number,
    tableType: number
  ): any {
    const result: object = {};
    const tableRowsOfPage: any[] = new Array();
    let rows: any[] = new Array();
    //currentRow += this.rowTitleRowCount;
    currentRow +=
      currentRow === 0 ? this.rowTitleRowCount : this.rowTitleRowCount1;
    const a: number = tableType === 1 ? 1 : 2;
    const RowsCount: number = targetRows.length * a;

    if (currentRow > this.rowTitleRowCount) {
      if (this.rowCountAtPage < currentRow + RowsCount) {
        // 改ページが必要
        if (this.rowTitleRowCount1 + RowsCount < this.rowCountAtPage) {
          // 次のページに収まる
          tableRowsOfPage.push(null);
          tableRowsOfPage.push(targetRows);
          currentRow = this.rowTitleRowCount + RowsCount;
          result["currentRow"] = currentRow;
          result["tableRowsOfPage"] = tableRowsOfPage;
          return result;
        }
      }
    }

    let i: number = currentRow;

    for (const row of targetRows) {
      rows.push(row);
      i += tableType === 1 ? 1 : 2;
      if (this.rowCountAtPage < i) {
        tableRowsOfPage.push(rows);
        rows = new Array();
        i = this.rowTitleRowCount;
      }
    }
    if (i > this.rowTitleRowCount) {
      tableRowsOfPage.push(rows);
    }
    currentRow = i;
    result["currentRow"] = currentRow;
    result["tableRowsOfPage"] = tableRowsOfPage;
    return result;
  }

  private setPage(
    memberList: any[],
    upperName: string,
    bottomName: string,
    forces: any[]
  ): any[] {
    const result = [];
    for (const member of memberList) {
      const tmp = forces.filter((a) => a.m_no === member.m_no);
      if (tmp == null) {
        continue;
      }
      for (const pos of tmp) {
        const p: any = {
          m_no: member.m_no,
          p_id: pos.p_id,
          position: pos.position.toFixed(3),
          p_name: pos.p_name,
          upperSideName: upperName,
          bottomSideName: bottomName,
        };

        for (const pp of pos.designForce) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          if ("Md" in pp) {
            if (!isNaN(pp.Md) && pp.Md !== null) {
              md.value = pp.Md.toFixed(2);
              md.position = "right";
            }
          }
          if ("Nd" in pp) {
            if (!isNaN(pp.Nd) && pp.Nd !== null) {
              nd.value = pp.Nd.toFixed(2);
              nd.position = "right";
            }
          }
          if ("Vd" in pp) {
            if (!isNaN(pp.Vd) && pp.Vd !== null) {
              vd.value = pp.Vd.toFixed(2);
              vd.position = "right";
            }
          }
          if ("Mt" in pp) {
            if (!isNaN(pp.Mt) && pp.Mt !== null) {
              mt.value = pp.Mt.toFixed(2);
              mt.position = "right";
            }
          }
          if ("comb" in pp) {
            comb.value = pp.comb;
            comb.position = "center";
          }
          const pt = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
          switch (pp.side) {
            case "上側引張":
              p["upper"] = pt;
              break;
            case "下側引張":
              p["lower"] = pt;
              break;
          }
        }

        if ("upper" in p === false) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          p["upper"] = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
        }
        if ("lower" in p === false) {
          let md = { value: "-", position: "center" };
          let nd = { value: "-", position: "center" };
          let vd = { value: "-", position: "center" };
          let mt = { value: "-", position: "center" };
          let comb = { value: "-", position: "center" };
          p["lower"] = { Md: md, Nd: nd, Vd: vd, Mt: mt, comb: comb };
        }

        result.push(p);
      }
    }
    return result;
  }
}

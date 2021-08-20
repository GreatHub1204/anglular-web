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
    private serviceabilityShearForce: CalcServiceabilityShearForceService
  ) {}

  ngOnInit() {
    this.pages = new Array();

    const groupeList = this.members.getGroupeList();
    for (let i = 0; i < groupeList.length; i++) {
      const memberList = groupeList[i];
      let currentRow: number = 0;

      // グループタイプ によって 上側・下側の表示を 右側・左側 等にする
      const g_id: string = memberList[0].g_id;
      let upperSideName: string = "上　　 側";
      let bottomSideName: string = "下　　 側";
      let upperName: string = "上側";
      let bottomName: string = "下側";

      const g_name: string = this.members.getGroupeName(i);

      let page: any = null;
      const g_name_moment: string = g_name + " 曲げモーメントの照査";
      let tableType: number = 1;

      // 使用性,耐久性曲げモーメントの照査
      if (this.serviceabilityMoment.DesignForceList.length +
          this.durabilityMoment.DesignForceList.length > 0 ) {
        const data = [];
        const title = [];
        if (this.serviceabilityMoment.DesignForceList.length > 0 &&
            this.durabilityMoment.DesignForceList.length > 0 ) {
          // 耐久性と使用性両方照査する場合
          data.push(this.serviceabilityMoment.DesignForceList1);
          title.push("耐久性、使用性　縁引張応力度検討用");
          data.push(this.serviceabilityMoment.DesignForceList);
          title.push("耐久性、使用性　永久作用");
        } else if (
          this.serviceabilityMoment.DesignForceList.length > 0 &&
          this.durabilityMoment.DesignForceList.length == 0 ) {
          // 耐久性のみ照査する場合
          data.push(this.serviceabilityMoment.DesignForceList1);
          title.push("耐久性　縁引張応力度検討用");
          data.push(this.serviceabilityMoment.DesignForceList);
          title.push("耐久性　永久作用");
        } else {
          // 使用性のみ照査する場合
          data.push(this.durabilityMoment.DesignForceList1);
          title.push("使用性　縁引張応力度検討用");
          data.push(this.durabilityMoment.DesignForceList);
          title.push("使用性　永久作用");
        }
        for (let i = 0; i < data.length; i++) {
          const table = this.setPage( memberList, upperName, bottomName, data[i]);
          if (table.length === 0) { continue; }
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType);
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_moment, upperSideName, bottomSideName, tableType, title[i]);
        }
      }

      // 安全性（破壊）曲げモーメントの照査
      if (this.safetyMoment.DesignForceList.length > 0) {
        const table = this.setPage( memberList, upperName, bottomName, this.safetyMoment.DesignForceList );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_moment, upperSideName, bottomSideName, tableType, "安全性（破壊）" );
        }
      }

      // 安全性（疲労破壊）曲げモーメントの照査
      if (this.SafetyFatigueMoment.DesignForceList.length > 0 ) {
        const data = [];
        const title = [];
        data.push(this.SafetyFatigueMoment.DesignForceList);
        title.push("安全性（疲労破壊）最大応力");
        data.push(this.SafetyFatigueMoment.DesignForceList3);
        title.push("安全性（疲労破壊）最小応力");
        data.push(this.SafetyFatigueMoment.DesignForceList2);
        title.push("安全性（疲労破壊）変動応力");
        for (let i = 0; i < data.length; i++) {
          const table = this.setPage( memberList, upperName, bottomName, data[i]);
          if (table.length === 0) { continue; }
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType);
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_moment, upperSideName, bottomSideName, tableType, title[i]);
        }
      }

      // 復旧性（地震時以外）曲げモーメントの照査
      if (this.restorabilityMoment.DesignForceList.length > 0) {
        const table = this.setPage( memberList, upperName, bottomName, this.restorabilityMoment.DesignForceList );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_moment, upperSideName, bottomSideName,　tableType,　"復旧性（地震時以外）"　);
        }
      }

      // 復旧性（地震時）曲げモーメントの照査
      if (this.earthquakesMoment.DesignForceList.length > 0) {
        const table = this.setPage( memberList, upperName, bottomName, this.earthquakesMoment.DesignForceList　);
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage(　table,　currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_moment, upperSideName, bottomSideName,　tableType, "復旧性（地震時）" );
        }
      }
      if (page !== null) {
        this.pages.push(page);
        page = null;
      }

      const g_name_shear: string = g_name + " せん断力に対する照査";
      tableType = 2;
      currentRow = 0;

      // 耐久性せん断力に対する照査
      if (this.serviceabilityShearForce.DesignForceList.length > 0 ) {
        const data = [];
        const title = [];
        // 耐久性のみ照査する場合
        data.push(this.serviceabilityShearForce.DesignForceList);
        title.push("耐久性　ひび割れ照査必要性の検討用");
        data.push(this.serviceabilityShearForce.DesignForceList1);
        title.push("耐久性　永久作用");
        data.push(this.serviceabilityShearForce.DesignForceList2);
        title.push("耐久性　変動作用");

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage( memberList, upperName, bottomName, data[i]);
          if (table.length === 0) { continue; }
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType);
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_shear, upperSideName, bottomSideName, tableType, title[i]);
        }
      }

      // 安全性（破壊）せん断力に対する照査
      if (this.safetyShearForce.DesignForceList.length > 0) {
        const table = this.setPage(　memberList, upperName, bottomName,　this.safetyShearForce.DesignForceList );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_shear, upperSideName, bottomSideName, tableType, "安全性（破壊）" );
        }
      }

      // 安全性（疲労破壊）せん断力に対する照査
      if (this.safetyFatigueShearForce.DesignForceList.length > 0 ) {
        const data = [];
        const title = [];
        // 耐久性のみ照査する場合
        data.push(this.safetyFatigueShearForce.DesignForceList);
        title.push("安全性（疲労破壊）最大応力");
        data.push(this.safetyFatigueShearForce.DesignForceList3);
        title.push("安全性（疲労破壊）最小応力");
        data.push(this.safetyFatigueShearForce.DesignForceList2);
        title.push("安全性（疲労破壊）変動応力");

        for (let i = 0; i < data.length; i++) {
          const table = this.setPage( memberList, upperName, bottomName, data[i]);
          if (table.length === 0) { continue; }
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType);
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_shear, upperSideName, bottomSideName, tableType, title[i]);
        }
      }

      // 復旧性（地震時以外）せん断力に対する照査
      if (this.restorabilityShearForce.DesignForceList.length > 0) {
        const table = this.setPage(　memberList, upperName, bottomName, this.restorabilityShearForce.DesignForceList );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_shear, upperSideName, bottomSideName, tableType, "復旧性（地震時以外）" );
        }
      }


      // 復旧性（地震時）せん断力に対する照査
      if (this.earthquakesShearForce.DesignForceList.length > 0) {
        const table = this.setPage(　memberList, upperName, bottomName, this.earthquakesShearForce.DesignForceList );
        if (table.length > 0) {
          const info: any = this.getTableRowsOfPage( table, currentRow, tableType );
          currentRow = info.currentRow;
          page = this.setTables( info.tableRowsOfPage, page, g_name_shear, upperSideName, bottomSideName, tableType, "復旧性（地震時）" );
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

  private setTables( rows: any[], page: any, g_name: string,
    upperSideName: string, bottomSideName: string,
    tableType: number, title: string
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
    currentRow += currentRow === 0 ? this.rowTitleRowCount : this.rowTitleRowCount1;
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

  private setPage( memberList: any[],
    upperName: string, bottomName: string,
    forces: any[]
  ): any[] {
    const result = [];
    for (const member of memberList) {
      const tmp = forces.filter((a) => a.m_no === member.m_no);
      if (tmp === undefined) {
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

        /*for (const pp of pos.designForce) {
          const pt = { Md: "-", Nd: "-", Vd: "-", comb: "-" };
          if ("Md" in pp) {
            pt.Md = pp.Md.toFixed(2);
          }
          if ("Nd" in pp) {
            pt.Nd = pp.Nd.toFixed(2);
          }
          if ("Vd" in pp) {
            pt.Vd = pp.Vd.toFixed(2);
          }
          if ("comb" in pp) {
            pt.comb = pp.comb;
          }
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
          p["upper"] = { Md: "-", Nd: "-", Vd: "-", comb: "-" };
        }
        if ("lower" in p === false) {
          p["lower"] = { Md: "-", Nd: "-", Vd: "-", comb: "-" };
        }*/
        for (const pp of pos.designForce) {
          let md = { value: "-", position: "center"};
          let nd = { value: "-", position: "center"};
          let vd = { value: "-", position: "center"};
          let comb = { value: "-", position: "center"};
          if ("Md" in pp) {
            md.value = pp.Md.toFixed(2);
            md.position = "right";
          }
          if ("Nd" in pp) {
            nd.value = pp.Nd.toFixed(2);
            nd.position = "right";
          }
          if ("Vd" in pp) {
            vd.value = pp.Vd.toFixed(2);
            vd.position = "right";
          }
          if ("comb" in pp) {
            comb.value = pp.comb;
            comb.position = "center";
          }
          const pt = { Md: md, Nd: nd, Vd: vd, comb: comb };
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
          let md = { value: "-", position: "center"};
          let nd = { value: "-", position: "center"};
          let vd = { value: "-", position: "center"};
          let comb = { value: "-", position: "center"};
          p["upper"] = { Md: md, Nd: nd, Vd: vd, comb: comb };
        }
        if ("lower" in p === false) {
          let md = { value: "-", position: "center"};
          let nd = { value: "-", position: "center"};
          let vd = { value: "-", position: "center"};
          let comb = { value: "-", position: "center"};
          p["lower"] = { Md: md, Nd: nd, Vd: vd, comb: comb };
        }

        result.push(p);
      }
    }
    return result;
  }
}

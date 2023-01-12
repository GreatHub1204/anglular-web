import { Component } from "@angular/core";
import { InputDesignPointsService } from "./components/design-points/design-points.service";
import { InputMembersService } from "./components/members/members.service";
import { ConfigService } from "./providers/config.service";
import { SaveDataService } from "./providers/save-data.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  constructor(
    private config: ConfigService,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService
  ) {}

  public isManual(): boolean {
    return this.save.isManual();
  }

  // 画面遷移したとき現在表示中のコンポーネントを覚えておく
  public onActivate(componentRef: any): void {
    this.config.setActiveComponent(componentRef);
  }
  public onDeactivate(componentRef: any): void {
    this.config.setActiveComponent(null);
  }

  public activePageChenge(id: number): void {
    this.deactiveButtons();
    document.getElementById(id.toString()).classList.add("is-active");
  }

  // アクティブになっているボタンを全て非アクティブにする
  public deactiveButtons() {
    for (let i = 0; i <= 10; i++) {
      const data = document.getElementById(i + "");
      if (data != null) {
        if (data.classList.contains("is-active")) {
          data.classList.remove("is-active");
        }
      }
    }
  }

  // 部材に何か入力されたら呼ばれる
  // 有効な入力行があったら次のボタンを有効にする
  public isMemberEnable = false;
  public memberChange(flg: boolean = this.members.checkMemberEnables()): void {
    if (this.isMemberEnable !== flg) {
      for (const id of ["2", "7"]) {
        const data = document.getElementById(id);
        if (data != null) {
          if (flg === true) {
            if (data.classList.contains("disabled")) {
              data.classList.remove("disabled");
            }
          } else {
            if (!data.classList.contains("disabled")) {
              data.classList.add("disabled");
            }
          }
        }
      }
      this.isMemberEnable = flg;
    }

    if (this.isManual()) {
      this.designPointChange(this.isMemberEnable);
    }
  }

  // 算出点に何か入力されたら呼ばれる
  // 有効な入力行があったら次のボタンを有効にする
  public isDesignPointEnable = false;
  public designPointChange(flg = this.points.designPointChange()): void {
    // if(!this.save.isManual()){
    //   flg = this.points.designPointChange();
    // }

    if (this.isDesignPointEnable !== flg) {
      for (const id of ["3", "4", "5", "6", "7", "10"]) {
        const data = document.getElementById(id);
        if (data != null) {
          if (flg === true) {
            if (data.classList.contains("disabled")) {
              data.classList.remove("disabled");
            }
          } else {
            if (!data.classList.contains("disabled")) {
              data.classList.add("disabled");
            }
          }
        }
      }
      this.isDesignPointEnable = flg;
    }
  }
}

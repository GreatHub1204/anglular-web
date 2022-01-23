﻿import { Component, OnInit, ViewChild } from "@angular/core";
import { NgbModal, ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import { AppComponent } from "../../app.component";

import {
  Router,
  ActivatedRoute,
  ParamMap,
  NavigationEnd,
} from "@angular/router";

import { LoginDialogComponent } from "../login-dialog/login-dialog.component";
import { WaitDialogComponent } from "../wait-dialog/wait-dialog.component";

import * as FileSaver from "file-saver";
import { SaveDataService } from "../../providers/save-data.service";
import { ConfigService } from "../../providers/config.service";
import { DsdDataService } from "src/app/providers/dsd-data.service";

import { DataHelperModule } from "src/app/providers/data-helper.module";
import { InputMembersService } from "../members/members.service";
import { InputDesignPointsService } from "../design-points/design-points.service";
import { AngularFireAuth } from "@angular/fire/auth";

import { LanguagesService } from "../../providers/languages.service";

@Component({
  selector: "app-menu",
  templateUrl: "./menu.component.html",
  styleUrls: ["./menu.component.scss"],
})
export class MenuComponent implements OnInit {
  public fileName: string;
  public pickup_file_name: string;

  constructor(
    private modalService: NgbModal,
    private app: AppComponent,
    private save: SaveDataService,
    private members: InputMembersService,
    private points: InputDesignPointsService,
    private helper: DataHelperModule,
    private dsdData: DsdDataService,
    private router: Router,
    private config: ConfigService,
    public auth: AngularFireAuth,
    public language: LanguagesService
  ) {
    this.fileName = "";
    this.pickup_file_name = "";
  }

  ngOnInit() {
    this.renew();
  }

  // 新規作成
  renew(): void {
    this.router.navigate(["/blank-page"]);
    this.app.deactiveButtons();

    // this.fileName = "";
    this.fileName = "";
    this.pickup_file_name = "";

    setTimeout(() => {
      this.save.clear();
      this.app.memberChange(false); // 左側のボタンを無効にする。
    }, 10);
  }

  // ファイルを開く
  open(evt) {
    const file = evt.target.files[0];
    const modalRef = this.modalService.open(WaitDialogComponent);
    this.fileName = file.name;
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.app.deactiveButtons();

    switch (this.helper.getExt(this.fileName)) {
      case "dsd":
        this.fileToBinary(file)
          .then((buff) => {
            const pik = this.dsdData.readDsdData(buff);
            this.open_done(modalRef);
            if (pik !== null) {
              alert(pik + " を開いてください！");
            }
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
        break;
      default:
        this.fileToText(file)
          .then((text) => {
            this.save.readInputData(text);
            this.open_done(modalRef);
          })
          .catch((err) => {
            this.open_done(modalRef, err);
          });
    }
  }

  private open_done(modalRef, error = null) {
    // 後処理
    if (error === null) {
      this.pickup_file_name = this.save.getPickupFilename();
      this.app.memberChange(); // 左側のボタンを有効にする。
      this.app.designPointChange(); // 左側のボタンを有効にする。
    } else {
      console.log(error);
    }

    modalRef.close();
  }

  // ピックアップファイルを開く
  pickup(evt) {
    const file = evt.target.files[0];
    const modalRef = this.modalService.open(WaitDialogComponent);
    evt.target.value = "";

    this.router.navigate(["/blank-page"]);
    this.app.deactiveButtons();

    this.fileToText(file)
      .then((text) => {
        this.save.readPickUpData(text, file.name); // データを読み込む
        this.pickup_file_name = this.save.getPickupFilename();
        modalRef.close();
      })
      .catch((err) => {
        modalRef.close();
        console.log(err);
      });
  }

  // ファイルのテキストを読み込む
  private fileToText(file): any {
    const reader = new FileReader();
    reader.readAsText(file);
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });
  }

  // バイナリのファイルを読み込む
  private fileToBinary(file): any {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
    });
  }

  // ファイルを保存
  public fileSave(): void {
    this.config.saveActiveComponentData();
    const inputJson: string = this.save.getInputText();
    const blob = new window.Blob([inputJson], { type: "text/plain" });
    if (this.fileName.length === 0) {
      this.fileName = "WebDan.wdj";
    }

    let ext = "";
    if (this.helper.getExt(this.fileName) !== "wdj") {
      ext = ".wdj";
    }
    FileSaver.saveAs(blob, this.fileName + ext);
  }

  // ログイン関係
  logIn(): void {
    this.modalService.open(LoginDialogComponent).result.then((result) => {});
  }

  logOut(): void {
    // this.user.clear();
    this.auth.signOut();
  }

  public goToLink() {
    window.open(
      "https://liberating-rodent-f3f.notion.site/697a045460394d03a8dc859f15bf97ea",
      "_blank"
    );
  }
}

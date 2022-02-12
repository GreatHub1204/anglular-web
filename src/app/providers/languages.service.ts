import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { DataHelperModule } from "./data-helper.module";

@Injectable({
  providedIn: "root",
})
export class LanguagesService {
  public browserLang: string;
  public languageIndex = {
    ja: "日本語",
    en: "English",
  };

  constructor(
    public translate: TranslateService,
    public helper: DataHelperModule
  ) {
    this.browserLang = translate.getBrowserLang();
    translate.use(this.browserLang);
  }

  public trans(key: string) {
    this.browserLang = key;
    this.translate.use(this.browserLang);
  }
}

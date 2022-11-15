import { NgModule } from "@angular/core";
import { InputBasicInformationService } from "../components/basic-information/basic-information.service";
import { ElectronService } from 'ngx-electron';

@NgModule({
  imports: [],
  exports: [],
})
export class DataHelperModule {

  constructor(
    public electronService: ElectronService
  ) {}

  // アラートを表示する
  public alert(message: string): void{
    if(this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.sendSync('alert', message);
    }else{
      alert(message);
    }
  }

  // ファイル名から拡張子を取得する関数
  public getExt(filename: string): string {
    const pos = filename.lastIndexOf('.');
    if (pos === -1) {
      return '';
    }
    const ext = filename.slice(pos + 1);
    return ext.toLowerCase();
  }

  /// 文字列string を数値に変換する
  public toNumber(num: any): number {

    let result: number = null;
    try {
      if(num === null) return null;
      if(num == null) return null;

      const tmp: string = num.toString().trim();
      if (tmp.length > 0) {
        result = ((n: number) => isNaN(n) ? null : n)(+tmp);
      }
    } catch {
      result = null;
    }
    return result;
  }

  // 角度をラジアンに変換
  public Radians(degree: number) {
    return degree * (Math.PI / 180);
  }

  // 鉄筋強度の情報を返す
  public getFsyk( rebar_dia: number, material_bar: any, key: string = "tensionBar"): any {

    const result = {
      fsy: null,
      fsu: null,
      id: "",
    };

    let bar = material_bar[0];
    if('separate' in bar){
      if (rebar_dia <= bar.separate) {
        result.fsy = this.toNumber(bar[key].fsy);
        result.fsu = this.toNumber(bar[key].fsu);
        result.id = "1";
      } else {
        bar = material_bar[1];
        result.fsy = this.toNumber(bar[key].fsy);
        result.fsu = this.toNumber(bar[key].fsu);
        result.id = "2";
      }
    } else {
      result.fsy = this.toNumber(bar[key].fsy);
      result.fsu = this.toNumber(bar[key].fsu);
      result.id = "0";
    }
    return result;
  }
  
  // 鉄骨強度の情報を返す
  public getFsyk2( thickness: number, material_steel: any, key: string = 'fsy'): any {

    const result = {
      id: "",
    };

    if (thickness !== null) {
      if (thickness <= material_steel[0].separate) {
        result[key] = (key === 'fsy') ? this.toNumber(material_steel[0].fsyk) :
                      (key === 'fvy') ? this.toNumber(material_steel[0].fsvyk) :
                      null;
        result.id = "1";
      } else if (thickness <= material_steel[1].separate) {
        result[key] = (key === 'fsy') ? this.toNumber(material_steel[1].fsyk) :
                      (key === 'fvy') ? this.toNumber(material_steel[1].fsvyk) :
                      null;
        result.id = "2";
      } else {
        result[key] = (key === 'fsy') ? this.toNumber(material_steel[2].fsyk) :
                      (key === 'fvy') ? this.toNumber(material_steel[1].fsvyk) :
                      null;
        result.id = "3";
      }
    } else {
      result[key] = null;
    }

    return result;
  }

  // コンクリート強度の POST用データを返す
  public getConcreteElastic(safety: any): any {

    const fck = this.getFck(safety);

    return {
      fck: fck.fck * fck.rfck,     // コンクリート強度
      rc: fck.rc,
      Ec: fck.Ec,       // コンクリートの弾性係数
      ElasticID: 'c'      // 材料番号
    };

  }

  // 諸々の係数を考慮したコンクリート強度
  public getFck(safety: any): any {

    const result = {
      fck: null, rc: null, Ec: null, fcd: null,
      rfck: null, rEc: null, rfbok: null, rVcd: null
    };

    const pile = safety.pile_factor;//.find((e) => e.selected === true);
    result.rfck = pile !== undefined ? pile.rfck : 1;
    result.rEc = pile !== undefined ? pile.rEc : 1;
    result.rfbok = pile !== undefined ? pile.rfbok : 1;
    result.rVcd = pile !== undefined ? pile.rVcd : 1;

    result.rc = 1;
    if ("M_rc" in safety.safety_factor) {
      result.rc = safety.safety_factor.M_rc;
    } else if ("V_rc" in safety.safety_factor) {
      result.rc = safety.safety_factor.V_rc;
    }

    if ("fck" in safety.material_concrete) {
      const fck = safety.material_concrete.fck;
      result.fck = fck * result.rfck;
      const Ec = this.getEc(result.fck);
      result.Ec = Ec * result.rEc;
      result.fcd = result.rfck * fck / result.rc;
    }

    return result;
  }
  
  // コンクリート強度から弾性係数を 返す
  public getEc(fck: number) {

    const EcList: number[] = [22, 25, 28, 31, 33, 35, 37, 38];
    const fckList: number[] = [18, 24, 30, 40, 50, 60, 70, 80];

    const linear = (x, y) => {
      return (x0) => {
        const index = x.reduce((pre, current, i) => current <= x0 ? i : pre, 0) //数値が何番目の配列の間かを探す
        const i = index === x.length - 1 ? x.length - 2 : index //配列の最後の値より大きい場合は、外挿のために、最後から2番目をindexにする

        return (y[i + 1] - y[i]) / (x[i + 1] - x[i]) * (x0 - x[i]) + y[i] //線形補間の関数を返す
      };
    };

    // 線形補間関数を作成
    const linearEc = linear(fckList, EcList);

    return linearEc(fck);

  }

  // 圧縮・引張主鉄筋の情報を整理して返す
  public rebarInfo(barInfo: any): any {
    // 鉄筋径
    if (this.toNumber(barInfo.rebar_dia) === null) {
      return null;
    }
    const dia = Math.abs(barInfo.rebar_dia);

    // 異形鉄筋:D, 丸鋼: R
    const mark = barInfo.rebar_dia > 0 ? "D" : "R";

    // 鉄筋全本数
    let rebar_n = this.toNumber(barInfo.rebar_n);
    if (rebar_n === null) {
      rebar_n = 0;
    }

    // 1段当りの本数
    let line = this.toNumber(barInfo.rebar_lines);
    if (line === null) {
      line = rebar_n;
    }

    // 鉄筋段数
    const n = Math.ceil(rebar_n / line);

    // 鉄筋アキ
    let space = this.toNumber(barInfo.rebar_space);
    if (space === null) {
      space = 0;
    }

    // 鉄筋かぶり
    let dsc = this.toNumber(barInfo.rebar_cover);
    if (dsc === null) {
      dsc = 0;
    }

    let cos = this.toNumber(barInfo.cos);
    if (cos === null) {
      cos = 1;
    }

    let ss = this.toNumber(barInfo.rebar_ss);
    if (ss === null) {
      ss = 0;
    }

    return {
      rebar_dia: dia, // 鉄筋径
      mark,           // 異形鉄筋:D, 丸鋼：R
      rebar_n,        // 全本数
      n,              // 段数
      dsc,            // 最外縁の鉄筋かぶり
      line,           // 1列当たりの鉄筋本数
      space,          // 1段目と2段目のアキ
      rebar_ss: ss,   // 鉄筋間隔
      cos             // 角度補正係数 cosθ
    }
  }

  // 側方鉄筋の情報を整理して返す
  public sideInfo(barInfo1: any,barInfo2:any, dst: number, dsc: number, height: number){

    if(height===null){
      return null; // 円形など側鉄筋を用いない形状はスキップ
    }

    // 鉄筋径の入力が ない場合は スキップ
    if (barInfo1.side_dia === null) {
      return null;
    }
    const dia = Math.abs(barInfo1.side_dia);

    // 異形鉄筋:D, 丸鋼: R
    const mark = barInfo1.side_dia > 0 ? "D" : "R";

    // 鉄筋段数
    const n = barInfo1.side_n;
    if (n === 0) {
      return null; // 鉄筋段数の入力が 0 の場合は スキップ
    }

    // 鉄筋間隔
    let space = barInfo1.side_ss;
    if (this.toNumber(space) === null) {
      space = (height - dst - dsc) / (n + 1);
    }

    // 鉄筋かぶり
    let cover = barInfo1.side_cover;
    if (this.toNumber(cover) === null) {
      cover = dsc + space;
    }


    //　1118追加
    let cover2 = barInfo2.side_cover;
    if (this.toNumber(cover2) === null) {
      cover2 =0;
    }

    // 1段当りの本数
    const line = 2;

    return {
      mark,
      side_dia: dia,
      n,
      space,
      cover,
      cover2,
      line
    }
  }

  // 鉄筋の重心位置を求める
  public getBarCenterPosition(bar: any, _cos: number = null) {

    const cover: number = bar.dsc;
    const n: number = bar.rebar_n;
    const line: number = bar.line;
    const space: number = bar.space;
    const cos: number = (_cos === null) ? bar.cos : _cos;

    // 計算する必要のない場合の処理
    if (cover === null) {
      return 0;
    }
    if (n === null || n <= 0) {
      return cover / cos;
    }
    if (line === null || line <= 0) {
      return cover / cos;
    }
    if (space === null || space <= 0) {
      return cover / cos;
    }
    if (n < line) {
      return cover / cos;
    }
    // 鉄筋の重心位置を計算する
    const steps: number = Math.ceil(n / line); // 鉄筋段数
    let result: number = cover;
    if(steps > 1){
      let reNum: number = n;
      let PosNum: number = 0;
      for (let i = 0; i < steps; i++) {
        const pos = cover + i * space;
        const num: number = Math.min(line, reNum);
        PosNum += pos * num;
        reNum -= line;
      }
      result = PosNum / n;
    }
    result /= cos;
    return result;
  }

  // html テーブルをクリップボードにコピーする用のテキストに変換する
  public table_To_text(wTABLE) {
    var wRcString = "";
    var wTR = wTABLE.rows;
    let spanList: any = { 1:{row:0, col:0}, 2:{row:0, col:0}, 3:{row:0, col:0} };
    for (var i = 0; i < wTR.length; i++) {
      var wTD = wTABLE.rows[i].cells;
      var wTR_Text = "";
      const rowspan_text = this.getRowSpan(spanList);
      wTR_Text += rowspan_text;
      // 断面形状の列のみ、特殊な挙動をする
      if (wTD[0].innerText !== '断面形状') {
        for (var j = 0; j < wTD.length; j++) {
          const a: string = wTD[j].innerText;
          const b = a.replace(" ", "");
          const c = b.replace("\n", "");
          wTR_Text += c;
          if (j === wTD.length - 1) {
            wTR_Text += "";
          } else {
            wTR_Text += "\t";
          }
          // colspanを処理する
          for (let k = 1 ; k < wTD[j].colSpan; k++) {
            wTR_Text += "\t";
          }
          // rowspanを入手する
          if (wTD[j].rowSpan > 1) {
            for (const key of Object.keys(spanList)) {
              if (spanList[key].row < 2) {
                spanList[key] = { row:wTD[j].rowSpan, col:wTD[j].colSpan };
                break;
          } } };
        }
      } else {
      // 断面形状の列のみ、特殊な挙動をする
        wTR_Text = this.getShapeText(wTD);
        //以下のlink imgでurlを取得
        // const link = document.images[0].alt;
        // const img = document.getElementById('shape');
      }
      wRcString += wTR_Text + "\r\n";
    }
    return wRcString;
  }

  private getRowSpan(list): string {
    let result: string = "";

    for (const key of Object.keys(list)) {
      if (list[key].row > 1) {
        for (let i = 0; i < list[key].col; i++) {
          result += "\t";
        }
        list[key].row -= 1;
      }
    }

    return result
  }

  private getShapeText(wTD) {
    let text: string = ""; 
    let B_text: string = "";
    let H_text: string = "";
    let side: string = "";
    let shape: string = "";

    const a0: string = wTD[0].innerText;
    const a1: string = wTD[1].innerText;
    text += "\t".repeat(wTD[0].colSpan - 1) + '幅\t' + a1;
    side += "\t".repeat(wTD[0].colSpan + wTD[1].colSpan);
    shape += a0 + "\t".repeat(wTD[0].colSpan + wTD[1].colSpan);

    for (var j = 2; j < wTD.length; j++) {
      // size
      const a: string = wTD[j].innerText;
      const b = a.split('\n');
      B_text += b[0];
      H_text += b[2];

      if (j === wTD.length - 1) {
        B_text += "\n";
        H_text += "";
      } else {
        B_text += "\t";
        H_text += "\t";
      }

      // side
      const target = wTD[j].getElementsByTagName("DIV");
      let target2: any;
      // HTMLCollectionやNodeListでは処理できないため、以下のコードで対応
      for (let i = 0; i < target[0].children.length; i++ ) {
        if (target[0].children[i].tagName === 'IMG') {
          target2 = target[0].children[i];
          break;
        }
      }
      const link = target2.alt
      if (link === '' || link == undefined) {
        side += '\t'
      }
      if (link.indexOf('under') !== -1) {
        side += "下側引張\t"
      } else if (link.indexOf('upper') !== -1) {
        side += "上側引張\t"
      }// else if (link.indexOf('circle') !== -1) {
      //  ss = "円環引張"
      //}

      // shape
      if (link.indexOf('rectangle') !== -1) {
        shape += '矩形\t'
      } else if (link.indexOf('tsection') !== -1) {
        shape += 'T型\t'
      } else if (link.indexOf('circle') !== -1) {
        shape += '円形\t'
      } else if (link.indexOf('Oval') !== -1) {
        shape += '小判型\t'
      }
    }
    text += '\t';
    side += '\n';
    shape += '\n';

    const size: string = text + B_text + "\t".repeat(wTD[0].colSpan - 1) + '高さ\t\t' + H_text;

    const result: string = side + shape + size; 

    return result;
  }

}

import { NgModule } from "@angular/core";

@NgModule({
  imports: [],
  exports: [],
})
export class DataHelperModule {

  public rebar_List: any[];

  constructor() {
    this.rebar_List = [
      { 'D': 10, 'As': 71.33 },
      { 'D': 13, 'As': 126.7 },
      { 'D': 16, 'As': 198.6 },
      { 'D': 19, 'As': 286.5 },
      { 'D': 22, 'As': 387.1 },
      { 'D': 25, 'As': 506.7 },
      { 'D': 29, 'As': 642.4 },
      { 'D': 32, 'As': 794.2 },
      { 'D': 35, 'As': 956.6 },
      { 'D': 38, 'As': 1140 },
      { 'D': 41, 'As': 1340 },
      { 'D': 51, 'As': 2027 }
    ];
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

  // 鉄筋の公称断面積を含む情報
  public getRebar(Dia: number): any {
    const result = this.rebar_List.find( (value) => {
      return value.D === Dia;
    });
    return result;
  }

  // 次に太い鉄筋
  public getNextRebar(Dia: any): any {
    let result = undefined;
    const d: number = this.toNumber(Dia);
    if (d === null) { return undefined };
    for (let i = 0; i < this.rebar_List.length - 1; i++){
      if (d === this.rebar_List[i].D) {
        result = this.rebar_List[i + 1];
        break;
      }
    }
    return result;
  }

  // 次に細い鉄筋
  public getPreviousRebar(Dia: any): any {
    let result = undefined;
    const d: number = this.toNumber(Dia);
    if (d === null) { return undefined };
    for (let i = 1; i < this.rebar_List.length; i++) {
      if (d === this.rebar_List[i].D) {
        result = this.rebar_List[i - 1];
        break;
      }
    }
    return result;
  }

  // 鉄筋の断面積
  public getAs(strAs: string): number {
    let result: number = 0;
    if (strAs.indexOf("φ") >= 0) {
      const fai: number = this.toNumber(strAs.replace("φ", ""));
      if (fai === null) {
        return 0;
      }
      result = (fai ** 2 * Math.PI) / 4;
    } else if (strAs.indexOf("R") >= 0) {
      const fai: number = this.toNumber(strAs.replace("R", ""));
      if (fai === null) {
        return 0;
      }
      result = (fai ** 2 * Math.PI) / 4;
    } else if (strAs.indexOf("D") >= 0) {
      const fai: number = this.toNumber(strAs.replace("D", ""));
      if (fai === null) {
        return 0;
      }
      let reverInfo = this.rebar_List.find((value) => {
        return value.D === fai;
      });
      if (reverInfo === undefined) {
        return 0;
      }
      result = reverInfo.As;
    } else {
      result = this.toNumber(strAs);
      if (result === null) {
        return 0;
      }
    }
    return result;
  }

  /// 文字列string を数値に変換する
  public toNumber(num: any): number {

    let result: number = null;
    try {
      if(num === null) return null;
      if(num === undefined) return null;

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

    if (rebar_dia <= material_bar[0].separate) {
      result.fsy = this.toNumber(material_bar[0][key].fsy);
      result.fsu = this.toNumber(material_bar[0][key].fsu);
      result.id = "1";
    } else {
      result.fsy = this.toNumber(material_bar[1][key].fsy);
      result.fsu = this.toNumber(material_bar[1][key].fsu);
      result.id = "2";
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
      fck: fck.fcd,     // コンクリート強度
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

    let rc = safety.safety_factor.rc;

    if ("rc" in safety.safety_factor) {
      result.rc = rc;
    } else {
      rc = 1;
    }

    if ("fck" in safety.material_concrete) {
      const fck = safety.material_concrete.fck;
      result.fck = fck * result.rfck;
      const Ec = this.getEc(result.fck);
      result.Ec = Ec * result.rEc;
      result.fcd = result.rfck * fck / rc;
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
  public sideInfo(barInfo: any, dst: number, dsc: number, height: number){

    if(height===null){
      return null; // 円形など側鉄筋を用いない形状はスキップ
    }

    // 鉄筋径の入力が ない場合は スキップ
    if (barInfo.side_dia === null) {
      return null;
    }
    const dia = Math.abs(barInfo.side_dia);

    // 異形鉄筋:D, 丸鋼: R
    const mark = barInfo.side_dia > 0 ? "D" : "R";

    // 鉄筋段数
    const n = barInfo.side_n;
    if (n === 0) {
      return null; // 鉄筋段数の入力が 0 の場合は スキップ
    }

    // 鉄筋間隔
    let space = barInfo.side_ss;
    if (this.toNumber(space) === null) {
      space = (height - dst - dsc) / (n + 1);
    }

    // 鉄筋かぶり
    let cover = barInfo.side_cover;
    if (this.toNumber(cover) === null) {
      cover = dsc + space;
    }

    // 1段当りの本数
    const line = 2;

    return {
      mark,
      side_dia: dia,
      n,
      space,
      cover,
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
    for (var i = 0; i < wTR.length; i++) {
      var wTD = wTABLE.rows[i].cells;
      var wTR_Text = "";
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
      }
      wRcString += wTR_Text + "\r\n";
    }
    return wRcString;
  }

}

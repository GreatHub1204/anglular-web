import { Injectable } from '@angular/core';
import { SaveDataService } from './save-data.service';

import * as Encord from 'encoding-japanese';
import { DataHelperModule } from './data-helper.module';
import { InputBarsService } from '../components/bars/bars.service';
import { InputBasicInformationService } from '../components/basic-information/basic-information.service';
import { InputCalclationPrintService } from '../components/calculation-print/calculation-print.service';
import { InputCrackSettingsService } from '../components/crack/crack-settings.service';
import { InputDesignPointsService } from '../components/design-points/design-points.service';
import { InputFatiguesService } from '../components/fatigues/fatigues.service';
import { InputMembersService } from '../components/members/members.service';
import { InputSafetyFactorsMaterialStrengthsService } from '../components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { InputSectionForcesService } from '../components/section-forces/section-forces.service';
import { InputSteelsService } from '../components/steels/steels.service';

@Injectable({
  providedIn: 'root'
})
export class DsdDataService {

  private float_max: number = 3.4 * Math.pow(10, 38);
  private float_min: number = 3.4 * Math.pow(10, -38);//1.4 * Math.pow(10,-45);
  private byte_max: number = 255;

  constructor(
    private save: SaveDataService,
    private bars: InputBarsService,
    private steel: InputSteelsService,
    private basic: InputBasicInformationService,
    private points: InputDesignPointsService,
    private crack: InputCrackSettingsService,
    private fatigues: InputFatiguesService,
    private members: InputMembersService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private force: InputSectionForcesService,
    private calc: InputCalclationPrintService,
    private helper: DataHelperModule) { }

  // DSD データを読み込む
  public readDsdData(arrayBuffer: ArrayBuffer): string {

    const old = this.save.getInputJson();

    try {
      this.save.clear();

      const buff: any = {
        u8array: new Uint8Array(arrayBuffer),
        byteOffset: 0
      };

      const obj = this.IsDSDFile(buff);
      buff['datVersID'] = obj.datVersID;
      buff['isManualInput'] = (obj.ManualInput > 0);

      // 断面力手入力モード
      if (buff.isManualInput) {
        this.FrmManualGetTEdata(buff, obj.ManualInput);
      }
      // 画面１ 基本データ
      this.GetKIHONscrn(buff);
      // 画面２  部材､断面データ
      this.GetBUZAIscrn(buff)
      // 画面５　安全係数の画面
      this.GetKEISUscrn(buff)
      // 画面３　算出点
      this.GetSANSHUTUscrn(buff)
      // 画面４　鉄筋データ
      this.GetTEKINscrn(buff)
      // 画面６　計算・印刷フォーム
      this.GetPrtScrn(buff)


      // 断面力手入力モード
      if (buff.isManualInput) {
        return null;
      } else {
        return buff.PickFile.trim();
      }

    } catch (e) {
      this.save.setInputData(old);
    }
  }

  // ピックアップファイルを読み込む
  private readPickUpData(PickFile: string, file: any) {
    file.name = PickFile;
    this.fileToText(file)
      .then(text => {
        this.save.readPickUpData(text, file.name); // データを読み込む
      })
      .catch(err => {
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

  // 画面１ 基本データ
  private GetKIHONscrn(buff: any): void {

    const dt1Dec = this.readSingle(buff); // -----> 疲労寿命 05/02/22
    const dt1Infl = this.readByte(buff);

    // 仕様
    const dt1Spec = this.readByte(buff);
    this.basic.set_specification2(dt1Spec)

    const dt1Ser = this.readInteger(buff);
    const dt1Sekou = this.readByte(buff); // 杭の施工条件
    buff['dt1Sekou'] = dt1Sekou;
    const dt1Shusei = this.readSingle(buff); // -----> 材料修正係数 ----->  ' 耐用年数 05/02/22
    this.fatigues.service_life = dt1Shusei;

    const gOud = this.readByte(buff)

    let MaxPicUp: number;
    if (!this.isOlder('0.1.6', buff.datVersID)) {
      MaxPicUp = this.readInteger(buff);
    }

    // ピックアップ番号を代入
    // 曲げ
    let dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(0, dt2Pick);

    let dt3Pick = this.readByte(buff);
    if (dt3Pick !== null) {
      this.basic.set_pickup_moment(1, dt3Pick);
      dt2Pick = this.readByte(buff);
    } else {
      dt3Pick = this.readByte(buff);
      if (dt3Pick !== null) this.basic.set_pickup_moment(1, dt3Pick);
    }
    // 耐久性 （変動荷重）
    dt2Pick = this.readByte(buff); // ・・・捨て
    // 使用性 外観ひび割れ
    dt2Pick = this.readByte(buff);
    if (dt3Pick !== null) this.basic.set_pickup_moment(1, dt2Pick);
    // 安全性 （疲労破壊）永久作用
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(3, dt2Pick);

    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(4, dt2Pick);

    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(5, dt2Pick);

    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(6, dt2Pick);

    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_moment(7, dt2Pick);

    dt2Pick = this.readByte(buff);
    dt2Pick = this.readByte(buff);

    // せん断
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(0, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(1, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(2, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(3, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(4, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(5, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(6, dt2Pick);
    dt2Pick = this.readByte(buff);
    this.basic.set_pickup_shear_force(7, dt2Pick);

    dt2Pick = this.readByte(buff);
    dt2Pick = this.readByte(buff);

    if (!this.isOlder('3.6.0', buff.datVersID)) {
      if (!this.isOlder('4.0.0', buff.datVersID)) {
        this.basic.set_specification1(1); // フィリピン版
      } else {
        throw("インド版のデータは読み込むことができません")
      }
    }
    if (!this.isOlder('1.3.10', buff.datVersID)) {
      // 縁応力度が制限値以内でも ひび割れ幅の検討を行う
      const iOutputHibiware = this.readInteger(buff);
      this.basic.set_conditions('JR-000', iOutputHibiware !== 0);
    }

    if (!this.isOlder('1.3.11', buff.datVersID)) {
      // T形断面でフランジ側引張は矩形断面で計算する
      const iOutputTgataKeisan = this.readInteger(buff);
      this.basic.set_conditions('JR-002', iOutputTgataKeisan !== 0);
    }

    if (!this.isOlder('1.3.13', buff.datVersID)) {
      const dt1HibiSeigen = this.readSingle(buff);
      this.fatigues.train_A_count = Math.round(dt1HibiSeigen);
      const dt1HibiK2 = this.readSingle(buff);
      this.fatigues.train_B_count = Math.round(dt1HibiK2);
    }

    if (!this.isOlder('1.3.14', buff.datVersID)) {
      const dt1USCheck = this.readByte(buff);
    }

    if (!this.isOlder('1.4.1', buff.datVersID)) {
      const dt1ChoutenCheck = this.readByte(buff);
      // 円形断面で鉄筋を頂点に１本配置する
      this.basic.set_conditions('JR-003', dt1ChoutenCheck !== 0);
    }

    if (!this.isOlder('2.1.2', buff.datVersID)) {
      const gひび割れ制限 = this.readByte(buff);
      // ひび割れ幅制限値に用いるかぶりは 100mm を上限とする
      this.basic.set_conditions('JR-001', gひび割れ制限 !== 0);
    }

    if (!this.isOlder('3.1.8', buff.datVersID)) {
      const sng外観ひび = this.readSingle(buff);
    }

  }

  // 画面２  部材､断面データ
  private GetBUZAIscrn(buff: any): void {

    let iDummyCount: number;
    iDummyCount = this.readInteger(buff)

    for (let i = 0; i < iDummyCount; i++) {
      const Index = this.readInteger(buff) + 1;     // 算出点データ（基本データ）へのIndex
      const iNumCalc = this.readInteger(buff);  // 部材の算出点数
      const iBzNo = this.readInteger(buff); // 部材番号

      // ひび割れデータ
      let c = this.crack.getTableColumn(Index);
      // 疲労データ
      let f = this.fatigues.getTableColumn(Index);
      // 部材データ
      let m = this.members.getTableColumns(iBzNo);
      c.m_no = m.m_no;
      f.m_no = m.m_no;

      const sLeng = this.readSingle(buff);  // 部材長 = JTAN
      m.m_len = sLeng;

      const strMark = this.readString(buff, 32);
      m.g_id = strMark.trim();
      m.g_no = this.helper.toNumber(m.g_id);

      const strBuzaiName = this.readString(buff, 32);
      m.g_name = strBuzaiName.trim();
      f.g_name = m.g_name;
      c.g_name = m.g_name;

      const intDanmenType = this.readInteger(buff);
      switch (intDanmenType) {
        case 1:
          m.shape = '矩形';
          break;
        case 2:
          m.shape = 'T形';
          break;
        case 3:
          m.shape = '円形';
          break;
        case 4:
          m.shape = '小判';
          break;
      }

      const isOlder311 = (this.isOlder('3.1.1', buff.datVersID));
      let sngDanmen1 = this.readSingle(buff);
      if (isOlder311) { sngDanmen1 *= 10; } // cm --> mm
      if (sngDanmen1 > 0) {
        m.B = sngDanmen1;
        if (m.shape === '円形') {
          m.B *= 2;
        }
      }
      let sngDanmen2 = this.readSingle(buff);
      if (isOlder311) { sngDanmen2 *= 10; } // cm --> mm
      if (sngDanmen2 > 0) m.H = sngDanmen2;
      let sngDanmen3 = this.readSingle(buff);
      if (isOlder311) { sngDanmen3 *= 10; } // cm --> mm
      if (sngDanmen3 > 0) m.Bt = sngDanmen3;
      let sngDanmen4 = this.readSingle(buff);
      if (isOlder311) { sngDanmen4 *= 10; } // cm --> mm
      if (sngDanmen4 > 0) m.t = sngDanmen4;


      // 環境条件 曲げ
      const intKankyo1 = this.readInteger(buff);
      if (intKankyo1 > 0) c.con_u = intKankyo1;
      const intKankyo2 = this.readInteger(buff);
      if (intKankyo2 > 0) c.con_l = intKankyo2;

      // 環境条件せん断 　since version 0.1.4
      if (!this.isOlder('0.1.4', buff.datVersID)) {
        const intKankyo2 = this.readInteger(buff);
        if (intKankyo2 > 0) c.con_s = intKankyo2;
      }

      const bytHibi1 = this.readByte(buff);
      c.vis_u = bytHibi1 !== 0;
      const bytHibi2 = this.readByte(buff);
      c.vis_l = bytHibi2 !== 0;

      if (this.isOlder("0.1.4", buff.datVersID)) {
        const sngHirou1 = this.readInteger(buff);
        if (sngHirou1 > 0) {
          f.M1.r1_1 = sngHirou1;
          f.M2.r1_1 = sngHirou1;
        }
        const sngHirou2 = this.readInteger(buff);
        if (sngHirou2 > 0) {
          f.V1.r1_2 = sngHirou2;
          f.V2.r1_2 = sngHirou2;
        }
        const sngHirou3 = this.readInteger(buff);
        if (sngHirou3 > 0) {
          f.M1.r1_3 = sngHirou3;
          f.M2.r1_3 = sngHirou3;
        }
      } else {
        if (this.isOlder("2.5.1", buff.datVersID)) {
          const kr = this.readSingle(buff); // kr
          if (kr > 0) c.kr = kr;
          const sngHirou1 = this.readSingle(buff);
          if (sngHirou1 > 0) {
            f.M1.r1_1 = sngHirou1;
            f.M2.r1_1 = sngHirou1;
          }
          const sngHirou2 = this.readSingle(buff);
          if (sngHirou2 > 0) {
            f.V1.r1_2 = sngHirou2;
            f.V2.r1_2 = sngHirou2;
          }
          const sngHirou3 = this.readSingle(buff);
          if (sngHirou3 > 0) {
            f.M1.r1_3 = sngHirou3;
            f.M2.r1_3 = sngHirou3;
          }
        } else {
          const sngEcsd = this.readSingle(buff); // εcsd
          if (sngEcsd > 0) {
            c.ecsd_u = sngEcsd; 
            c.ecsd_l = sngEcsd; 
          }
          const kr = this.readSingle(buff);// kr
          if (kr > 0) c.kr = kr;
          const sngHirou1 = this.readSingle(buff);
          if (sngHirou1 > 0) {
            f.M1.r1_1 = Math.round(sngHirou1 * 100) / 100;
            f.M2.r1_1 = Math.round(sngHirou1 * 100) / 100;
          }
          const sngHirou2 = this.readSingle(buff);
          if (sngHirou2 > 0) {
            f.V1.r1_2 = Math.round(sngHirou2 * 100) / 100;
            f.V2.r1_2 = Math.round(sngHirou2 * 100) / 100;
          }
          const sngHirou3 = this.readSingle(buff);
          if (sngHirou3 > 0) {
            f.M1.r1_3 = Math.round(sngHirou3 * 100) / 100;
            f.M2.r1_3 = Math.round(sngHirou3 * 100) / 100;
          }
        }
      }

      if (!this.isOlder("4.0.1", buff.datVersID)) {
        const sngK4 = this.readSingle(buff);
      }

      if (this.isOlder("1.3.4", buff.datVersID)) {
        const sngNumBZI = this.readInteger(buff);
        const a = sngNumBZI;
        if (sngNumBZI > 0) m.n = sngNumBZI;
      } else if (this.isOlder("4.1.0", buff.datVersID)) {
        const sngNumBZI = this.readSingle(buff);
        if (sngNumBZI > 0) m.n = sngNumBZI;
      } else {
        const strNumBZI = this.helper.toNumber(this.readString(buff, 32));
        if (strNumBZI !== null && strNumBZI > 0) m.n = strNumBZI;
      }

      if (!this.isOlder("0.1.3", buff.datVersID)) {
        const bytTaisinKiso = this.readByte(buff);
      }


      for (let j = Index + 1; j < Index + iNumCalc; j++) {
        // ひび割れデータ
        const crack = this.crack.getTableColumn(j);
        for (const key of Object.keys(crack)) {
          if (key === 'index') continue;
          crack[key] = c[key];
        }
        // 疲労データ
        // f は連想配列が含まれているため clone をコピーしないと
        const f2 = JSON.parse(JSON.stringify(f));
        const fatigue = this.fatigues.getTableColumn(j);
        for (const key of Object.keys(fatigue)) {
          if (key === 'index') continue;
          fatigue[key] = f2[key];
        }
      }


    }


  }

  // 画面５　安全係数の画面
  private GetKEISUscrn(buff: any): void {

    const jsonData = this.safety.getSaveData();

    let iDummyCount: number;
    iDummyCount = this.readInteger(buff)

    const isOlder328 = this.isOlder('3.2.8', buff.datVersID);
    const isOlder015 = this.isOlder('0.1.5', buff.datVersID);
    const IsOldData = this.isOlder('0.1.4', buff.datVersID);

    const groupe = this.members.getGroupes();

    for (let i = 0; i < iDummyCount; i++) {
      const g_id = groupe[i];
      const safety_factor = this.safety.default_safety_factor();
      const material_bar = this.safety.default_material_bar();
      const material_steel = this.safety.default_material_steel();
      const material_concrete = this.safety.default_material_concrete();
      const pile_factor = this.safety.default_pile_factor();

      for (let ii = 0; ii <= 5; ii++) {

        const mgTkin = this.readByte(buff);
        if (ii < 5) {
          safety_factor[ii].range = mgTkin;
        }

        if (isOlder328) {
          let Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rc = Mage;
          let Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rc = Sen;
          Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rs = Mage;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rs = Sen;
          Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rbs = Mage;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbc = Sen;
          Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].ri = Mage;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbs = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbv = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].T_rbt = Sen;
        } else {
          let Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rc = Mage;
          Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rs = Mage;
          Mage = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].M_rbs = Mage;
          let Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rc = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rs = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbc = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbs = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].V_rbv = Sen;
          Sen = this.readSingle(buff);
          if (ii < 5) safety_factor[ii].ri = Sen;
          // Sen = this.readSingle(buff);
          // if (ii < 5) safety_factor[ii].T_rbt = Sen;
        }
      }

      for (const k1 of ['tensionBar', 'sidebar', 'stirrup', 'bend']) {
        for (const k2 of ['fsy', 'fsu']) {
          for (let j=0; j<2; j++) {
            let Kyodo = this.readInteger(buff);
            if(material_bar.length < (j+1))
              continue;
            const mb = material_bar[j];
            if(mb == null) continue;
            if(!(k1 in mb)) continue;
            const mbk1 = mb[k1];
            if(!(k2 in mbk1)) continue;
            let mbk1k2 = mbk1[k2];
            if (Kyodo > 0) {
              mbk1k2 = Kyodo;
            }
          }
        }
      }

      if (!isOlder015) {
        let KyodoD = this.readInteger(buff);
        if (KyodoD > 0) {
          material_bar[0].separate = KyodoD;
        }
        KyodoD = this.readInteger(buff);
        if (KyodoD > 0) {
          if(1 < material_bar.length)
            material_bar[1].separate = KyodoD;
        }
        KyodoD = this.readInteger(buff);
        KyodoD = this.readInteger(buff);
      }
      if (IsOldData) {
        const iii = this.readInteger(buff);
        material_concrete.fck = Math.round(iii * 10) / 10;
      } else {
        const Dummy = this.readSingle(buff);
        material_concrete.fck = Math.round(Dummy * 10) / 10;
      }

      if (this.helper.toNumber(g_id) >= 3) {
        let id = null;
        switch (buff['dt1Sekou']) {
          case 0:
            id = 'pile-000';
            break;
          case 1:
            id = 'pile-001';
            break;
          case 2:
            id = 'pile-002';
            break;
          case 3:
            id = 'pile-003';
            break;
          case 9:
            id = 'pile-004';
            break;
        }
        for (const key of Object.keys(pile_factor)) {
          const value = pile_factor[key];
          value.selected = (value.id === id) ? true : false;
        }
      }
      jsonData.safety_factor[g_id] = safety_factor;
      jsonData.material_bar[g_id] = material_bar;
      jsonData.material_steel[g_id] = material_steel;
      jsonData.material_concrete[g_id] = material_concrete;
      jsonData.pile_factor[g_id] = pile_factor;
    }

    // 最後に登録する
    this.safety.setSaveData(jsonData);
  }

  // 画面３　算出点
  private GetSANSHUTUscrn(buff: any): void {

    let iDummyCount: number;
    iDummyCount = this.readInteger(buff)

    if (iDummyCount !== 0) {
      buff['PickFile'] = this.readString(buff, 100).trim(); // ピックアップファイルのパス
      const buff2 = { u8array: buff.u8array.slice(0, buff.u8array.length) };
      let strFix100 = this.readString(buff, 100, 'unicode').trim();
      let strFix102 = this.readString(buff2, 100).trim();
      if(strFix102.length < strFix100.length){
        strFix100 = strFix102;
        buff.u8array = buff2.u8array;
      }
      const D_Name = strFix100.trim();

      for (let i = 0; i < iDummyCount; i++) {
        const Matr = this.readInteger(buff);
        const Calc1 = this.readString(buff, 32);
        const Calc2 = this.readSingle(buff);
      }
    }

    iDummyCount = this.readInteger(buff)

    for (let i = 0; i < iDummyCount; i++) {
      const index = i + 1;

      let position = this.points.getTableColumn(index);
      position.p_id = index;

      const CalName = this.readString(buff, 12).trim();
      position.p_name = CalName;

      const iBzNo = this.readInteger(buff);
      position.m_no = iBzNo;

      if (this.isOlder('0.1.2', buff.datVersID)) {
        const byteVar = this.readByte(buff);
        //position.isMzCalc = byteVar !== 0;
        position.isVyCalc = byteVar !== 0;
      } else {
        const Safe2 = this.readInteger(buff);
        //position.isMzCalc = Safe2 !== 0;
        position.isVyCalc = Safe2 !== 0;
      }
      const Safe1 = this.readBoolean(buff);
      //position.isVyCalc = Safe1;
      position.isMzCalc = Safe1;
      const Ness0 = this.readBoolean(buff);
      const Ness1 = this.readBoolean(buff);

      const GammaEM = this.readSingle(buff);
      if (!buff.isManualInput) {
        position.La = GammaEM;
      }

      if (!this.isOlder('3.2.8', buff.datVersID)) {
        const T2d = this.readSingle(buff);
        const KuiKei = this.readSingle(buff);
      }


      // 登録
      const bar = this.bars.getTableColumn(index);
      for (const key of Object.keys(bar)) {
        if (key in position) {
          bar[key] = position[key];
        }
      }
      // 疲労データ
      const fatigue = this.fatigues.getTableColumn(index);
      for (const key of Object.keys(fatigue)) {
        if (key in position) {
          fatigue[key] = position[key];
        }
      }
      // ひび割れデータ
      const crack = this.crack.getTableColumn(index);
      for (const key of Object.keys(crack)) {
        if (key in position) {
          crack[key] = position[key];
        }
      }

    }

  }

  // 画面４　鉄筋データ
  private GetTEKINscrn(buff: any): void {

    const bTekinShori = this.readByte(buff);

    const iDummyCount = this.readInteger(buff);

    for (let i = 0; i < iDummyCount; i++) {
      const index = i + 1;

      const bar = this.bars.getTableColumn(index);
      const m = this.members.getCalcData(bar.m_no);

      const iType = this.readInteger(buff);
      const iNext = this.readInteger(buff);
      const MageSendan0 = this.readSingle(buff);
      if (MageSendan0 > 0) {
        if (m.g_no < 2 && m.shape !== '小判' && m.shape !== '円形') {
          bar.haunch_M = MageSendan0;
        }
      }
      const MageSendan1 = this.readSingle(buff);
      if (MageSendan1 > 0) {
        if (m.g_no < 2 && m.shape !== '小判' && m.shape !== '円形') {
          bar.haunch_V = MageSendan1;
        }
      }

      if (this.isOlder("3.1.4", buff.datVersID)) {
        const stDummy1 = this.readByte(buff);
        if (stDummy1 > 0) bar.rebar1.rebar_dia = stDummy1;
        const stDummy2 = this.readByte(buff);
        if (stDummy2 > 0) bar.rebar2.rebar_dia = stDummy2;
      } else {
        const JikuR0 = this.readInteger(buff);
        if (JikuR0 > 0) bar.rebar1.rebar_dia = JikuR0;
        const JikuR1 = this.readInteger(buff);
        if (JikuR1 > 0) {
          if (m.shape !== '円形') {
            bar.rebar2.rebar_dia = JikuR1;
          }
        }
      }
      const JikuHON0 = this.readSingle(buff);
      if (JikuHON0 > 0) {
        bar.rebar1.rebar_n = JikuHON0;
      } else if (JikuHON0 < 0) {
        bar.rebar1.rebar_n = -1000 / JikuHON0;
      }
      const JikuHON1 = this.readSingle(buff);
      if (m.shape !== '円形') {
        if (JikuHON1 > 0) {
          bar.rebar2.rebar_n = JikuHON1;
        } else if (JikuHON1 < 0) {
          bar.rebar2.rebar_n = -1000 / JikuHON1;
        }
      }
      const JikuKABURI0 = this.readSingle(buff);
      if (JikuKABURI0 > 0) {
        bar.rebar1.rebar_cover = Math.round(JikuKABURI0 * 10) / 10;
      }
      const JikuKABURI1 = this.readSingle(buff);
      if (JikuKABURI1 > 0) {
        if (m.shape !== '円形') {
          bar.rebar2.rebar_cover = Math.round(JikuKABURI1 * 10) / 10;
        }
      }

      if (this.isOlder("3.2.6", buff.datVersID) === true
        && this.isOlder("3.1.4", buff.datVersID) === false) {
        const stDummy6 = this.readByte(buff);
        if (stDummy6 > 0) {
          if (m.g_no < 3) {
            bar.rebar1.rebar_lines = stDummy6;
          }
        }
        const stDummy7 = this.readByte(buff);
        if (stDummy7 > 0) {
          if (m.g_no < 3 && m.shape !== '円形') {
            bar.rebar2.rebar_lines = stDummy7;
          }
        }
        const stDummy8 = this.readSingle(buff);
        if (stDummy8 > 0) {
          if (m.g_no < 3) {
            bar.rebar1.rebar_space = stDummy8;
          }
        }
        const stDummy9 = this.readSingle(buff);
        if (stDummy9 > 0) {
          if (m.g_no < 3 && m.shape !== '円形') {
            bar.rebar2.rebar_space = stDummy9;
          }
        }
      } else {
        if (this.isOlder("3.1.4", buff.datVersID)) {
          const stDummy3 = this.readInteger(buff);
          if (stDummy3 > 0) {
            if (m.g_no < 3) {
              bar.rebar1.rebar_lines = stDummy3;
            }
          }
          const stDummy4 = this.readInteger(buff);
          if (stDummy4 > 0) {
            if (m.g_no < 3 && m.shape !== '円形') {
              bar.rebar2.rebar_lines = stDummy4;
            }
          }
        } else {
          const JikuNARABI0 = this.readSingle(buff);
          if (JikuNARABI0 > 0) {
            if (m.g_no < 3) {
              bar.rebar1.rebar_lines = JikuNARABI0;
            }
          }
          const JikuNARABI1 = this.readSingle(buff);
          if (JikuNARABI1 > 0) {
            if (m.g_no < 3 && m.shape !== '円形') {
              bar.rebar2.rebar_lines = JikuNARABI1;
            }
          }
        }
        if (this.isOlder("3.3.2", buff.datVersID)) {
          const stDummy6 = this.readByte(buff);
          if (stDummy6 > 0) {
            if (m.g_no < 3) {
              bar.rebar1.rebar_space = stDummy6;
            }
          }
          const stDummy7 = this.readByte(buff);
          if (stDummy7 > 0) {
            if (m.g_no < 3 && m.shape !== '円形') {
              bar.rebar2.rebar_space = stDummy7;
            }
          }
        } else {
          const JikuAKI0 = this.readSingle(buff);
          if (JikuAKI0 > 0) {
            if (m.g_no < 3) {
              bar.rebar1.rebar_space = JikuAKI0;
            }
          }
          const JikuAKI1 = this.readSingle(buff);
          if (JikuAKI1 > 0) {
            if (m.g_no < 3 && m.shape !== '円形') {
              bar.rebar2.rebar_space = JikuAKI1;
            }
          }
        }
      }
      const JikuPITCH0 = this.readSingle(buff);
      if (JikuPITCH0 > 0) {
        if (m.g_no < 3) {
          bar.rebar1.rebar_ss = Math.round(JikuPITCH0 * 10) / 10;
        }
      }
      const JikuPITCH1 = this.readSingle(buff);
      if (JikuPITCH1 > 0) {
        if (m.g_no < 3 && m.shape !== '円形') {
          bar.rebar2.rebar_ss = Math.round(JikuPITCH1 * 10) / 10;
        }
      }
      const JikuSHARITU0 = this.readSingle(buff);
      if (JikuSHARITU0 > 0) {
        if (m.g_no < 2) {
          bar.rebar1.cos = Math.round(JikuSHARITU0 * 1000) / 1000;
        }
      }
      const JikuSHARITU1 = this.readSingle(buff);
      if (JikuSHARITU1 > 0) {
        if (m.g_no < 2 && m.shape !== '円形') {
          bar.rebar2.cos = Math.round(JikuSHARITU1 * 1000) / 1000;
        }
      }

      const SokuR0 = this.readByte(buff);
      if (SokuR0 > 0) {
        if (m.g_no < 3 && m.shape !== '円形') {
          bar.sidebar.side_dia = SokuR0;
        }
      }
      const SokuR1 = this.readByte(buff);
      const SokuHON0 = this.readByte(buff);
      if (SokuHON0 > 0) {
        if (m.g_no < 3 && m.shape !== '円形') {
          bar.sidebar.side_n = SokuHON0;
        }
      }
      const SokuHON1 = this.readByte(buff);
      const SokuKABURI0 = this.readSingle(buff);
      if (SokuKABURI0 > 0) {
        if (m.g_no < 2 && m.shape !== '円形') {
          const s1 = Math.floor(SokuKABURI0);
          const s2 = Math.ceil((SokuKABURI0 - s1) * 10000);
          if (s1 > 0) bar.sidebar.side_cover = s1;
          if (s2 > 0) bar.sidebar.side_ss = s2;
        }
      }
      const SokuKABURI1 = this.readSingle(buff);

      const StarR0 = this.readByte(buff);
      if (StarR0 > 0) bar.stirrup.stirrup_dia = StarR0;
      const StarR1 = this.readByte(buff);
      const StarKUMI0 = this.readSingle(buff);
      if (StarKUMI0 > 0) bar.stirrup.stirrup_n = StarKUMI0 * 2;
      const StarKUMI1 = this.readSingle(buff);
      const StarPitch0 = this.readSingle(buff);
      if (StarPitch0 > 0) bar.stirrup.stirrup_ss = StarPitch0;
      const StarPitch1 = this.readSingle(buff);
      const StarTanTHETA0 = this.readSingle(buff);
      if (StarTanTHETA0 > 0) {
        if (m.g_no < 2) {
          bar.tan = StarTanTHETA0;
        }
      }
      const StarTanTHETA1 = this.readSingle(buff);

      const OrimgR = this.readByte(buff);
      if (OrimgR > 0) {
        if (m.g_no < 2) {
          bar.bend.bending_dia = OrimgR;
        }
      }
      if (this.isOlder("3.4.5", buff.datVersID)) {
        const stDummy10 = this.readByte(buff);
        if (stDummy10 > 0) {
          if (m.g_no < 2) {
            bar.bend.bending_n = stDummy10;
          }
        }
      } else {
        const OrimgHON = this.readSingle(buff);
        if (OrimgHON > 0) {
          if (m.g_no < 2) {
            bar.bend.bending_n = OrimgHON;
          }
        }
      }
      const OrimgANGLE = this.readByte(buff);
      if (OrimgANGLE > 0) {
        if (m.g_no < 2) {
          bar.bend.bending_angle = OrimgANGLE;
        }
      }

      if (this.isOlder("0.1.5", buff.datVersID)) {
        const Shori0 = this.readByte(buff);
        bar.rebar1.enable = Shori0 !== 0;

      } else {
        const OrimgKankaku = this.readSingle(buff);
        if (OrimgKankaku > 0) {
          if (m.g_no < 2) {
            bar.bend.bending_ss = OrimgKankaku;
          }
        }

        const Shori0 = this.readByte(buff);
        bar.rebar1.enable = Shori0 !== 0;
        const Shori1 = this.readByte(buff);
        bar.rebar2.enable = Shori1 !== 0;
      }

      if (!this.isOlder("3.1.6", buff.datVersID)) {
        const fatigue = this.fatigues.getTableColumn(index);

        const cMage00 = this.readSingle(buff);
        fatigue.M1.SA = cMage00;
        const cMage01 = this.readSingle(buff);
        fatigue.M2.SA = cMage01;
        const cMage10 = this.readSingle(buff);
        fatigue.M1.SB = cMage10;
        const cMage11 = this.readSingle(buff);
        fatigue.M2.SB = cMage11;
        const cMage20 = this.readSingle(buff);
        fatigue.M1.NA06 = cMage20;
        const cMage21 = this.readSingle(buff);
        fatigue.M2.NA06 = cMage21;
        const cMage30 = this.readSingle(buff);
        fatigue.M1.NB06 = cMage30;
        const cMage31 = this.readSingle(buff);
        fatigue.M2.NB06 = cMage31;
        const cMage40 = this.readSingle(buff);
        fatigue.M1.NA12 = cMage40;
        const cMage41 = this.readSingle(buff);
        fatigue.M2.NA12 = cMage41;
        const cMage50 = this.readSingle(buff);
        fatigue.M1.NB12 = cMage50;
        const cMage51 = this.readSingle(buff);
        fatigue.M2.NB12 = cMage51;
        const cMage60 = this.readSingle(buff);
        fatigue.M1.A = cMage60;
        const cMage61 = this.readSingle(buff);
        fatigue.M2.A = cMage61;
        const cMage70 = this.readSingle(buff);
        fatigue.M1.B = cMage70;
        const cMage71 = this.readSingle(buff);
        fatigue.M2.B = cMage71;
        const cMage800 = this.readSingle(buff);
        const cMage810 = this.readSingle(buff);
        const cMage801 = this.readSingle(buff);
        const cMage811 = this.readSingle(buff);
        const cMage802 = this.readSingle(buff);
        const cMage812 = this.readSingle(buff);

        const cSend00 = this.readSingle(buff);
        fatigue.V1.SA = cSend00;
        const cSend01 = this.readSingle(buff);
        fatigue.V2.SA = cSend01;
        const cSend10 = this.readSingle(buff);
        fatigue.V1.SB = cSend10;
        const cSend11 = this.readSingle(buff);
        fatigue.V2.SB = cSend11;
        const cSend20 = this.readSingle(buff);
        fatigue.V1.NA06 = cSend20;
        const cSend21 = this.readSingle(buff);
        fatigue.V2.NA06 = cSend21;
        const cSend30 = this.readSingle(buff);
        fatigue.V1.NB06 = cSend30;
        const cSend31 = this.readSingle(buff);
        fatigue.V2.NB06 = cSend31;
        const cSend40 = this.readSingle(buff);
        fatigue.V1.NA12 = cSend40;
        const cSend41 = this.readSingle(buff);
        fatigue.V2.NA12 = cSend41;
        const cSend50 = this.readSingle(buff);
        fatigue.V1.NB12 = cSend50;
        const cSend51 = this.readSingle(buff);
        fatigue.V2.NB12 = cSend51;
        const cSend60 = this.readSingle(buff);
        fatigue.V1.A = cSend60;
        const cSend61 = this.readSingle(buff);
        fatigue.V2.A = cSend61;
        const cSend70 = this.readSingle(buff);
        fatigue.V1.B = cSend70;
        const cSend71 = this.readSingle(buff);
        fatigue.V2.B = cSend71;
        const cSend800 = this.readSingle(buff);
        const cSend810 = this.readSingle(buff);
        const cSend801 = this.readSingle(buff);
        const cSend811 = this.readSingle(buff);
        const cSend802 = this.readSingle(buff);
        const cSend812 = this.readSingle(buff);

      }


    }
  }

  // 画面６　計算・印刷フォーム
  private GetPrtScrn(buff: any): void {
    const bCollect = this.readBoolean(buff);
    const bDoDraft = this.readBoolean(buff);
    const bDoPrev = this.readBoolean(buff);
    for (let i = 0; i <= 4; i++) {
      const bDoPrint = this.readBoolean(buff);
    }
    for (let i = 0; i <= 1; i++) {
      const bDoType = this.readBoolean(buff);
    }
    const bN_Fixed = this.readBoolean(buff);
    const bDummy = this.readBoolean(buff);
    for (let i = 0; i <= 3; i++) {
      const byteDanSokuHON = this.readByte(buff);
    }
    const iDanBUZAI = this.readInteger(buff);
    for (let i = 0; i <= 3; i++) {
      const fDanHON = this.readSingle(buff);
    }
    const iDanOtoshi = this.readInteger(buff);
    const iJIKUScale = this.readInteger(buff);
    const iKOUKAN_ATUMI = this.readInteger(buff);
    const iMOMENTperCM = this.readInteger(buff);
    const intKetaFlag = this.readInteger(buff);
    for (let i = 0; i <= 3; i++) {
      const fDSY = this.readSingle(buff);
    }
    const strSubTITLE = this.readString(buff, 100);
    if (!this.isOlder("2.1.0", buff.datVersID)) {
      for (let i = 0; i <= 2; i++) {
        const KuiTKIN_D = this.readInteger(buff);
      }
    }

  }

  // 断面力手入力情報を
  private FrmManualGetTEdata(buff: any, NumManualDt: number): void {

    let strfix10: string;
    let strfix32: string;

    for (let i = 0; i < NumManualDt; i++) {
      const index = i + 1;

      // グループNo
      const member = this.members.getTableColumns(index);

      strfix10 = this.readString(buff, 10);
      member.g_no = this.helper.toNumber(strfix10.trim());
      if (member.g_no === null) {
        member.g_id = 'blank';
      } else {
        member.g_id = member.g_no.toString();
      }

      // 部材名
      strfix32 = this.readString(buff, 32);
      member.g_name = strfix32.trim();

      const position = this.points.getTableColumn(index);
      for (const key of Object.keys(position)) {
        if (key in member) {
          position[key] = member[key];
        }
      }

      // 着目点名
      strfix32 = this.readString(buff, 32);
      position.p_name = strfix32.trim();
      position.isMzCalc = true;
      position.isVyCalc = true;
      position.isMtCalc = true;

      // 断面力
      const force = this.force.getTable1Columns(index);
      // 設計曲げモーメントの入力を取得
      let sHAND_MageDAN: number;
      // 耐久性 縁応力検討用
      for (const k3 of ['Md0_Md', 'Md0_Nd']) {
        sHAND_MageDAN = this.readSingle(buff);
        if (sHAND_MageDAN !== null) {
          force[k3] = Math.round(sHAND_MageDAN * 100) / 100;
        }
      }

      // 耐久性 鉄筋応力検討用, 永久
      for (let id = 0; id <= 1; id++) {
        for (const k3 of ['Md1_Md', 'Md1_Nd']) {
          sHAND_MageDAN = this.readSingle(buff);
          if (sHAND_MageDAN !== null) {
            force[k3] = Math.round(sHAND_MageDAN * 100) / 100;
          }
        }
      }
      // 耐久性 変動
      sHAND_MageDAN = this.readSingle(buff);
      sHAND_MageDAN = this.readSingle(buff);
      // 耐久性 外観
      for (const k3 of ['Md1_Md', 'Md1_Nd']) {
        sHAND_MageDAN = this.readSingle(buff);
        if (sHAND_MageDAN !== null) {
          force[k3] = Math.round(sHAND_MageDAN * 100) / 100;
        }
      }
      // 3疲労 最小応力, 4最大応力, 5安全性, 6復旧性 地震時以外, 7復旧性 地震時
      for (let id = 3; id <= 7; id++) {
        const k1 = 'Md' + id;
        for (const k2 of ['_Md', '_Nd']) {
          const k3 = k1 + k2;
          sHAND_MageDAN = this.readSingle(buff);
          if (sHAND_MageDAN !== null) {
            force[k3] = Math.round(sHAND_MageDAN * 100) / 100;
          }
        }
      }
      // 余り
      sHAND_MageDAN = this.readSingle(buff);
      sHAND_MageDAN = this.readSingle(buff);

      // 設計せん断力の入力を取得
      let sHAND_SenDAN: number;
      for (let id = 0; id <= 7; id++) {
        const k1 = 'Vd' + id;
        for (const k2 of ['_Vd', '_Md', '_Nd']) {
          const k3 = k1 + k2;
          sHAND_SenDAN = this.readSingle(buff);
          if (sHAND_SenDAN !== null) {
            force[k3] = Math.round(sHAND_SenDAN * 100) / 100;
          }
        }
      }

      // せん断スパンの入力を取得
      let sHAND_SenDANLa: number = null;
      if (!this.isOlder('3.1.7', buff.datVersID)) {
        sHAND_SenDANLa = this.readSingle(buff);
      }
      if (sHAND_SenDANLa !== null && sHAND_SenDANLa !== 0) {
        position.La = sHAND_SenDANLa;
      }

      // 安全性破壊の設計軸圧縮力の入力を取得
      let sHAND_軸力maxDAN = null
      if (!this.isOlder('3.2.4', buff.datVersID)) {
        sHAND_軸力maxDAN = this.readSingle(buff);
      }

      // min(t/2, d) の入力
      let sHAND_SenDANLa2_1: number = null
      if (!this.isOlder('3.2.7', buff.datVersID)) {
        sHAND_SenDANLa2_1 = this.readSingle(buff);
      }

      // 杭の直径 の入力
      let sHAND_SenDANLa2_2: number = null
      if (!this.isOlder('3.2.8', buff.datVersID)) {
        sHAND_SenDANLa2_2 = this.readSingle(buff);
      }


      // 登録
      const bar = this.bars.getTableColumn(index);
      for (const key of Object.keys(bar)) {
        if (key in member) {
          bar[key] = member[key];
        }
        if (key in position) {
          bar[key] = position[key];
        }
      }
      const fatigue = this.fatigues.getTableColumn(index);
      for (const key of Object.keys(fatigue)) {
        if (key in member) {
          fatigue[key] = member[key];
        }
        if (key in position) {
          fatigue[key] = position[key];
        }
      }
    }



  }

  // バージョンを調べる
  private IsDSDFile(buff: any): any {
    const strfix32 = this.readString(buff, 32);
    const strT: string[] = strfix32.replace("WINDAN", "").trim().split(" ");
    return {
      datVersID: strT[0],
      ManualInput: this.helper.toNumber(strT[1])
    };
  }

  // string型の情報を バイナリから取り出す
  private readString(buff: any, length: number, encode = 'sjis'): string {
    let str: string = '';
    while (str.length < length) {
      const tmp1 = String.fromCharCode.apply("", buff.u8array.slice(0, 2));
      const tmp = (encode !== 'unicode') ? Encord.convert(tmp1, 'unicode', encode) : tmp1;
      if (tmp.length == 1) {
        // ２バイト文字（日本語）
        str += tmp;
        buff.u8array = buff.u8array.slice(2);
      } else {
        const tmp1 = String.fromCharCode.apply("", buff.u8array.slice(0, 1));
        const tmp = (encode !== 'unicode') ? Encord.convert(tmp1, 'unicode', encode) : tmp1;
        str += tmp;
        buff.u8array = buff.u8array.slice(1);
      }
    }
    return str;
  }

  // Boolean型の情報を バイナリから読み取る
  private readBoolean(buff: any): boolean {
    const view = this.getDataView(buff, 2);
    const num = view.getInt16(0);
    return num < 0;
  }

  // Byte型の情報を バイナリから読み取る
  private readByte(buff: any): number {
    const view = this.getDataView(buff, 1);
    let num = view.getUint8(0);
    if (num === this.byte_max) num = null;
    return num;
  }

  // Integer型の情報を バイナリから読み取る
  private readInteger(buff: any): number {
    const view = this.getDataView(buff, 2);
    const num = view.getInt16(0);
    return num;
  }

  //Long型の情報を バイナリから読み取る
  private readLong(buff: any): number {
    const view = this.getDataView(buff, 4);
    const num = view.getInt32(0);
    return num;
  }

  // single型の情報を バイナリから読み取る
  private readSingle(buff: any): number {
    const view = this.getDataView(buff, 4);
    let num = view.getFloat32(0);
    if (Math.abs(num) > this.float_max || (0 < Math.abs(num) && Math.abs(num) < this.float_min)) {
      num = null;
    }
    return num;
  }

  private getDataView(buff, length: number): DataView {
    const data = buff.u8array.slice(0, length);
    const re = data.reverse();
    const b = re.buffer;
    const view = new DataView(b);
    buff.u8array = buff.u8array.slice(length);
    return view;
  }

  // バージョン文字列比較処理
  private isOlder(a: string, b: string): boolean {
    if (a === b) return false;
    const aUnits = a.split(".");
    const bUnits = b.split(".");
    // 探索幅に従ってユニット毎に比較していく
    for (var i = 0; i < Math.min(aUnits.length, bUnits.length); i++) {
      if (parseInt(aUnits[i]) > parseInt(bUnits[i])) return true; // A > B
      if (parseInt(aUnits[i]) < parseInt(bUnits[i])) return false;  // A < B
    }
    return false;
  }

}

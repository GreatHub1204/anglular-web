import { Injectable } from '@angular/core';
import { DataHelperModule } from 'src/app/providers/data-helper.module';
import { InputBasicInformationService } from 'src/app/components/basic-information/basic-information.service';
import { InputCalclationPrintService } from 'src/app/components/calculation-print/calculation-print.service';
import { InputSafetyFactorsMaterialStrengthsService } from 'src/app/components/safety-factors-material-strengths/safety-factors-material-strengths.service';
import { SaveDataService } from 'src/app/providers/save-data.service';
import { CalcSafetyMomentService } from '../result-safety-moment/calc-safety-moment.service';
import { SetDesignForceService } from '../set-design-force.service';
import { SetPostDataService } from '../set-post-data.service';
import { ResultDataService } from '../result-data.service';

@Injectable({
  providedIn: 'root'
})
export class CalcMinimumReinforcementService {
  // 最小鉄筋量
  public DesignForceList: any[];
  public isEnable: boolean;
  public safetyID: number = 5;

  constructor(
    private save: SaveDataService,
    private safety: InputSafetyFactorsMaterialStrengthsService,
    private force: SetDesignForceService,
    private post: SetPostDataService,
    public base: CalcSafetyMomentService,
    private basic: InputBasicInformationService,
    private helper: DataHelperModule,
    private calc: InputCalclationPrintService,
    private result: ResultDataService,) {

    this.DesignForceList = null;
    this.isEnable = false;
  }

  // 設計断面力の集計
  // ピックアップファイルを用いた場合はピックアップテーブル表のデータを返す
  // 手入力モード（this.save.isManual === true）の場合は空の配列を返す
  public setDesignForces(): void{

    this.isEnable = false;

    this.DesignForceList = new Array();

    // 曲げモーメントが計算対象でない場合は処理を抜ける
    if (this.calc.print_selected.calculate_moment_checked === false) {
      return;
    }

    const No8 = (this.save.isManual()) ? 8 : this.basic.pickup_moment_no(8);
    this.DesignForceList = this.force.getDesignForceList(
      'Md', No8);

  }

  // サーバー POST用データを生成する
  public setInputData(): any {

    if(this.DesignForceList.length < 1 ){
      return null;
    }

    // 有効なデータかどうか
    const force = this.force.checkEnable('Md', this.safetyID, this.DesignForceList);

    // POST 用
    const option = {};

    const postData = this.post.setInputData('Md', '耐力', this.safetyID, option,
    force[0]);

    return postData;
  }

  public getSafetyFactor(g_id: string, safetyID: number){
    return this.safety.getCalcData('Md', g_id, safetyID);
  }


  public getResultValue(
    res: any, section: any, member: any, safety: any, fck: any, DesignForceList: any): any {

    const dmax: number = safety.material_concrete.dmax;
    const fck13: number = fck.fck * 1.3;
    const GF: number = Math.round(10000 * 0.01 * dmax ** (1/3) * fck13 ** (1/3))/10000;
    const Ec: number = Math.round(10 * this.helper.getEc(fck13)) / 10;
    const ftk: number = Math.round(100 * 0.23 * fck13 **(2/3)) / 100;
    const lch: number = Math.round(10 * 1000 * GF * Ec / ftk ** 2) / 10;
    const k0b: number = Math.round(100 * (1 + 1 / (0.85 + 4.5 * (section.shape.H / lch)))) / 100;
    const k1b: number = 1.0;
    const sigma_crd: number = Math.round(100 * k0b * k1b * ftk) / 100;

    const struct = this.result.getStructuralVal(
      section.shapeName, member, "Md", res.index);
    const A : number = struct.A;
    const I : number = struct.I;
    const y : number = (res.side==='上側引張') ? struct.eu : struct.el;

    const force = DesignForceList.find(v => v.index === res.index)
                      .designForce.find(v => v.side === res.side);
    const resultData = res.Reactions[0];
    const safety_factor = safety.safety_factor;

    const Nd: number = force.Nd;
    let rb: number = safety_factor.M_rb;

    const Mcrd: number = I / y * (sigma_crd + Nd * 1000/ A) / rb;

    // Myd の計算
    rb = 1.1;
    const εcu: number = resultData.Y.εc;
    const εs: number = resultData.Y.εs;
    const x: number = resultData.Y.x;
    const My: number = resultData.Y.Mi;
    const Myd: number = My / rb;

    const fcd : number = safety.material_concrete.fck / 1.3;
    const a_val: number = 0.88 - 0.004 * fck.fck;
    const a: number = (a_val > 0.68) ? 0.68: a_val;
    const εcu_val: number = (155 - fck.fck) / 30000;
    const εcu_max: number = (εcu_val > 0.0035) ? 0.0035: εcu_val;
    const fsyd : number = section.Ast.fsd;
    const Es: number = section.Ast.Es;
    const Asc: number = section.Asc.Asc;
    const εsy: number = fsyd / Es / 1000;
    let sigma_s : number = 0;
    /*/ 圧縮鉄筋かぶり
    if(section['Asc'] != null){
      if(section.Asc['dsc'] != null && section.Asc['compress']['fsy']  != null){
          sigma_s = εcu / x * (x - section.Asc.dsc) * Es * 1000;
          sigma_s = Math.min(sigma_s, section.Asc.compress.fsy.fsy);
      }
    }*/


    const d : number = (section.shape.Hw === null) ? section.shape.H - section.Ast.dst :
                                                      section.shape.Hw - section.Ast.dst;
    const pb : number = ((a * εcu_max / (εcu_max + εsy) - Nd * 1000 / (section.shape.B * d * fcd)) *
                        fcd / fsyd + Asc / (section.shape.B * d) * sigma_s / fsyd) * 100
    const pc : number = section.Ast.Ast / (section.shape.B * d) * 100;


    return {
      dmax, fck13, GF, Ec, ftk, lch,
      k0b, k1b, sigma_crd, A, I, y, Nd,
      Mcrd,
      εcu, εs, x, My, rb, Myd,
      fcd, a_val, a, εcu_val, εcu_max, fsyd, Es, εsy,
      sigma_s, d, pb, pc
    };
  }
}


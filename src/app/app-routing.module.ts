import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BlankPageComponent } from './components/blank-page/blank-page.component';
import { BasicInformationComponent } from './components/basic-information/basic-information.component';
import { MembersComponent } from './components/members/members.component';
import { DesignPointsComponent } from './components/design-points/design-points.component';
import { BarsComponent } from './components/bars/bars.component';
import { SteelsComponent } from './components/steels/steels.component';
import { FatiguesComponent } from './components/fatigues/fatigues.component';
import { SafetyFactorsMaterialStrengthsComponent } from './components/safety-factors-material-strengths/safety-factors-material-strengths.component';
import { SectionForcesComponent } from './components/section-forces/section-forces.component';
import { CalculationPrintComponent } from './components/calculation-print/calculation-print.component';
import { ResultViewerComponent } from './calculation/result-viewer/result-viewer.component';
import { CrackSettingsComponent } from './components/crack/crack-settings.component';
import { ShearComponent } from './components/shear/shear.component';


const routes: Routes = [
    { path: '', redirectTo: '/blank-page', pathMatch: 'full' },
    { path: 'basic-information', component: BasicInformationComponent },
    { path: 'members', component: MembersComponent },
    { path: 'design-points', component: DesignPointsComponent },
    { path: 'bars', component: BarsComponent },
    { path: 'steels', component: SteelsComponent },
    { path: 'shear', component: ShearComponent },
    { path: 'crack', component: CrackSettingsComponent },
    { path: 'fatigues', component: FatiguesComponent },
    { path: 'safety-factors-material-strengths', component: SafetyFactorsMaterialStrengthsComponent },
    { path: 'section-forces', component: SectionForcesComponent },
    { path: 'calculation-print', component: CalculationPrintComponent },
    { path: 'result-viewer', component: ResultViewerComponent },
    { path: 'blank-page', component: BlankPageComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    useHash: false,
    scrollPositionRestoration: 'enabled',
    anchorScrolling: 'enabled',
    relativeLinkResolution: 'legacy'
})],
  exports: [RouterModule]
})
export class AppRoutingModule {


}

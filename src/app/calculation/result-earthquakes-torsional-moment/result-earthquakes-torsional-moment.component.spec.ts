import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultEarthquakesTorsionalMomentComponent } from './result-earthquakes-torsional-moment.component';

describe('ResultEarthquakesTorsionalMomentComponent', () => {
  let component: ResultEarthquakesTorsionalMomentComponent;
  let fixture: ComponentFixture<ResultEarthquakesTorsionalMomentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultEarthquakesTorsionalMomentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResultEarthquakesTorsionalMomentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

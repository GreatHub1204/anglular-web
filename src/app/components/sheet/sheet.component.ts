import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild, Renderer2 } from '@angular/core';
import pq from 'pqgrid';

//import few localization files for this demo.
import 'pqgrid/localize/pq-localize-en.js';
import 'pqgrid/localize/pq-localize-ja.js';

@Component({
  selector: 'app-sheet',
  templateUrl: './sheet.component.html',
  styleUrls: ['./sheet.component.scss']
})
export class SheetComponent implements AfterViewInit, OnChanges {

  @ViewChild('pqgrid') div: ElementRef;
  @Input() options:any;
  grid: pq.gridT.instance = null;

  private createGrid(){
      this.grid = pq.grid(this.div.nativeElement, this.options);
  }

  ngOnChanges(obj: SimpleChanges){
      if( !obj.options.firstChange ){
        //grid is destroyed and recreated only when whole options object is changed to new reference.
        this.grid.destroy();
        this.createGrid();
      }
  }

  ngAfterViewInit(){ 
      this.createGrid();
  }

  refreshDataAndView(){
    if (this.grid === null ) {
      return;
    }
    this.grid.refreshDataAndView();
  }

  refresh(){
    if (this.grid === null ) {
      return;
    }
    this.grid.refresh();
  }
  
}

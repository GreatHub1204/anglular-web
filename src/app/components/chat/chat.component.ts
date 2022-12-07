import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements AfterViewInit {
  
  @Input()
  type: string;
  
  @ViewChild('script') script: ElementRef;

  constructor() { }

  ngAfterViewInit(): void {

    const element = this.script.nativeElement;

    document["__cp_d"]="https://app.chatplus.jp";
    document["__cp_c"]="a4ef5c36_1";
    const script = document.createElement('script');
    script.type = this.type ? this.type : 'text/javascript';
    script.src = "https://app.chatplus.jp/cp.js";

    const parent = element.parentElement;
    parent.parentElement.replaceChild(script, parent);

  }

}

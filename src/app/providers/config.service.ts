import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private activeComponentRef: any;

  constructor() {
    this.activeComponentRef = null;
   }

   public nativeGlobal() { return window }

  public setActiveComponent(componentRef: any): void {
    this.activeComponentRef = componentRef;
  }

  public saveActiveComponentData(): void {
    if (this.activeComponentRef === null) {
      return;
    }
    if ('saveData' in this.activeComponentRef) {
      this.activeComponentRef.saveData();
    }

  }

}


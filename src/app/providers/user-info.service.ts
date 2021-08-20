import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';



@Injectable({
  providedIn: 'root'
})
export class UserInfoService {
  
  public uid: string = '';
  public deduct_points: number = 0;
  public daily_points: number = 0;

  public clear(uid: string): void{
    this.uid = uid;
    this.deduct_points = 0;
    this.daily_points = 0;
  }

  public setUserPoint(_deduct_points: number, _daily_points: number){
    this.deduct_points += _deduct_points;
    this.daily_points = Math.max(this.daily_points, _daily_points);
  }
  
}
import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFireAuth } from '@angular/fire/auth';

import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss']
})


export class LoginDialogComponent implements OnInit {
  loginForm: FormGroup;
  loginUserName: string;
  loginPassword: string;

  loginError: boolean;
  errorMessage: string;
  connecting: boolean;

  constructor(public activeModal: NgbActiveModal,
    public auth: AngularFireAuth,
    private fb: FormBuilder) {
    this.loginError = false;
    this.connecting = false;
  }

  ngOnInit() {
    this.loginForm = this.fb.group({
      'email': ['', [Validators.required, Validators.email]],
      'password': ['', [Validators.required]]
    });
  }

  public login() {
    this.connecting = true;
    const email = this.loginForm.get('email').value;
    const password = this.loginForm.get('password').value;
    this.auth
    .signInWithEmailAndPassword(email, password)
    .then(auth => {
      this.connecting = false;
      // メールアドレス確認が済んでいるかどうか
      if (!auth.user.emailVerified) {
        this.auth.signOut();
        // this.user.clear();
        return Promise.reject('メールアドレスが確認できていません。');
      }
      
      return this.activeModal.close('Submit');
    })
    .catch( err => {
      this.connecting = false;
      // this.user.loggedIn = false;
      this.loginError = true;
      this.errorMessage = err;
      alert('ログインに失敗しました。\n' + err);
    });
  }

  public goToLink(){
    window.open(environment.loginURL, "_blank");
  }
}

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import log from 'electron-log';

log.info(`${app.name} ${app.getVersion()}`);
let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.openDevTools();
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// Angular -> Electron

// 上書き保存
ipcMain.on('overWrite', async (event: Electron.IpcMainEvent, path: string, data: string) => {
  fs.writeFile(path, data, function (error) {
    if (error != null) {
      dialog.showMessageBox({ message: 'error : ' + error });
    }
  });
  event.returnValue = path;
});

// 名前を付けて保存
ipcMain.on('saveFile', async (event: Electron.IpcMainEvent, filename: string, data: string) => {
  // 場所とファイル名を選択
  const path = dialog.showSaveDialogSync(mainWindow, {
    buttonLabel: '保存',  // ボタンのラベル
    filters: [
      { name: 'json', extensions: ['json'] },
    ],
    defaultPath: filename,
    properties:[
      'createDirectory',  // ディレクトリの作成を許可 (macOS)
    ]
  });

  // キャンセルで閉じた場合
  if( path === undefined ){
    event.returnValue = '';
  }

  // ファイルの内容を返却
  try {
    fs.writeFileSync(path, data);
    event.returnValue = path;
  }
  catch(error) {
    dialog.showMessageBox({ message: 'error : ' + error });
    event.returnValue = '';
  }
});

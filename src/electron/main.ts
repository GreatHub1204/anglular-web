import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import log from 'electron-log';

log.info(`${app.name} ${app.getVersion()}`);
let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      nativeWindowOpen: true
    }
  });
  mainWindow.maximize();
  mainWindow.setMenuBarVisibility(false);
  // mainWindow.webContents.openDevTools();
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// Angular -> Electron
// ファイルを開く
ipcMain.on('open', async (event: Electron.IpcMainEvent) => {
  // ファイルを選択
  const paths = dialog.showOpenDialogSync(mainWindow, {
    buttonLabel: '開く',  // 確認ボタンのラベル
    filters: [
      { name: 'wdj', extensions: ['wdj', 'dsd'] },
    ],
    properties:[
      'openFile',         // ファイルの選択を許可
      'createDirectory',  // ディレクトリの作成を許可 (macOS)
    ]
  });

  // キャンセルで閉じた場合
  if( paths === undefined ){
    event.returnValue = {status: undefined};
    return;
  }

  // ファイルの内容を返却
  try {
    const path = paths[0];
    const buff = fs.readFileSync(path);

    // ファイルを読み込む
    let text = null;
    switch (path.split('.').pop()) {
      case "dsd":
        text = buff;
        break;
      default:
        text = buff.toString();
    }

    // リターン
    event.returnValue = {
      status: true,
      path: path,
      text
    };
  }
  catch(error) {
    event.returnValue = {status:false, message:error.message};
  }
});

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
      { name: 'wdj', extensions: ['wdj'] },
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


import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import log from 'electron-log';

log.info(`${app.name} ${app.getVersion()}`);

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.maximize();
  mainWindow.webContents.openDevTools();
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
});

// Angular -> Electron
ipcMain.on('selectPirate', async (event: Electron.IpcMainEvent, name: string) => {
    await dialog.showMessageBox({ message: 'You selected: ' + name });
    event.returnValue = true;
});

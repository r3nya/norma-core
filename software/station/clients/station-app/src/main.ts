import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const IS_DEV = !app.isPackaged;

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NormaCore Station',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Block navigation and new windows for security
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  if (IS_DEV) {
    // Dev: load Vite dev server
    win.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load Vite dev server — is it running?', err.message);
    });
    win.webContents.openDevTools();
  } else {
    // Prod: load from extraResources (electron-builder copies station-viewer/dist there)
    const viewerDist = path.join(process.resourcesPath, 'station-viewer-dist', 'index.html');

    if (!fs.existsSync(viewerDist)) {
      console.error(`station-viewer dist not found at: ${viewerDist}`);
      win.loadURL('data:text/html,<h1>station-viewer/dist not found</h1><p>Build station-viewer before packaging.</p>');
    } else {
      win.loadFile(viewerDist).catch((err) => {
        console.error('Failed to load station-viewer:', err);
      });
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

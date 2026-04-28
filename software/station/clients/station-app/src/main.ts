import { app, BrowserWindow, Menu, shell } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { STATION_VERSION } from './generated/version';

const FORCE_LOAD_DIST = process.argv.includes('--load-dist');
const OPEN_DEVTOOLS = process.argv.includes('--devtools');
const IS_DEV = !app.isPackaged && !FORCE_LOAD_DIST;
const STATION_WEB_ADDR = '127.0.0.1:8889';
const STATION_TCP_ADDR = '127.0.0.1:8888';
const NORMACORE_WEBSITE = 'https://normacore.dev/';

let stationProcess: ChildProcess | null = null;
let isQuitting = false;

function openNormaCoreWebsite(): void {
  shell.openExternal(NORMACORE_WEBSITE).catch((err) => {
    console.error('Failed to open NormaCore website:', err);
  });
}

function configureApplicationMenu(): void {
  app.setAboutPanelOptions({
    applicationName: 'NormaCore Station',
    applicationVersion: STATION_VERSION,
    copyright: 'NormaCore',
    credits: NORMACORE_WEBSITE,
    website: NORMACORE_WEBSITE,
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            {
              label: 'NormaCore Website',
              click: openNormaCoreWebsite,
            },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(process.platform === 'darwin'
          ? [{ role: 'zoom' as const }, { type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'NormaCore Website',
          click: openNormaCoreWebsite,
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function getViewerDistPath(): string {
  if (app.isPackaged) {
    // Packaged app: electron-builder copies station-viewer/dist to resources/station-viewer-dist
    return path.join(process.resourcesPath, 'station-viewer-dist', 'index.html');
  }

  // Local prod preview: main.js is emitted to station-app/dist/
  return path.join(__dirname, '..', '..', 'station-viewer', 'dist', 'index.html');
}

function getStationBinaryPath(): string {
  const binaryName = process.platform === 'win32' ? 'station.exe' : 'station';

  if (app.isPackaged) {
    // Packaged app: electron-builder copies the Rust station binary to resources/bin
    return path.join(process.resourcesPath, 'bin', binaryName);
  }

  // Local prod preview: Rust build output lives under the repository target directory
  return path.join(__dirname, '..', '..', '..', '..', '..', 'target', 'release', binaryName);
}

function getDevIconPath(): string | undefined {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  return fs.existsSync(iconPath) ? iconPath : undefined;
}

function startStationBackend(): void {
  if (stationProcess) {
    return;
  }

  const stationPath = getStationBinaryPath();
  if (!fs.existsSync(stationPath)) {
    console.error(`station binary not found at: ${stationPath}`);
    return;
  }

  const userDataPath = app.getPath('userData');
  const stationDataPath = path.join(userDataPath, 'station_data');
  const stationConfigPath = path.join(userDataPath, 'station.yaml');
  fs.mkdirSync(stationDataPath, { recursive: true });

  stationProcess = spawn(
    stationPath,
    [
      '--web',
      STATION_WEB_ADDR,
      '--tcp',
      STATION_TCP_ADDR,
      '--normfs-base-folder',
      stationDataPath,
      '--config',
      stationConfigPath,
    ],
    {
      cwd: userDataPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  stationProcess.stdout?.on('data', (data) => {
    console.log(`[station] ${data.toString().trimEnd()}`);
  });

  stationProcess.stderr?.on('data', (data) => {
    console.error(`[station] ${data.toString().trimEnd()}`);
  });

  stationProcess.on('error', (err) => {
    console.error('Failed to start station backend:', err);
  });

  stationProcess.on('exit', (code, signal) => {
    if (!isQuitting) {
      console.error(`station backend exited unexpectedly (code=${code}, signal=${signal})`);
    }
    stationProcess = null;
  });
}

function stopStationBackend(): void {
  if (!stationProcess) {
    return;
  }

  stationProcess.kill();
  stationProcess = null;
}

function createWindow(): void {
  const devIconPath = getDevIconPath();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NormaCore Station',
    icon: devIconPath,
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
    // Dev: load Vite dev server. Backend is expected to be started separately.
    win.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load Vite dev server — is it running?', err.message);
    });
    if (OPEN_DEVTOOLS) {
      win.webContents.openDevTools();
    }
    return;
  }

  startStationBackend();

  // Prod / local preview: load built station-viewer dist via file://
  const viewerDist = getViewerDistPath();

  if (!fs.existsSync(viewerDist)) {
    console.error(`station-viewer dist not found at: ${viewerDist}`);
    win.loadURL('data:text/html,<h1>station-viewer/dist not found</h1><p>Run yarn build:viewer before loading production mode.</p>');
    return;
  }

  win.loadFile(viewerDist).catch((err) => {
    console.error('Failed to load station-viewer:', err);
  });
}

app.whenReady().then(() => {
  configureApplicationMenu();

  if (process.platform === 'darwin') {
    const devIconPath = getDevIconPath();
    if (devIconPath) {
      app.dock?.setIcon(devIconPath);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopStationBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

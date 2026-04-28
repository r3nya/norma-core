declare module 'electron-window-state' {
  interface Options {
    defaultWidth?: number;
    defaultHeight?: number;
    path?: string;
    file?: string;
    maximize?: boolean;
    fullScreen?: boolean;
  }

  interface State {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
    isFullScreen: boolean;
    manageWindow(browserWindow: Electron.BrowserWindow): void;
    manage(browserWindow: Electron.BrowserWindow): void;
    unmanageWindow(): void;
    saveState(): void;
    resetStateToDefaults(): void;
  }

  function windowStateKeeper(options?: Options): State;
  export = windowStateKeeper;
}

/** Desktop API injected by Electron preload (contextBridge). */
interface StationDesktopAPI {
  backendUrl: string;
  isDesktop: true;
}

interface Window {
  stationDesktop?: StationDesktopAPI;
}

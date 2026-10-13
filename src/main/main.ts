import { app, BrowserWindow, dialog, Menu, session, shell } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AppError } from '../core/errors';
import { DEFAULT_SETTINGS, sanitizeHistory, sanitizeSettings } from '../core/settings';
import { registerIpc } from './ipc';
import { JsonStore } from './services/jsonStore';
import { Organizer } from './services/organizer';

const INDEX_HTML = path.join(__dirname, '..', 'renderer', 'index.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 820,
    minHeight: 560,
    title: 'PixelDesk',
    backgroundColor: '#120c26',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  void mainWindow.loadFile(INDEX_HTML);
}

async function bootstrap(): Promise<void> {
  const userData = app.getPath('userData');
  const organizer = new Organizer({
    settingsStore: new JsonStore(path.join(userData, 'settings.json'), () => ({ ...DEFAULT_SETTINGS, roots: [] }), sanitizeSettings),
    historyStore: new JsonStore(path.join(userData, 'history.json'), () => [], sanitizeHistory),
    caseInsensitive: process.platform !== 'linux',
    pickFolder: async () => {
      const r = await dialog.showOpenDialog(mainWindow!, {
        title: 'Choose a folder to tidy',
        buttonLabel: 'Choose folder',
        properties: ['openDirectory'],
      });
      return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
    },
    confirm: async (req) => {
      const r = await dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: ['Cancel', req.confirmLabel],
        defaultId: 0, // Enter = Cancel
        cancelId: 0,
        noLink: true,
        title: req.title,
        message: req.message,
        detail: req.detail,
      });
      return r.response === 1;
    },
    openFolder: async (p) => {
      const err = await shell.openPath(p);
      if (err) throw new AppError('OPEN_FAILED', 'Could not open that folder.');
    },
  });
  await organizer.init();
  registerIpc(organizer, pathToFileURL(INDEX_HTML).href);
  createWindow();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });

  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-navigate', (e) => e.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });

  void app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    Menu.setApplicationMenu(null);
    await bootstrap();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}

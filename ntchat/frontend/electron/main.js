const { app, BrowserWindow } = require('electron');
const path = require('path');
// const url = require('url'); // Not strictly needed if loading remote URL or index.html directly

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'), // Optional: for secure IPC
      nodeIntegration: false, // Recommended false for security
      contextIsolation: true, // Recommended true for security
    },
  });

  // Option 1: Load from Vite dev server (for development) - requires vite dev server to be running
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.loadURL('http://localhost:5173'); // Assuming Vite runs on 5173
  //   mainWindow.webContents.openDevTools(); // Open DevTools
  // } else {
  // Option 2: Load the built frontend (for production packaging)
  // The path should point to your frontend's index.html in the dist folder
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  // }
  // Or, if your backend serves the frontend and you want Electron to point to it:
  // mainWindow.loadURL('http://your-deployed-backend-or-domain.com');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

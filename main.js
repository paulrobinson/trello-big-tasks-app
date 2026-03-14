const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 }
  });

  mainWindow.loadFile('index.html');
}

// Handle Trello API requests from renderer
ipcMain.handle('trello-api', async (event, url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, data: JSON.parse(data) });
        } else {
          resolve({ ok: false, status: res.statusCode, data: null });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
});

// Handle opening external URLs
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// Handle OAuth authentication
ipcMain.handle('trello-oauth', async (event, apiKey) => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const authUrl = `https://trello.com/1/authorize?expiration=never&name=Big%20Tasks%20App&scope=read&response_type=token&key=${apiKey}&return_url=https://trello.com/1/token/approve`;

    authWindow.loadURL(authUrl);
    authWindow.show();

    // Listen for URL changes to capture the token
    authWindow.webContents.on('will-redirect', (event, url) => {
      handleCallback(url);
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      handleCallback(url);
    });

    function handleCallback(url) {
      // Check if we're on the token page
      if (url.includes('trello.com/1/token/approve')) {
        // Extract the token from the page
        authWindow.webContents.executeJavaScript(`
          const tokenElement = document.querySelector('pre') || document.querySelector('code') || document.body;
          tokenElement ? tokenElement.textContent.trim() : '';
        `).then(token => {
          if (token && token.length > 30) {
            authWindow.close();
            resolve({ success: true, token });
          }
        }).catch(err => {
          console.error('Error extracting token:', err);
        });
      }
    }

    authWindow.on('closed', () => {
      reject(new Error('Authentication window was closed'));
    });
  });
});

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

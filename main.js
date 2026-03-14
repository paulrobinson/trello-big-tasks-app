const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');

let mainWindow;
let tray = null;
let top5Cards = [];

// Window state management
const userDataPath = app.getPath('userData');
const windowStatePath = path.join(userDataPath, 'window-state.json');

function saveWindowState(state) {
  try {
    // Ensure user data directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    fs.writeFileSync(windowStatePath, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

function loadWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      return JSON.parse(fs.readFileSync(windowStatePath, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load window state:', err);
  }
  return null;
}

function createWindow() {
  if (mainWindow) {
    mainWindow.show();
    return;
  }

  // Load saved window state
  const savedState = loadWindowState();

  let windowOptions = {
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    roundedCorners: false
  };

  // Restore position if we have saved state
  if (savedState && savedState.bounds) {
    // Check if the saved display still exists
    const displays = screen.getAllDisplays();
    const savedDisplay = displays.find(d =>
      d.bounds.x === savedState.displayBounds.x &&
      d.bounds.y === savedState.displayBounds.y
    );

    if (savedDisplay) {
      windowOptions.x = savedState.bounds.x;
      windowOptions.y = savedState.bounds.y;
      windowOptions.width = savedState.bounds.width;
      windowOptions.height = savedState.bounds.height;
    }
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile('index.html');

  // Restore bar mode state after window is ready
  if (savedState && savedState.isBarMode) {
    mainWindow.webContents.on('did-finish-load', () => {
      // Let the renderer know to restore bar mode
      // The renderer will call toggle-bar-mode which will set the correct bounds
    });
  }

  // Set always on top if it was in bar mode
  if (savedState && savedState.isBarMode) {
    mainWindow.setAlwaysOnTop(true);
  }

  mainWindow.on('close', () => {
    // Save state before closing
    saveCurrentWindowState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save window state on move or resize
  mainWindow.on('moved', () => {
    saveCurrentWindowState();
  });

  mainWindow.on('resized', () => {
    saveCurrentWindowState();
  });
}

function saveCurrentWindowState() {
  if (!mainWindow) return;

  const bounds = mainWindow.getBounds();
  const windowCenter = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  const currentDisplay = screen.getDisplayNearestPoint(windowCenter);

  saveWindowState({
    bounds: bounds,
    displayBounds: currentDisplay.bounds,
    isBarMode: mainWindow.isAlwaysOnTop() // Use always-on-top as proxy for bar mode
  });
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

// Handle close window
ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Handle menu bar updates
ipcMain.on('update-menu-bar', (event, cards) => {
  top5Cards = cards;
  updateTrayMenu();
});

// Handle toggle bar mode
ipcMain.on('toggle-bar-mode', (event, enabled) => {
  if (!mainWindow) return;

  // Get the window's current position
  const windowBounds = mainWindow.getBounds();
  const windowCenter = {
    x: windowBounds.x + windowBounds.width / 2,
    y: windowBounds.y + windowBounds.height / 2
  };

  // Find which display the window is currently on
  const currentDisplay = screen.getDisplayNearestPoint(windowCenter);
  const { x: displayX, y: displayY, width, height } = currentDisplay.workArea;

  if (enabled) {
    // Bar mode: full width, compact 32px height
    const barHeight = 32;
    mainWindow.setBounds({
      x: displayX,
      y: displayY + height - barHeight,
      width: width,
      height: barHeight
    });
    mainWindow.setAlwaysOnTop(true);
  } else {
    // Normal mode: restore default size on current screen
    mainWindow.setBounds({
      x: displayX + Math.floor((width - 800) / 2),
      y: displayY + Math.floor((height - 600) / 2),
      width: 800,
      height: 600
    });
    mainWindow.setAlwaysOnTop(false);
  }

  // Save window state after mode change
  saveCurrentWindowState();
});

// Create tray icon
function createTray() {
  // Create a simple visible icon - a 16x16 black square with white text
  const iconSize = 16;
  const canvas = nativeImage.createEmpty();

  // Create a simple template icon (works better on macOS)
  // Using a basic shape that will be visible
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAB5SURBVHjarJNBCsAgDATX/3+aHiyIYE0aSQ9dWMZLmMwk2lprKaU45xhjYK0V5xyt1v6MZCCiSimZmZl7/yAiRGSstWKMwVqLEAJCCHDOYc6JtRamaeq/MeccUsqcc733DhGhlBK993LOUWvFnBNrrX0LY0yFd64BAKaJMzAiqt0KAAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);
  tray.setToolTip('Trello Big Tasks');
  tray.setTitle('📋'); // This shows text in the menu bar

  updateTrayMenu();

  // Click on tray to show window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

// Update tray menu with cards
function updateTrayMenu() {
  if (!tray) return;

  const menuItems = [];

  // Add top 5 cards
  if (top5Cards.length > 0) {
    top5Cards.forEach((card, index) => {
      menuItems.push({
        label: `${index + 1}. ${card.name}`,
        click: () => {
          shell.openExternal(`https://trello.com/c/${card.id}`);
        }
      });
    });
    menuItems.push({ type: 'separator' });
  } else {
    menuItems.push({
      label: 'No cards loaded',
      enabled: false
    });
    menuItems.push({ type: 'separator' });
  }

  // Add show/hide window option
  menuItems.push({
    label: mainWindow && mainWindow.isVisible() ? 'Hide Window' : 'Show Window',
    click: () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      } else {
        createWindow();
      }
    }
  });

  menuItems.push({ type: 'separator' });
  menuItems.push({
    label: 'Quit',
    click: () => {
      app.quit();
    }
  });

  const contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit - keep running in menu bar
  // Users can quit from the tray menu
});

app.on('before-quit', () => {
  // Save state before quitting
  if (mainWindow) {
    saveCurrentWindowState();
  }
});

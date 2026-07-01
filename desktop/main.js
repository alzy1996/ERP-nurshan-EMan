const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

// ERP Nexus Desktop is a secure shell around the LIVE web system, so desktop,
// web and phone always run the exact same app and data — nothing to keep in
// sync by hand. Point it elsewhere with the ERP_NEXUS_URL environment variable.
const APP_URL = process.env.ERP_NEXUS_URL || "https://procurement-erp-6e271.web.app";

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0e0f1a",
    title: "ERP Nexus",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  // Links to other sites (mailto:, wa.me, maps, etc.) open in the real browser
  // instead of a bare window inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Keep in-app navigation on our own origin; send anything external out.
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on("closed", () => {
    win = null;
  });
}

// A minimal, familiar menu (reload, zoom, fullscreen, dev tools).
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    { label: "File", submenu: [isMac ? { role: "close" } : { role: "quit" }] },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

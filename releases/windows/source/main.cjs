const { app, BrowserWindow, shell, Menu } = require("electron");
const DEFAULT_URL = "https://inquiry-atelier-desk.lovable.app/";
// Single instance
if (!app.requestSingleInstanceLock()) app.quit();
let win;
function create() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1366, height: 860, minWidth: 360, minHeight: 500,
    title: "تمكين - الإدارة", backgroundColor: "#0E1E3D", autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // Open the last saved admin address (set from the in-app settings), otherwise the default.
  const saved = require("path").join(app.getPath("userData"), "admin-url.txt");
  let url = DEFAULT_URL;
  try { const t = require("fs").readFileSync(saved, "utf8").trim(); if (/^https:\/\//.test(t)) url = t; } catch {}
  win.loadURL(url);
  // Remember the origin whenever the user navigates to a new admin address.
  win.webContents.on("did-navigate", (_e, u) => {
    try { const o = new URL(u).origin + "/"; require("fs").writeFileSync(saved, o); } catch {}
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:") || url === "about:blank") return { action: "allow" };
    shell.openExternal(url); return { action: "deny" };
  });
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type === "keyDown" && (i.key === "F5" || (i.control && i.key.toLowerCase() === "r"))) { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
  });
}
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());

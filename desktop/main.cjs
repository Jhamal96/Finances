"use strict";
const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const APP_URL = "https://finance.ajdapp.org/";
const ORIGIN = new URL(APP_URL).origin;
let mainWindow = null;

function sameSite(raw) {
  try {const url = new URL(raw);return url.protocol === "https:" && url.origin === ORIGIN;}catch(_){return false;}
}
function openExternalSafe(raw) {
  try {
    const u = new URL(raw);
    if (["https:","mailto:","tel:"].includes(u.protocol)) shell.openExternal(u.href).catch(() => {});
  } catch (_) {}
}


const INTRO_MARKER = path.join(app.getPath('userData'), 'intro-seen-v2');
function startBrandedApp(win) {
  const first=!fs.existsSync(INTRO_MARKER);
  return win.loadFile(path.join(__dirname,'intro.html'),{query:{first:first?'1':'0'}});
}
ipcMain.on('ajd:intro-done',(event,remember) => {
  if(!event.senderFrame || !event.senderFrame.url.startsWith('file://'))return;
  const current=BrowserWindow.fromWebContents(event.sender);
  if(!current || current.isDestroyed())return;
  if(remember === true) {
    try {fs.mkdirSync(path.dirname(INTRO_MARKER),{recursive:true});fs.writeFileSync(INTRO_MARKER,'1');}catch(_) {}
  }
  current.loadURL(APP_URL);
});
function createWindow() {
  const win = new BrowserWindow({
    title:"Household Finance",
    width:1250,height:830,minWidth:800,minHeight:600,
    backgroundColor: '#101b2b',
    autoHideMenuBar:true,
    show:false,
    icon: path.join(__dirname,'icon.png'),
    webPreferences:{
      preload: path.join(__dirname,'preload.cjs'),
    nodeIntegration:false,
      contextIsolation:true,
      sandbox:true,
      webSecurity:true,
      allowRunningInsecureContent:false
    }
  });
  mainWindow=win;
  win.once("ready-to-show",()=>win.show());
  win.webContents.setWindowOpenHandler(({url})=>{
    openExternalSafe(url);
    return {action:"deny"};
  });
  win.webContents.on("will-navigate",(event,url)=>{
    if(sameSite(url)) return;
    event.preventDefault();
    openExternalSafe(url);
  });
  win.webContents.on("will-redirect",(event,url)=>{
    if(sameSite(url))return;
    event.preventDefault();
    openExternalSafe(url);
  });
  win.webContents.on("did-finish-load",()=>{
    if (!sameSite(win.webContents.getURL()))return;
    win.webContents.insertCSS("#financeHeaderInstallBtn, #financeAuthInstallSection {display:none!important;}").catch(()=>{});
  });
  startBrandedApp(win);
}
app.whenReady().then(()=>{
  const trusted=url=>{try{return new URL(url).origin===ORIGIN;}catch(_){return false;}};
  session.defaultSession.setPermissionCheckHandler((_wc,permission,origin)=>{
    return trusted(origin)&&["notifications","fullscreen"].includes(permission);
  });
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback,details)=>{
    const u=details?.requestingUrl||wc.getURL();
    callback(trusted(u)&&["notifications","fullscreen"].includes(permission));
  });
  createWindow();
  app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});

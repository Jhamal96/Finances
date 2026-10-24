"use strict";
const {app, BrowserWindow, session, shell} = require("electron");

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

function createWindow() {
  const win = new BrowserWindow({
    title:"Household Finance",
    width:1250,height:830,minWidth:800,minHeight:600,
    backgroundColor:"#090d16",
    autoHideMenuBar:true,
    show:false,
    webPreferences:{
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
  win.loadURL(APP_URL);
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

'use strict';
// Minimal Chrome DevTools Protocol client with a built-in WebSocket implementation,
// so the auditor runs on plain Node 16+ with any installed Chromium browser and no npm install.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
};

function findBrowser() {
  if (process.env.AXIOMATIC_BROWSER) return process.env.AXIOMATIC_BROWSER;
  for (const p of CANDIDATES[process.platform] || CANDIDATES.linux) if (fs.existsSync(p)) return p;
  throw new Error('No Chromium browser found. Set AXIOMATIC_BROWSER to a Chrome, Edge or Chromium executable.');
}

class WS extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.parts = [];
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => this.emit('close'));
    socket.on('error', (e) => this.emit('error', e));
  }
  static connect(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const key = crypto.randomBytes(16).toString('base64');
      const req = http.request({
        host: u.hostname, port: u.port, path: u.pathname,
        headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' },
      });
      req.on('upgrade', (res, socket, head) => {
        const ws = new WS(socket);
        if (head && head.length) ws._onData(head);
        resolve(ws);
      });
      req.on('error', reject);
      req.end();
    });
  }
  send(text) {
    const payload = Buffer.from(text);
    const len = payload.length;
    let header;
    if (len < 126) { header = Buffer.alloc(2); header[1] = 0x80 | len; }
    else if (len < 65536) { header = Buffer.alloc(4); header[1] = 0x80 | 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2); }
    header[0] = 0x81;
    const mask = crypto.randomBytes(4);
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i & 3];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  _onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 2) return;
      const fin = (this.buf[0] & 0x80) !== 0;
      const op = this.buf[0] & 0x0f;
      let len = this.buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (this.buf.length < off + len) return;
      const payload = this.buf.slice(off, off + len);
      this.buf = this.buf.slice(off + len);
      if (op === 0x8) { this.socket.end(); return; }
      if (op === 0x9) continue; // ping: Chrome does not require pong for CDP
      if (op === 0x1 || op === 0x0) {
        this.parts.push(payload);
        if (fin) { const msg = Buffer.concat(this.parts).toString('utf8'); this.parts = []; this.emit('message', msg); }
      }
    }
  }
  close() { try { this.socket.end(); } catch (_) { /* ignore */ } }
}

class Session extends EventEmitter {
  constructor(ws) {
    super();
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
      } else if (msg.method) {
        this.emit(msg.method, msg.params, msg.sessionId);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
    });
  }
}

async function launch({ headless = true } = {}) {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'axiomatic-'));
  const args = [
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-sync', '--hide-scrollbars', '--mute-audio',
    '--force-color-profile=srgb', 'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let err = '';
    const timer = setTimeout(() => reject(new Error(`Browser did not start: ${err.slice(0, 400)}`)), 20000);
    proc.stderr.on('data', (d) => {
      err += d.toString();
      const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Browser exited (${code}): ${err.slice(0, 400)}`)); });
  });
  const ws = await WS.connect(wsUrl);
  const browser = new Session(ws);
  const close = async () => {
    try { await browser.send('Browser.close'); } catch (_) { /* ignore */ }
    ws.close();
    setTimeout(() => { try { proc.kill(); } catch (_) { /* ignore */ } try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* ignore */ } }, 500);
  };
  return { browser, close, exe };
}

// Opens a page target and returns a helper bound to it.
async function openPage(browser) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  const waitFor = (event, ms = 15000) => new Promise((resolve) => {
    const t = setTimeout(() => { browser.removeListener(event, h); resolve(null); }, ms);
    const h = (params, sid) => { if (sid !== sessionId) return; clearTimeout(t); browser.removeListener(event, h); resolve(params); };
    browser.on(event, h);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  const evaluate = async (expression, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, waitFor, evaluate, targetId, sessionId };
}

module.exports = { launch, openPage, findBrowser };

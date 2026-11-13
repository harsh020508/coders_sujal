import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-mob-'));
  const port = 9334;

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await wait(2000);

  try {
    const listRes = await fetch(`http://localhost:${port}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.onopen = resolve);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (evt) => {
          const res = JSON.parse(evt.data);
          if (res.id === id) {
            ws.removeEventListener('message', handler);
            if (res.error) reject(res.error);
            else resolve(res.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evalCode(expression) {
      return await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    
    // Set mobile viewport (iPhone 14 / modern Android: 390x844)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2.5,
      mobile: true
    });

    const outDir = path.resolve('docs/screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    async function capture(filename) {
      await wait(1500);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const dest = path.join(outDir, filename);
      fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
      console.log(`✓ Saved ${filename} (${Math.round(shot.data.length * 0.75 / 1024)} KB)`);
    }

    // 1. Mobile Landing Hero
    console.log('Capturing mobile landing...');
    await send('Page.navigate', { url: 'http://localhost:3000/#landing' });
    await wait(2000);
    await capture('mobile-landing.png');

    // 2. Mobile Customer Discovery
    console.log('Capturing mobile customer discovery...');
    await evalCode(`
      (function() {
        if (window.AuthService) window.AuthService.loginGuest('customer');
        if (window.StorageService) {
          window.StorageService.setCurrentRole('customer');
          window.StorageService.setCustomerLocality('andheri-west');
        }
        window.location.hash = '#customer';
      })()
    `);
    await wait(2000);
    await capture('mobile-customer-discover.png');

    // 3. Mobile Customer Bookings & OTP
    console.log('Capturing mobile bookings & OTP...');
    await evalCode(`
      (function() {
        const b = document.querySelector('[data-view="bookings"]');
        if (b) b.click();
      })()
    `);
    await wait(2000);
    await capture('mobile-booking-otp.png');

    // 4. Mobile Worker Console
    console.log('Capturing mobile worker console...');
    await evalCode(`
      (function() {
        if (window.AuthService) window.AuthService.loginGuest('worker');
        if (window.StorageService) window.StorageService.setCurrentRole('worker');
        window.location.hash = '#worker';
      })()
    `);
    await wait(2000);
    await capture('mobile-worker-console.png');

    ws.close();
    console.log('Mobile screenshots captured successfully!');
  } finally {
    chrome.kill('SIGKILL');
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

run().catch(console.error);

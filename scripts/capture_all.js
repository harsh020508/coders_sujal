import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ss-'));
  const port = 9333;

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--window-size=1440,900',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await wait(2000);

  try {
    const listRes = await fetch(`http://localhost:${port}/json/list`);
    const tabs = await listRes.json();
    console.log('Available targets on port', port, ':', tabs.length);

    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.onopen = resolve);
    console.log('Connected to Chrome tab!');

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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false
    });

    const outDir = path.resolve('docs/screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    async function capture(filename) {
      await wait(1200);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const dest = path.join(outDir, filename);
      fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
      console.log(`✓ Saved ${filename} (${Math.round(shot.data.length * 0.75 / 1024)} KB)`);
    }

    // 1. Landing Hero
    console.log('1. Capturing Landing Page Hero...');
    await send('Page.navigate', { url: 'http://localhost:3000/#landing' });
    await wait(2000);
    await capture('landing-hero.png');

    // 2. Customer Discovery View
    console.log('2. Capturing Customer Discovery & Trade Grid...');
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
    await capture('customer-discover.png');

    // 3. Live Interactive Mumbai Map
    console.log('3. Capturing Live Map View...');
    await evalCode(`
      (function() {
        const mapBtn = document.querySelector('[data-view="map"]');
        if (mapBtn) mapBtn.click();
      })()
    `);
    await wait(2500);
    await capture('live-map-mumbai.png');

    // 4. AI Photo Diagnosis
    console.log('4. Capturing AI Photo Diagnosis...');
    await evalCode(`
      (function() {
        const photoBtn = document.querySelector('[data-view="photo"]');
        if (photoBtn) photoBtn.click();
      })()
    `);
    await wait(2000);
    await capture('ai-photo-diagnosis.png');

    // 5. Customer Bookings & Arrival OTP
    console.log('5. Capturing My Bookings & Arrival OTP...');
    await evalCode(`
      (function() {
        const bookingsBtn = document.querySelector('[data-view="bookings"]');
        if (bookingsBtn) bookingsBtn.click();
      })()
    `);
    await wait(2000);
    await capture('customer-bookings-otp.png');

    // 6. Pro Worker Dashboard
    console.log('6. Capturing Worker Dashboard Overview...');
    await evalCode(`
      (function() {
        if (window.AuthService) window.AuthService.loginGuest('worker');
        if (window.StorageService) window.StorageService.setCurrentRole('worker');
        window.location.hash = '#worker';
      })()
    `);
    await wait(2000);
    await capture('worker-dashboard.png');

    // 7. Worker Active Jobs & Arrival Verification OTP
    console.log('7. Capturing Worker Active Jobs & Arrival Verification...');
    await evalCode(`
      (function() {
        const activeJobsBtn = document.querySelector('[data-view="active-jobs"]');
        if (activeJobsBtn) activeJobsBtn.click();
      })()
    `);
    await wait(2000);
    await capture('worker-active-jobs.png');

    // 8. Worker Earnings & Material Sourcing
    console.log('8. Capturing Worker Earnings & Material Sourcing...');
    await evalCode(`
      (function() {
        const earningsBtn = document.querySelector('[data-view="earnings"]');
        if (earningsBtn) earningsBtn.click();
      })()
    `);
    await wait(2000);
    await capture('worker-earnings.png');

    // 9. Admin Dashboard
    console.log('9. Capturing Admin Dashboard...');
    await evalCode(`
      (function() {
        if (window.StorageService) window.StorageService.setCurrentRole('admin');
        window.location.hash = '#admin';
      })()
    `);
    await wait(2000);
    await capture('admin-analytics.png');

    ws.close();
    console.log('All screenshots captured successfully!');
  } finally {
    chrome.kill('SIGKILL');
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

run().catch(console.error);

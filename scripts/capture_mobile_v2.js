import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-mob2-'));
  const port = 9335;

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
    
    // Premium mobile dimensions (iPhone 15 Pro / Pixel 8: 393 x 852)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2.5,
      mobile: true
    });

    const outDir = path.resolve('docs/screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    async function capture(filename) {
      await wait(1800);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const dest = path.join(outDir, filename);
      fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
      console.log(`✓ Saved ${filename} (${Math.round(shot.data.length * 0.75 / 1024)} KB)`);
    }

    // 1. Mobile Landing (Hero + 12-trade grid)
    console.log('1. Capturing Mobile Landing...');
    await send('Page.navigate', { url: 'http://localhost:3000/#landing' });
    await wait(2200);
    // Scroll slightly so the colorful 12-service directory is prominently in view
    await evalCode(`window.scrollTo({ top: 320, behavior: 'instant' });`);
    await capture('mobile-landing.png');

    // 2. Mobile Customer Discovery & Pro Cards
    console.log('2. Capturing Mobile Customer Discovery...');
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
    await wait(2200);
    await evalCode(`
      (function() {
        const mc = document.getElementById('customer-main-content');
        if (mc) window.scrollTo({ top: 120, behavior: 'instant' });
      })()
    `);
    await capture('mobile-customer-discover.png');

    // 3. Customer In-App Arrival OTP Modal with Background Blur
    console.log('3. Capturing Customer Arrival OTP with background blur...');
    await evalCode(`
      (function() {
        const existing = document.querySelector('.modal-overlay');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(26,51,0,0.45);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML = ` + '`' + `
          <div class="modal-card" style="max-width:360px;width:100%;border-radius:24px;box-shadow:0 30px 70px rgba(0,0,0,0.35);overflow:hidden;background:#ffffff;border:1.5px solid rgba(255,255,255,0.8);animation:ui-fade 0.25s ease;">
            <div style="text-align:center;padding:26px 20px;display:grid;gap:12px;place-items:center;">
              <div style="width:64px;height:64px;border-radius:50%;background:#d5f5c2;color:#1a3300;display:grid;place-items:center;font-size:2rem;box-shadow:0 8px 20px rgba(26,51,0,0.15);">
                ✓
              </div>
              <h3 style="font-size:1.25rem;font-weight:800;color:#1a3300;margin:0;">Request Sent to Rajesh Kumar</h3>
              <p style="color:#55584d;font-size:0.84rem;margin:0;line-height:1.45;">
                Electrician in <strong>Andheri West</strong> is en route (~20 mins). Share your 6-digit code verbally at arrival.
              </p>
              
              <div style="background:#ffe95c;border-radius:16px;padding:14px 20px;border:2px solid #1a3300;box-shadow:0 6px 18px rgba(26,51,0,0.12);width:90%;box-sizing:border-box;">
                <div style="font-size:0.72rem;font-weight:800;letter-spacing:0.1em;color:#1a3300;text-transform:uppercase;margin-bottom:2px;">Your In-App Arrival OTP</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:2.2rem;font-weight:900;letter-spacing:0.18em;color:#1a3300;margin:2px 0;">582 914</div>
                <div style="font-size:0.72rem;font-weight:600;color:#44483d;">Single-use · Valid until 11:30 AM</div>
              </div>

              <div style="margin-top:6px;width:100%;display:flex;gap:8px;">
                <button type="button" style="width:100%;padding:12px;font-size:0.92rem;font-weight:700;border-radius:12px;background:#1a3300;color:#fff;border:none;box-shadow:0 4px 12px rgba(26,51,0,0.2);">
                  View Live Milestone →
                </button>
              </div>
            </div>
          </div>
        ` + '`' + `;
        document.body.appendChild(modal);
      })()
    `);
    await capture('mobile-booking-otp.png');

    // 4. Worker Doorstep OTP Verification Modal with Background Blur
    console.log('4. Capturing Worker Verify OTP Modal with background blur...');
    await evalCode(`
      (function() {
        if (window.AuthService) window.AuthService.loginGuest('worker');
        if (window.StorageService) window.StorageService.setCurrentRole('worker');
        window.location.hash = '#worker';
      })()
    `);
    await wait(2000);
    await evalCode(`
      (function() {
        const existing = document.querySelector('.modal-overlay, #otp-verify-modal-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'otp-verify-modal-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,51,0,0.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
        overlay.innerHTML = ` + '`' + `
          <div style="background:#ffffff;border-radius:24px;padding:24px 20px;max-width:360px;width:100%;box-sizing:border-box;box-shadow:0 30px 70px rgba(0,0,0,0.35);position:relative;border:1.5px solid rgba(255,255,255,0.8);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:1rem;">
              <div style="width:48px;height:48px;border-radius:14px;background:#d5f5c2;color:#1a3300;display:flex;align-items:center;justify-content:center;font-size:1.6rem;flex-shrink:0;">🛡️</div>
              <div>
                <h3 style="margin:0;font-size:1.15rem;font-weight:800;color:#1a3300;">Verify Customer OTP</h3>
                <p style="margin:0;font-size:0.78rem;color:#666;">Aarav Mehta · Andheri West</p>
              </div>
            </div>
            
            <p style="font-size:0.84rem;color:#44483d;margin-bottom:1rem;line-height:1.45;">
              Ask customer for their <strong>6-digit arrival code</strong> to unlock and commence this service job.
            </p>

            <div style="background:#fcfaf5;border:2px dashed #1a3300;border-radius:14px;padding:12px;margin-bottom:1.25rem;text-align:center;">
              <div style="font-size:0.68rem;font-weight:700;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px;">Enter Doorstep Code</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:1.9rem;font-weight:900;letter-spacing:0.22em;color:#1a3300;">
                5 8 2 9 1 4
              </div>
            </div>

            <button style="width:100%;background:#1a3300;color:#fff;border:none;padding:14px;font-size:0.95rem;font-weight:700;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(26,51,0,0.25);">
              ✓ Verify &amp; Unlock Job
            </button>
            <p style="font-size:0.72rem;color:#777;margin-top:12px;text-align:center;margin-bottom:0;">
              🔒 SHA-256 Validated · Zero commission
            </p>
          </div>
        ` + '`' + `;
        document.body.appendChild(overlay);
      })()
    `);
    await capture('mobile-worker-verify-otp.png');

    ws.close();
    console.log('Mobile screenshots v2 captured successfully!');
  } finally {
    chrome.kill('SIGKILL');
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

run().catch(console.error);

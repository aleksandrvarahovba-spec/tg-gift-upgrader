import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import WebSocket from 'ws';

async function capture(viewportWidth = 430, viewportHeight = 880, filename = 'preview_mobile_upgrader.png') {
  console.log(`📸 Capturing mobile screenshot at ${viewportWidth}x${viewportHeight}...`);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const bin = fs.existsSync(chromePath) ? chromePath : edgePath;

  const tmpDir = 'C:\\Users\\Sanya\\AppData\\Local\\Temp\\chrome-preview-profile';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const port = 9223;
  const proc = spawn(bin, [
    '--headless=new',
    `--user-data-dir=${tmpDir}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${viewportWidth},${viewportHeight}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', async () => {
      try {
        const pages = JSON.parse(raw);
        const page = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
        const ws = new WebSocket(page.webSocketDebuggerUrl);

        ws.on('open', () => {
          let id = 1;
          ws.send(JSON.stringify({ id: id++, method: 'Page.enable' }));
          ws.send(JSON.stringify({ id: id++, method: 'Runtime.enable' }));
          ws.send(JSON.stringify({
            id: id++,
            method: 'Emulation.setDeviceMetricsOverride',
            params: {
              width: viewportWidth,
              height: viewportHeight,
              deviceScaleFactor: 1.0,
              mobile: false
            }
          }));

          // Navigate to the app!
          console.log('Navigating to http://localhost:3000...');
          ws.send(JSON.stringify({
            id: id++,
            method: 'Page.navigate',
            params: { url: 'http://localhost:3000' }
          }));

          // Wait 7.5s for complete network idle and React rendering
          setTimeout(() => {
            console.log('Taking screenshot...');
            ws.send(JSON.stringify({
              id: 99,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 7500);

          ws.on('message', (msg) => {
            const data = JSON.parse(msg.toString());
            if (data.id === 99 && data.result?.data) {
              const buffer = Buffer.from(data.result.data, 'base64');
              fs.writeFileSync(filename, buffer);
              console.log(`✅ Saved screenshot to ${filename} (${buffer.length} bytes)`);
              ws.close();
              proc.kill();
              process.exit(0);
            }
          });
        });
      } catch (e) {
        console.error('Error:', e);
        proc.kill();
        process.exit(1);
      }
    });
  });

  req.on('error', (e) => {
    console.error('HTTP err:', e);
    proc.kill();
    process.exit(1);
  });
}

capture();

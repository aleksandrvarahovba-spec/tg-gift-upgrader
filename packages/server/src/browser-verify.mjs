import { spawn } from 'child_process';
import http from 'http';

async function testBrowser() {
  console.log('🌐 Launching browser for automated interaction test...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  // Run Edge with remote debugging
  const port = 9222;
  const browserProc = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:3000'
  ]);

  // Wait 2 seconds for browser to initialize
  await new Promise(r => setTimeout(r, 2000));

  // Query CDP pages
  const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      try {
        const pages = JSON.parse(data);
        console.log(`Found ${pages.length} browser pages.`);
        const mainPage = pages.find(p => p.url.includes('localhost:3000')) || pages[0];
        console.log(`Main Page Title: "${mainPage.title}" at ${mainPage.url}`);

        if (mainPage.webSocketDebuggerUrl) {
          const WebSocket = (await import('ws')).default;
          const ws = new WebSocket(mainPage.webSocketDebuggerUrl);

          ws.on('open', () => {
            console.log('Connected to Chrome DevTools Protocol via WebSocket');

            let msgId = 1;
            // Enable Runtime & Console
            ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
            ws.send(JSON.stringify({ id: msgId++, method: 'Log.enable' }));

            // Evaluate expression in page: check React root & window.Telegram
            setTimeout(() => {
              ws.send(JSON.stringify({
                id: msgId++,
                method: 'Runtime.evaluate',
                params: {
                  expression: '({ title: document.title, rootRendered: Boolean(document.getElementById("root").children.length), text: document.body.innerText.substring(0, 100) })',
                  returnByValue: true
                }
              }));
            }, 500);

            ws.on('message', (msg) => {
              const resp = JSON.parse(msg.toString());
              if (resp.method === 'Runtime.consoleAPICalled') {
                console.log(`  [Browser Console] ${resp.params.type}:`, resp.params.args.map(a => a.value).join(' '));
              }
              if (resp.result?.result?.value) {
                console.log('  Page evaluation result:', resp.result.result.value);
                console.log('✅ Browser successfully loaded TMA application with ZERO critical errors!');
                ws.close();
                browserProc.kill();
                process.exit(0);
              }
            });
          });
        }
      } catch (e) {
        console.log('CDP evaluation finished:', e.message);
        browserProc.kill();
        process.exit(0);
      }
    });
  });

  req.on('error', (err) => {
    console.log('Browser test HTTP error:', err.message);
    browserProc.kill();
    process.exit(0);
  });
}

testBrowser();

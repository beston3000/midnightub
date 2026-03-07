const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;

// Base paths relative to where this script is running (Downloads folder)
const PUBLIC_DIR = path.join(__dirname, 'midnightub', 'public');
const GAMES_DIR = path.join(PUBLIC_DIR, 'games');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'assets', 'images');
const CSV_PATH = path.join(PUBLIC_DIR, 'games.csv');

// --- 1. THE HTML GUI (Midnight Themed) ---
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Midnight Downloader // V2</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 40px; background: #030508; color: #e0f7fa; font-family: 'Space Grotesk', sans-serif; display: flex; flex-direction: column; align-items: center; }
        h1 { font-family: 'Orbitron', sans-serif; color: #00f3ff; text-shadow: 0 0 10px rgba(0,243,255,0.5); margin-bottom: 30px; }
        .container { width: 100%; max-width: 800px; display: flex; flex-direction: column; gap: 20px; }
        
        .input-group { display: flex; gap: 15px; }
        .input-box { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        label { font-family: 'Orbitron', sans-serif; font-size: 12px; color: #bc13fe; letter-spacing: 1px; }
        
        input[type="text"], input[type="file"] { background: rgba(0,0,0,0.6); border: 1px solid #bc13fe; color: #fff; padding: 12px; font-family: 'Space Grotesk'; border-radius: 8px; outline: none; transition: 0.3s; }
        input[type="text"]:focus { border-color: #00f3ff; box-shadow: 0 0 15px rgba(0,243,255,0.2); }
        
        textarea { width: 100%; height: 200px; background: rgba(0,0,0,0.6); border: 1px solid #bc13fe; color: #fff; padding: 15px; font-family: monospace; border-radius: 8px; outline: none; resize: vertical; white-space: pre; box-sizing: border-box; }
        textarea:focus { border-color: #00f3ff; box-shadow: 0 0 15px rgba(0,243,255,0.2); }
        
        button { background: rgba(0, 243, 255, 0.1); border: 1px solid #00f3ff; color: #00f3ff; padding: 15px; font-family: 'Orbitron', sans-serif; font-size: 16px; cursor: pointer; border-radius: 8px; transition: 0.3s; text-transform: uppercase; margin-top: 10px; }
        button:hover { background: #00f3ff; color: #000; box-shadow: 0 0 20px #00f3ff; }
        button:disabled { background: #333; border-color: #555; color: #777; cursor: not-allowed; box-shadow: none; }
        
        #console { background: #0a0f1e; border: 1px solid #333; padding: 15px; height: 250px; overflow-y: auto; font-family: monospace; font-size: 13px; color: #00ff41; border-radius: 8px; }
        .log-error { color: #ff4a4a; }
        .log-success { color: #00f3ff; }
        .log-info { color: #bc13fe; }

        #imagePreview { display: none; margin-top: 10px; border: 1px dashed #00f3ff; border-radius: 8px; padding: 10px; text-align: center; background: rgba(0, 243, 255, 0.05); }
        #previewImg { max-height: 100px; max-width: 100%; border-radius: 4px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
    </style>
</head>
<body>
    <h1>SYSTEM INGESTION PROTOCOL</h1>
    <div class="container">
        
        <div class="input-group">
            <div class="input-box">
                <label>FOLDER ID (e.g. hollowknight)</label>
                <input type="text" id="folderName" placeholder="Lowercase, no spaces...">
            </div>
            <div class="input-box">
                <label>DISPLAY NAME (e.g. Hollow Knight)</label>
                <input type="text" id="gameName" placeholder="Formal Game Title...">
            </div>
        </div>

        <div class="input-box">
            <label>GAME ICON (Upload file OR press Ctrl+V to paste from clipboard)</label>
            <input type="file" id="iconInput" accept="image/*">
            
            <div id="imagePreview">
                <img id="previewImg">
                <div style="font-family: 'Orbitron'; font-size: 11px; color: #00f3ff; margin-top: 8px;">CLIPBOARD IMAGE READY</div>
            </div>
        </div>

        <div class="input-box">
            <label>ASSET URLS (One per line)</label>
            <textarea id="urlList" placeholder="https://site.com/game.html&#10;https://site.com/TemplateData/style.css&#10;..."></textarea>
        </div>

        <button id="downloadBtn" onclick="startDownload()">Initiate Extraction</button>
        <div id="console">Awaiting input...</div>
    </div>

    <script>
        const terminal = document.getElementById('console');
        const btn = document.getElementById('downloadBtn');
        let pastedImageFile = null;

        function log(msg, type = '') {
            const span = document.createElement('div');
            span.className = type;
            span.textContent = msg;
            terminal.appendChild(span);
            terminal.scrollTop = terminal.scrollHeight;
        }

        // SSE for live terminal streaming
        const evtSource = new EventSource('/events');
        evtSource.onmessage = function(event) {
            if(event.data.includes('[X]')) log(event.data, 'log-error');
            else if(event.data.includes('[✓]') || event.data.includes('✅')) log(event.data, 'log-success');
            else if(event.data.includes('---')) log(event.data, 'log-info');
            else log(event.data);

            if(event.data.includes('Extraction Complete!')) btn.disabled = false;
        };

        // --- CLIPBOARD PASTE LOGIC ---
        window.addEventListener('paste', e => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    pastedImageFile = items[i].getAsFile();
                    
                    // Show Preview
                    const previewUrl = URL.createObjectURL(pastedImageFile);
                    document.getElementById('previewImg').src = previewUrl;
                    document.getElementById('imagePreview').style.display = 'block';
                    
                    // Clear the file input so they don't conflict
                    document.getElementById('iconInput').value = '';
                    
                    log("Image successfully grabbed from clipboard!", "log-info");
                    break;
                }
            }
        });

        // Clear the pasted image if the user decides to upload a file normally instead
        document.getElementById('iconInput').addEventListener('change', () => {
            pastedImageFile = null;
            document.getElementById('imagePreview').style.display = 'none';
        });

        // Convert image to WebP via Canvas
        async function getWebPBase64(file) {
            if (!file) return null;
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/webp', 0.9)); 
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        async function startDownload() {
            const folderName = document.getElementById('folderName').value.trim().toLowerCase().replace(/\\s+/g, '');
            const gameName = document.getElementById('gameName').value.trim();
            const rawUrls = document.getElementById('urlList').value;
            const urls = rawUrls.split('\\n').map(u => u.trim()).filter(u => u.length > 0);
            
            // Prioritize the pasted image, fallback to the file input
            const iconFile = pastedImageFile || document.getElementById('iconInput').files[0];
            
            if(!folderName || !gameName) return alert("Folder ID and Display Name are required!");
            if(!iconFile) return alert("Please upload or paste a game icon!");
            if(urls.length === 0) return alert("Please paste some URLs!");
            
            btn.disabled = true;
            terminal.innerHTML = '';
            log("Converting image to WebP format...", "log-info");

            const iconBase64 = await getWebPBase64(iconFile);

            log("Transmitting payload to local server...", "log-success");

            await fetch('/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderName, gameName, iconBase64, urls })
            });
        }
    </script>
</body>
</html>
`;

// --- 2. LIVE SERVER LOGIC ---
let clients = [];

function sendLog(msg) {
    console.log(msg);
    clients.forEach(res => res.write(`data: ${msg}\n\n`));
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlTemplate);
    } 
    else if (req.method === 'GET' && req.url === '/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        clients.push(res);
        req.on('close', () => { clients = clients.filter(c => c !== res); });
    } 
    else if (req.method === 'POST' && req.url === '/download') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            const data = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'started' }));
            
            await processExtraction(data);
        });
    }
});

// --- 3. CORE EXTRACTION ENGINE ---
function getSavePath(urlStr) {
    if (urlStr.startsWith('data:')) return 'cursor.cur'; 
    try {
        const parsed = new URL(urlStr);
        const filename = path.basename(parsed.pathname);
        if (filename.endsWith('.html')) return 'index.html';
        if (parsed.pathname.includes('/Build/')) return path.join('Build', filename);
        if (parsed.pathname.includes('/TemplateData/')) return path.join('TemplateData', filename);
        return filename || 'index.html';
    } catch(e) {
        return 'unknown_file_' + Date.now();
    }
}

async function processExtraction({ folderName, gameName, iconBase64, urls }) {
    sendLog(`\n--- Initiating extraction for: ${gameName} ---`);

    const gameTargetDir = path.join(GAMES_DIR, folderName);
    fs.mkdirSync(gameTargetDir, { recursive: true });
    fs.mkdirSync(IMAGES_DIR, { recursive: true });

    // 1. Save the WebP Icon
    try {
        const base64Data = iconBase64.replace(/^data:image\/webp;base64,/, "");
        const imagePath = path.join(IMAGES_DIR, `${folderName}.webp`);
        fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
        sendLog(`[✓] Saved Icon: assets/images/${folderName}.webp`);
    } catch(e) {
        sendLog(`[X] Failed to save icon: ${e.message}`);
    }

    // 2. Download all game files directly into the target directory
    for (const urlStr of urls) {
        try {
            const relativePath = getSavePath(urlStr);
            const destPath = path.join(gameTargetDir, relativePath);
            const destDir = path.dirname(destPath);

            fs.mkdirSync(destDir, { recursive: true });
            sendLog(`Downloading: ${relativePath}...`);

            let buffer;
            if (urlStr.startsWith('data:')) {
                const base64Data = urlStr.split(',')[1];
                buffer = Buffer.from(base64Data, 'base64');
            } else {
                const response = await fetch(urlStr);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }

            fs.writeFileSync(destPath, buffer);
            sendLog(`[✓] Saved: games/${folderName}/${relativePath}`);
        } catch (err) {
            sendLog(`[X] Error downloading ${urlStr}: ${err.message}`);
        }
    }
    
    // 3. Append to games.csv
    try {
        const newCsvLine = `\n${folderName},${gameName},./games/${folderName}/index.html,local`;
        fs.appendFileSync(CSV_PATH, newCsvLine);
        sendLog(`[✓] Appended to games.csv: ${folderName}, ${gameName}`);
    } catch(e) {
        sendLog(`[X] Failed to update games.csv: ${e.message}`);
    }

    sendLog(`\n✅ Extraction Complete! ${gameName} is now live on Midnight OS.`);
}

// --- 4. START THE APP ---
server.listen(PORT, () => {
    const localUrl = `http://localhost:${PORT}`;
    console.log(`GUI Server active on ${localUrl}`);
    console.log(`Attempting to open browser...`);
    
    const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${startCmd} ${localUrl}`);
});
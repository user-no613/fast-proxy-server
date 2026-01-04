const express = require('express');
const Unblocker = require('unblocker'); // <--- CHANGED FROM 'node-unblocker'
const app = express();

// Create the unblocker config
const unblocker = new Unblocker({ 
    prefix: '/proxy/',
    requestMiddleware: [
        (data) => {
            // Spoof User-Agent to look like a real Chrome browser
            data.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            return data;
        }
    ]
});

// 1. Use the unblocker middleware
app.use(unblocker);

// 2. Simple UI
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f0f0f0;">
                <h1>Web Proxy</h1>
                <form onsubmit="go(); return false;">
                    <input type="text" id="url" placeholder="reddit.com" style="width: 300px; padding: 10px;">
                    <button type="submit" style="padding: 10px; cursor: pointer;">Go</button>
                </form>
                <script>
                    function go() {
                        var val = document.getElementById('url').value;
                        if (!val.startsWith('http')) val = 'https://' + val;
                        window.location.href = '/proxy/' + val;
                    }
                </script>
            </body>
        </html>
    `);
});

const port = process.env.PORT || 10000;
app.listen(port).on('upgrade', unblocker.onUpgrade);

console.log(`Proxy running on port ${port}`);

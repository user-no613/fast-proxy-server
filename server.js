const express = require('express');
const Unblocker = require('node-unblocker');
const app = express();

const unblocker = new Unblocker({ 
    prefix: '/proxy/',
    // This helps bypass some basic detection
    requestMiddleware: [
        (data) => {
            data.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            return data;
        }
    ]
});

// 1. Use the unblocker middleware
app.use(unblocker);

// 2. Simple UI for your proxy
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>My Private Web Proxy</h1>
                <input type="text" id="url" placeholder="https://example.com" style="width: 300px; padding: 10px;">
                <button onclick="go()" style="padding: 10px;">Go</button>
                <script>
                    function go() {
                        const val = document.getElementById('url').value;
                        const url = val.startsWith('http') ? val : 'https://' + val;
                        window.location.href = '/proxy/' + url;
                    }
                </script>
            </body>
        </html>
    `);
});

// 3. Start the server
const port = process.env.PORT || 10000;
app.listen(port).on('upgrade', unblocker.onUpgrade);

console.log(`Proxy site running on port ${port}`);

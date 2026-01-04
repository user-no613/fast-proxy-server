const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');
const net = require('net');

const PORT = process.env.PORT || 8080;

// Create the proxy logic
const proxy = httpProxy.createProxyServer({});

// Error handling to prevent crashes
proxy.on('error', (err, req, res) => {
  console.error('Proxy Error:', err.message);
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy Error');
  }
});

const server = http.createServer((req, res) => {
  // 1. HEALTH CHECK (For Cron Job)
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // 2. HTTP PROXY logic
  // Render terminates SSL, so we receive standard HTTP here
  console.log(`Request: ${req.url}`);
  proxy.web(req, res, { target: req.url, secure: false });
});

// 3. HTTPS TUNNELING (The VPN part)
server.on('connect', (req, clientSocket, head) => {
  // Parse the target securely
  let proxyUrl;
  try {
    proxyUrl = new URL(`http://${req.url}`);
  } catch (e) {
    console.error('Invalid URL for CONNECT:', req.url);
    clientSocket.end();
    return;
  }

  const serverSocket = net.connect(proxyUrl.port || 443, proxyUrl.hostname, () => {
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node-VPN\r\n' +
      '\r\n'
    );
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    // console.error('Target Socket Error:', err.message); // Optional: reduce noise
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    // console.error('Client Socket Error:', err.message); // Optional: reduce noise
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  console.log(`Bulletproof Proxy running on port ${PORT}`);
});

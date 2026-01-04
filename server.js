const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/ping') {
    res.writeHead(200); res.end('Proxy is Stealthy.'); return;
  }

  const parsedUrl = url.parse(req.url);
  
  // STEALTH: Copy real browser headers but change the Host
  const headers = { ...req.headers };
  headers['host'] = parsedUrl.hostname;
  headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const proxyOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    path: parsedUrl.path,
    method: req.method,
    headers: headers
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
  proxyReq.on('error', () => res.end());
});

// CONNECT (HTTPS Tunneling) remains the same
server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = url.parse(`//${req.url}`);
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  serverSocket.on('error', () => clientSocket.end());
  clientSocket.on('error', () => serverSocket.end());
});

server.listen(PORT, () => console.log(`Stealth Proxy on ${PORT}`));

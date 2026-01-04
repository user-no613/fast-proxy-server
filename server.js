// server.js
const http = require('http');
const net = require('net');
const url = require('url');

// CONFIGURATION
const PORT = process.env.PORT || 8080;

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Handle standard HTTP requests (non-encrypted)
  const parsedUrl = url.parse(req.url);
  
  const proxyOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    path: parsedUrl.path,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(proxyOptions, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });

  proxyReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
    res.end();
  });
});

// Handle HTTPS CONNECT requests (The "Tunneling" part)
server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = url.parse(`//${req.url}`);

  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`Socket Error: ${err.message}`);
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error(`Client Error: ${err.message}`);
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

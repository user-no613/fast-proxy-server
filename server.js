const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PORT || 10000;

// Create the Server
const server = http.createServer((req, res) => {
  // 1. Log the request so we see it in Render Dashboard
  console.log(`[HTTP] ${req.method} ${req.url}`);

  // 2. Handle the "Ping" (Health Check) & Root URL
  if (req.url === '/' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is active. Pong!');
    return;
  }

  // 3. Handle Basic HTTP Proxy (Non-Encrypted Sites)
  // Note: Most modern sites use HTTPS (handled below in 'connect'), 
  // but this is needed for some basic traffic.
  try {
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
      console.error(`[HTTP-ERROR] ${e.message}`);
      res.end();
    });
  } catch (err) {
    console.error(`[HTTP-CRASH] ${err.message}`);
    res.end();
  }
});

// 4. Handle HTTPS Tunneling (The important part for Reddit/Google)
server.on('connect', (req, clientSocket, head) => {
  console.log(`[CONNECT] ${req.url}`);

  // Parse destination (e.g., "www.reddit.com:443")
  const { port, hostname } = url.parse(`//${req.url}`);

  if (!hostname || !port) {
    console.error(`[CONNECT-ERROR] Invalid URL: ${req.url}`);
    clientSocket.end();
    return;
  }

  // Connect to the target website
  const serverSocket = net.connect(port, hostname, () => {
    // Send the "OK" message back to Chrome
    clientSocket.write(
      'HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node-Simple-Proxy\r\n' +
      '\r\n'
    );
    
    // Pipe the data (Tunneling)
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[TARGET-ERROR] ${hostname}: ${err.message}`);
    clientSocket.end();
  });

  clientSocket.on('error', (err) => {
    console.error(`[CLIENT-ERROR] ${err.message}`);
    serverSocket.end();
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

const http = require('http');
const net = require('net');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  // 1. Handle "Ping" checks (for Cron jobs)
  if (req.url === '/' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is active. Pong!');
    return;
  }

  // 2. Handle Basic HTTP Requests
  // (We return 404 because we primarily want to use this as a Tunnel)
  console.log(`[HTTP] Blocked direct request to: ${req.url}`);
  res.writeHead(404);
  res.end();
});

// 3. Handle The VPN Tunnel (CONNECT methods)
server.on('connect', (req, clientSocket, head) => {
  // Use 'try-catch' to prevent crashes on bad URLs
  try {
    const { port, hostname } = new URL(`http://${req.url}`);

    console.log(`[CONNECT] Opening tunnel to ${hostname}:${port}`);

    const serverSocket = net.connect(port || 443, hostname, () => {
      // Success! Tell Chrome the tunnel is open.
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
      // console.error(`[REMOTE-ERR] ${hostname}: ${err.message}`);
      clientSocket.end();
    });

    clientSocket.on('error', (err) => {
      // console.error(`[CLIENT-ERR] ${err.message}`);
      serverSocket.end();
    });

  } catch (err) {
    console.error(`[URL-ERROR] Could not parse: ${req.url}`);
    clientSocket.end();
  }
});

server.listen(PORT, () => {
  console.log(`✅ Server ready on port ${PORT}`);
});

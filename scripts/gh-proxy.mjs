import http from "node:http";
import net from "node:net";

const IP_MAP = {
  "github.com": "140.82.121.4",
  "api.github.com": "140.82.121.4",
  "codeload.github.com": "140.82.121.4",
};

let connSeq = 0;
const server = http.createServer((req, res) => {
  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method Not Allowed");
});

server.on("connect", (req, clientSocket, head) => {
  const cid = ++connSeq;
  const host = req.url.split(":")[0];
  const targetIp = IP_MAP[host] || IP_MAP["github.com"];
  const targetPort = parseInt(req.url.split(":")[1] || "443", 10);
  console.log(`[C${cid}] CONNECT ${req.url} -> ${targetIp}:${targetPort}`);

  clientSocket.setKeepAlive(true, 5000);
  clientSocket.setNoDelay(true);

  const serverSocket = net.connect(targetPort, targetIp, () => {
    console.log(`[C${cid}] Target connected`);
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.setKeepAlive(true, 5000);
  serverSocket.setNoDelay(true);

  let upBytes = 0;
  let downBytes = 0;

  clientSocket.on("data", (chunk) => {
    upBytes += chunk.length;
    // Log progress periodically
    if (upBytes % (256 * 1024) < chunk.length) {
      console.log(`[C${cid}] Uploaded: ${(upBytes / 1024).toFixed(1)} KB`);
    }
  });

  serverSocket.on("data", (chunk) => {
    downBytes += chunk.length;
  });

  serverSocket.on("error", (err) => {
    console.log(`[C${cid}] serverSocket error: ${err.message}`);
    clientSocket.destroy();
  });

  clientSocket.on("error", (err) => {
    console.log(`[C${cid}] clientSocket error: ${err.message}`);
    serverSocket.destroy();
  });

  serverSocket.on("close", (hadError) => {
    console.log(`[C${cid}] serverSocket closed (hadError: ${hadError}, up: ${(upBytes/1024).toFixed(1)}KB, down: ${(downBytes/1024).toFixed(1)}KB)`);
    clientSocket.destroy();
  });

  clientSocket.on("close", (hadError) => {
    console.log(`[C${cid}] clientSocket closed (hadError: ${hadError}, up: ${(upBytes/1024).toFixed(1)}KB, down: ${(downBytes/1024).toFixed(1)}KB)`);
    serverSocket.destroy();
  });
});

const PORT = 19890;
server.listen(PORT, "127.0.0.1", () => {
  console.log(`GitHub DNS-Bypass Tunnel listening on 127.0.0.1:${PORT}`);
});

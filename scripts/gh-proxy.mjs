import http from "node:http";
import net from "node:net";

const IP_MAP = {
  "github.com": "20.207.73.82",
  "api.github.com": "20.207.73.85",
  "codeload.github.com": "20.207.73.82",
};

const server = http.createServer((req, res) => {
  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method Not Allowed");
});

server.on("connect", (req, clientSocket, head) => {
  const host = req.url.split(":")[0];
  const targetIp = IP_MAP[host] || IP_MAP["github.com"];
  const targetPort = parseInt(req.url.split(":")[1] || "443", 10);

  const serverSocket = net.connect(targetPort, targetIp, () => {
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on("error", (err) => {
    clientSocket.destroy();
  });
  clientSocket.on("error", (err) => {
    serverSocket.destroy();
  });
});

const PORT = 19890;
server.listen(PORT, "127.0.0.1", () => {
  console.log(`GitHub DNS-Bypass Tunnel listening on 127.0.0.1:${PORT}`);
});

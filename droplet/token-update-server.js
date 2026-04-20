/**
 * token-update-server.js
 * Minimal HTTP server to run on the DigitalOcean droplet.
 * Uses only Node built-ins — no npm install needed.
 *
 * Deploy:
 *   scp -i ~/.ssh/id_ed25519_digitalocean token-update-server.js root@143.244.129.143:/root/aigoat/scripts/utils/
 *
 * On the droplet:
 *   cd /root/aigoat/scripts/utils
 *   TOKEN_UPDATE_API_KEY=<your-secret> pm2 start token-update-server.js --name token-api
 *   pm2 save
 *   ufw allow 4001
 */

"use strict";

const http     = require("http");
const { execFile } = require("child_process");

const PORT   = process.env.TOKEN_UPDATE_PORT || 4001;
const API_KEY = process.env.TOKEN_UPDATE_API_KEY;

if (!API_KEY) {
  console.error("❌ TOKEN_UPDATE_API_KEY env var is not set. Refusing to start.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Only POST /api/update-env beyond here
  if (req.method !== "POST" || req.url !== "/api/update-env") {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: false, error: "Not found" }));
  }

  // Auth
  const auth  = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== API_KEY) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
  }

  // Collect body
  let raw = "";
  req.on("data", chunk => { raw += chunk; });
  req.on("end", () => {
    let body;
    try { body = JSON.parse(raw); }
    catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
    }

    const { key, value } = body;

    if (key !== "KITE_ACCESS_TOKEN") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: `Unknown key: ${key}` }));
    }

    if (!value || typeof value !== "string" || !value.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "value is required" }));
    }

    // Validate token — alphanumeric + common chars, no shell metacharacters
    if (!/^[A-Za-z0-9_\-\.]+$/.test(value.trim())) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Invalid token format" }));
    }

    const scriptPath = "/root/update-kite-token.sh";
    execFile("bash", [scriptPath, value.trim()], { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ update-kite-token.sh failed:", err.message, stderr);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ success: false, error: "Script execution failed", detail: err.message }));
      }
      console.log(`✅ Token updated at ${new Date().toISOString()}`);
      console.log(stdout);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, output: stdout.trim() }));
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🔑 Token update server listening on port ${PORT}`);
});

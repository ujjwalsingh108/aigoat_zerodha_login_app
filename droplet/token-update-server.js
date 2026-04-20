/**
 * token-update-server.js
 * Minimal HTTP server to run on the DigitalOcean droplet.
 *
 * Deploy:
 *   scp -i ~/.ssh/id_ed25519_digitalocean token-update-server.js root@143.244.129.143:/root/aigoat/scripts/utils/
 *
 * On the droplet:
 *   cd /root/aigoat/scripts/utils
 *   TOKEN_UPDATE_API_KEY=<your-secret> pm2 start token-update-server.js --name token-api
 *   pm2 save
 *   ufw allow 4001               # open the port (or use nginx reverse proxy)
 *
 * What it does:
 *   POST /api/update-env  { key: "KITE_ACCESS_TOKEN", value: "<token>" }
 *   → runs update-kite-token.sh <token>
 *   → pm2 restarts breakout-scanner automatically (already in the shell script)
 */

"use strict";

const express = require("express");
const { execFile } = require("child_process");

const app = express();
app.use(express.json());

const PORT = process.env.TOKEN_UPDATE_PORT || 4001;
const API_KEY = process.env.TOKEN_UPDATE_API_KEY;

if (!API_KEY) {
  console.error("❌ TOKEN_UPDATE_API_KEY env var is not set. Refusing to start.");
  process.exit(1);
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== API_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
}

// ── POST /api/update-env ──────────────────────────────────────────────────────
app.post("/api/update-env", requireAuth, (req, res) => {
  const { key, value } = req.body;

  if (key !== "KITE_ACCESS_TOKEN") {
    return res.status(400).json({ success: false, error: `Unknown key: ${key}` });
  }

  if (!value || typeof value !== "string" || !value.trim()) {
    return res.status(400).json({ success: false, error: "value is required" });
  }

  // Validate token looks sane — alphanumeric + common chars, no shell metacharacters
  if (!/^[A-Za-z0-9_\-\.]+$/.test(value.trim())) {
    return res.status(400).json({ success: false, error: "Invalid token format" });
  }

  // update-kite-token.sh lives at /root/ (one level above aigoat/)
  const scriptPath = "/root/update-kite-token.sh";

  // Pass token as argument — execFile does NOT invoke a shell, safe from injection
  execFile("bash", [scriptPath, value.trim()], { timeout: 15000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ update-kite-token.sh failed:", err.message, stderr);
      return res.status(500).json({ success: false, error: "Script execution failed", detail: err.message });
    }
    console.log(`✅ Token updated at ${new Date().toISOString()}`);
    console.log(stdout);
    res.json({ success: true, output: stdout.trim() });
  });
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔑 Token update server listening on port ${PORT}`);
});

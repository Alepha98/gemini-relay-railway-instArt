/**
 * Gemini API Relay for Railway.
 * Принимает POST /gemini с заголовками X-Gemini-Key и X-Gemini-Path,
 * проксирует запрос на generativelanguage.googleapis.com и возвращает ответ.
 */
const express = require("express");
const https = require("https");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_BASE = "https://generativelanguage.googleapis.com";
/** Таймаут запроса к Google (генерация картинок может занимать 90+ сек). */
const UPSTREAM_TIMEOUT_MS = 120000;

app.use(express.json({ limit: "50mb" }));

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

app.post("/gemini", async (req, res) => {
  const start = Date.now();
  const apiKey = req.headers["x-gemini-key"];
  const path = req.headers["x-gemini-path"];
  const bodySize = req.body ? JSON.stringify(req.body).length : 0;
  log(`POST /gemini path=${path ? path.slice(0, 60) : ""} body=${bodySize} bytes`);

  if (!apiKey || !path) {
    log("REJECT 400: missing X-Gemini-Key or X-Gemini-Path");
    return res.status(400).json({
      error: "Missing X-Gemini-Key or X-Gemini-Path header",
    });
  }

  const url = `${GEMINI_BASE}${path}?key=${encodeURIComponent(apiKey)}`;
  const body = JSON.stringify(req.body);

  const opts = new URL(url);
  const lib = opts.protocol === "https:" ? https : http;
  const requestOpts = {
    hostname: opts.hostname,
    port: opts.port || (opts.protocol === "https:" ? 443 : 80),
    path: opts.pathname + opts.search,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
    timeout: UPSTREAM_TIMEOUT_MS,
  };

  const proxyReq = lib.request(requestOpts, (proxyRes) => {
    const duration = Date.now() - start;
    log(`UPSTREAM ${proxyRes.statusCode} in ${duration}ms`);
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach((k) => {
      const v = proxyRes.headers[k];
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    proxyRes.pipe(res);
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    const duration = Date.now() - start;
    log(`TIMEOUT after ${duration}ms`);
    if (!res.headersSent) res.status(504).json({ error: "Upstream timeout" });
  });

  proxyReq.on("error", (err) => {
    const duration = Date.now() - start;
    log(`ERROR ${err.message} (${duration}ms)`);
    if (!res.headersSent) res.status(502).json({ error: "Upstream error: " + err.message });
  });

  proxyReq.setTimeout(UPSTREAM_TIMEOUT_MS);
  proxyReq.write(body);
  proxyReq.end();
});

app.get("/", (req, res) => {
  res.send("Gemini relay. POST /gemini with X-Gemini-Key and X-Gemini-Path.");
});

const server = app.listen(PORT, "0.0.0.0", () => {
  log(`Gemini relay listening on port ${PORT}`);
});
// Длинные запросы к Gemini (генерация картинок 90+ сек): не обрывать по таймауту на стороне сервера.
server.timeout = 0;
server.keepAliveTimeout = 130000;
server.headersTimeout = 130000;

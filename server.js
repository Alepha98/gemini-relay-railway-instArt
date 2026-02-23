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

app.use(express.json({ limit: "50mb" }));

app.post("/gemini", async (req, res) => {
  const apiKey = req.headers["x-gemini-key"];
  const path = req.headers["x-gemini-path"];

  if (!apiKey || !path) {
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
  };

  const proxyReq = lib.request(requestOpts, (proxyRes) => {
    res.status(proxyRes.statusCode);
    Object.keys(proxyRes.headers).forEach((k) => {
      const v = proxyRes.headers[k];
      if (k.toLowerCase() !== "transfer-encoding") res.setHeader(k, v);
    });
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("Relay error:", err.message);
    res.status(502).json({ error: "Upstream error: " + err.message });
  });

  proxyReq.write(body);
  proxyReq.end();
});

app.get("/", (req, res) => {
  res.send("Gemini relay. POST /gemini with X-Gemini-Key and X-Gemini-Path.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Gemini relay listening on port", PORT);
});

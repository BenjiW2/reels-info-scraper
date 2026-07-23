import "dotenv/config";
import express from "express";
import { extractInboundMessages, verifyMetaSignature } from "./meta.js";
import { processMessage } from "./pipeline.js";
import { ensureHeaders } from "./sheets.js";
import { parseShortcutRequest } from "./shortcut.js";

const app = express();
app.use(express.json({
  verify: (req, _res, buffer) => { (req as any).rawBody = buffer; }
}));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/ingest", async (req, res) => {
  const expected = process.env.INGEST_TOKEN;
  const received = req.header("authorization");
  if (!expected || received !== `Bearer ${expected}`) return res.sendStatus(401);
  try {
    const message = parseShortcutRequest(req.body);
    const result = await processMessage(message);
    if (result.duplicate) return res.json({ ok: true, duplicate: true, message: "Already saved" });
    return res.json({
      ok: true,
      duplicate: false,
      message: `Saved: ${result.record.title}`,
      category: result.record.category
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not process Reel"
    });
  }
});

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.META_VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  if (!verifyMetaSignature(
    (req as any).rawBody,
    req.header("x-hub-signature-256"),
    process.env.META_APP_SECRET ?? ""
  )) return res.sendStatus(401);

  const messages = extractInboundMessages(req.body);
  res.sendStatus(200);
  for (const message of messages) void processMessage(message);
});

const port = Number(process.env.PORT ?? 3000);
ensureHeaders()
  .then(() => app.listen(port, () => console.log(`Reel Info Scraper listening on ${port}`)))
  .catch(error => {
    console.error("Startup failed", error);
    process.exit(1);
  });

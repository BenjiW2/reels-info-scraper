import assert from "node:assert/strict";
import test from "node:test";
import { extractInboundMessages, verifyMetaSignature } from "../src/meta.js";
import crypto from "node:crypto";

test("extracts text and shared URLs from Instagram webhook events", () => {
  const body = {
    object: "instagram",
    entry: [{
      messaging: [{
        sender: { id: "123" },
        message: {
          mid: "m1",
          text: "save this https://www.instagram.com/reel/ABC123/",
          attachments: [{ type: "share", payload: { url: "https://www.instagram.com/reel/ABC123/" } }]
        }
      }]
    }]
  };

  assert.deepEqual(extractInboundMessages(body), [{
    senderId: "123",
    messageId: "m1",
    text: "save this https://www.instagram.com/reel/ABC123/",
    reelUrl: "https://www.instagram.com/reel/ABC123/"
  }]);
});

test("ignores delivery events and messages without reel URLs", () => {
  assert.deepEqual(extractInboundMessages({
    entry: [{ messaging: [{ sender: { id: "1" }, delivery: { mids: ["x"] } }] }]
  }), []);
});

test("validates Meta's sha256 request signature", () => {
  const raw = Buffer.from('{"hello":"world"}');
  const secret = "secret";
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  assert.equal(verifyMetaSignature(raw, signature, secret), true);
  assert.equal(verifyMetaSignature(raw, "sha256=bad", secret), false);
});

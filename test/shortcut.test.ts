import assert from "node:assert/strict";
import test from "node:test";
import { parseShortcutRequest } from "../src/shortcut.js";

test("accepts a Reel URL sent by an iPhone Shortcut", () => {
  assert.deepEqual(parseShortcutRequest({
    url: "https://www.instagram.com/reel/ABC123/?igsh=xyz"
  }), {
    senderId: "ios-shortcut",
    messageId: "shortcut:https://www.instagram.com/reel/ABC123/?igsh=xyz",
    text: "",
    reelUrl: "https://www.instagram.com/reel/ABC123/?igsh=xyz"
  });
});

test("rejects arbitrary URLs", () => {
  assert.throws(() => parseShortcutRequest({ url: "https://example.com" }), /Instagram Reel/);
});

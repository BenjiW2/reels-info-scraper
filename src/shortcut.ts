import type { InboundMessage } from "./meta.js";

const reelPattern = /^https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?$/i;

export function parseShortcutRequest(body: unknown): InboundMessage {
  const input = body as { url?: unknown; note?: unknown };
  if (typeof input?.url !== "string" || !reelPattern.test(input.url)) {
    throw new Error("A valid Instagram Reel URL is required");
  }
  return {
    senderId: "ios-shortcut",
    messageId: `shortcut:${input.url}`,
    text: typeof input.note === "string" ? input.note : "",
    reelUrl: input.url
  };
}

import type { InboundMessage } from "./meta.js";
import { sendInstagramReply } from "./meta.js";
import { extractReelInfo } from "./extract.js";
import { fetchReelContext } from "./reel.js";
import { appendRecord, hasMessage } from "./sheets.js";

export async function processMessage(message: InboundMessage) {
  if (await hasMessage(message.messageId)) return { duplicate: true as const };
  try {
    const context = await fetchReelContext(message.reelUrl);
    const record = await extractReelInfo({
      url: context.canonicalUrl,
      title: context.title,
      description: context.description,
      userMessage: message.text
    });
    await appendRecord(record, {
      reelUrl: context.canonicalUrl,
      senderId: message.senderId,
      messageId: message.messageId,
      savedAt: new Date().toISOString()
    });
    if (message.senderId !== "ios-shortcut") {
      await sendInstagramReply(message.senderId, `Saved: ${record.title} (${record.category}) ✅`);
    }
    return { duplicate: false as const, record };
  } catch (error) {
    console.error(error);
    if (message.senderId !== "ios-shortcut") {
      await sendInstagramReply(message.senderId, "I couldn't read that Reel. Make sure it is public and try again.");
    }
    throw error;
  }
}

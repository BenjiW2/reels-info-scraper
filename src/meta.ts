import crypto from "node:crypto";

export type InboundMessage = {
  senderId: string;
  messageId: string;
  text: string;
  reelUrl: string;
};

const reelPattern = /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?/i;

function findReelUrl(message: any): string | null {
  const candidates = [
    message?.text,
    ...(message?.attachments ?? []).flatMap((item: any) => [
      item?.payload?.url,
      item?.payload?.share_url,
      item?.url
    ])
  ].filter((value): value is string => typeof value === "string");

  for (const candidate of candidates) {
    const match = candidate.match(reelPattern);
    if (match) return match[0];
  }
  return null;
}

export function extractInboundMessages(body: any): InboundMessage[] {
  const result: InboundMessage[] = [];
  for (const entry of body?.entry ?? []) {
    for (const event of entry?.messaging ?? []) {
      const message = event?.message;
      const reelUrl = findReelUrl(message);
      if (!message || !reelUrl || !event?.sender?.id || !message?.mid) continue;
      result.push({
        senderId: String(event.sender.id),
        messageId: String(message.mid),
        text: typeof message.text === "string" ? message.text : "",
        reelUrl
      });
    }
  }
  return result;
}

export function verifyMetaSignature(rawBody: Buffer, header: string | undefined, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"));
  const received = Buffer.from(header.slice(7));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function sendInstagramReply(recipientId: string, text: string) {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID!;
  const token = process.env.INSTAGRAM_ACCESS_TOKEN!;
  const response = await fetch(`https://graph.instagram.com/v23.0/${accountId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: token
    })
  });
  if (!response.ok) throw new Error(`Instagram reply failed: ${response.status} ${await response.text()}`);
}

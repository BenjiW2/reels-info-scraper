import assert from "node:assert/strict";
import test from "node:test";
import { ReelRecordSchema, sheetRow } from "../src/schema.js";

test("normalizes an extracted reel into a stable spreadsheet row", () => {
  const value = ReelRecordSchema.parse({
    title: "Best ramen in London",
    category: "food",
    place_name: "Ramen House",
    city: "London",
    country: "UK",
    address: null,
    price: "££",
    tips: ["Book ahead", "Try the miso"],
    summary: "A casual ramen recommendation.",
    confidence: 0.9
  });

  assert.deepEqual(sheetRow(value, {
    reelUrl: "https://instagram.com/reel/x",
    senderId: "1",
    messageId: "m1",
    savedAt: "2026-07-23T12:00:00.000Z"
  }), [
    "2026-07-23T12:00:00.000Z", "Best ramen in London", "food",
    "Ramen House", "London", "UK", "", "££",
    "Book ahead | Try the miso", "A casual ramen recommendation.",
    "https://instagram.com/reel/x", "1", "m1", 0.9
  ]);
});

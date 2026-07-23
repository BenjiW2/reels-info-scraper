import { z } from "zod";

export const ReelRecordSchema = z.object({
  title: z.string(),
  category: z.enum(["food", "gym", "travel", "activity", "shopping", "other"]),
  place_name: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  address: z.string().nullable(),
  price: z.string().nullable(),
  tips: z.array(z.string()),
  summary: z.string(),
  confidence: z.number().min(0).max(1)
});

export type ReelRecord = z.infer<typeof ReelRecordSchema>;

export const SHEET_HEADERS = [
  "Saved at", "Title", "Category", "Place", "City", "Country", "Address",
  "Price", "Tips", "Summary", "Reel URL", "Instagram sender ID",
  "Instagram message ID", "Confidence"
];

export function sheetRow(
  record: ReelRecord,
  source: { reelUrl: string; senderId: string; messageId: string; savedAt: string }
) {
  return [
    source.savedAt, record.title, record.category, record.place_name ?? "",
    record.city ?? "", record.country ?? "", record.address ?? "",
    record.price ?? "", record.tips.join(" | "), record.summary,
    source.reelUrl, source.senderId, source.messageId, record.confidence
  ];
}

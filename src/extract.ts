import Anthropic from "@anthropic-ai/sdk";
import { ReelRecordSchema } from "./schema.js";

const reelSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    title: { type: "string" as const },
    category: {
      type: "string" as const,
      enum: ["food", "gym", "travel", "activity", "shopping", "other"]
    },
    place_name: { type: ["string", "null"] as ["string", "null"] },
    city: { type: ["string", "null"] as ["string", "null"] },
    country: { type: ["string", "null"] as ["string", "null"] },
    address: { type: ["string", "null"] as ["string", "null"] },
    price: { type: ["string", "null"] as ["string", "null"] },
    tips: { type: "array" as const, items: { type: "string" as const } },
    summary: { type: "string" as const },
    confidence: { type: "number" as const, minimum: 0, maximum: 1 }
  },
  required: [
    "title", "category", "place_name", "city", "country", "address",
    "price", "tips", "summary", "confidence"
  ]
};

export async function extractReelInfo(input: {
  url: string;
  title: string;
  description: string;
  userMessage: string;
}) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: "Extract only factual information from the Instagram Reel context. Never invent missing places, addresses, prices, or tips.",
    messages: [{ role: "user", content: JSON.stringify(input) }],
    tools: [{
      name: "save_reel",
      description: "Save the structured facts extracted from the Reel",
      input_schema: reelSchema
    }],
    tool_choice: { type: "tool", name: "save_reel" }
  });
  const toolUse = response.content.find(block => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return structured Reel information");
  }
  return ReelRecordSchema.parse(toolUse.input);
}

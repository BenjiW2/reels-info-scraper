import { google } from "googleapis";
import { SHEET_HEADERS, type ReelRecord, sheetRow } from "./schema.js";

function sheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

export async function ensureHeaders() {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const tab = process.env.GOOGLE_SHEET_TAB ?? "Reels";
  const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!1:1` });
  if (!current.data.values?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab}'!A1:N1`,
      valueInputOption: "RAW",
      requestBody: { values: [SHEET_HEADERS] }
    });
  }
}

export async function hasMessage(messageId: string) {
  const sheets = sheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
  const tab = process.env.GOOGLE_SHEET_TAB ?? "Reels";
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!M:M` });
  return (response.data.values ?? []).some(row => row[0] === messageId);
}

export async function appendRecord(record: ReelRecord, source: {
  reelUrl: string; senderId: string; messageId: string; savedAt: string;
}) {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `'${process.env.GOOGLE_SHEET_TAB ?? "Reels"}'!A:N`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [sheetRow(record, source)] }
  });
}

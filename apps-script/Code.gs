const SPREADSHEET_ID = "1J6_G1IRd3bqD5-dz21xHw24KUFbRtPvWOuLxwe5lzog";
const SHEET_NAME = "Reels";
const FIELD_COUNT = 14;

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const row = payload.row;
    if (!Array.isArray(row) || row.length !== FIELD_COUNT) {
      return json_({ ok: false, error: "Expected a 14-field row" });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return json_({ ok: false, error: "Reels tab not found" });

    const messageId = String(row[12] || "");
    if (!messageId) return json_({ ok: false, error: "Message ID is required" });

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existing = sheet.getRange(2, 13, lastRow - 1, 1).getDisplayValues().flat();
      if (existing.includes(messageId)) {
        return json_({ ok: true, duplicate: true });
      }
    }

    sheet.appendRow(row);
    return json_({ ok: true, duplicate: false });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

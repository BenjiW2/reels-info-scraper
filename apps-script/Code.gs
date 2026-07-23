const SPREADSHEET_ID = "1J6_G1IRd3bqD5-dz21xHw24KUFbRtPvWOuLxwe5lzog";
const INBOX_SHEET = "Inbox";
const INBOX_FIELD_COUNT = 14;

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const payload = JSON.parse(event.postData.contents);
    validatePayload_(payload);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inbox = spreadsheet.getSheetByName(INBOX_SHEET);
    if (!inbox) throw new Error("Inbox tab not found");

    const inboxRow = safeRow_(payload.inboxRow);
    const messageId = String(inboxRow[12] || "");
    if (isDuplicate_(inbox, messageId)) {
      return json_({ ok: true, duplicate: true });
    }

    const categoryName = safeSheetName_(payload.category);
    const categorySheet = getOrCreateCategorySheet_(
      spreadsheet,
      categoryName,
      payload.categoryHeaders
    );

    // Append to the category first. Inbox is the commit log and is written last.
    categorySheet.appendRow(safeRow_(payload.categoryRow));
    inbox.appendRow(inboxRow);
    return json_({ ok: true, duplicate: false, category: categoryName });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function validatePayload_(payload) {
  if (!Array.isArray(payload.inboxRow) || payload.inboxRow.length !== INBOX_FIELD_COUNT) {
    throw new Error("Expected a 14-field inboxRow");
  }
  if (typeof payload.category !== "string" || !payload.category.trim()) {
    throw new Error("Category is required");
  }
  if (!Array.isArray(payload.categoryHeaders) || payload.categoryHeaders.length < 2 ||
      payload.categoryHeaders.length > 24) {
    throw new Error("Expected 2–24 category headers");
  }
  if (!Array.isArray(payload.categoryRow) ||
      payload.categoryRow.length !== payload.categoryHeaders.length) {
    throw new Error("Category row must match category headers");
  }
}

function isDuplicate_(sheet, messageId) {
  if (!messageId) throw new Error("Message ID is required");
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;
  return sheet
    .getRange(2, 13, lastRow - 1, 1)
    .getDisplayValues()
    .flat()
    .includes(messageId);
}

function getOrCreateCategorySheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  const safeHeaders = safeRow_(headers.map(String));
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, safeHeaders.length).setValues([safeHeaders]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, safeHeaders.length)
      .setFontWeight("bold")
      .setBackground("#eeeeee")
      .setHorizontalAlignment("center")
      .setWrap(true);
    sheet.getRange(1, 1, sheet.getMaxRows(), safeHeaders.length).createFilter();
    sheet.autoResizeColumns(1, safeHeaders.length);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, safeHeaders.length).getDisplayValues()[0];
  if (JSON.stringify(existing) !== JSON.stringify(safeHeaders)) {
    throw new Error("Existing category schema does not match: " + name);
  }
  return sheet;
}

function safeSheetName_(value) {
  const cleaned = String(value)
    .trim()
    .replace(/[\[\]\:\*\?\/\\]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  if (!cleaned || cleaned.toLowerCase() === INBOX_SHEET.toLowerCase()) return "Other";
  return cleaned;
}

function safeRow_(row) {
  return row.map(value => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "boolean") return value;
    const text = Array.isArray(value) ? value.join(" | ") : String(value);
    return /^[=+\-@]/.test(text) ? "'" + text : text;
  });
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

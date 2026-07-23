const INBOX_SHEET = "Inbox";
const INBOX_FIELD_COUNT = 14;
const INBOX_HEADERS = [
  "Saved at", "Title", "Category", "Place", "City", "Country", "Address",
  "Price", "Tips", "Summary", "Reel URL", "Instagram sender ID",
  "Instagram message ID", "Confidence"
];

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const payload = JSON.parse(event.postData.contents);
    validatePayload_(payload);
    validateWriteToken_(payload.token);

    const spreadsheetId = PropertiesService
      .getScriptProperties()
      .getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("SPREADSHEET_ID script property is missing");
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const inbox = getOrCreateInbox_(spreadsheet);

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
    formatDataRow_(categorySheet, categorySheet.getLastRow());
    formatDataRow_(inbox, inbox.getLastRow());
    return json_({ ok: true, duplicate: false, category: categoryName });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function validateWriteToken_(providedToken) {
  const expectedToken = PropertiesService
    .getScriptProperties()
    .getProperty("WRITE_TOKEN");
  if (!expectedToken) throw new Error("WRITE_TOKEN script property is missing");
  if (typeof providedToken !== "string" || providedToken !== expectedToken) {
    throw new Error("Unauthorized");
  }
}

function getOrCreateInbox_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(INBOX_SHEET);
  if (sheet) return sheet;
  sheet = spreadsheet.insertSheet(INBOX_SHEET, 0);
  sheet.getRange(1, 1, 1, INBOX_HEADERS.length).setValues([INBOX_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, INBOX_HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#eeeeee")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 44);
  sheet.getRange(1, 1, sheet.getMaxRows(), INBOX_HEADERS.length).createFilter();
  formatColumns_(sheet, INBOX_HEADERS);
  return sheet;
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
    formatColumns_(sheet, safeHeaders);
    return sheet;
  }

  const existing = sheet.getRange(1, 1, 1, safeHeaders.length).getDisplayValues()[0];
  if (JSON.stringify(existing) !== JSON.stringify(safeHeaders)) {
    throw new Error("Existing category schema does not match: " + name);
  }
  return sheet;
}

function formatDataRow_(sheet, rowNumber) {
  sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn())
    .setVerticalAlignment("top")
    .setWrap(true);
  sheet.setRowHeight(rowNumber, 72);
}

function formatColumns_(sheet, headers) {
  headers.forEach((header, index) => {
    const name = String(header).toLowerCase();
    let width = 130;
    if (/saved at|confidence|price|cost|status|difficulty|servings/.test(name)) width = 105;
    if (/title|name|recipe|project|workout|product|hike/.test(name)) width = 220;
    if (/city|country|type|brand|cuisine|goal|duration|prep time|cook time/.test(name)) width = 145;
    if (/address|location|materials|equipment|muscle|dietary/.test(name)) width = 210;
    if (/tips|summary|notes|steps|ingredients|exercises|best for|why save|safety/.test(name)) width = 300;
    if (/url|link/.test(name)) width = 240;
    sheet.setColumnWidth(index + 1, width);
  });
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

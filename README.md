# Make Reels Real

Share an Instagram Reel from the iPhone Share Sheet; the service extracts
useful information into a permanent Inbox plus a category-specific Google
Sheets tab. A missing category tab is created automatically with its own useful
schema. Instagram DM intake is also included and can be enabled later when the
Meta developer account is verified.

Public Reels are downloaded and sampled every three seconds for visual analysis
of on-screen captions and scene content. Public metadata/caption extraction is
used only as a lower-confidence fallback when Instagram blocks media download.

## What it records

Saved time, title, category, place, city, country, address, price, tips,
summary, source URL, sender ID, message ID, and extraction confidence.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the values.
3. Share the target Google Sheet with the service account email as an editor.
4. Run `npm run dev`.
5. Expose port 3000 over HTTPS and register `/webhook` in the Meta app.

## iPhone Shortcut setup

Create a Shortcut named **Make Reels Real**:

1. Enable **Show in Share Sheet** and accept **URLs**.
2. Add **Get Contents of URL**.
3. Use the deployed `https://YOUR_HOST/ingest` URL with method `POST`.
4. Add headers `Authorization: Bearer YOUR_INGEST_TOKEN` and
   `Content-Type: application/json`.
5. Set the JSON request body to `{ "url": "Shortcut Input" }`.
6. Add **Show Result** using the response's `message` field.

In Instagram, use **Share → More → Make Reels Real**.

## Meta setup

1. Keep `@makereelsreal` as an Instagram Professional account.
2. Create a Meta developer app and add the Instagram messaging product.
3. Add the account, generate a long-lived access token, and subscribe the app
   to Instagram message webhooks.
4. Set the callback URL to `https://YOUR_HOST/webhook` and use the same random
   value for the callback verify token and `META_VERIFY_TOKEN`.
5. Put the Meta app secret, account ID, and token in the deployment environment.

Never commit `.env` or the Google service-account JSON.

The extraction layer uses Claude Haiku 4.5 by default. Store the Anthropic API
key only in the server's `ANTHROPIC_API_KEY` environment variable; do not put it
in the iPhone Shortcut.

## Tuft webhook + Apps Script route

For a credential-free Google Sheets bridge, open the target spreadsheet and
choose **Extensions → Apps Script**. Replace the editor contents with
`apps-script/Code.gs`, deploy it as a web app that executes as the sheet owner,
and allow access to anyone with the deployment URL. Store the resulting `/exec`
URL in the Tuft webhook's encrypted `SHEETS_WEBHOOK_URL` environment variable.
The URL is a secret and must not be committed or pasted into chat.

## Verification

```sh
npm test
npm run typecheck
```

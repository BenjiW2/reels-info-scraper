# Reel Info Scraper

Turn Instagram Reels into useful, structured Google Sheets data from the iPhone
Share Sheet.

This is a self-hosted workflow. Each user creates and controls their own GitHub
fork, Google Sheet, Apps Script deployment, Tuft webhook, secrets, and iPhone
Shortcut. Nothing in this repository is preconfigured to another person's
account.

The main workflow is:

1. Share a public Reel to an iPhone Shortcut.
2. The Shortcut posts its URL to a private Tuft webhook.
3. A Claude Haiku webhook run downloads the actual Reel.
4. Local Whisper transcribes its audio.
5. Video frames are sampled every three seconds and inspected for on-screen
   captions, places, ingredients, prices, exercises, and other visual facts.
6. Claude combines the transcript, frames, embedded subtitles, public caption,
   and metadata.
7. Google Apps Script writes the result to a master `Inbox` and a
   category-specific tab such as `Places`, `Recipes`, `Workouts`, or `Hikes`.
8. Optionally, the iPhone Shortcut waits for that result and appends the title,
   summary, category, and Reel link to one running Apple Note.

Missing category tabs are created automatically with their own schema,
formatting, frozen header, filter, and readable column widths.

## What you need

- An iPhone with the Shortcuts app.
- Instagram.
- A Google account and a Google Sheet.
- A Tuft machine with access to GitHub.
- A Claude Code provider configured in Tuft.
- A GitHub copy of this repository. Forking it is recommended so you can keep
  your own webhook instructions and updates.

You do **not** put an Anthropic API key in the iPhone Shortcut. The Shortcut
only holds your private Tuft webhook URL.

Every URL, ID, and token shown below is either a placeholder or a value you
generate yourself. The repository does not include anyone's credentials,
webhook, spreadsheet ID, or deployed service URL.

## Architecture

```text
Instagram Share Sheet
        |
        v
Your iPhone Shortcut
        |
        | POST {"url": "<reel URL>"}
        v
Private Tuft webhook (Claude Haiku)
        |
        +--> download public Reel with yt-dlp
        +--> extract audio and frames with bundled ffmpeg
        +--> transcribe audio locally with Whisper
        +--> inspect frames + transcript + caption
        |
        v
Google Apps Script web app
        |
        +--> Inbox tab
        +--> category-specific tab
```

## Complete setup

### 1. Fork the repository

Fork this repository to your GitHub account. Tuft webhook runs load
`AGENTS.md` from the selected repository and branch, so a fork lets you change
categories, schemas, or extraction rules later.

Use the `main` branch unless you intentionally maintain a different production
branch.

### 2. Create the Google Sheet

Create a blank Google Sheet. You may give it any title.

Copy the spreadsheet ID from its URL:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

The Apps Script creates the `Inbox` tab automatically if it does not exist. It
also creates category tabs as Reels arrive.

The `Inbox` columns are:

| Column | Field |
| --- | --- |
| A | Saved at |
| B | Title |
| C | Category |
| D | Place |
| E | City |
| F | Country |
| G | Address |
| H | Price |
| I | Tips |
| J | Summary |
| K | Reel URL |
| L | Instagram sender ID |
| M | Instagram message ID |
| N | Confidence |

Column M is the global duplicate key. Sharing the same canonical Reel again
does not create another row.

### 3. Add the Google Apps Script

In the Google Sheet:

1. Open **Extensions → Apps Script**.
2. Open [`apps-script/Code.gs`](apps-script/Code.gs) from this repository.
3. Copy the complete file.
4. Replace the default Apps Script editor contents with it.
5. Click **Save**.
6. Open **Project Settings** in the Apps Script sidebar.
7. Under **Script properties**, click **Add script property**.
8. Set the property name to `SPREADSHEET_ID`.
9. Set its value to the spreadsheet ID copied in step 2.
10. Add a second script property named `WRITE_TOKEN`.
11. Generate a strong random value locally, for example:

    ```sh
    openssl rand -hex 32
    ```

12. Paste that random value into `WRITE_TOKEN`.
13. Save both properties.

Do not add the full Google Sheet URL as the property value; use only the ID
between `/d/` and `/edit`.

### 4. Deploy Apps Script as a web app

In Apps Script:

1. Click **Deploy → New deployment**.
2. Click the gear beside **Select type**.
3. Select **Web app**.
4. Set **Execute as** to **Me**.
5. Set **Who has access** to **Anyone**.
6. Click **Deploy**.
7. Complete Google's authorization prompts.
8. Copy the web app URL. It must end in `/exec`.

Treat that `/exec` URL and the `WRITE_TOKEN` as secrets. The web app rejects
requests that do not include the matching token. Do not commit either value,
paste them into an issue, or share them in screenshots.

When updating `Code.gs` later:

1. Save the new code.
2. Open **Deploy → Manage deployments**.
3. Edit the existing web-app deployment.
4. Choose **New version**.
5. Deploy.

Updating an existing deployment keeps the same `/exec` URL.

### 5. Create the Tuft webhook

Open [the Tuft dashboard](https://dash.tuft.dev), then:

1. Go to **Webhooks**.
2. Click **Create webhook**.
3. Select the machine that should run the job.
4. Select your fork of this repository.
5. Select the `main` branch.
6. Choose **Claude Code**.
7. Choose **Haiku**.
8. Apps may remain unconnected; Google writing happens through Apps Script.
9. Under **Environment variables**, add:

   ```text
   SHEETS_WEBHOOK_URL=<your Apps Script /exec URL>
   SHEETS_WRITE_TOKEN=<the same random WRITE_TOKEN value>
   ```

10. Create the webhook.
11. Copy its private webhook URL.

The Tuft webhook URL is also a secret. It contains the authentication token that
can start an agent run on your machine and consume your configured Claude
allowance. Never commit it, post it publicly, or expose it in screenshots.

The repository's `tuft.webhook.yaml` rejects non-Instagram payloads before Tuft
starts a Claude run and strips the accepted payload down to only the Reel URL.
The private Tuft webhook URL remains the authorization boundary.

### 6. Build the iPhone Shortcut

Open the **Shortcuts** app on the iPhone.

#### Create and name it

1. Tap **+** to create a shortcut.
2. Tap the shortcut name at the top.
3. Rename it to **Save Reel**.

#### Enable the Share Sheet

1. Tap the shortcut name again, or tap the **ⓘ** details button.
2. Open **Details**.
3. Enable **Show in Share Sheet**.
4. Return to the shortcut editor.
5. At the top, tap **Receive [input types] from Share Sheet**.
6. Tap **Deselect All**.
7. Enable only **URLs**.

The wording varies slightly by iOS version. The important outcome is that the
shortcut appears when Instagram shares a URL and receives that URL as
`Shortcut Input`.

#### Add the webhook request

1. Tap **Add Action**.
2. Search for **Generate UUID** and add it.
3. Search for **Get Contents of URL** and add it below **Generate UUID**.
4. In its URL field, paste the private Tuft webhook URL.
5. Expand the action's options.
6. Set **Method** to `POST`.
7. Set **Request Body** to `JSON`.
8. Add these JSON fields:

   ```text
   Key:   url         Value: Shortcut Input
   Key:   requestId   Value: UUID
   ```

To insert `Shortcut Input`, tap the value field and select the magic variable
named **Shortcut Input**. For `requestId`, select the magic variable produced
by **Generate UUID**. Do not type either variable name as ordinary text.

No API-key header is required. The Tuft webhook token is already part of its
private URL.

#### Append each result to one Apple Note

First open Apple Notes and create a note named **Saved Reels**. Then return to
the Shortcut and add the following actions after the webhook request:

1. Add **Repeat** and set it to `20` times.
2. Inside **Repeat**, add **Wait** for `15` seconds.
3. Add a **Text** action containing your Apps Script web-app URL followed by
   `?requestId=` and the generated **UUID** magic variable:

   ```text
   https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?requestId=UUID
   ```

   Insert **UUID** as a magic variable; do not type the letters `UUID`.
4. Add **Get Contents of URL** using that **Text** value. Leave its method as
   `GET`.
5. Add **Get Dictionary Value** and read the key `status` from the result.
6. Add an **If** action: if `status` is `ready`, read the `title`, `category`,
   `summary`, and `reelUrl` dictionary values from the same result.
7. Inside that **If**, add a **Text** action formatted like:

   ```text
   Title
   Category

   Summary

   Reel URL
   ```

   Replace each line with its matching dictionary-value magic variable.
8. Add **Append to Note** and select the existing **Saved Reels** note.
9. Add **Show Notification** with `Saved to Sheet + Notes ✅`.
10. Add **Stop This Shortcut** so later repeat iterations do not append the
    same Reel again.
11. After **End Repeat**, add **Show Notification** with
    `Saved to Sheet, but Notes timed out`.

The polling loop waits for up to five minutes. Keep the Shortcut running while
it processes. A Reel that takes longer still lands in Google Sheets, but it
will not be appended to Apple Notes during that run.

If Apple Notes output is not wanted, omit this entire polling section and add a
final **Show Notification** action containing:

```text
Reel sent ✅
```

Tap **Done** when the Shortcut is complete.

### 7. Test from Instagram

Use a public Reel for the first test:

1. Open the Reel in Instagram.
2. Tap **Share**.
3. Tap **More** if the shortcut is not immediately visible.
4. Choose **Save Reel**.
5. Wait for the `Reel sent ✅` notification.
6. Open the Tuft dashboard and inspect the latest webhook run.
7. Open the Google Sheet.

The first transcription run may take longer because the local Whisper model is
downloaded and cached. Later runs reuse the model cache.

After a successful run:

- `Inbox` contains the canonical record.
- A category-specific tab contains the useful domain-specific fields.
- The **Saved Reels** Apple Note contains the title and summary when the
  optional polling actions are installed.
- Re-sharing the same canonical Reel does not add a duplicate.

## Category behavior

`AGENTS.md` defines canonical schemas for:

- `Places`
- `Recipes`
- `Workouts`
- `Hikes`
- `Products`
- `Home & DIY`
- `Other`

Claude should reuse these names when they fit. For a genuinely new category,
the Apps Script accepts a new 2–24-column schema and creates the tab
automatically.

This gives each kind of saved Reel the right shape: recipes have ingredients
and steps; hikes have distance and elevation; workouts have sets and equipment;
places have city, address, price, and visit status.

## What is actually analyzed

For public Reels, the webhook attempts to use:

- downloaded Reel video;
- local Whisper audio transcription with timestamps;
- embedded or automatic subtitle tracks when available;
- sampled video frames every three seconds;
- on-screen captions and visual context;
- Instagram public caption and metadata.

If Instagram blocks the media download, the workflow may use public
caption/metadata as a lower-confidence fallback. It must label that outcome as
`Caption-only extraction`.

Private, removed, region-locked, or login-gated Reels may not be readable.

## Troubleshooting

### The Shortcut does not appear in Instagram

- Confirm **Show in Share Sheet** is enabled.
- Confirm the shortcut accepts **URLs**.
- In Instagram's share menu, tap **More**.
- Reopen Shortcuts after changing the accepted input type.

### The webhook run never starts

- Confirm **Get Contents of URL** uses `POST`.
- Confirm the action's URL is the private Tuft webhook URL.
- Confirm the JSON field is named exactly `url`.
- Confirm its value is the magic variable **Shortcut Input**, not typed text.

### The Sheet does not receive a row

- Confirm the Apps Script deployment URL ends in `/exec`.
- Confirm the deployment type is **Web app**.
- Confirm **Execute as: Me**.
- Confirm **Who has access: Anyone**.
- Confirm the Apps Script property is named exactly `SPREADSHEET_ID`.
- Confirm the Apps Script property `WRITE_TOKEN` exists.
- Confirm `SHEETS_WEBHOOK_URL` contains the Apps Script URL, not the Google
  Sheet URL.
- Confirm `SHEETS_WRITE_TOKEN` exactly matches the Apps Script `WRITE_TOKEN`.
- Create a **New version** of the Apps Script deployment after code changes.

### The Sheet updates but Apple Notes does not

- Confirm the Shortcut sends the generated UUID in the JSON field
  `requestId`.
- Confirm the polling URL is the Apps Script `/exec` URL followed by
  `?requestId=` and the same generated UUID magic variable.
- Confirm **Get Contents of URL** in the polling loop uses `GET`.
- Confirm the Apple Note named **Saved Reels** exists and is selected in
  **Append to Note**.
- Deploy a **New version** of the Apps Script after copying the latest
  `Code.gs`.
- Keep the Shortcut open while it polls. The loop stops after five minutes.

### The webhook reports a 404 after the row was written

Apps Script redirects after processing the first POST. `AGENTS.md` instructs
curl to follow that redirect without forcing another POST. Confirm the webhook
is using the latest `main` branch.

### A Reel contains only caption-level information

Inspect the webhook run. A full run should download media, produce `audio.wav`,
create a Whisper transcript, and inspect sampled frames. If it says
`Caption-only extraction`, Instagram blocked or gated the media.

### A category tab looks wrong

The Apps Script refuses to silently change an existing category's header
schema. Rename or remove an incorrect empty tab, or deliberately update the
schema in `AGENTS.md` and the Sheet.

## Security

Never commit or share:

- the private Tuft webhook URL;
- the Apps Script `/exec` URL;
- the Apps Script `WRITE_TOKEN`;
- the Tuft `SHEETS_WRITE_TOKEN` environment value;
- Anthropic, Google, or Meta access tokens;
- `.env` files;
- Google service-account JSON.

If a private URL or API key appears in chat, a screenshot, a log, or Git
history, rotate it immediately.

To rotate access:

1. Generate a new `WRITE_TOKEN`.
2. Replace it in Apps Script Project Settings.
3. Replace `SHEETS_WRITE_TOKEN` in the Tuft webhook environment.
4. If the Tuft webhook URL leaked, delete and recreate that webhook.
5. If an Anthropic API key leaked, revoke it in the Anthropic Console and
   replace it only in Tuft's encrypted provider/environment settings.

The Apps Script sanitizes spreadsheet values that begin with formula-control
characters to reduce formula-injection risk. It also serializes writes with a
script lock and checks duplicates before appending.

## Local development

The repository also includes an Express service and optional Instagram
Messaging API path. Those are secondary to the Tuft webhook + iPhone Shortcut
workflow documented above.

Install and verify:

```sh
npm install
npm test
npm run typecheck
```

Download and sample a public Reel:

```sh
npm run extract-media -- \
  "https://www.instagram.com/reel/REEL_ID/" \
  "/tmp/reel-output"
```

Transcribe its extracted audio locally:

```sh
npm run transcribe-audio -- \
  "/tmp/reel-output/audio.wav" \
  "/tmp/reel-output/transcript.json"
```

The first transcription downloads the Whisper model. Set `WHISPER_MODEL` to a
compatible Transformers.js Whisper model to change the default.

## Verification

```sh
npm test
npm run typecheck
npm audit
```

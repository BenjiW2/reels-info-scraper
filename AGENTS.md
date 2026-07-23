# Make Reels Real webhook workflow

This repository supports a Tuft webhook triggered by an iPhone Shortcut.

When a webhook run starts:

1. Read the JSON trigger payload. It must contain an Instagram URL in `url`.
2. Accept only `https://instagram.com/...` or `https://www.instagram.com/...`
   URLs whose path begins with `/reel/`, `/reels/`, or `/p/`.
3. Fetch the public Reel page and inspect its caption/title/description. Extract
   only facts visible in the source. Never invent a place, address, price, or
   tip. If the Reel is private or unavailable, report that and make no Sheet
   changes.
4. Produce these fields:
   - Saved at (UTC ISO timestamp)
   - Title
   - Category: food, gym, travel, activity, shopping, or other
   - Place
   - City
   - Country
   - Address
   - Price
   - Tips
   - Summary
   - Reel URL
   - Instagram sender ID: `ios-shortcut`
   - Instagram message ID: `shortcut:<canonical URL>`
   - Confidence: number from 0 to 1
5. Build one JSON array named `row` containing the 14 values above in exactly
   that order.
6. POST `{"row": row}` as JSON to the URL in the `SHEETS_WEBHOOK_URL`
   environment variable. This Apps Script endpoint handles duplicate checking
   and appending to the `Reels` tab. Never print, echo, inspect, interpolate
   into a displayed command, or reveal that URL. Reference the environment
   variable directly from a script or command whose output cannot contain it.
7. Treat `{ "ok": true, "duplicate": true }` as an already-saved result. Treat
   any response with `ok: false` as a failure and report its error without
   retrying duplicate writes.
8. Finish with a short result saying `Saved: <title>` or `Already saved:
   <title>`. For inaccessible Reels, say `Could not read that Reel; make sure
   it is public.`

Do not ask for, print, store, or use an Anthropic API key. The webhook's selected
Claude model provides the extraction capability. Require `SHEETS_WEBHOOK_URL`
and fail clearly when it is absent, but never reveal its value while checking.

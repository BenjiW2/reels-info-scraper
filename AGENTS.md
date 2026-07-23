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
5. Use the connected Google Drive/Sheets tools to open spreadsheet
   `1J6_G1IRd3bqD5-dz21xHw24KUFbRtPvWOuLxwe5lzog`, tab `Reels`.
6. Check column M for the Instagram message ID. If it already exists, do not
   append another row.
7. Append exactly one row in columns A:N, preserving the existing header,
   formatting, filter, and unrelated cells.
8. Finish with a short result saying `Saved: <title>` or `Already saved:
   <title>`. For inaccessible Reels, say `Could not read that Reel; make sure
   it is public.`

Do not ask for, print, store, or use an Anthropic API key. The webhook's selected
Claude model provides the extraction capability.

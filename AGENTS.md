# Make Reels Real webhook workflow

This repository supports a Tuft webhook triggered by an iPhone Shortcut.

When a webhook run starts:

1. Read the JSON trigger payload. It must contain an Instagram URL in `url`.
2. Accept only `https://instagram.com/...` or `https://www.instagram.com/...`
   URLs whose path begins with `/reel/`, `/reels/`, or `/p/`.
3. Fetch the public Reel page and inspect its caption/title/description. Extract
   only facts visible in the source. Never invent a place, address, price,
   ingredient, quantity, exercise, or tip. If the Reel is private or
   unavailable, report that and do not call the Sheet webhook.
4. Classify the Reel by its actual utility. Prefer stable, human-friendly
   category names such as `Places`, `Recipes`, `Workouts`, `Hikes`, `Products`,
   `Home & DIY`, or `Other`. Reuse an existing category name when it fits; do
   not create near-duplicate categories such as `Food Places` and `Restaurants`.
5. Build `inboxRow` with exactly these 14 fields:
   - Saved at (UTC ISO timestamp)
   - Title
   - Category
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
6. Build a useful category-specific schema and row. Use these canonical schemas
   whenever their category applies:
   - `Places`: Saved at, Name, Type, City, Country, Address, Price, Status,
     Best for, Notes, Reel URL
   - `Recipes`: Saved at, Recipe, Cuisine, Ingredients, Steps, Prep time,
     Cook time, Servings, Dietary tags, Notes, Reel URL
   - `Workouts`: Saved at, Workout, Goal, Exercises, Sets/Reps/Time, Equipment,
     Muscle groups, Difficulty, Notes, Reel URL
   - `Hikes`: Saved at, Hike, Location, Distance, Elevation, Duration,
     Difficulty, Best season, Route notes, Reel URL
   - `Products`: Saved at, Product, Brand, Type, Price, Size/Variant,
     Purchase link, Why save it, Notes, Reel URL
   - `Home & DIY`: Saved at, Project, Room/Area, Materials, Tools, Steps,
     Difficulty, Cost, Safety notes, Reel URL
   For a genuinely new category, define 2–24 concise headers whose final header
   is `Reel URL`. Keep the same header names and order on later Reels in that
   category.
7. POST this JSON shape to the URL in `SHEETS_WEBHOOK_URL`:

   ```json
   {
     "inboxRow": [],
     "category": "Places",
     "categoryHeaders": [],
     "categoryRow": []
   }
   ```

   Never print, echo, inspect, interpolate into a displayed command, or reveal
   the URL. Reference the environment variable directly from a command whose
   output cannot contain it. When using curl, use `--data-binary` with `-L` and
   do not add `-X POST`; Apps Script redirects after the initial POST, and
   forcing POST on the redirected URL can create a false 404 after a successful
   append.
8. Treat `{ "ok": true, "duplicate": true }` as already saved. Treat any
   response with `ok: false` as a failure and report its error without retrying.
9. Finish with `Saved to <category>: <title>`, `Already saved: <title>`, or
   `Could not read that Reel; make sure it is public.`

Do not ask for, print, store, or use an Anthropic API key. The webhook's selected
Claude model provides extraction. Require `SHEETS_WEBHOOK_URL` and fail clearly
when it is absent, but never reveal its value while checking.

# Kitchen

A web app for the household iPad (and iPhone): recipes, the week plan, the grocery list, what's in the kitchen, and what dinner costs. It has no build step. These files are the whole app.

## What's here
- `index.html`: the page
- `app.css`: the look (light and dark)
- `js/core.js`: dates, units, recipe and receipt parsing, saving to the device
- `js/data.js`: the starter ingredient list and the sample household
- `js/seed.js`: the family recipes, the first receipt and the store price estimates a new device starts with (generated, see below)
- `js/model.js`: costs, matching ingredients to the kitchen, suggestions, the grocery list, learning
- `js/app.js`: the screens and buttons
- `manifest.webmanifest`, `sw.js`, `icons/`: Home Screen install and offline use
- `seed/`: the plain-text sources for `js/seed.js`. Edit `family-recipes.txt`, `first-receipt.txt` or `store-prices.txt`, then run `node seed/build-seed.js` to regenerate it

## Where data lives
Everything is saved in the browser's storage on each device (IndexedDB). Nothing is sent anywhere. Use Settings > Download a backup now and then.

## Putting it on GitHub Pages
1. Create a repo (for example `kitchen-app`) and upload everything in this folder to the top level of the repo, so `index.html` sits at the top, not inside a folder.
2. In the repo, go to Settings > Pages, set Source to "Deploy from a branch", pick `main` and `/ (root)`, then Save.
3. After a minute the app is at `https://<your-username>.github.io/kitchen-app/`.
4. On the iPad, open that address in Safari, tap Share, then "Add to Home Screen". Open it from the new icon.

## Trying it locally on Windows
Double-clicking `index.html` won't save data reliably. Run a tiny local server from this folder instead, for example `python -m http.server 8000`, then open http://localhost:8000.

## Notes
- Recipe links: the app first asks the site itself, then (if Settings allows) free public reader services (AllOrigins, CodeTabs, Jina Reader) that fetch the page. Only the link is sent. It reads the recipe data that sites publish for search engines. When a site won't share, the "Copy for Kitchen" Safari bookmark (set up from Add a recipe) copies the recipe on the page itself, and the paste box reads it.
- Receipt photos are read on the device with Tesseract.js, which downloads the first time it's used. Before reading, the app crops to the receipt and cleans up shadows; afterwards it matches codes the store has used before (even when a letter was misread), fixes prices that differ from last time by one commonly misread digit, flags prices that look off, and compares the lines with the receipt's printed total. Typing or pasting receipt lines always works.
- Recipes open as written. "Making" on a recipe (or Half / Double when planning a dinner) scales the amounts, the grocery list and what "We made this" takes out of the kitchen. The household size is only used for per-person costs and guessing leftovers.
- "We made this" assumes the whole recipe was made (or what the page was changed to), and shows what will be taken out of the Kitchen list so amounts can be corrected before saving.
- Cook mode keeps the screen on using the Screen Wake Lock API (iPadOS 16.4 and later; works best when opened from the Home Screen icon).
- When you change files, bump `CACHE` in `sw.js` (for example `kitchen-v7`) so the iPad picks up the new version.

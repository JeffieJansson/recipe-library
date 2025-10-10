Netlify link : https://library-recipe.netlify.app/

# Recipe Library
A recipe browser built with **HTML/CSS/JavaScript** that fetches data from the Spoonacular API.  


---

## Features

- Fetches recipes from Spoonacular `/recipes/complexSearch` with:
  - `addRecipeInformation=true` (get images, ingredients, etc.)
  - `instructionsRequired=true` (avoid empty/how-to)
  - `fillIngredients=true` (include ingredient list)
  - `sort=random` (or `popularity` if you prefer more complete metadata)
- **Local cache** with TTL (6 hours) via `localStorage` → faster reloads, fewer API calls.
- **Normalization layer**: turns messy API objects into a small, predictable shape for the UI.
- **Filters & sorting** (cuisine, diet, time, popularity) + free‑text **search** (title/ingredients).
- **Accessible rendering**: live status messages + `aria-busy` while grid updates(and cleared after render).
- **Quota/Offline fallback**: shows cached data or a friendly message when API is unavailable.
- **Random recipe** button (renders one card from the current dataset).

---

## Tech Stack

- **HTML** (semantic structure + `<template>` for cards)
- **CSS** (responsive grid, clean tokens/variables)
- **JavaScript** (fetch, normalize, cache, render)

---

## Project Structure

```
.
├── README.md     
├── backupData.js       
├── index.html
├── script.js
└── style.css       
```

---

## Setup

1) **Get an API key** from Spoonacular (free/student).  
2) In `script.js`, set:
```js
const API_KEY = "YOUR_API_KEY_HERE";
```
3) Optional: change how many recipes to load on startup:
```js
fetchRecipes(24); // try 12, 24, 36 ...
```

### Configure cuisines
This project fetches certain cuisines from the API. You’ll see:
- a string‑built URL (simple):
```js
const API_URL = (n = 24) =>
  `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=${n}&cuisine=Italian,American,Chinese,Asian,Mediterranean,Middle%20Eastern&addRecipeInformation=true&instructionsRequired=true&fillIngredients=true&sort=random`;
```

---

## How It Works (10 parts)

> The code is intentionally organized into small, named functions with clear headers.

### 1) API config
Builds the full request URL using your API key, number of recipes, desired cuisines, and safe parameters.

### 2) Cache & UI constants
Defines constants like `CACHE_KEY`, `CACHE_TTL_MS` (6 hours), `MAX_INGREDIENTS`, and a global `RECIPES` array (the app’s in‑memory “working data”).

### 3) DOM helpers
A tiny `$()` helper for `getElementById`. Stores a reference to `#grid` where cards are rendered.

### 4) String helpers/formatters
- `toKebabCase("Middle Eastern") → "middle-eastern"` (stable for filters)
- `toTitleCase("middle-eastern") → "Middle Eastern"` (nice labels)

### 5) Normalization
`normalizeRecipe(raw)` converts/maps raw API items into a compact shape the UI can trust:
```js
{
  id, title, cuisine, cuisines[], diet, timeMin, popularity, imageUrl, ingredients[]
}
```
Diet is reduced to **one** tag (`vegan/vegetarian/gluten-free/dairy-free/none`). Popularity is normalized to 0–100.
| Popularity | Stars |
|-----------:|:-----:|
| 0          | ☆☆☆☆☆ |
| 10         | ★☆☆☆☆ |
| 35         | ★★☆☆☆ |
| 65         | ★★★☆☆ |
| 85         | ★★★★☆ |
| 100        | ★★★★★ |
- `p / 20` → split 100 into 5 steps.

### 6) Cache functions
- `saveCache(recipes)` → writes `{ ts, data }` to `localStorage`.
- `loadCache()` → returns cached data only if it’s fresh (<= TTL).

### 7) Fetch with quota handling
- Show “Loading…” and mark grid `aria-busy`.
- Try fresh cache first; otherwise call the API.
- Normalize, save to cache, render.  
- On error/402/429, fall back to in‑memory data, then stale cache, or show a friendly empty state.

cache → API → normalize → cache → render; graceful fallback on 402/429/offline

### 8) Filtering & sorting
Applies the current UI selections:
- Filter by **cuisine**, **diet**, and **search** (title + ingredients).
- Sort by **popularity** and/or **time**.

### 9) Rendering
Clones a hidden `<template>` for each recipe, fills in fields (image, title, meta, ingredients), and updates an ARIA live status. Renders an empty state if no results.

### 10) Events & init
Wires dropdowns + search to re-render on change. “Random” button shows a single random card. On page load, calls `fetchRecipes(...)` to populate the grid.

---

## Full Data Flow (with arrows)

```
[PAGE LOAD]
   │
   ▼
(10) init → fetchRecipes(n)
   │
   ▼
(7) fetch
  ├─ try (6) loadCache → YES → (9) render "cache"
  └─ NO → API → JSON → (5) normalize → (6) saveCache → (9) render "api"
     └─ on error/quota → in-memory or stale cache → render "stale" → else empty state
   │
   ▼
(8) filter/sort/search → (9) render "filters"
   │
   ▼
Random → pick 1 from RECIPES → render

```

---



## Error Handling & Quota

- **402 / 429** → “Daily API quota reached” message.  
- Falls back to in‑memory or stale cache when possible.  
- Always fails **gracefully** with helpful messages instead of crashing.

---

##  Accessibility

- `aria-busy` while rendering the grid
- Live status region (`role="status"`) that announces what’s shown
- Clear empty/error states

---

## Performance Notes

- Local caching avoids unnecessary network calls.  
- Using `<template>` nodes + fragment cloning keeps rendering snappy.  
- Filtering/sorting is done on small, normalized arrays in memory.

---

## Security Note (Important)

The API key is included **client‑side** for school/demos only. In production you should **not** expose secrets in the browser. Use a small server/proxy to keep your key private.


---

## License

No license included by default. For school use, that’s fine. If you publish publicly, consider **MIT**.

---

Happy cooking & coding! 🍝

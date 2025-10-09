# Recipe Library (Vanilla JS)

A small, clean recipe browser built with **HTML/CSS/JavaScript** that fetches data from the Spoonacular API.  
It focuses on **clarity**, **good structure**, and **student‑friendly code**: each step is split into small functions and clearly commented.

---

## ✨ Features

- Fetches recipes from Spoonacular `/recipes/complexSearch` with:
  - `addRecipeInformation=true` (get images, ingredients, etc.)
  - `instructionsRequired=true` (avoid empty/how-to)
  - `fillIngredients=true` (include ingredient list)
  - `sort=random` (or `popularity` if you prefer more complete metadata)
- **Local cache** with TTL (6 hours) via `localStorage` → faster reloads, fewer API calls.
- **Normalization layer**: turns messy API objects into a small, predictable shape for the UI.
- **Filters & sorting** (cuisine, diet, time, popularity) + free‑text **search** (title/ingredients).
- **Accessible rendering**: live status messages + `aria-busy` while grid updates.
- **Quota/Offline fallback**: shows cached data or a friendly message when API is unavailable.
- **Random recipe** button (renders exactly one card from the current dataset).

---

## 🧱 Tech Stack

- **HTML** (semantic structure + `<template>` for cards)
- **CSS** (responsive grid, clean tokens/variables)
- **JavaScript** (no frameworks)

---

## 📁 Project Structure

```
.
├── index.html      # Layout, filter controls, grid, <template> for cards
├── style.css       # Tokens, responsive grid, card styling, UI polish
└── script.js       # All logic (fetch/cache/normalize/filter/sort/render/events)
```

Open `index.html` directly in a browser or via a lightweight web server (e.g. VS Code “Live Server”).

> Tip: If you double‑click `index.html`, most browsers will run it fine. If you ever hit CORS issues, use a local server.

---

## ⚙️ Setup

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
This project fetches certain cuisines from the API. You’ll see either:
- a string‑built URL (simple):
```js
const API_URL = (n = 24) =>
  `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=${n}&cuisine=Italian,American,Chinese,Asian,Mediterranean,Middle%20Eastern&addRecipeInformation=true&instructionsRequired=true&fillIngredients=true&sort=random`;
```
or (alternative style) a URL builder with an editable list:
```js
const BASE = "https://api.spoonacular.com";
const WANTED_CUISINES = ["Italian","American","Chinese","Asian","Mediterranean","Middle Eastern"];
const API_URL = (n = 24) => {
  const url = new URL("/recipes/complexSearch", BASE);
  url.searchParams.set("apiKey", API_KEY);
  url.searchParams.set("number", String(n));
  url.searchParams.set("cuisine", WANTED_CUISINES.join(","));
  url.searchParams.set("addRecipeInformation", "true");
  url.searchParams.set("instructionsRequired", "true");
  url.searchParams.set("fillIngredients", "true");
  url.searchParams.set("sort", "random"); // or "popularity"
  return url.toString();
};
```
Use whichever version your codebase has—both produce a correct API URL.

---

## 🧠 How It Works (10 parts)

> The code is intentionally organized into small, named functions with clear headers.

### 1) API config
Builds the full request URL using your API key, number of recipes, desired cuisines, and safe parameters.

### 2) Cache & UI constants
Defines constants like `CACHE_KEY`, `CACHE_TTL_MS` (6 hours), `MAX_INGREDIENTS`, and a global `RECIPES` array (the app’s in‑memory “working data”).

### 3) DOM helpers
A tiny `$()` helper for `getElementById`. Stores a reference to `#grid` where cards are rendered.

### 4) String helpers
- `toKebabCase("Middle Eastern") → "middle-eastern"` (stable for filters)
- `toTitleCase("middle-eastern") → "Middle Eastern"` (nice labels)

### 5) Normalization
`normalizeRecipe(raw)` converts raw API items into a compact shape the UI can trust:
```js
{
  id, title, cuisine, cuisines[], diet, timeMin, popularity, imageUrl, ingredients[]
}
```
Diet is reduced to **one** tag (`vegan/vegetarian/gluten-free/dairy-free/none`). Popularity is normalized to 0–100.

### 6) Cache functions
- `saveCache(recipes)` → writes `{ ts, data }` to `localStorage`.
- `loadCache()` → returns cached data only if it’s fresh (<= TTL).

### 7) Fetch with quota handling
- Show “Loading…” and mark grid `aria-busy`.
- Try fresh cache first; otherwise call the API.
- Normalize, save to cache, render.  
- On error/402/429, fall back to in‑memory data, then stale cache, or show a friendly empty state.

> (Optional but recommended) You can filter out items with missing cuisines before normalization:
```js
const normalized = (data.results || data.recipes || [])
  .filter(r => Array.isArray(r.cuisines) && r.cuisines.length > 0)
  .map(normalizeRecipe);
```

### 8) Filtering & sorting
Applies the current UI selections:
- Filter by **cuisine**, **diet**, and **search** (title + ingredients).
- Sort by **popularity** and/or **time**.

### 9) Rendering
Clones a hidden `<template>` for each recipe, fills in fields (image, title, meta, ingredients), and updates an ARIA live status. Renders an empty state if no results.

### 10) Events & init
Wires dropdowns + search to re-render on change. “Random” button shows a single random card. On page load, calls `fetchRecipes(...)` to populate the grid.

---

## 🔁 Full Data Flow (with arrows)

```
[PAGE LOAD]
   │
   ▼
(10) events/init → fetchRecipes(n)
   │
   ▼
(7) fetchRecipes
  ├─ show "Loading…" + aria-busy
  ├─ try (6) loadCache()
  │    ├─ YES → RECIPES = cache → (9) renderGrid("cache") → DONE
  │    └─ NO  → fetch API using (1) API_URL
  │          ├─ parse JSON
  │          ├─ (optional) filter out empty cuisines
  │          ├─ (5) normalize each item
  │          ├─ RECIPES = normalized
  │          ├─ (6) saveCache(RECIPES)
  │          └─ (9) renderGrid("api") → DONE
  └─ on error/quota:
       ├─ if in-memory RECIPES → renderGrid("stale")
       ├─ else stale localStorage → renderGrid("stale")
       └─ else empty state message
   │
   ▼
(8) filter/sort/search → (9) renderGrid("filters")
   │
   ▼
Random button → 1 card from RECIPES
```

---

## 🧩 Normalized Recipe Shape (UI object)

```ts
type Recipe = {
  id: number;
  title: string;
  cuisine: string;        // e.g. "italian" (kebab-case)
  cuisines: string[];     // all cuisines (kebab-case)
  diet: "vegan" | "vegetarian" | "gluten-free" | "dairy-free" | "none";
  timeMin: number;        // readyInMinutes (default 0)
  popularity: number;     // 0..100
  imageUrl: string;
  ingredients: string[];  // short, clean list
};
```

---

## 🛟 Error Handling & Quota

- **402 / 429** → “Daily API quota reached” message.  
- Falls back to in‑memory or stale cache when possible.  
- Always fails **gracefully** with helpful messages instead of crashing.

---

## ♿ Accessibility

- `aria-busy` while rendering the grid
- Live status region (`role="status"`) that announces what’s shown
- Clear empty/error states

---

## 🚀 Performance Notes

- Local caching avoids unnecessary network calls.  
- Using `<template>` nodes + fragment cloning keeps rendering snappy.  
- Filtering/sorting is done on small, normalized arrays in memory.

---

## 🔒 Security Note (Important)

The API key is included **client‑side** for school/demos only. In production you should **not** expose secrets in the browser. Use a small server/proxy to keep your key private.

---

## ✅ Code‑Review Checklist (for your classmate)

- Clear section headers and small, named functions?
- Normalization returns the same shape for every recipe?
- Filters/sorts are pure (they don’t mutate the original array)?
- Empty + loading states are handled?
- Cache TTL, API URL, and constants easy to change?
- Comments explain the “why”, not only the “what”?

---

## 📄 License

No license included by default. For school use, that’s fine. If you publish publicly, consider **MIT**.

---

Happy cooking & coding! 🍝

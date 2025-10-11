/* ===========================================================
//  Recipe Finder App
//  Code is split up into small, named functions that describe what they do. 
// Each section is clearly marked with a header.
// -1 API config & fetch
// -2 Cache handling
// -3 DOM helpers
// -4 String helpers
// -5 Normalization helpers
// -6 Cache functions
// -7 Fetch with quota handling
// -8 Filtering & sorting
// -9 Rendering
// -10 Event handling & init  random recipe
   =========================================================== */

//Import backup data
import { backupData } from './backupData.js';
/* -----------------------
   1) API CONFIG
   ----------------------- */
const API_KEY = '42a3e506a5a6493080872a8509f9c7d5';
const API_URL = (n = 24) =>
  `https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&number=${n}&cuisine=Italian,American,Chinese,Asian,Mediterranean,Middle%20Eastern&addRecipeInformation=true&instructionsRequired=true&fillIngredients=true&sort=random`;

/* -----------------------
   2) CACHE + UI CONSTANTS
   ----------------------- */
// These constants + global array are "shared settings/memory":
// - CACHE_KEY → name used to save/load recipes in localStorage
// - CACHE_TTL_MS → how long cached data is valid (6h here). After this time we consider the cache “expired” and try to refetch fresh data.
// - MAX_INGREDIENTS → UI rule: keep recipe cards short
// - RECIPES → global array holding all recipes (so filter/sort/render can access same data)
const CACHE_KEY = 'spoon_recipes_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MAX_INGREDIENTS = 4;
// global in-memory array of all recipes (fetched + normalized)
let RECIPES = [];


/* -----------------------
   3) DOM HELPERS
   ----------------------- */
// $() → shortcut for document.getElementById()
// grid → reference to <div id="grid"> where recipe cards go
const $ = (id) => document.getElementById(id);
const grid = $('grid');


/* -----------------------
   4) STRING HELPERS (REUSABLE)
   ----------------------- 
   Purpose: Avoid duplicating string transforms in multiple places.
   - toKebabCase: "Middle Eastern" → "middle-eastern" (stable codes for filters)
   - toTitleCase: "middle-eastern" → "Middle Eastern" (friendly UI labels)
   */
function toKebabCase(str = '') {
  return String(str).trim().toLowerCase().replace(/\s+/g, '-');
}
// Converts "middle-eastern" → "Middle Eastern" (Title Case: good for UI labels).
function toTitleCase(str = '') {
  return String(str).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// PURE FORMATTERS – Small helpers to transform numbers/codes to user-friendly labels.
function minutesToLabel(mins) {
  // Return a time label based on numeric ranges
  if (mins < 15) return "Under 15 min";
  if (mins <= 30) return "15–30 min";
  if (mins <= 60) return "30–60 min";
  return "Over 60 min";
}
function starsFromPopularity(p) {
  // Convert 0–100 popularity to a 0–5 stars string
  const n = Math.max(0, Math.min(5, Math.round(p / 20)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/* -----------------------
   5) NORMALIZATION HELPERS
   -----------------------
PURPOSE:
   The API returns big, messy objects with many fields and inconsistent shapes.
   I use normalizeRecipe() to clean and reformat that data into a consistent structure
   that our UI can easily use.
      - Split the logic into smaller helper functions for better readability:
     • resolveDietCode() – decides which diet label (vegan, vegetarian, etc.)
     • resolvePopularity() – converts popularity score safely (0–100)
     • mapToNormalizedRecipe() – returns the final clean recipe object
*/
function normalizeRecipe(recipe) {
  if (!recipe) throw new Error("Recipe input is null or undefined");

  // Read first cuisine safely (optional chaining) or default to 'unknown'.
  // Then convert to kebab-case so filters are simple and consistent.
  const cuisineCode = toKebabCase(recipe.cuisines?.[0] || "unknown");
  const dietCode = resolveDietCode(recipe);
  const rawPop = resolvePopularity(recipe);

  return mapToNormalizedRecipe(recipe, cuisineCode, dietCode, rawPop);
}

// resolveDietCode() → decides which single diet label to use.
// Order of priority: vegan > vegetarian > gluten-free > dairy-free > none.
function resolveDietCode(recipe) {
  if (recipe.vegan || recipe.diets?.includes?.("vegan")) return "vegan";
  if (recipe.vegetarian || recipe.diets?.includes?.("vegetarian")) return "vegetarian";
  if (recipe.glutenFree || recipe.diets?.includes?.("gluten free")) return "gluten-free";
  if (recipe.dairyFree || recipe.diets?.includes?.("dairy free")) return "dairy-free";
  return "none";
}

// resolvePopularity() → takes spoonacularScore (0–100) or falls back to aggregateLikes.
function resolvePopularity(recipe) {
  if (typeof recipe.spoonacularScore === "number") {
    return recipe.spoonacularScore;
  }
  return Math.min(100, recipe.aggregateLikes || 0);
}

// mapToNormalizedRecipe() → builds the final simplified recipe object
function mapToNormalizedRecipe(recipe, cuisineCode, dietCode, rawPop) {
  return {
    id: recipe.id,
    title: recipe.title || "Untitled recipe",
    cuisine: cuisineCode,
    cuisines: (recipe.cuisines || []).map(toKebabCase),
    diet: dietCode,
    timeMin: recipe.readyInMinutes || 0,
    popularity: rawPop,
    imageUrl:
      recipe.image ||
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop",
    ingredients: (recipe.extendedIngredients || [])
      .map((i) => i?.name)
      .filter(Boolean)
      .slice(0, 24),
  };
}


/* ===========================================================
   6) CACHE FUNCTIONS (localStorage)
   PURPOSE: Reduce API calls (quota), speed up UI, work better with flaky networks.
   We save normalized recipes + timestamp, then read them if still within TTL.
   =========================================================== */

// Read FRESH cache (honors TTL). Returns an array or null.
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);         // may be null
    if (!raw) return null;
    const obj = JSON.parse(raw);                         // parse string → object
    if (!obj || !obj.ts || !Array.isArray(obj.data)) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null; // expired
    return obj.data;
  } catch {
    // If JSON is corrupted or storage blocked, fail safely.
    return null;
  }
}

// Save normalized recipes into cache along with current timestamp.
function saveCache(recipes) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: recipes }));
  } catch {
    // If storage is full/blocked, fail safely (but warn in console).
  }
}


/* ===========================================================
   7) FETCH (API + fallback) with QUOTA messaging
   PURPOSE: Show loading → try cache → try network → normalize/save/render → handle errors.
   Includes a stale-cache fallback to keep UI useful when offline/quota.
   =========================================================== */
async function fetchRecipes(count = 24) {
  grid.innerHTML = '<div class="loading">Loading recipes…</div>';
  $('status').textContent = 'Loading recipes…';
  grid.setAttribute('aria-busy', 'true');

  // 1) Try fresh cache first
  const cached = loadCache();
  if (cached) {
    RECIPES = cached;
    renderGrid('cache');
    return;
  }

  // 2) Else fetch from API
  /*QUOTA HANDLING — detect when daily API limit (402/429) is reached
    and show a useful message to the user instead of breaking silently.*/
  try {
    const res = await fetch(API_URL(count));

    if (!res.ok) {
      if (res.status === 402 || res.status === 429) {
        $('status').textContent = 'Daily API quota reached — showing cached recipes if available.';
        throw new Error('QUOTA');
      }
      throw new Error(`HTTP ${res.status}`);
    }
    // Parse JSON + normalize
    const data = await res.json();
    const normalized = (data.results || data.recipes || []).map(normalizeRecipe);

    if (normalized.length === 0) throw new Error('Empty result');

    RECIPES = normalized;
    saveCache(RECIPES);
    renderGrid('api');
  } catch (err) {
    const isQuota = err && err.message === 'QUOTA';

    // 3a) In-memory stale
    if (RECIPES && RECIPES.length) {
      // fallback message for quota or offline situations
      $('status').textContent = isQuota
        ? 'Daily API quota reached — showing previously loaded recipes.'
        : 'Network error — showing previously loaded recipes.';
      renderGrid('cache (stale)');
      return;
    }

    // 3b) Stale cache (ignore TTL)
    const stale = (() => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || !Array.isArray(obj.data)) return null;
        return obj.data;
      } catch { return null; }
    })();

    if (stale && stale.length) {
      RECIPES = stale;
      $('status').textContent = isQuota
        ? 'Daily API quota reached — showing cached recipes (stale).'
        : 'Offline/quota — showing cached recipes (stale).';
      renderGrid('cache (stale)');
      return;
    }

    // 3c) Empty state
    RECIPES = [];
    grid.innerHTML = '<div class="empty">Couldn’t fetch recipes (quota reached or offline). Try again later.</div>';
    $('status').textContent = isQuota
      ? 'Daily API quota reached — showing no results.'
      : 'API unavailable — showing no results.';
    grid.removeAttribute('aria-busy');
  }
}

/* ===========================================================
   8) FILTERING + SORTING
   PURPOSE: Take the full set of RECIPES and produce a new array
   that matches the current dropdown values (cuisine/diet + sorting).
   Non-mutating patterns are used (returns new arrays).
   =========================================================== */

// Get current UI selections from the dropdowns. Empty string "" means “no filter/sort”.
function getSelectedCuisine() { return $('cuisine').value || ""; }
function getSelectedDiet() { return $('diet').value || ""; }
function getSelectedSortTime() { return $('sortTime').value || ""; } // "asc" | "desc" | ""
function getSelectedSortPop() { return $('sortPop').value || ""; }   // "most" | "least" | ""
function getQuery() { return ($('q')?.value || '').trim().toLowerCase(); }

// FILTERING — applies current dropdown selections (cuisine, diet)
// Also supports free-text search in title and ingredients query.

function filterRecipes(list) {
  const cuisine = getSelectedCuisine();
  const diet = getSelectedDiet();
  const q = getQuery();


  // Empty filter ("") = user didn't pick a value → don't restrict by that criterion.
  // Ternary pattern: condition ? checkMatch : true  → if empty, return true so all items pass.
  // Example: diet ? r.diet === diet : true   // no diet selected → every recipe passes the diet test.
  // Optional chaining helps avoid crashes on missing fields: r.cuisines?.includes(cuisine)

  const out = list.filter(r => {
    const passCuisine = cuisine
      ? (r.cuisine === cuisine || r.cuisines?.includes(cuisine))
      : true;
    const passDiet = diet ? r.diet === diet : true;
    const passQuery = q
      ? (r.title.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.toLowerCase().includes(q)))
      : true;
    return passCuisine && passDiet && passQuery;
  });

  return out;
}

// SORTING — sorts recipes by time or popularity based on dropdowns
// Sorting and filtering work together in combination.
// Uses a copy of the list to avoid mutating the original array.
function sortRecipes(list) {
  const sTime = getSelectedSortTime();
  const sPop = getSelectedSortPop();
  const arr = [...list]; // copy first

  arr.sort((a, b) => {
    // Primary: popularity (if selected)
    if (sPop === 'most' && a.popularity !== b.popularity) return b.popularity - a.popularity;
    if (sPop === 'least' && a.popularity !== b.popularity) return a.popularity - b.popularity;

    // Secondary (or primary if no popularity sort): time
    if (sTime === 'asc') return a.timeMin - b.timeMin;
    if (sTime === 'desc') return b.timeMin - a.timeMin;

    return 0; // 0 leaves order as-is
  });

  return arr;
}

// Compose the two steps: FILTER first, then SORT
function getVisibleRecipes() {
  return sortRecipes(filterRecipes(RECIPES));
}


/* ===========================================================
   9) RENDER
   PURPOSE: Turn the (filtered + sorted) array into real DOM cards.
   We clone a <template> per recipe and fill its fields.
   We also update a live status line for accessibility/debugging.
   =========================================================== */
function renderGrid(sourceLabel = 'filters') {
  // Clear the grid before re-rendering (prevents duplicates)
  grid.innerHTML = '';
  const items = getVisibleRecipes();  // Compute the list of items to show after filters/sorts

  // G-REQ: Empty state if nothing matches the current filters show a meaningful message to the user instead of blank UI.
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty">No recipes match your filters, please try another option.</div>';
    updateStatus(0, sourceLabel);
    grid.removeAttribute('aria-busy'); //Removes aria-busy after rendering is complete (accessibility enhancement)
    return; // early exit
  }

  // Grab the <template> once, then clone it for each recipe
  const tpl = $('cardTpl');
  items.forEach(r => {
    // Clone the template content (deep clone = true)
    const node = tpl.content.cloneNode(true);

    // Fill img + title
    node.querySelector('.card__img').src = r.imageUrl;
    node.querySelector('.card__img').alt = r.title;
    node.querySelector('.card__title').textContent = r.title;

    // Fill meta info (cuisine, diet, popularity, time)
    node.querySelector('.meta-cuisine').textContent = toTitleCase(r.cuisine);
    node.querySelector('.meta-diet').textContent = toTitleCase(r.diet);
    node.querySelector('.meta-pop').textContent = starsFromPopularity(r.popularity);
    node.querySelector('.meta-time').textContent = minutesToLabel(r.timeMin);

    // Build the ingredient list (<ul> with ≤ MAX_INGREDIENTS + optional ellipsis)
    const ul = node.querySelector('.ing-list');
    const list = r.ingredients.length > MAX_INGREDIENTS
      ? [...r.ingredients.slice(0, MAX_INGREDIENTS), '…']  // spread to create a new array
      : r.ingredients;

    list.forEach(i => {
      const li = document.createElement('li'); // create <li>
      li.textContent = i;                      // set text
      ul.appendChild(li);                      // add to list
    });



    // Finally, append the card to the grid
    grid.appendChild(node);
  });

  // Update the status line (screen-readers + helpful for users)
  updateStatus(items.length, sourceLabel);
  grid.removeAttribute('aria-busy');
}

// Simplified user-friendly status messages, clears the text completely when there are no matching recipes (count === 0).
function updateStatus(count, source) {
  if (count === 0) {
    $('status').textContent = ''; // hide status when grid is empty
    return;
  }

  const q = getQuery();
  $('status').textContent = q
    ? `Found ${count} recipe(s) matching "${q}".`
    : `Showing ${count} recipe(s).`;
}

/* ===========================================================
   10) EVENTS + INIT (+ Random)
   PURPOSE: Wire up the dropdowns (on change → re-render), and then kick off the first fetch.
   We also keep the visual "is-selected" pill style in sync with whether a value is chosen.
   =========================================================== */
['cuisine', 'diet', 'sortTime', 'sortPop', 'q'].forEach(id => {
  // Grab the <select> element by id
  const sel = $(id);
  if (!sel) return; // safety guard 

  // Re-render the grid when any dropdown changes (source label = "filters" so status is clear)
  const rerender = () => renderGrid('filters');
  sel.addEventListener('change', rerender);
  sel.addEventListener('input', rerender);

  // Keep the visual "is-selected" class in sync (blue/white vs mint/pink)
  const sync = () => sel.classList.toggle('is-selected', !!sel.value);
  sel.addEventListener('change', sync);
  sel.addEventListener('blur', sync);
  sel.addEventListener('input', sync);
  sync(); // set correct state on page load
});

//Random recipe button
$('btnRandom')?.addEventListener('click', (e) => {
  e.preventDefault();
  showRandomRecipe();
});

function showRandomRecipe() {
  if (!RECIPES || !RECIPES.length) {
    $('status').textContent = 'No recipes loaded yet — try fetching first.';
    return;
  }
  const idx = Math.floor(Math.random() * RECIPES.length);
  const pick = RECIPES[idx];

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = '';
  const tpl = $('cardTpl');
  const node = tpl.content.cloneNode(true);

  node.querySelector('.card__img').src = pick.imageUrl;
  node.querySelector('.card__img').alt = pick.title;
  node.querySelector('.card__title').textContent = pick.title;

  node.querySelector('.meta-cuisine').textContent = toTitleCase(pick.cuisine);
  node.querySelector('.meta-diet').textContent = toTitleCase(pick.diet);
  node.querySelector('.meta-pop').textContent = starsFromPopularity(pick.popularity);
  node.querySelector('.meta-time').textContent = minutesToLabel(pick.timeMin);

  const ul = node.querySelector('.ing-list');
  const list = pick.ingredients.length > MAX_INGREDIENTS
    ? [...pick.ingredients.slice(0, MAX_INGREDIENTS), '…']
    : pick.ingredients;

  list.forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    ul.appendChild(li);
  });

  grid.appendChild(node);
  updateStatus(1, 'random');
  grid.removeAttribute('aria-busy'); //Removes aria-busy after rendering is complete (accessibility enhancement)
}

// ENTRY POINT – Start by fetching recipes (cache → API → stale fallback) then rendering.
fetchRecipes(24);
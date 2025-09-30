/* ===========================================================
   SPOONACULAR + APP BOOTSTRAP
   Concepts shown here:
   - Constants, template literals, functions
   - Promises & async/await (API calls)
   - localStorage caching (JSON stringify/parse)
   - DOM updates (rendering a template)
   - Conditionals, logical operators, arrays, loops, objects
   =========================================================== */

// 1) Your API key (OBJECT/STRING). In a real production app, you would NOT
//    expose this in frontend code; you'd call a server that keeps the key secret.
//    For this project it's fine so you can learn how fetch() works.
const API_KEY = '42a3e506a5a6493080872a8509f9c7d5';

// Build a full URL to Spoonacular's /recipes/random endpoint.
// Template literal: backticks + ${value} interpolation.
const API_URL = (n = 12) =>
  `https://api.spoonacular.com/recipes/random?number=${n}&apiKey=${API_KEY}`;

// 2) Cache settings. We'll store fetched recipes to avoid hitting the 150/day quota.
//    TTL (time to live) is how long the cache is valid (here: 6 hours).
const CACHE_KEY = 'spoon_recipes_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// 3) Short helper to grab elements by id.
//    This is a FUNCTION. It has local scope for "id" parameter and returns a DOM node.
const $ = (id) => document.getElementById(id);
const grid = $('grid'); // Global variable holding the grid element (GLOBAL SCOPE)

/* ===========================================================
   NORMALIZATION HELPERS
   Purpose: The API returns big, messy OBJECTS. We "normalize"
   them into the shape our UI expects (consistent keys).
   =========================================================== */

// FUNCTION normalizeRecipe takes one API recipe OBJECT `r`
// and RETURNS a new OBJECT in our preferred format.
function normalizeRecipe(r) {
  // CONDITIONAL + OPTIONAL CHAINING:
  // r.cuisines might be undefined or empty. We safely read first item or fall back to 'unknown'.
  const cuisineCode = (r.cuisines?.[0] || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '-'); // "Middle Eastern" -> "middle-eastern"

  // CONDITIONAL CHAIN to pick one diet (vegan > vegetarian > gluten-free > dairy-free > none)
  let dietCode = 'none';
  if (r.vegan || r.diets?.includes?.('vegan')) dietCode = 'vegan';
  else if (r.vegetarian || r.diets?.includes?.('vegetarian')) dietCode = 'vegetarian';
  else if (r.glutenFree || r.diets?.includes?.('gluten free')) dietCode = 'gluten-free';
  else if (r.dairyFree || r.diets?.includes?.('dairy free')) dietCode = 'dairy-free';

  // POPULARITY: prefer spoonacularScore (0–100). Else use aggregateLikes, capped to 100.
  // LOGICAL OPERATORS + TYPE CHECK.
  const rawPop = typeof r.spoonacularScore === 'number'
    ? r.spoonacularScore
    : Math.min(100, r.aggregateLikes || 0);

  // RETURN a new OBJECT: this is what we will render.
  return {
    id: r.id,
    title: r.title || 'Untitled recipe',
    cuisine: cuisineCode,
    diet: dietCode,
    timeMin: r.readyInMinutes || 0,
    popularity: rawPop, // number for sorting
    imageUrl: r.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
    // ARRAY MAP (loops under the hood). Take only the "name" fields and cap length (safety).
    ingredients: (r.extendedIngredients || []).map(i => i.name).slice(0, 12),
  };
}

// Pure FUNCTIONS for formatting small pieces of text:
function minutesToLabel(mins) {
  // CONDITIONAL CHAIN: returns a label based on minute ranges
  if (mins < 15) return "Under 15 min";
  if (mins <= 30) return "15–30 min";
  if (mins <= 60) return "30–60 min";
  return "Over 60 min";
}
function prettyLabel(code) {
  // If code is falsy (""), return empty string. || is a LOGICAL OR.
  if (!code) return '';
  // String replace + regex: kebab-case to Title Case
  return code.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function starsFromPopularity(p) {
  // Convert 0–100 popularity into 0–5 stars (OBJECT → STRING)
  const n = Math.max(0, Math.min(5, Math.round(p / 20)));
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return full + empty;
}

/* ===========================================================
   STORAGE (CACHE)
   Purpose: Reduce API usage & quota errors by reusing data.
   Uses localStorage (key/value STRING store) + JSON parse/stringify.
   =========================================================== */

function loadCache() {
  try {
    // Read a JSON string (or null) from localStorage.
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;         // CONDITIONAL: nothing cached
    const obj = JSON.parse(raw);   // Convert STRING → OBJECT

    // Validate shape and TTL (time to live)
    if (!obj || !obj.ts || !Array.isArray(obj.data)) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null; // expired

    return obj.data;               // Return the cached ARRAY of recipes
  } catch {
    // Any JSON parse errors end up here (graceful fallback)
    return null;
  }
}

function saveCache(recipes) {
  try {
    // Save current timestamp + data ARRAY as a STRING
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: recipes }));
  } catch {
    // Could fail due to browser quota; we can safely ignore for this project
  }
}

/* ===========================================================
   FETCH (with graceful fallback)
   Purpose: Get data from the API (PROMISE) using async/await.
   Also demonstrates try/catch error handling.
   =========================================================== */

async function fetchRecipes(count = 12) {
  // Show a loading state in the grid and status (DOM manipulation)
  grid.innerHTML = '<div class="loading">Loading recipes…</div>';
  $('status').textContent = 'Loading recipes…';

  // 1) Try cache first to avoid extra API calls
  const cached = loadCache();
  if (cached) {
    // GLOBAL variable RECIPES gets assigned (GLOBAL SCOPE).
    RECIPES = cached;
    renderGrid('cache'); // FUNCTION call to draw the cards
    return;              // Early return (we’re done)
  }

  // 2) No cache → fetch from API
  try {
    // fetch() returns a PROMISE. We "await" it (async/await).
    const res = await fetch(API_URL(count));

    // Check HTTP status. If not OK (200–299), throw to catch().
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Parse JSON body (also returns a PROMISE)
    const data = await res.json();

    // ARRAY MAP: transform API recipes into our normalized objects
    const normalized = (data.recipes || []).map(normalizeRecipe);

    // If API returns nothing (can happen), throw an error to fall into catch
    if (normalized.length === 0) throw new Error('Empty result');

    // Save globally and cache to localStorage
    RECIPES = normalized;
    saveCache(RECIPES);

    // Draw the UI
    renderGrid('api');
  } catch (err) {
    // 3) Any network error / quota error / parse error ends up here
    console.warn('Fetch failed or quota reached:', err);

    // Show a helpful empty state
    RECIPES = [];
    grid.innerHTML = '<div class="empty">Couldn’t fetch recipes (quota reached or offline). Try again later.</div>';
    $('status').textContent = 'API unavailable — showing no results.';
  }
}

/* ===========================================================
   FILTERING + SORTING
   Purpose: Take the full set of RECIPES and produce a new ARRAY
   that matches the current dropdown values.
   =========================================================== */

// These small FUNCTIONS read the current values from the DOM.
function getSelectedCuisine() { return $('cuisine').value || ""; }
function getSelectedDiet() { return $('diet').value || ""; }
function getSelectedSortTime() { return $('sortTime').value || ""; } // "asc" | "desc" | ""
function getSelectedSortPop() { return $('sortPop').value || ""; }  // "most" | "least" | ""

// FUNCTION filterRecipes: returns a filtered ARRAY (does NOT mutate original).
function filterRecipes(list) {
  const cuisine = getSelectedCuisine();
  const diet = getSelectedDiet();

  // ARRAY filter() loops through and keeps items that return true.
  return list.filter(r => {
    // LOGICAL: if a filter is empty "", we accept everything (true).
    // TERNARY: condition ? valueIfTrue : valueIfFalse
    const passCuisine = cuisine ? r.cuisine === cuisine : true;
    const passDiet = diet ? r.diet === diet : true;
    return passCuisine && passDiet; // BOTH must be true (&&)
  });
}

// FUNCTION sortRecipes: returns a new sorted ARRAY (non-mutating pattern).
function sortRecipes(list) {
  const sTime = getSelectedSortTime();
  const sPop = getSelectedSortPop();

  // Copy array so we don't mutate the original (good practice)
  const arr = [...list];

  // ARRAY sort() with a comparator FUNCTION.
  arr.sort((a, b) => {
    // PRIMARY: popularity if chosen
    if (sPop === 'most' && a.popularity !== b.popularity) return b.popularity - a.popularity;
    if (sPop === 'least' && a.popularity !== b.popularity) return a.popularity - b.popularity;

    // SECONDARY (or primary if no pop sort): time
    if (sTime === 'asc') return a.timeMin - b.timeMin;
    if (sTime === 'desc') return b.timeMin - a.timeMin;

    return 0; // 0 means "leave order as-is"
  });

  return arr;
}

// Compose the two steps: FILTER then SORT
function getVisibleRecipes() {
  return sortRecipes(filterRecipes(RECIPES));
}

/* ===========================================================
   RENDER
   Purpose: Turn the (filtered + sorted) ARRAY into real DOM cards.
   This is where we loop and fill the <template>.
   Also shows Date(), string templates and status updates.
   =========================================================== */

let RECIPES = [];      // GLOBAL array, filled by cache or API
const MAX_ING = 4;     // Limit ingredient list length to keep cards compact

function renderGrid(sourceLabel = 'cache/api') {
  // Clear grid before re-render (DOM write)
  grid.innerHTML = '';

  const items = getVisibleRecipes(); // ARRAY after filter+sort

  // CONDITION: handle empty state
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty">No recipes match your filters.</div>';
    updateStatus(0, sourceLabel);
    return; // stop here
  }

  // Grab the template from HTML once
  const tpl = $('cardTpl');

  // ARRAY forEach = LOOP over each recipe OBJECT and build a card
  items.forEach(r => {
    // Clone the <template> content
    const node = tpl.content.cloneNode(true);

    // Fill dynamic fields (DOM manipulation)
    node.querySelector('.card__img').src = r.imageUrl;
    node.querySelector('.card__img').alt = r.title;
    node.querySelector('.card__title').textContent = r.title;

    // Use pretty labels (and show UI-friendly — if needed)
    node.querySelector('.meta-cuisine').textContent = prettyLabel(r.cuisine);
    node.querySelector('.meta-diet').textContent = prettyLabel(r.diet);
    node.querySelector('.meta-pop').textContent = starsFromPopularity(r.popularity);
    node.querySelector('.meta-time').textContent = minutesToLabel(r.timeMin);

    // Build the ingredient list (ARRAY → multiple <li>)
    const ul = node.querySelector('.ing-list');
    // If the list is longer than MAX_ING, slice + add ellipsis
    const list = r.ingredients.length > MAX_ING
      ? [...r.ingredients.slice(0, MAX_ING), '…']  // SPREAD creates a new ARRAY
      : r.ingredients;

    list.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i;
      ul.appendChild(li);
    });

    // Finally, append to the grid
    grid.appendChild(node);
  });

  // Update screen-reader/live status line
  updateStatus(items.length, sourceLabel);
}

// Show a one-line summary of what is displayed (uses Date())
function updateStatus(count, source) {
  // Pick labels (or dash if empty) using LOGICAL OR
  const c = getSelectedCuisine() ? prettyLabel(getSelectedCuisine()) : 'all';
  const d = getSelectedDiet() ? prettyLabel(getSelectedDiet()) : 'all';
  const st = getSelectedSortTime() || '—';
  const sp = getSelectedSortPop() || '—';

  // Date() object to show a “time of update”
  const when = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Template string assembling everything
  $('status').textContent =
    `Showing ${count} recipe(s). Cuisine: ${c}. Diet: ${d}. Sort(time): ${st}. Sort(pop): ${sp}. Source: ${source}. ${when}`;
}

/* ===========================================================
   EVENTS + INIT
   Purpose: Wire up the dropdowns, then kick off the first render.
   =========================================================== */

// When any dropdown changes, re-render the grid.
// We pass 'cache/api' as sourceLabel to indicate where data came from.
['cuisine', 'diet', 'sortTime', 'sortPop'].forEach(id => {
  $(id).addEventListener('change', () => renderGrid('cache/api'));
});

// Give <select> a "selected" visual state when a non-empty value is chosen
['cuisine', 'diet', 'sortTime', 'sortPop'].forEach(id => {
  const sel = document.getElementById(id);
  if (!sel) return;

  const sync = () => sel.classList.toggle('is-selected', !!sel.value);

  sel.addEventListener('change', sync);
  sel.addEventListener('blur', sync);
  sel.addEventListener('input', sync);
  sync(); // set correct state on page load
});

// Entry point: fetch (from cache or API), then render
// DEMONSTRATES: calling an async FUNCTION (fetchRecipes), which itself
// uses PROMISES under the hood (await fetch, await res.json).
fetchRecipes(16);

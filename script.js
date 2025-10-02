/* ===========================================================
   SPOONACULAR + APP BOOTSTRAP
   Concepts shown here:
   - Constants, template literals, functions
   - Promises & async/await (API calls)
   - localStorage caching (JSON stringify/parse)
   - DOM updates (rendering a template)
   - Conditionals, logical operators, arrays, loops, objects
   - Clearer render source labels ("api" | "cache" | "cache (stale)" | "filters")
   - Stale-cache fallback when fetch fails (keeps UI useful offline/quota)
   - Ingredient list cleaned with .filter(Boolean) to avoid blank bullets
   =========================================================== */


/* -----------------------
   1) API CONFIG
   ----------------------- */
// CONST (STRING): API key used to authenticate against Spoonacular (OK for school projects, unsafe in production)
const API_KEY = '42a3e506a5a6493080872a8509f9c7d5';

// FUNCTION (arrow) + TEMPLATE LITERAL: builds full API URL from a count parameter (default 12)
const API_URL = (n = 12) =>
  `https://api.spoonacular.com/recipes/random?number=${n}&apiKey=${API_KEY}`;

/* -----------------------
   2) CACHE + UI CONSTANTS
   ----------------------- */
// CONST (STRING)  store fetched recipes to avoid hitting the 150/day quota.
// CONST( NUMBER)  TTL (time to live) is how long the cache is valid (here: 6 hours).
// CONST (NUMBER): UI rule to cap ingredient bullets per card
const CACHE_KEY = 'spoon_recipes_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MAX_INGREDIENTS = 4;     // Limit ingredient list length to keep cards compact

/* -----------------------
   3) DOM HELPERS
   ----------------------- */
// FUNCTION: tiny helper to get an element by id
// GLOBAL DOM HANDLE: the grid container where cards will be injected
const $ = (id) => document.getElementById(id);
const grid = $('grid');


/* -- NORMALIZATION HELPERS,
Purpose: The API returns big, messy OBJECTS. We "normalize"
them into the shape our UI expects --*/

// FUNCTION normalizeRecipe takes one API recipe OBJECT `r`
// and RETURNS a new OBJECT in our preferred format.
function normalizeRecipe(r) {
  // CONDITIONAL + OPTIONAL CHAINING:
  // r.cuisines might be undefined or empty. We safely read first item or fall back to 'unknown'.
  const cuisineCode = (r.cuisines?.[0] || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '-'); // "Middle Eastern" -> "middle-eastern"

  // CONDITIONAL CHAIN  pick one diet (vegan > vegetarian > gluten-free > dairy-free > none)
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
    id: r.id,                                                           // number/string
    title: r.title || 'Untitled recipe',                                // string
    cuisine: cuisineCode,                                               // 'italian', 'middle-eastern', ...
    diet: dietCode,                                                     // 'vegan', 'vegetarian', 'none', ...
    timeMin: r.readyInMinutes || 0,                                     // number
    popularity: rawPop,                                                 // number (0–100)
    imageUrl: r.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
    // ARRAY.map → take ingredient names
    // .filter(Boolean) → drop empty/undefined names to avoid blank <li>
    // .slice(0, 12) → safety cap
    ingredients: (r.extendedIngredients || [])
      .map(i => i?.name)
      .filter(Boolean)
      .slice(0, 12),
  };
}


// PURE FORMATTERS: convert raw numbers/codes → friendly labels
// CONDITIONAL CHAIN: returns a label based on minute ranges
function minutesToLabel(mins) {
  if (mins < 15) return "Under 15 min";
  if (mins <= 30) return "15–30 min";
  if (mins <= 60) return "30–60 min";
  return "Over 60 min";
}
function prettyLabel(code) {
  // If code is falsy (""), return empty string. || is a LOGICAL OR.
  if (!code) return '';
  // STRING replace: kebab → spaced; REGEX capitalize first letter of each word
  return code.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function starsFromPopularity(p) {
  // Convert 0–100 popularity into 0–5 stars (OBJECT → STRING)
  const n = Math.max(0, Math.min(5, Math.round(p / 20)));
  const full = "★".repeat(n);
  const empty = "☆".repeat(5 - n);
  return full + empty;
}


/* ===========================================================
   4) CACHE 
   Purpose: Reduce API usage & quota errors by reusing data.
   Uses localStorage (key/value STRING store) + JSON parse/stringify.
   ========================================================= */

function loadCache() {
  try {
    // Read a JSON string (or null) from localStorage.
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;         // CONDITIONAL: nothing cached
    const obj = JSON.parse(raw);   // Convert STRING → OBJECT

    // Validate shape and TTL (time to live)
    if (!obj || !obj.ts || !Array.isArray(obj.data)) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null; // expired

    return obj.data;               // ARRAY of normalized recipes
  } catch {
    return null;                  // safe fallback if parsing fails
  }
}

function saveCache(recipes) {
  try {
    // FUNCTION: Save normalized recipes into cache (with timestamp).
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: recipes }));
  } catch {
    // Could fail due to browser quota; but can safely ignore for this project
  }
}
/* ===========================================================
   5) FETCH
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
   6) FILTERING + SORTING
   Purpose: Take the full set of RECIPES and produce a new ARRAY
   that matches the current dropdown values.
   =========================================================== */

// Getters for current UI selections (empty string = “no filter/sort”
function getSelectedCuisine() { return $('cuisine').value || ""; }
function getSelectedDiet() { return $('diet').value || ""; }
function getSelectedSortTime() { return $('sortTime').value || ""; } // "asc" | "desc" | ""
function getSelectedSortPop() { return $('sortPop').value || ""; }  // "most" | "least" | ""

//  FUNCTION: filter recipes by selected cuisine/diet (does NOT mutate original).
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

// FUNCTION: sort recipes by popularity/time (non-mutating pattern).
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
   7) RENDER
   Purpose: Turn the (filtered + sorted) ARRAY into real DOM cards.
   This is where we loop and fill the <template>.
   Also shows Date(), string templates and status updates.
   =========================================================== */

let RECIPES = [];      // GLOBAL array, filled by cache or API

function renderGrid(sourceLabel = 'cache/api') {
  // Clear grid before re-render (prevents duplicates)
  grid.innerHTML = '';

  const items = getVisibleRecipes();  //Compute visible items (after filters/sorts

  // CONDITION: Empty state for no result
  if (items.length === 0) {
    grid.innerHTML = '<div class="empty">No recipes match your filters.</div>';
    updateStatus(0, sourceLabel);
    return; // stop here
  }

  // Grab the template from HTML once and clone for each recipe
  const tpl = $('cardTpl');

  // ARRAY forEach = LOOP over each recipe OBJECT and build a card
  items.forEach(r => {
    // Clone the <template> content
    const node = tpl.content.cloneNode(true);

    // Fill dynamic fields (DOM manipulation)
    node.querySelector('.card__img').src = r.imageUrl;
    node.querySelector('.card__img').alt = r.title;
    node.querySelector('.card__title').textContent = r.title;

    // Use pretty labels for meta fields
    node.querySelector('.meta-cuisine').textContent = prettyLabel(r.cuisine);
    node.querySelector('.meta-diet').textContent = prettyLabel(r.diet);
    node.querySelector('.meta-pop').textContent = starsFromPopularity(r.popularity);
    node.querySelector('.meta-time').textContent = minutesToLabel(r.timeMin);

    // Build the ingredient list (ARRAY → multiple <li>)
    const ul = node.querySelector('.ing-list');
    // If the list is longer than MAX_INGREDIENTS, slice + add ellipsis
    const list = r.ingredients.length > MAX_INGREDIENTS
      ? [...r.ingredients.slice(0, MAX_INGREDIENTS), '…']  // SPREAD creates a new ARRAY
      : r.ingredients;
    //  ARRAY.forEach: create <li> per ingredient
    list.forEach(i => {
      const li = document.createElement('li');
      li.textContent = i;
      ul.appendChild(li);
    });

    // Now append the filled card to the grid
    // Update screen-reader/live status line
    grid.appendChild(node);
  });
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

// Combine event listeners and visual state setup for dropdowns
['cuisine', 'diet', 'sortTime', 'sortPop'].forEach(id => {
  const sel = $(id);
  if (!sel) return;

  //  Re-render on change with a clear source label "filters
  sel.addEventListener('change', () => renderGrid('cache/api'));

  //  Keep visual "is-selected" class in sync with value presence
  //  Listen to multiple events to keep state accurat
  const sync = () => sel.classList.toggle('is-selected', !!sel.value);
  sel.addEventListener('change', sync);
  sel.addEventListener('blur', sync);
  sel.addEventListener('input', sync);
  sync();  //  Initialize correct visual state on page loa
});

// Entry point: fetch (from cache or API), then render
// DEMONSTRATES: calling an async FUNCTION (fetchRecipes), which itself
// uses PROMISES under the hood (await fetch, await res.json).
fetchRecipes(12);

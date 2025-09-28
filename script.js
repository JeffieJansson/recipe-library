// ===== Helpers to read dropdown selections =====
function getSelectedCuisine() {
  const el = document.getElementById('cuisine');
  return el.value || null;
}

function getSelectedTimeFilter() {
  const el = document.getElementById('timeFilter');
  return el.value || null; // "under-15" | "15-30" | "30-60" | "over-60" | null
}

function getSelectedSort() {
  const el = document.getElementById('sort');
  return el.value || null; // "asc" | "desc" | null
}

function hasAtLeastOneFilter() {
  return !!getSelectedCuisine() || !!getSelectedTimeFilter();
}

// ===== Suggestion logic (conditions) =====
function minutesToLabel(mins) {
  if (mins < 15) return 'Under 15 min';
  if (mins <= 30) return '15–30 min';
  if (mins <= 60) return '30–60 min';
  return 'Over 60 min';
}

// Simple catalog (tiny sample)
const RECIPES = {
  asian: [
    { title: 'Quick Stir-fry Noodles', timeMin: 12, ingredients: ['Noodles', 'Veg mix', 'Soy sauce', 'Sesame'] },
    { title: 'Sesame Ramen Bowl', timeMin: 25, ingredients: ['Ramen', 'Broth', 'Sesame oil', 'Greens'] },
  ],
  italian: [
    { title: 'Margherita Pizza', timeMin: 30, ingredients: ['Dough', 'Tomato sauce', 'Mozzarella', 'Basil'] },
    { title: 'Lasagna', timeMin: 60, ingredients: ['Pasta sheets', 'Ragù', 'Béchamel', 'Cheese'] },
  ],
  mexican: [
    { title: 'Chicken Tacos', timeMin: 20, ingredients: ['Tortillas', 'Chicken', 'Salsa', 'Cilantro'] },
    { title: 'Enchiladas', timeMin: 45, ingredients: ['Tortillas', 'Sauce', 'Cheese', 'Chicken'] },
  ],
  'mediterranean': [
    { title: 'Greek Salad', timeMin: 10, ingredients: ['Tomato', 'Cucumber', 'Feta', 'Olives'] },
    { title: 'Roasted Veg Plate', timeMin: 40, ingredients: ['Zucchini', 'Peppers', 'Eggplant', 'Oil'] },
  ],
  'middle-eastern': [
    { title: 'Falafel', timeMin: 25, ingredients: ['Chickpeas', 'Herbs', 'Garlic', 'Tahini'] },
    { title: 'Hummus & Pita', timeMin: 15, ingredients: ['Chickpeas', 'Tahini', 'Lemon', 'Garlic'] },
  ],
  chinese: [
    { title: 'Mapo Tofu (mild)', timeMin: 25, ingredients: ['Tofu', 'Bean paste', 'Garlic', 'Rice'] },
    { title: 'Egg Fried Rice', timeMin: 15, ingredients: ['Rice', 'Eggs', 'Peas', 'Soy sauce'] },
  ],
  thai: [
    { title: 'Pad Thai (quick)', timeMin: 18, ingredients: ['Rice noodles', 'Tamarind', 'Peanut', 'Egg'] },
    { title: 'Green Curry', timeMin: 35, ingredients: ['Curry paste', 'Coconut milk', 'Veg', 'Basil'] },
  ],
  indian: [
    { title: 'Chana Masala', timeMin: 35, ingredients: ['Chickpeas', 'Tomato', 'Onion', 'Spices'] },
    { title: 'Tadka Dal', timeMin: 30, ingredients: ['Lentils', 'Ghee', 'Chili', 'Cumin'] },
  ],
  japanese: [
    { title: 'Onigiri', timeMin: 20, ingredients: ['Rice', 'Nori', 'Filling'] },
    { title: 'Miso Soup', timeMin: 12, ingredients: ['Dashi', 'Miso', 'Tofu', 'Scallion'] },
  ],
  korean: [
    { title: 'Bibimbap', timeMin: 40, ingredients: ['Rice', 'Veg', 'Egg', 'Gochujang'] },
    { title: 'Kimchi Fried Rice', timeMin: 20, ingredients: ['Kimchi', 'Rice', 'Egg', 'Scallion'] },
  ],
};

function passesTimeFilter(recipe, filter) {
  if (!filter) return true;
  if (filter === 'under-15') return recipe.timeMin < 15;
  if (filter === '15-30') return recipe.timeMin >= 15 && recipe.timeMin <= 30;
  if (filter === '30-60') return recipe.timeMin > 30 && recipe.timeMin <= 60;
  if (filter === 'over-60') return recipe.timeMin > 60;
  return true;
}

function getSuggestion() {
  const cuisine = getSelectedCuisine();
  const timeFilter = getSelectedTimeFilter();
  const sort = getSelectedSort();

  if (!cuisine) {
    return {
      title: 'Temporary placeholder recipe',
      cuisine: '—',
      time: '—',
      ingredients: ['—']
    };
  }

  // 1) pull candidates for the cuisine
  let candidates = RECIPES[cuisine] ? [...RECIPES[cuisine]] : [];

  // 2) filter by time range if selected
  candidates = candidates.filter(r => passesTimeFilter(r, timeFilter));

  // 3) sort if selected
  if (sort === 'asc') candidates.sort((a, b) => a.timeMin - b.timeMin);
  if (sort === 'desc') candidates.sort((a, b) => b.timeMin - a.timeMin);

  // 4) pick the first result or fallback
  const picked = candidates[0] || { title: 'No match for this time range', timeMin: 0, ingredients: [] };
  return {
    title: picked.title,
    cuisine: cuisine.replace('-', ' '),
    time: minutesToLabel(picked.timeMin),
    ingredients: picked.ingredients.length ? picked.ingredients : ['—']
  };
}

// ===== Render =====
function updateCard(recipe) {
  document.getElementById('recipeTitle').textContent = recipe.title;
  document.getElementById('recipeCuisine').textContent = recipe.cuisine;
  document.getElementById('recipeTime').textContent = recipe.time;

  const ul = document.getElementById('recipeIngredients');
  ul.innerHTML = '';
  recipe.ingredients.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

function updateStatus() {
  const s = document.getElementById('status');
  const cuisine = getSelectedCuisine();
  const timeFilter = getSelectedTimeFilter();
  const sort = getSelectedSort();

  if (!cuisine && !timeFilter && !sort) {
    s.textContent = 'Pick at least one filter and one sorting option to get a suggestion.';
    return;
  }
  if (!cuisine && !timeFilter) {
    s.textContent = 'Pick at least one filter (cuisine or time).';
    return;
  }
  if (!sort) {
    s.textContent = 'Pick a sorting method.';
    return;
  }

  const parts = [];
  if (cuisine) parts.push(`cuisine=${cuisine}`);
  if (timeFilter) parts.push(`time=${timeFilter}`);
  if (sort) parts.push(`sort=${sort}`);
  s.textContent = `Selected: ${parts.join(' • ')}`;
}

function updateUI() {
  updateCard(getSuggestion());
  updateStatus();
}

// ===== Events =====
['cuisine', 'timeFilter', 'sort'].forEach(id => {
  document.getElementById(id).addEventListener('change', updateUI);
});

// Initial render
updateUI();

// ===== STATE =====
let selectedCuisine = null;  // "asian" | "italian" | "mexican" | ...
let selectedSort = null;     // "asc" | "desc"

// ===== CUISINE BUTTONS (grön grupp) =====
document.querySelectorAll('[data-cuisine]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Avmarkera alla i denna grupp
    const group = btn.closest('.btns');
    group.querySelectorAll('[data-cuisine]').forEach(b =>
      b.setAttribute('aria-pressed', 'false')
    );

    // Sätt vald knapp
    const wasOn = selectedCuisine === btn.dataset.cuisine;
    selectedCuisine = wasOn ? null : btn.dataset.cuisine;
    btn.setAttribute('aria-pressed', wasOn ? 'false' : 'true');

    updateUI();
  });
});

// ===== SORT BUTTONS (rosa grupp) =====
document.querySelectorAll('[data-sort]').forEach(btn => {
  btn.addEventListener('click', () => {
    // Avmarkera alla i denna grupp
    const group = btn.closest('.btns');
    group.querySelectorAll('[data-sort]').forEach(b =>
      b.setAttribute('aria-pressed', 'false')
    );

    // Sätt vald knapp
    const wasOn = selectedSort === btn.dataset.sort;
    selectedSort = wasOn ? null : btn.dataset.sort;
    btn.setAttribute('aria-pressed', wasOn ? 'false' : 'true');

    updateUI();
  });
});

// ===== GETTERS =====
function getSelectedFilter() { return selectedCuisine; }
function getSelectedSort() { return selectedSort; }

// ===== DATA (recept baserat på cuisine) =====
function getSuggestion(cuisine) {
  if (cuisine === 'asian') return {
    title: 'Quick Stir-fry Noodles', cuisine: 'Asian', time: '12 min',
    ingredients: ['Noodles', 'Veg mix', 'Soy sauce', 'Sesame']
  };
  if (cuisine === 'italian') return {
    title: 'Margherita Pizza', cuisine: 'Italian', time: '30 min',
    ingredients: ['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Basil']
  };
  if (cuisine === 'mexican') return {
    title: 'Chicken Tacos', cuisine: 'Mexican', time: '20 min',
    ingredients: ['Tortillas', 'Chicken', 'Salsa', 'Cilantro']
  };
  if (cuisine === 'mediterranean') return {
    title: 'Greek Salad', cuisine: 'Mediterranean', time: '10 min',
    ingredients: ['Tomato', 'Cucumber', 'Feta', 'Olives']
  };
  if (cuisine === 'middle-eastern') return {
    title: 'Falafel Bowl', cuisine: 'Middle Eastern', time: '25 min',
    ingredients: ['Falafel', 'Hummus', 'Tomato', 'Cucumber', 'Pita']
  };
  // Placeholder
  return { title: 'Temporary placeholder recipe', cuisine: '—', time: '—', ingredients: ['—'] };
}

// ===== UPDATE CARD =====
function updateCard(r) {
  document.getElementById('recipeTitle').textContent = r.title;
  document.getElementById('recipeCuisine').textContent = r.cuisine;
  document.getElementById('recipeTime').textContent = r.time;

  const ul = document.getElementById('recipeIngredients');
  ul.innerHTML = '';
  r.ingredients.forEach(x => {
    const li = document.createElement('li');
    li.textContent = x;
    ul.appendChild(li);
  });
}

// ===== UPDATE STATUS =====
function updateStatus() {
  const s = document.getElementById('status');
  const hasFilter = !!getSelectedFilter();
  const hasSort = !!getSelectedSort();

  if (!hasFilter && !hasSort) {
    s.textContent = 'Pick at least one filter and one sorting option to get a suggestion.';
    return;
  }
  if (!hasFilter) {
    s.textContent = 'Pick at least one filter.';
    return;
  }
  if (!hasSort) {
    s.textContent = 'Pick a sorting method.';
    return;
  }

  s.textContent = `Selected: cuisine=${getSelectedFilter()} • sort=${getSelectedSort()}`;
}

// ===== UPDATE WHOLE UI =====
function updateUI() {
  updateCard(getSuggestion(getSelectedFilter()));
  updateStatus();
}

// ===== INITIAL RENDER =====
updateUI();



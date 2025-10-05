
# Netlify URL: library-recipe.netlify.app

# 📋 Project Brief & Requirements

## Grade G (Pass) Requirements
**Requirements:**
- Your page should fetch real recipe data from Spoonacular's `recipes/random` endpoint
- When the page is loaded, you should dynamically display recipe cards based on the API data
- Users should be able to select at least one filter, and at least one sorting option
- When a filter or sorting option is picked, you should update the DOM with these recipes
- Your code should be split up into different functions that are named after what they do
- The user should be able to click a button that selects a random recipe, and your page should display the selected item
- Your page should have an empty state, e.g. if there are no recipes matching the filter - show a meaningful message to the user
- Your page should show a useful message to the user in case the daily API quota has been reached(only 150 requests per day)
- Your page should be responsive and look good on devices from 320px width up to at least 1600px
- Deal with missing or inconsistent data (e.g., how dietary properties are structured).

**Course Participation Requirements**
- Active participation in mob/pair programming workshops
- Regular attendance at weekly demos and retrospectives
- Completion of (at least) one peer code review

## Grade VG (Pass with Distinction) Requirements
All Grade G requirements **plus** the implementation of a **minimum of 4 stretch goals**:

### Stretch Goal Options
For VG, implement 1–3 and pick the 4th: **A, B, C or D**.

1. Make your filters and sorting options work together so that the user, for example, can filter on vegetarian & popular recipes or Italian vegan recipes  
2. Implement local storage caching to reduce API requests  
3. Show a loading state while fetching data  
4. Pick one of these:
   - **A.** Implement a feature so that the user will be able to see the instructions/steps, for example when clicking a button.  
   - **B.** Allow users to search for specific recipe names or ingredients  
   - **C.** Allow users to save/like recipes and store them in local storage. This includes adding a heart button to the recipe card and adding a "View favourites" button that only shows favourite recipes.  
   - **D.** Implement pagination for large results or infinite scrolling (e.g. fetching more recipes when the user has reached the bottom)

---

# 🍳 Recipe Library — Spoonacular API Project

This project is part of the **Frontend JavaScript course** and demonstrates how to build a dynamic recipe library that fetches real data from the [Spoonacular API](https://spoonacular.com/food-api).  
It includes API integration, local storage caching, filtering, sorting, search, and responsive design.

## 🧠 Project Overview
The goal of the project is to replace static mock data with **real recipe data** fetched from the Spoonacular API and render it dynamically on the page.  
Users can filter and sort recipes, search by name or ingredients, and display a random recipe.  

The project fulfills all **G** (Pass) requirements and several **VG** (Pass with Distinction) stretch goals.



## ⚙️ How It Works

### 1) API & Data Fetching
The app uses the **Spoonacular API** to fetch real recipes:
```js
const API_KEY = 'YOUR_API_KEY';
const API_URL = (n = 12) => 
  `https://api.spoonacular.com/recipes/random?number=${n}&apiKey=${API_KEY}`;
```
Recipes are fetched asynchronously using `fetch()` and `async/await`.  
If the quota is reached or offline, cached data is used as a fallback.

### 2) Caching
Fetched recipes are stored in `localStorage` for 6 hours to avoid exceeding the API limit:
```js
localStorage.setItem("spoon_recipes_cache_v1", JSON.stringify({ ts: Date.now(), data: recipes }));
```
When the app loads, it first checks if valid cache data exists before making a new API request.

### 3) Normalization
The incoming API data is **normalized** into a smaller, predictable object that the UI can safely render.  
This reduces bugs and makes filtering/sorting simpler.

### 4) Filtering & Sorting
Users can filter by **cuisine**, **diet**, apply a **search query**, and sort by **popularity** or **time**.  
Filtering and sorting functions are combined so that multiple options can be active together.

### 5) Rendering
Recipes are displayed dynamically by cloning a hidden `<template>` in the HTML and filling in data such as:
- Image
- Title
- Cuisine & diet
- Cooking time
- Ingredients

An **empty state** appears if no recipes match the selected filters.

### 6) Accessibility
- `aria-live="polite"` is used to update status messages.
- `aria-busy="true"` is used while recipes are loading.

## 🧩 File Structure
```
📁 project-folder
│
├── README.md       # Project documentation (this file)
├── index.html      # Structure of the page (filters, grid, template)
├── script.js       # JavaScript logic: API, cache, filtering, rendering
└── style.css       # All styling (responsive grid, dropdowns, cards)
```



## 👩‍💻 Author
**Jennifer Jansson**  
Frontend Developer Student  
Project completed as part of the **JavaScript Frontend course**.

---

© 2025 – Recipe Library Project


## 🎓 How This Project Meets the G & VG Requirements

Below is a detailed mapping of how each requirement has been implemented in the code.

---

### 🟩 Grade G (Pass) Requirements

| Requirement | How it’s implemented | Code reference |
|--------------|---------------------|----------------|
| **Fetch real recipe data** | The app uses the Spoonacular `recipes/random` endpoint to retrieve live recipe data. | `fetchRecipes()` → `API_URL()` |
| **Display recipe cards dynamically** | Recipes are rendered dynamically by cloning a `<template>` and inserting API data. | `renderGrid()` |
| **Filters and sorting options** | Dropdowns for cuisine, diet, popularity, and time trigger a re-render of the filtered and sorted results. | `filterRecipes()`, `sortRecipes()`, `getVisibleRecipes()` |
| **Filter/sort updates DOM** | Event listeners call `renderGrid('filters')` whenever a dropdown value changes. | Event section in `script.js` |
| **Functions split logically and clearly named** | The code is divided into reusable functions (e.g., `normalizeRecipe`, `fetchRecipes`, `saveCache`, `renderGrid`). | Throughout `script.js` |
| **Random recipe button** | Selects a random recipe and renders it alone in the grid. | `showRandomRecipe()` |
| **Empty state message** | If no recipes match filters, a friendly message appears instead of blank space. | `renderGrid()` |
| **Daily quota message** | Detects status codes `402` and `429` and informs the user if the API quota is reached. | Inside `fetchRecipes()` |
| **Responsive design (320px–1600px)** | Uses CSS Grid with `auto-fill`, `minmax()`, and media queries for flexible layouts. | `style.css` |
| **Code readability** | Consistent structure, comments, and clear naming conventions are used throughout. | Entire project |

---

### 💎 Grade VG (Pass with Distinction) Requirements

| VG Stretch Goal | Description | Code reference |
|------------------|-------------|----------------|
| **1. Combined filters & sorting** | Users can filter (e.g., vegan + Italian) while sorting by time or popularity simultaneously. | `getVisibleRecipes()` combines `filterRecipes()` + `sortRecipes()` |
| **2. Local storage caching** | Recipes are stored with a timestamp to reduce API requests and reuse cached data. | `loadCache()` and `saveCache()` |
| **3. Loading state while fetching** | Shows a “Loading recipes…” message and sets `aria-busy="true"` while waiting for data. | `fetchRecipes()` |
| **4. Search feature** | The user can search recipes by name or ingredient keywords. | `getQuery()` and its use inside `filterRecipes()` |
| **Accessibility improvements** | Uses `aria-live` and `aria-busy` to improve screen reader experience. | `fetchRecipes()`, `updateStatus()` |
| **Optional stretch** | The project could easily be extended with instructions, favourites, or infinite scrolling. | Planned features in README |

---

✅ **Summary:**
- **All G requirements** are fully implemented and verified in code.  
- **At least four VG stretch goals** are clearly achieved (1–4).  
- Code is modular, readable, and includes user-friendly error handling and accessibility enhancements.  


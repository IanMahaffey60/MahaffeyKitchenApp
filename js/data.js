/* Starter knowledge (ingredient catalog) and the sample household used for the first run. */
(function () {
  'use strict';
  const K = window.K;

  // name, category, where it lives, days it keeps, usual pack (qty, unit), usual price per pack, grams per cup (optional), staple
  const C = [
    ['chicken thigh', 'Meat & fish', 'fridge', 3, 1.5, 'lb', 6.5],
    ['ground beef', 'Meat & fish', 'fridge', 3, 1, 'lb', 5.5],
    ['pork shoulder', 'Meat & fish', 'fridge', 4, 3, 'lb', 10.5],
    ['salmon', 'Meat & fish', 'fridge', 2, 1, 'lb', 10.99],
    ['ribeye steak', 'Meat & fish', 'fridge', 3, 1.5, 'lb', 19.5],
    ['tofu', 'Produce', 'fridge', 10, 14, 'oz', 2.29],
    ['egg', 'Dairy & eggs', 'fridge', 21, 12, '', 3.79],
    ['milk', 'Dairy & eggs', 'fridge', 7, 1, 'gal', 3.59],
    ['butter', 'Dairy & eggs', 'fridge', 45, 16, 'oz', 4.49],
    ['cheddar', 'Dairy & eggs', 'fridge', 21, 8, 'oz', 3.29],
    ['parmesan', 'Dairy & eggs', 'fridge', 30, 6, 'oz', 4.99],
    ['mozzarella', 'Dairy & eggs', 'fridge', 14, 8, 'oz', 3.19],
    ['greek yogurt', 'Dairy & eggs', 'fridge', 14, 32, 'oz', 4.99, 245],
    ['tortilla', 'Bakery', 'pantry', 10, 10, '', 2.49],
    ['bread', 'Bakery', 'pantry', 6, 1, '', 3.49],
    ['rice', 'Pantry', 'pantry', 365, 32, 'oz', 2.99, 185, true],
    ['pasta', 'Pantry', 'pantry', 365, 16, 'oz', 1.49],
    ['black bean', 'Pantry', 'pantry', 365, 1, 'can', 1.09],
    ['diced tomato', 'Pantry', 'pantry', 365, 1, 'can', 1.29],
    ['chipotle in adobo', 'Pantry', 'pantry', 365, 1, 'can', 2.19],
    ['coconut milk', 'Pantry', 'pantry', 365, 1, 'can', 1.79],
    ['green curry paste', 'Pantry', 'pantry', 180, 4, 'oz', 3.49],
    ['marinara', 'Pantry', 'pantry', 365, 24, 'oz', 3.49, 250],
    ['chicken broth', 'Pantry', 'pantry', 365, 32, 'floz', 2.49],
    ['soy sauce', 'Pantry', 'pantry', 365, 15, 'floz', 2.49, null, true],
    ['olive oil', 'Pantry', 'pantry', 365, 500, 'ml', 6.99, null, true],
    ['onion', 'Produce', 'pantry', 21, 3, '', 2.99],
    ['garlic', 'Produce', 'pantry', 30, 10, 'clove', 0.79],
    ['ginger', 'Produce', 'fridge', 21, 4, 'oz', 1.29],
    ['bell pepper', 'Produce', 'fridge', 7, 1, '', 1.19],
    ['spinach', 'Produce', 'fridge', 5, 5, 'oz', 2.99],
    ['romaine', 'Produce', 'fridge', 7, 1, 'head', 2.49],
    ['tomato', 'Produce', 'pantry', 6, 4, '', 2.99],
    ['avocado', 'Produce', 'pantry', 4, 4, '', 3.99],
    ['lime', 'Produce', 'fridge', 14, 1, '', 0.39],
    ['cilantro', 'Produce', 'fridge', 6, 1, 'bunch', 0.99],
    ['green onion', 'Produce', 'fridge', 7, 1, 'bunch', 0.99],
    ['broccoli', 'Produce', 'fridge', 6, 1, 'lb', 2.49],
    ['carrot', 'Produce', 'fridge', 21, 2, 'lb', 1.79],
    ['potato', 'Produce', 'pantry', 30, 5, 'lb', 4.49],
    ['frozen pea', 'Frozen', 'freezer', 180, 16, 'oz', 1.49, 145],
    ['salt', 'Pantry', 'pantry', 3650, 26, 'oz', 1.29, null, true],
    ['black pepper', 'Pantry', 'pantry', 3650, 2, 'oz', 2.99, null, true],
    ['coffee', 'Pantry', 'pantry', 60, 12, 'oz', 7.99],
    ['tortilla chip', 'Snacks', 'pantry', 30, 1, 'bag', 2.99],
    ['soda', 'Drinks', 'pantry', 180, 12, 'can', 6.49],
    ['paper plate', 'Household', 'pantry', 3650, 1, 'pkg', 4.99],
    // added for the family recipe binder
    ['chicken breast', 'Meat & fish', 'fridge', 3, 2, 'lb', 8.99],
    ['chicken', 'Meat & fish', 'fridge', 3, 4.5, 'lb', 7.5],
    ['pork chop', 'Meat & fish', 'fridge', 3, 2, 'lb', 7.99],
    ['flank steak', 'Meat & fish', 'fridge', 3, 1.5, 'lb', 14.99],
    ['chuck roast', 'Meat & fish', 'fridge', 4, 3, 'lb', 21.99],
    ['italian sausage', 'Meat & fish', 'fridge', 3, 1, 'lb', 4.99],
    ['bacon', 'Meat & fish', 'fridge', 14, 12, 'oz', 5.99],
    ['ham', 'Meat & fish', 'fridge', 5, 8, 'oz', 4.49],
    ['cod', 'Meat & fish', 'fridge', 2, 1, 'lb', 9.99],
    ['sour cream', 'Dairy & eggs', 'fridge', 14, 16, 'oz', 2.49, 230],
    ['heavy cream', 'Dairy & eggs', 'fridge', 14, 16, 'floz', 3.99],
    ['half and half', 'Dairy & eggs', 'fridge', 10, 16, 'floz', 2.49],
    ['cream cheese', 'Dairy & eggs', 'fridge', 21, 8, 'oz', 2.49],
    ['cottage cheese', 'Dairy & eggs', 'fridge', 10, 16, 'oz', 3.29, 225],
    ['jack cheese', 'Dairy & eggs', 'fridge', 21, 8, 'oz', 3.29, 113],
    ['swiss cheese', 'Dairy & eggs', 'fridge', 21, 8, 'oz', 3.79],
    ['cabbage', 'Produce', 'fridge', 14, 1, 'head', 2.29],
    ['celery', 'Produce', 'fridge', 14, 1, 'bunch', 1.99],
    ['mushroom', 'Produce', 'fridge', 6, 8, 'oz', 2.49],
    ['kale', 'Produce', 'fridge', 6, 1, 'bunch', 1.99],
    ['lemon', 'Produce', 'fridge', 21, 1, '', 0.69],
    ['parsley', 'Produce', 'fridge', 6, 1, 'bunch', 0.99],
    ['tomatillo', 'Produce', 'fridge', 10, 1, 'lb', 1.99],
    ['sweet potato', 'Produce', 'pantry', 21, 1, 'lb', 1.49],
    ['flour', 'Pantry', 'pantry', 365, 5, 'lb', 3.49, 125, true],
    ['sugar', 'Pantry', 'pantry', 730, 4, 'lb', 3.29, 200, true],
    ['brown sugar', 'Pantry', 'pantry', 730, 2, 'lb', 2.49, 213, true],
    ['cornstarch', 'Pantry', 'pantry', 730, 16, 'oz', 1.99, null, true],
    ['vegetable oil', 'Pantry', 'pantry', 365, 48, 'floz', 4.49, null, true],
    ['oil', 'Pantry', 'pantry', 365, 48, 'floz', 4.49, null, true],
    ['vinegar', 'Pantry', 'pantry', 730, 16, 'floz', 1.99, null, true],
    ['honey', 'Pantry', 'pantry', 730, 12, 'oz', 4.99, null, true],
    ['lemon juice', 'Pantry', 'pantry', 180, 15, 'floz', 2.99],
    ['dijon mustard', 'Pantry', 'pantry', 365, 12, 'oz', 2.99],
    ['mustard', 'Pantry', 'pantry', 365, 14, 'oz', 1.99, null, true],
    ['mayo', 'Pantry', 'pantry', 90, 30, 'floz', 4.99],
    ['ketchup', 'Pantry', 'pantry', 180, 20, 'oz', 2.49, null, true],
    ['worcestershire sauce', 'Pantry', 'pantry', 730, 10, 'floz', 2.79, null, true],
    ['bbq sauce', 'Pantry', 'pantry', 365, 18, 'oz', 2.49],
    ['enchilada sauce', 'Pantry', 'pantry', 365, 1, 'can', 2.29],
    ['cream of chicken soup', 'Pantry', 'pantry', 365, 1, 'can', 1.49],
    ['cream of mushroom soup', 'Pantry', 'pantry', 365, 1, 'can', 1.49],
    ['egg noodle', 'Pantry', 'pantry', 365, 12, 'oz', 2.29],
    ['lasagna', 'Pantry', 'pantry', 365, 9, 'oz', 2.99],
    ['taco seasoning', 'Pantry', 'pantry', 365, 1, 'pkg', 0.99],
    ['onion soup mix', 'Pantry', 'pantry', 365, 2, 'pkg', 2.49],
    ['bisquick', 'Pantry', 'pantry', 365, 40, 'oz', 4.99],
    ['breadcrumb', 'Pantry', 'pantry', 180, 15, 'oz', 2.49],
    ['corn tortilla', 'Bakery', 'fridge', 14, 30, '', 2.99],
    ['pie crust', 'Bakery', 'fridge', 21, 2, '', 3.49],
    ['chili powder', 'Pantry', 'pantry', 730, 2, 'oz', 2.49, null, true],
    ['paprika', 'Pantry', 'pantry', 730, 2, 'oz', 2.49, null, true],
    ['cumin', 'Pantry', 'pantry', 730, 2, 'oz', 2.99, null, true],
    ['cayenne', 'Pantry', 'pantry', 730, 1.5, 'oz', 2.49, null, true],
    ['curry powder', 'Pantry', 'pantry', 730, 2, 'oz', 3.49, null, true],
    ['thyme', 'Pantry', 'pantry', 730, 0.75, 'oz', 2.49, null, true],
    ['red pepper flake', 'Pantry', 'pantry', 730, 1.5, 'oz', 2.49, null, true],
    ['pepper', 'Pantry', 'pantry', 3650, 2, 'oz', 2.99, null, true],
    ['water', 'Other', 'pantry', 3650, 1, 'gal', 0, null, true],
    ['beer', 'Drinks', 'fridge', 180, 6, 'can', 9.99],
    ['green pepper', 'Produce', 'fridge', 7, 1, '', 0.99],
    ['steak', 'Meat & fish', 'fridge', 3, 1, 'lb', 10.99],
    ['beef fillet', 'Meat & fish', 'fridge', 3, 1, 'lb', 24.99],
    ['tomato sauce', 'Pantry', 'pantry', 365, 1, 'can', 1.19],
    ['cream of celery soup', 'Pantry', 'pantry', 365, 1, 'can', 1.49],
    ['chicken with rice soup', 'Pantry', 'pantry', 365, 1, 'can', 1.49],
    ['chicken nugget', 'Frozen', 'freezer', 180, 29, 'oz', 7.99],
    // added for the first Trader Joe's receipt
    ['maple syrup', 'Pantry', 'pantry', 365, 32, 'floz', 15.99],
    ['vanilla extract', 'Pantry', 'pantry', 3650, 4, 'floz', 9.99, null, true],
    ['powdered sugar', 'Pantry', 'pantry', 730, 1, 'lb', 3.79, 120, true],
    ['pumpkin puree', 'Pantry', 'pantry', 365, 1, 'can', 2.79],
    ['great northern bean', 'Pantry', 'pantry', 365, 1, 'can', 1.19],
    ['instant ramen', 'Pantry', 'pantry', 365, 1, '', 1.89],
    ['fresh thyme', 'Produce', 'fridge', 10, 1, 'oz', 1.99],
    ['fennel', 'Produce', 'fridge', 7, 1, '', 3.49],
    ['blueberry', 'Produce', 'fridge', 7, 11, 'oz', 6.99],
    ['banana', 'Produce', 'pantry', 5, 1, '', 0.23],
    ['apple', 'Produce', 'fridge', 30, 1, '', 0.69],
    ['ice cream', 'Frozen', 'freezer', 60, 1, 'qt', 4.99],
    ['chocolate', 'Snacks', 'pantry', 180, 17.6, 'oz', 7.99],
    ['peanut snack', 'Snacks', 'pantry', 120, 1, '', 1.99],
    ['wine', 'Drinks', 'pantry', 730, 750, 'ml', 6.99],
    ['greeting card', 'Household', 'pantry', 3650, 1, '', 0.99],
    // added with the Walmart price baseline
    ['chicken drumstick', 'Meat & fish', 'fridge', 3, 1, 'lb', 1.98],
    ['chicken wing', 'Meat & fish', 'fridge', 3, 1, 'lb', 2.95],
    ['ground chicken', 'Meat & fish', 'fridge', 2, 1, 'lb', 3.92],
    ['pork tenderloin', 'Meat & fish', 'fridge', 4, 1, 'lb', 3.57],
    ['ground pork', 'Meat & fish', 'fridge', 2, 1.5, 'lb', 6.92],
    ['tilapia', 'Meat & fish', 'freezer', 180, 1, 'lb', 6.28],
    ['cauliflower', 'Produce', 'fridge', 7, 1, 'head', 3.16],
    ['zucchini', 'Produce', 'fridge', 6, 1, '', 0.68],
    ['bok choy', 'Produce', 'fridge', 5, 1, 'bunch', 3.07],
    ['strawberry', 'Produce', 'fridge', 5, 1, 'lb', 2.67],
    ['pinto bean', 'Pantry', 'pantry', 365, 1, 'can', 0.92],
    ['kidney bean', 'Pantry', 'pantry', 365, 1, 'can', 0.92],
    ['chickpea', 'Pantry', 'pantry', 365, 1, 'can', 0.92],
    ['lentil', 'Pantry', 'pantry', 365, 1, 'lb', 1.92, 192],
    ['crushed tomato', 'Pantry', 'pantry', 365, 28, 'oz', 1.57],
    ['tomato paste', 'Pantry', 'pantry', 365, 6, 'oz', 0.92],
    ['beef broth', 'Pantry', 'pantry', 365, 32, 'floz', 1.5],
    ['vegetable broth', 'Pantry', 'pantry', 365, 32, 'floz', 1.5],
    ['garlic powder', 'Pantry', 'pantry', 730, 3.4, 'oz', 1.08, null, true],
    ['onion powder', 'Pantry', 'pantry', 730, 3.25, 'oz', 1.08, null, true],
    ['cinnamon', 'Pantry', 'pantry', 730, 2.5, 'oz', 1.27, null, true],
    ['frozen broccoli', 'Frozen', 'freezer', 240, 16, 'oz', 0.94, 90],
    ['frozen green bean', 'Frozen', 'freezer', 240, 16, 'oz', 0.98, 110],
    ['frozen corn', 'Frozen', 'freezer', 240, 16, 'oz', 0.98, 150],
  ];
  // How to bridge units: density = grams per cup, each = grams in one counted unit ('' means one whole item).
  const BRIDGE = {
    butter: { density: 227 }, cheddar: { density: 113 }, mozzarella: { density: 113 }, parmesan: { density: 100 }, 'swiss cheese': { density: 113 },
    'jack cheese': { density: 113 }, 'cream cheese': { density: 232 }, ham: { density: 140 }, honey: { density: 340 }, 'dijon mustard': { density: 250 },
    mushroom: { density: 70 }, spinach: { density: 30 }, kale: { density: 25, each: { '': 200, bunch: 200 } }, cabbage: { density: 70, each: { '': 900, head: 900 } },
    cilantro: { density: 16, each: { bunch: 60 } }, parsley: { density: 60, each: { bunch: 60 } }, 'green onion': { density: 50, each: { bunch: 100 } },
    celery: { density: 100, each: { bunch: 450, stalk: 40, '': 40 } }, onion: { density: 160, each: { '': 150 } }, garlic: { density: 136, each: { clove: 5, '': 50, head: 50 } },
    ginger: { density: 96, each: { '': 30 } }, potato: { each: { '': 213 } }, 'sweet potato': { each: { '': 200 } }, carrot: { density: 128, each: { '': 61 } },
    'bell pepper': { density: 150, each: { '': 150 } }, 'green pepper': { density: 150, each: { '': 150 } }, tomato: { density: 180, each: { '': 120, can: 400 } },
    lime: { density: 240, each: { '': 30 } }, lemon: { density: 240, each: { '': 45 } }, avocado: { each: { '': 150 } },
    'chicken breast': { each: { '': 227 } }, 'chicken thigh': { each: { '': 113 } }, 'pork chop': { each: { '': 170 } }, 'flank steak': { each: { '': 680 } },
    steak: { each: { '': 340 } }, 'beef fillet': { each: { '': 227 } }, 'ribeye steak': { each: { '': 340 } }, salmon: { each: { '': 170 } },
    bacon: { each: { slice: 28, '': 28 } }, 'italian sausage': { each: { '': 113 } }, chicken: { each: { '': 2000 } },
    'chicken broth': { density: 240, each: { can: 411 } }, 'coconut milk': { density: 240, each: { can: 400 } }, marinara: { each: { jar: 680 } },
    'tomato sauce': { density: 245, each: { can: 425 } }, 'diced tomato': { density: 245, each: { can: 411 } }, 'black bean': { density: 170, each: { can: 250 } },
    'egg noodle': { density: 40, each: { '': 340, pkg: 340, bag: 340 } }, lasagna: { each: { '': 255, box: 255 } }, pasta: { density: 100, each: { box: 454, '': 454 } },
    'cottage cheese': { each: { '': 454 } }, 'sour cream': { each: { '': 227 } }, bread: { density: 45, each: { slice: 40, '': 680 } },
    'tortilla chip': { density: 30, each: { bag: 283 } }, bisquick: { density: 120 }, breadcrumb: { density: 108 },
    beer: { density: 240, each: { can: 355, bottle: 355 } }, mayo: { density: 220 }, 'lemon juice': { density: 240 }, 'heavy cream': { density: 240 },
    'half and half': { density: 240 }, milk: { density: 245 }, 'bbq sauce': { density: 290 }, 'enchilada sauce': { density: 245, each: { can: 283 } },
    'corn tortilla': { each: { pkg: 30, bag: 30 } }, tortilla: { each: { pkg: 10 } }, 'chicken nugget': { each: { bag: 822, '': 822 } },
    'fresh thyme': { density: 40 }, 'instant ramen': { each: { pkg: 1, '': 1 } }, 'pumpkin puree': { density: 245, each: { can: 425 } }, 'great northern bean': { density: 170, each: { can: 250 } },
    'bok choy': { density: 70, each: { bunch: 300, '': 40 } }, cauliflower: { density: 100, each: { head: 600, '': 600 } }, zucchini: { density: 125, each: { '': 200 } },
    strawberry: { density: 150 }, 'pinto bean': { density: 170, each: { can: 250 } }, 'kidney bean': { density: 170, each: { can: 250 } }, chickpea: { density: 165, each: { can: 250 } },
    'crushed tomato': { density: 245, each: { can: 794 } }, 'tomato paste': { density: 260, each: { can: 170 } },
    'beef broth': { density: 240, each: { can: 411 } }, 'vegetable broth': { density: 240, each: { can: 411 } }, tilapia: { each: { '': 113 } },
    'chicken drumstick': { each: { '': 110 } }, 'pork tenderloin': { each: { '': 500 } },
    'taco seasoning': { each: { '': 28, pkg: 28 } }, 'onion soup mix': { each: { '': 1, pkg: 1 } }, 'frozen pea': { density: 145 },
  };
  K.defaultCatalog = () => {
    const out = {};
    for (const [name, cat, loc, shelf, packQty, packUnit, price, density, staple] of C) {
      out[name] = { name, cat, loc, shelf, packQty, packUnit, price, density: density || null, staple: !!staple, ...(BRIDGE[name] || {}) };
    }
    return out;
  };
  K.CATEGORIES = ['Produce', 'Meat & fish', 'Dairy & eggs', 'Bakery', 'Pantry', 'Frozen', 'Snacks', 'Drinks', 'Household', 'Other'];
  K.CUISINES = ['Mexican', 'Chinese', 'Italian', 'American', 'Indian', 'Japanese', 'Thai', 'German', 'Other'];
  K.DEFAULT_STORES = ["Trader Joe's", "Raley's", 'Walmart', 'WinCo', 'Other'];

  const R = (name, cuisine, servings, time, tags, ingredients, steps, source) => ({
    id: K.uid(), name, cuisine, servings, time, tags, source: source || '', notes: '',
    ingredients: ingredients.map(K.parseIngredient), steps, rating: 0, yields: [], cooked: [], created: K.today(), sample: true,
  });
  const sampleRecipes = () => [
    R('Chicken tinga tacos', 'Mexican', 4, 35, [], ['1.5 lb chicken thighs', '1 onion, sliced', '3 cloves garlic', '1 can diced tomatoes', '1/4 can chipotle in adobo', '8 tortillas', '1 avocado', '1/2 bunch cilantro', '1 lime'],
      ['Simmer the chicken thighs in salted water for 20 minutes, then shred.', 'Cook the onion in a little oil for 5 minutes, add garlic for 1 minute.', 'Blend the tomatoes with the chipotles and add to the pan with the chicken. Simmer 10 minutes.', 'Warm the tortillas and serve with avocado, cilantro and lime.'], 'https://www.example.com/chicken-tinga'),
    R('Black bean quesadillas', 'Mexican', 3, 20, [], ['6 tortillas', '1 can black beans, drained', '6 oz cheddar, shredded', '1 bell pepper, diced', '1/2 onion, diced'],
      ['Cook the pepper and onion for 5 minutes.', 'Mash half the beans and stir in the rest with the vegetables.', 'Fill tortillas with beans and cheese and cook 3 minutes per side.']),
    R('Chicken fried rice', 'Chinese', 4, 25, [], ['2 cups rice, cooked and cold', '1 lb chicken thighs, diced', '3 eggs', '1 cup frozen peas', '1/4 lb carrots, diced', '1/2 bunch green onions', '3 tbsp soy sauce', '1 tbsp olive oil'],
      ['Cook the chicken in oil for 6 minutes and set aside.', 'Scramble the eggs and set aside.', 'Fry the carrots and peas for 3 minutes, add the rice and fry 5 minutes.', 'Return chicken and eggs, add soy sauce and green onions.']),
    R('Spaghetti with meat sauce', 'Italian', 4, 30, [], ['1 lb pasta', '1 lb ground beef', '24 oz marinara', '1/2 onion, diced', '2 cloves garlic', '2 oz parmesan'],
      ['Brown the beef with the onion for 8 minutes, add garlic.', 'Add marinara and simmer 15 minutes.', 'Cook the pasta, toss with sauce and top with parmesan.']),
    R('Thai green curry', 'Thai', 4, 35, [], ['1 can coconut milk', '1 oz green curry paste', '1 lb chicken thighs, sliced', '1 bell pepper, sliced', '1.5 cups rice', '1 lime'],
      ['Start the rice.', 'Fry the curry paste in a splash of coconut milk for 2 minutes.', 'Add the chicken and cook 5 minutes, then the rest of the coconut milk and pepper. Simmer 10 minutes.', 'Finish with lime juice and serve over rice.']),
    R('Sheet pan salmon and broccoli', 'American', 3, 25, [], ['1 lb salmon', '1 lb broccoli', '1 lb potatoes, cubed', '2 tbsp olive oil', '1 lime'],
      ['Heat the oven to 425°F. Roast the potatoes with oil for 10 minutes.', 'Add broccoli and salmon and roast 12 minutes.', 'Squeeze lime over everything.']),
    R('Slow cooker carnitas', 'Mexican', 6, 240, [], ['3 lb pork shoulder', '1 onion', '4 cloves garlic', '1 lime', '10 tortillas', '1 bunch cilantro'],
      ['Season the pork and put it in the slow cooker with onion, garlic and lime juice. Cook 4 hours on high.', 'Shred the pork and crisp it under the broiler for 5 minutes.', 'Serve in warm tortillas with cilantro.']),
    R('Ribeye with garlic butter', 'American', 3, 30, ['celebration'], ['1.5 lb ribeye steak', '2 oz butter', '3 cloves garlic', '1.5 lb potatoes', '5 oz spinach'],
      ['Boil the potatoes for 15 minutes, then smash and crisp them.', 'Sear the steaks 4 minutes per side, baste with butter and garlic. Rest 5 minutes.', 'Wilt the spinach in the pan for 1 minute.']),
    R('Mapo tofu', 'Chinese', 3, 25, [], ['14 oz tofu, cubed', '1/2 lb ground beef', '2 tbsp soy sauce', '1 oz ginger, minced', '3 cloves garlic', '1/2 bunch green onions', '1.5 cups rice'],
      ['Start the rice.', 'Brown the beef with ginger and garlic for 5 minutes.', 'Add soy sauce, a cup of water and the tofu. Simmer 8 minutes.', 'Top with green onions.']),
    R('Butter chicken', 'Indian', 4, 40, [], ['1.5 lb chicken thighs', '1 can diced tomatoes', '2 oz butter', '1 cup greek yogurt', '1 oz ginger', '4 cloves garlic', '1.5 cups rice'],
      ['Start the rice.', 'Brown the chicken in butter for 6 minutes.', 'Add ginger, garlic and tomatoes and simmer 15 minutes.', 'Stir in the yogurt off the heat.']),
  ];

  // Seeded random so the sample looks the same on every device.
  const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  K.makeSample = () => {
    const rand = rng(42);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const today = K.today();
    const catalog = K.defaultCatalog();
    const recipes = sampleRecipes();
    const byName = Object.fromEntries(recipes.map((r) => [r.name, r]));
    const STORE_MULT = { "Trader Joe's": 1.0, "Raley's": 1.16, Walmart: 0.94, WinCo: 0.86 };
    const stores = Object.keys(STORE_MULT);
    const prices = [], receipts = [], log = [], waste = [];
    const regular = ['chicken thigh', 'egg', 'milk', 'tortilla', 'onion', 'garlic', 'spinach', 'cilantro', 'lime', 'rice', 'cheddar', 'bell pepper', 'avocado', 'black bean', 'diced tomato', 'broccoli', 'ground beef', 'pasta', 'coffee', 'bread', 'potato', 'greek yogurt', 'salmon', 'coconut milk', 'tofu', 'green onion', 'butter'];

    // 26 weeks of grocery receipts
    for (let w = 26; w >= 1; w--) {
      const trips = rand() < 0.35 ? 2 : 1;
      for (let t = 0; t < trips; t++) {
        const date = K.addDays(today, -w * 7 + Math.floor(rand() * 6));
        const store = rand() < 0.45 ? "Trader Joe's" : pick(stores);
        const infl = 1 + (26 - w) * 0.0025;
        const lines = [];
        const n = 7 + Math.floor(rand() * 7);
        const used = new Set();
        for (let i = 0; i < n; i++) {
          const key = pick(regular);
          if (used.has(key)) continue;
          used.add(key);
          const c = catalog[key];
          const price = K.round(c.price * STORE_MULT[store] * infl * (0.95 + rand() * 0.1));
          lines.push({ code: key.toUpperCase(), name: key, key, price, forUs: true, cat: c.cat });
          prices.push({ date, store, key, qty: c.packQty, unit: c.packUnit, price });
        }
        receipts.push({ id: K.uid(), date, store, event: false, lines, total: K.round(K.sum(lines, (l) => l.price)) });
      }
    }
    // one birthday party run that should not count toward meals
    const partyDate = K.addDays(today, -58);
    const party = ['tortilla chip', 'soda', 'paper plate', 'avocado'].map((key) => {
      const c = catalog[key];
      return { code: key.toUpperCase(), name: key, key, price: K.round(c.price * 2 * 0.94), forUs: false, cat: c.cat };
    });
    receipts.push({ id: K.uid(), date: partyDate, store: 'Walmart', event: true, lines: party, total: K.round(K.sum(party, (l) => l.price)) });

    // 26 weeks of dinners; eating out creeps up over the last month
    const list = recipes.filter((r) => r.name !== 'Ribeye with garlic butter');
    for (let d = 182; d >= 1; d--) {
      const date = K.addDays(today, -d);
      const recent = d <= 28;
      const roll = rand();
      const outRate = recent ? 0.36 : 0.13;
      if (roll < outRate) { log.push({ id: K.uid(), date, type: 'out', amount: K.round(38 + rand() * 45), servings: 3 }); continue; }
      if (roll < outRate + 0.15) { log.push({ id: K.uid(), date, type: 'leftovers', servings: 3 }); continue; }
      const r = d % 37 === 0 ? byName['Ribeye with garlic butter'] : pick(list);
      const servings = 3;
      const made = r.servings + Math.floor(rand() * 3) - 1;
      const leftovers = Math.max(0, made - servings);
      const infl = 1 - d * 0.00035;
      log.push({ id: K.uid(), date, type: 'cooked', recipeId: r.id, servings, leftovers, costFactor: K.round(infl * (0.94 + rand() * 0.1), 3) });
      r.cooked.push(date);
      r.yields.push(servings + leftovers);
      if (d <= 3) r.lastLeft = leftovers;
    }
    byName['Chicken fried rice'].rating = 1;
    byName['Butter chicken'].rating = 1;
    byName['Mapo tofu'].rating = -1;

    // food that got thrown out
    [[150, 'spinach', 2.99], [120, 'cilantro', 0.99], [96, 'spinach', 2.99], [70, 'avocado', 2.0], [52, 'spinach', 2.99], [40, 'cilantro', 0.99], [25, 'milk', 1.8], [12, 'spinach', 2.99], [9, 'cilantro', 0.99]]
      .forEach(([d, key, cost]) => waste.push({ id: K.uid(), date: K.addDays(today, -d), key, name: key, cost }));

    // what is in the kitchen right now
    const inv = (key, qty, unit, days, extra) => ({ id: K.uid(), name: key, key, qty, unit, loc: catalog[key] ? catalog[key].loc : 'pantry', expires: K.addDays(today, days), added: K.addDays(today, -2), ...(extra || {}) });
    const items = [
      inv('spinach', 5, 'oz', 1), inv('chicken thigh', 1.5, 'lb', 2), inv('cilantro', 1, 'bunch', 2), inv('avocado', 2, '', 2),
      inv('tortilla', 10, '', 6), inv('egg', 9, '', 12), inv('milk', 0.5, 'gal', 4), inv('cheddar', 8, 'oz', 15),
      inv('bell pepper', 2, '', 5), inv('lime', 3, '', 10), inv('onion', 2, '', 18), inv('garlic', 8, 'clove', 25),
      inv('rice', 28, 'oz', 300), inv('black bean', 2, 'can', 300), inv('diced tomato', 1, 'can', 300), inv('pasta', 16, 'oz', 300),
      inv('soy sauce', 10, 'floz', 300), inv('olive oil', 300, 'ml', 300), inv('coconut milk', 1, 'can', 300), inv('frozen pea', 12, 'oz', 150),
      inv('greek yogurt', 20, 'oz', 6), inv('butter', 10, 'oz', 40), inv('ginger', 3, 'oz', 14),
      { id: K.uid(), name: 'Slow cooker carnitas (leftovers)', key: 'leftover', qty: 2, unit: 'serving', loc: 'fridge', expires: K.addDays(today, 2), added: K.addDays(today, -1), leftoverOf: byName['Slow cooker carnitas'].id },
    ];

    // this week: a few dinners planned, the rest left for "Fill my week"
    const plan = {};
    plan[K.addDays(today, 1)] = { dinner: { type: 'recipe', recipeId: byName['Chicken fried rice'].id, servings: 3, extra: 1 } };
    plan[K.addDays(today, 2)] = { dinner: { type: 'leftovers' }, lunch: 'Leftover fried rice' };
    plan[K.addDays(today, 4)] = { dinner: { type: 'out' } };

    const shorthand = {
      "Trader Joe's": { 'ORG BABY SPINACH': 'spinach', 'BNLS SKNLS CHKN THGH': 'chicken thigh', 'CAGE FREE EGGS LG': 'egg', 'TORTILLAS FLOUR': 'tortilla' },
      WinCo: { 'GRND BF 80/20': 'ground beef', 'CILANTRO': 'cilantro', 'LIMES': 'lime' },
    };

    return {
      version: 1, sample: true, created: today,
      settings: { household: 3, theme: 'system', stores: K.DEFAULT_STORES.slice() },
      catalog, recipes, items, prices, receipts, log, waste, plan, shorthand,
      grocery: [{ id: K.uid(), name: 'Coffee', key: 'coffee', qty: 1, unit: '', done: false, source: 'manual' }, { id: K.uid(), name: 'Paper towels', key: 'paper towel', qty: 1, unit: '', done: false, source: 'manual' }],
    };
  };

  K.emptyState = () => ({
    version: 1, sample: false, created: K.today(),
    settings: { household: 3, theme: 'system', stores: K.DEFAULT_STORES.slice() },
    catalog: K.defaultCatalog(), recipes: [], items: [], prices: [], receipts: [], log: [], waste: [], plan: {}, shorthand: {}, grocery: [],
  });
})();

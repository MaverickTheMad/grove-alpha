// Pantry taxonomy — ported VERBATIM from family-shopping-app/src/App.jsx.
// Do not "tidy" these keyword lists; the categorizer's correctness depends on
// their exact contents and order (Spices is checked first on purpose).

export const SECTION_ORDER = [
  "Produce","Meat & Seafood","Dairy & Eggs","Bakery & Bread",
  "Canned & Jarred","Dry Goods & Pasta","Spices & Seasonings",
  "Condiments & Sauces","Oils & Baking","Beverages & Wine",
  "Frozen","Household","Other",
]

export const RECIPE_CATEGORIES = [
  "Breakfast","Chicken","Other","Pasta","Pork","Salad","Sandwich","Seafood","Soup","Steak",
]

// Auto-category detection. Spices FIRST — before produce — so "black pepper",
// "dried thyme" etc. don't get caught by produce keywords.
export const DETECT_RULES = [
  { s: "Spices & Seasonings", k: ["black pepper","white pepper","red pepper flake","cayenne pepper","garlic powder","onion powder","garlic salt","celery salt","kosher salt","sea salt","table salt","pink salt","smoked paprika","sweet paprika","paprika","cumin","oregano","cinnamon","cayenne","chili powder","chili flake","seasoning","bay leaf","bay leaves","italian seasoning","turmeric","nutmeg","allspice","cardamom","coriander","fennel seed","garam masala","old bay","taco seasoning","cajun","dried thyme","dried rosemary","dried sage","dried basil","dried oregano","dried dill","dried parsley","dried mint","dried cilantro","ground coriander","ground cumin","ground ginger","ground clove","ground nutmeg","ground cinnamon","cracked pepper","pepper flake","red flake","five spice","za'atar","sumac","turmeric","saffron","mustard powder","cream of tartar","poppy seed","sesame seed","caraway","anise","star anise","clove","peppercorn"] },
  { s: "Produce", k: ["fresh garlic","garlic clove","garlic bulb","yellow onion","red onion","white onion","green onion","vidalia","shallot","scallion","leek","chive","tomato","potato","sweet potato","yam","carrot","celery","spinach","broccoli","bell pepper","jalapeño","serrano","anaheim pepper","poblano","habanero","lemon","lime","orange","grapefruit","mushroom","fresh ginger","basil","thyme","rosemary","sage","parsley","cilantro","mint","dill","fresh herb","kale","cabbage","cucumber","zucchini","squash","avocado","corn","green bean","jarlic","minced garlic","artichoke","arugula","asparagus","beet","bok choy","fennel","radish","turnip","banana","apple","mango","berry","strawberry","blueberry","raspberry","cherry","grape","peach","pear","plum","watermelon","cantaloupe","pineapple","pomegranate"] },
  { s: "Meat & Seafood", k: ["chicken breast","chicken thigh","chicken drumstick","chicken wing","chicken tender","whole chicken","ground chicken","ground turkey","turkey breast","beef","steak","pork","lamb","veal","bison","venison","duck","salmon","shrimp","fish","tilapia","cod","tuna","halibut","bacon","sausage","kielbasa","ham","salami","pepperoni","ground beef","ground pork","ribeye","tenderloin","brisket","meatball","chorizo","prosciutto","deli meat","spicy sausage","ground sausage","chicken"] },
  { s: "Dairy & Eggs", k: ["unsalted butter","salted butter","butter","whole milk","skim milk","2% milk","oat milk","almond milk","milk","heavy cream","heavy whipping cream","whipping cream","light cream","half and half","sour cream","cream cheese","cream","egg","yogurt","parmesan","parmigiano","mozzarella","cheddar","ricotta","boursin","queso","oatmilk","keifer","kefir","cold foam","buttermilk","ghee","provolone","gouda","brie","feta","swiss","jack cheese","pepper jack","shredded cheese","cottage cheese","mascarpone"] },
  { s: "Bakery & Bread", k: ["bread","sandwich roll","dinner roll","hamburger bun","hot dog bun","tortilla","flatbread","pita","naan","bagel","croissant","hawaiian roll","slider bun","sourdough","baguette","english muffin","hoagie","ciabatta","focaccia","pretzel bun","brioche"] },
  { s: "Canned & Jarred", k: ["chicken broth","beef broth","vegetable broth","chicken stock","beef stock","vegetable stock","broth","stock","tomato paste","tomato sauce","crushed tomato","diced tomato","whole tomato","fire roasted tomato","fire roasted","coconut milk","bouillon cube","chicken bouillon","beef bouillon","canned chickpea","canned garbanzo","black bean","kidney bean","pinto bean","cannellini","white bean","olive","kalamata","green olive","pickle","dill pickle","bread and butter pickle","capers","roasted red pepper","salsa verde","tapenade","water chestnut","artichoke heart","sun dried tomato","chipotle","adobo"] },
  { s: "Dry Goods & Pasta", k: ["pasta","spaghetti","penne","rigatoni","fusilli","linguine","fettuccine","tortellini","gnocchi","lasagna noodle","egg noodle","ramen noodle","noodle","orzo","rice","brown rice","white rice","jasmine rice","basmati rice","arborio","couscous","quinoa","barley","farro","lentil","oat","rolled oat","flour","all purpose flour","bread flour","wheat flour","almond flour","breadcrumb","panko","cracker","graham cracker","corn starch","cornstarch","arrowroot","stuffing","polenta","grits","chicken rice mix","cereal","granola","chip","tortilla chip","potato chip"] },
  { s: "Condiments & Sauces", k: ["soy sauce","tamari","worcestershire","fish sauce","oyster sauce","hoisin","teriyaki","sriracha","hot sauce","buffalo sauce","honey","maple syrup","agave","molasses","mustard","dijon","yellow mustard","whole grain mustard","ketchup","mayo","mayonnaise","ranch","blue cheese dressing","italian dressing","balsamic vinegar","red wine vinegar","white wine vinegar","apple cider vinegar","rice vinegar","vinegar","vinaigrette","balsamic","pesto","marinara","pasta sauce","pizza sauce","tomato sauce","bbq sauce","steak sauce","ponzu","tahini","jam","jelly","preserves","chutney","relish"] },
  { s: "Oils & Baking", k: ["olive oil","extra virgin olive oil","avocado oil","vegetable oil","canola oil","coconut oil","sesame oil","peanut oil","sunflower oil","grapeseed oil","cooking spray","baking powder","baking soda","active dry yeast","instant yeast","vanilla extract","almond extract","brown sugar","white sugar","powdered sugar","granulated sugar","confectioner","chocolate chip","semi sweet chocolate","dark chocolate","cocoa powder","unsweetened cocoa","shortening","lard","nonstick spray"] },
  { s: "Beverages & Wine", k: ["white wine","red wine","cabernet sauvignon","sauvignon blanc","chardonnay","merlot","pinot noir","pinot grigio","prosecco","sparkling wine","dry white wine","dry red wine","beer","lager","ale","cider","sake","bourbon","whiskey","vodka","rum","tequila","gin","brandy","orange juice","apple juice","lemon juice","lime juice","juice","coffee","espresso","tea","kombucha","club soda","sparkling water","seltzer","lemonade"] },
  { s: "Frozen", k: ["frozen pea","frozen corn","frozen spinach","frozen broccoli","frozen berry","frozen mango","frozen edamame","frozen shrimp","tater tot","french fry","ice cream","gelato","sherbet","popsicle","frozen nugget","frozen waffle","frozen pizza"] },
  { s: "Household", k: ["toilet paper","paper plate","paper towel","paper napkin","trash bag","garbage bag","dish soap","laundry detergent","aluminum foil","plastic wrap","saran wrap","parchment paper","wax paper","ziplock bag","ziploc","sandwich bag","freezer bag","sponge","tissue","kleenex","candle","battery","hand lotion","hand soap","dish sponge"] },
]

// Unit normalization — map aliases to canonical form.
export const UNIT_ALIASES = {
  "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsps": "tbsp", "tbs": "tbsp",
  "teaspoon": "tsp", "teaspoons": "tsp", "tsps": "tsp",
  "cup": "cup", "cups": "cup",
  "ounce": "oz", "ounces": "oz",
  "pound": "lb", "pounds": "lb", "lbs": "lb",
  "gram": "g", "grams": "g",
  "kilogram": "kg", "kilograms": "kg",
  "milliliter": "ml", "milliliters": "ml",
  "liter": "l", "liters": "l",
  "quart": "qt", "quarts": "qt",
  "pint": "pt", "pints": "pt",
  "clove": "clove", "cloves": "clove",
  "can": "can", "cans": "can",
  "sprig": "sprig", "sprigs": "sprig",
}

// Legacy relational tables → grove.records types (see scripts/migrate-pantry.js).
export const TYPES = {
  recipe: 'recipe',             // payload: { name,url,category,notes,cook_time,servings,pdf_url,ingredients,is_favorite }
  extra: 'extra',               // payload: { name,quantity,active,is_staple,sort_order }
  section: 'section',           // payload: { ingredient,section,sort_order }  (one per ingredient)
  shoppingState: 'shopping_state', // LEGACY — superseded by granular types below; kept for migration
  mealCooked: 'meal_cooked',    // payload: { recipe_id }, occurred_at = cooked_at
  // Granular shopping-state records (one record per item — no last-writer-wins clobber)
  selectedMeal: 'selected_meal',   // payload: { recipe_id }
  pantryItem: 'pantry_item',       // payload: { name, haveQty }
  checkedItem: 'checked_item',     // payload: { name }
  mealPlanSlot: 'meal_plan_slot',  // payload: { day_index, recipe_id }
}

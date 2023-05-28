if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  const express = require("express");
  const router = express.Router({ mergeParams: true });
  const API_KEY = process.env.SPOONACULAR_API_KEY;
  const { default: axios } = require("axios");
  const User = require("../models/user");
  const {isLoggedIn, resetPasswordLimiter, storeReturnTo} = require("../middleware/authenticate");
  const catchAsync = require("../helpers/catchAsync");
  const fetchRecipeDetails = require("../helpers/recipeDetails");


router.get("/recipes", catchAsync(async (req, res) => {
    const Recipes_Per_Page = 10; // Number of recipes per page
    const response = await axios.get(`https://api.spoonacular.com/recipes/random?number=${Recipes_Per_Page}&apiKey=${API_KEY}`);
    const recipes = response.data.recipes;
    res.render("recipes/index.ejs", { recipes });
  
}));


router.post("/search", catchAsync(async (req, res) => {
  const { query, type, cuisine, diet, time } = req.body;
  const numberOfResults = 25;
  const params = {
    query: query,
    type: type || "",
    cuisine: cuisine || "",
    diet: diet || "",
    number: numberOfResults,
    apiKey: API_KEY
  };

  if (time !== "") {
    params.maxReadyTime = time;
  }

  const response = await axios.get("https://api.spoonacular.com/recipes/complexSearch", { params });

  const recipes = response.data.results;

  const recipeDetailsPromises = recipes.map(recipe => fetchRecipeDetails(recipe.id));

  const recipeDetails = await Promise.all(recipeDetailsPromises);

  const recipesWithDetails = recipes.map((recipe, index) => ({
    ...recipe,
    details: recipeDetails[index]
  }));

  res.render("recipes/results.ejs", { recipes: recipesWithDetails });
}));


router.get("/recipe/:id" , catchAsync(async(req, res) => {
    const {id} = req.params;
    const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}`);
    const recipe = response.data;

    // Get similar recipes based on the ID
    const number = 4;
    const simRes = await axios.get(`https://api.spoonacular.com/recipes/${id}/similar?number=${number}&apiKey=${API_KEY}`);
    const simRec = simRes.data;
    res.render("recipes/recipe.ejs", {recipe, simRec});
}));


router.post("/recipes/favorites/add", isLoggedIn, catchAsync(async (req, res) => {
    // Retrieve the currently logged-in user's ID from the session data
    const userId = req.user._id;

    // Get the recipe ID from the request body
    const recipeId = req.body.recipeId;

    // Fetch the user document from the users collection in MongoDB
    const user = await User.findById(userId);

    // Add the recipe ID to the user's favorites array
    user.favorites.push(recipeId);

    // Save the updated user document
    await user.save();

    req.flash("success", "Recipe added to favorites");
    res.redirect("/recipes");
 
}));


router.get("/recipes/favorites", isLoggedIn, catchAsync(async (req, res) => {
    // Retrieve the currently logged-in user's ID from the session data
    const userId = req.user._id;

    const user = await User.findById(userId);

    // Make API calls to retrieve recipe details for each favorite
    const favoritesData = await Promise.all(
      user.favorites.map(async (favoriteId) => {
        // Make an API call to get recipe details using the favoriteId
        const response = await axios.get(
          `https://api.spoonacular.com/recipes/${favoriteId}/information?apiKey=${API_KEY}`,
         
        );
        
        // Extract the necessary recipe details from the response
        const { title, image, id, readyInMinutes, servings} = response.data;

        return { title, image, id, readyInMinutes, servings};
      })
    );

    // Render the favorites.ejs template and pass the favorites data to it
    res.render("recipes/favorites", { favorites: favoritesData });
}));


// Define the /favorites/remove route to remove a recipe from favorites
router.post("/recipes/favorites/remove", isLoggedIn, catchAsync(async (req, res) => {

    // Retrieve the currently logged-in user's ID from the session data
    const userId = req.user._id;

    // Get the recipe ID from the request body
    const recipeId = req.body.recipeId;

    // Fetch the user document from the users collection in MongoDB
    const user = await User.findById(userId);

    // Remove the recipe ID from the user's favorites array
    const index = user.favorites.indexOf(recipeId);
    if (index > -1) {
      user.favorites.splice(index, 1);
    }

    // Save the updated user document
    await user.save();
    req.flash("success", "Recipe removed")
    res.redirect("recipes/favorites");
 
}));


module.exports = router;



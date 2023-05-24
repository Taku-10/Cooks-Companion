if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  const express = require("express");
  const router = express.Router({ mergeParams: true });
  const API_KEY = "5dbb93858dfa4e929904c9f51c65a5a3";
  const { default: axios } = require("axios");
  const User = require("../models/user");
  const {isLoggedIn, resetPasswordLimiter, storeReturnTo} = require("../middleware/authenticate");


const ITEMS_PER_PAGE = 8; // Number of recipes per page

router.get("/recipes", async (req, res) => {
  try {
    const response = await axios.get(`https://api.spoonacular.com/recipes/random?number=${ITEMS_PER_PAGE}&apiKey=${API_KEY}`);
    const recipes = response.data.recipes;

    res.render("recipes/index.ejs", { recipes });
  } catch (error) {
    // Handle the error
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/search", async(req, res) => {
    const number = 2;
    const {ingredients} = req.body;
    const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=${number}&apiKey=${API_KEY}`);
    const recipes = response.data;
    // Get similar ingredients
    res.render("recipes/results.ejs", {recipes});
})

// app.post("/search", async(req, res) => {
//     const {query} = req.body;
//     const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?${query}&apiKey=${API_KEY}`);
//     const recipes = response.data.results;
//     res.render("results.ejs", {recipes});
// })

router.get("/recipe/:id" , async(req, res) => {
    const {id} = req.params;
    const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}`);
    const recipe = response.data;

    // Get similar recipes based on the ID
    const simRes = await axios.get(`https://api.spoonacular.com/recipes/${id}/similar?apiKey=${API_KEY}`);
    const simRec = simRes.data;
    res.render("recipes/recipe.ejs", {recipe, simRec});
})


router.post("/recipes/favorites/add", isLoggedIn, async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/recipes/favorites", isLoggedIn, async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Define the /favorites/remove route to remove a recipe from favorites
router.post("/recipes/favorites/remove", isLoggedIn, async (req, res) => {
  try {
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
    res.redirect("/recipes");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});


module.exports = router;
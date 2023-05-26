const { default: axios } = require("axios");
const API_KEY = process.env.SPOONACULAR_API_KEY;

async function fetchRecipeDetails(recipeId) {
    try {
      const response = await axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`);
      return response.data;
    } catch (error) {
      console.log("Error fetching recipe details:", error);
      return null;
    }
  }

  module.exports = fetchRecipeDetails;
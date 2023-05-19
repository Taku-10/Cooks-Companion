const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = "15b30897edae4303a282f1cee8c8257c";
const app = express();

app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "/views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const dbURL = "mongodb://127.0.0.1:27017/Recipes";

mongoose.connect(dbURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("Mongo Connection open");
  })
  .catch((err) => {
    console.log("Mongo connection error");
    console.log(err);
  });

app.get("/recipes", async(req, res) => {
    numberOfRecipes = 5;
    const response = await axios.get(`https://api.spoonacular.com/recipes/random?number=${numberOfRecipes}&apiKey=${API_KEY}`);
    const recipes = response.data.recipes;
    res.render("index.ejs", {recipes})
})

app.post("/search", async(req, res) => {
    const number = 2;
    const {ingredients} = req.body;
    const response = await axios.get(`https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=${number}&apiKey=${API_KEY}`);
    const recipes = response.data;
    // Get similar ingredients
    res.render("results.ejs", {recipes});
})

// app.post("/search", async(req, res) => {
//     const {query} = req.body;
//     const response = await axios.get(`https://api.spoonacular.com/recipes/complexSearch?${query}&apiKey=${API_KEY}`);
//     const recipes = response.data.results;
//     res.render("results.ejs", {recipes});
// })

app.get("/recipe/:id" , async(req, res) => {
    const {id} = req.params;
    const response = await axios.get(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}`);
    const recipe = response.data;

    // Get similar recipes based on the ID
    const simRes = await axios.get(`https://api.spoonacular.com/recipes/${id}/similar?apiKey=${API_KEY}`);
    const simRec = simRes.data;
    res.render("recipe.ejs", {recipe, simRec});
})

// USELESS ROUTES
app.get("/meal-planner", async(req, res) => {
    res.render("mealplanner.ejs");
})

const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

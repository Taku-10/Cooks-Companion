const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = "15b30897edae4303a282f1cee8c8257c";
const mongoose = require("mongoose");
const User = require("./models/user");
const passport = require("passport");
const localStrategy = require("passport-local");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();

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

app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "/views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));


const secret =  "thisisnottheactualsecret"

app.use(session({
  name: "session",
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    // secure: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  }
}));



app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

app.get("/register", (req, res) => {
  res.render("register")
})

app.get("/login", (req, res) => {
  res.render("login.ejs");
})

/*This route will be used to register a user thus submitting the user's details to the database*/
app.post("/register", async (req, res, next) => {
  const { email, username, password } = req.body;
  const user = new User({ email, username });
  const registeredUser = await User.register(user, password);
  
  req.logIn(registeredUser, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      req.flash("success", "Welcome to Cooks Companion");
      res.redirect("/recipes");
    }
  });
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


const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

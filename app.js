const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = "96a31e209aec457a8c806b9476f1c59e";
const mongoose = require("mongoose");
const User = require("./models/user.js");
const Recipe = require("./models/recipe.js");
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

app.get("/", (req, res) => {
  res.render("home");
}) 

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

/*This route will be used to log in the user by checking the provided details on the log in form correspond to the
 ones in the database*/
 app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  (req, res) => {
    req.flash("success", "Welcome back to Cooks Companion");
    const redirectUrl = res.locals.returnTo || "/recipes";
    res.redirect(redirectUrl);
  }
);

/*This route will be used to log out the user*/
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "Goodbye!");
    res.redirect("/recipes");
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


app.post("/recipes/favorites/add", async (req, res) => {
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


app.get("/recipes/favorites", async (req, res) => {
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
    res.render("favorites", { favorites: favoritesData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Define the /favorites/remove route to remove a recipe from favorites
app.post("/recipes/favorites/remove", async (req, res) => {
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

app.get("/about-us", (req, res) => {
  res.render("about");
})

const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

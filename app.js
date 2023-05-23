if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = "5dbb93858dfa4e929904c9f51c65a5a3";
const mongoose = require("mongoose");
const User = require("./models/user.js");
const sendEmail = require("./helpers/sendEmail.js")
const Recipe = require("./models/recipe.js");
const passport = require("passport");
const localStrategy = require("passport-local");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const session = require("express-session");
const flash = require("connect-flash");
const {isLoggedIn, storeReturnTo, resetPasswordLimiter} = require("./middleware/authenticate.js")
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
  console.log(email);
  const subject = "Welcome to Cooks Companion";
  const message = `<html>
<body style="background-color: #9CCB9A; color: #333333;">
    <p>Hello ${req.body.username},</p>
    <p>Thank you for joining Cooks Companion! We're excited to have you as a part of our community. Your registration was successful, and now you have access to a world of delicious recipes and culinary inspiration.</p>
    <p>Cooks Companion is your go-to recipe finder and cooking assistant. Whether you're a seasoned chef or just starting your culinary journey, we're here to simplify your cooking experience and make it enjoyable.</p>
    <p>We're here to help you every step of the way, so feel free to explore and make the most of our platform. If you have any questions, feedback, or suggestions, don't hesitate to reach out to us. Our team is always ready to assist you.</p>
    <p>Once again, welcome to Cooks Companion! We hope you have a fantastic cooking experience and discover many delicious recipes to enjoy. Get started by logging in to your account and start exploring the culinary world.</p>
    <p>Happy cooking!</p>
    <p>Best regards,<br><br>Cooks Companion Team</p>
</body>
</html>`;

  await sendEmail(email, subject, message);
  req.logIn(registeredUser, (err) => {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      req.flash("success", "Welcome to Cooks companion");
      res.redirect("/recipes");
    }
  });
});

/*This route will be used to log in the user by checking the provided details on the log in form correspond to the
 ones in the database*/
 app.post(
  "/login",
  storeReturnTo,
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


app.post("/recipes/favorites/add", isLoggedIn, async (req, res) => {
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


app.get("/recipes/favorites", isLoggedIn, async (req, res) => {
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
app.post("/recipes/favorites/remove", isLoggedIn, async (req, res) => {
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

// Process forgot password form
app.post("/forgot", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error", "Incorrect or invalid email address");
    return res.redirect("/login");
  }

  // Generate reset token
  user.generateResetToken();
  await user.save();
  // Send reset email
  const resetUrl = `http://localhost:3000/reset/${user.resetPasswordToken}`;
  const subject = "Password reset request";
  const message = `
  <p>Dear ${user.username}</p>
  <p>We received a request to reset your password. If you did not request this change, please ignore this email.</p>
  <p>To reset your password, please click the link below: </p>
  <a href="${resetUrl}">Reset password</a>
  <p>The link will expire in 24 hours</p>
  <p>If you have any questions or concerns, please contact our support team at support@cooks-companion.</p>
  <hr>
  <p>Best regards,</p>
  <p>The Cooks Companion Team</p>,`;
  await sendEmail(user.email, subject, message);
  req.flash("success", "An email has been sent to your email address with further instructions.");
  res.redirect("/login");
});

// Reset password page
app.get("/reset/:token", resetPasswordLimiter, async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/login");
  }

  res.render("reset", { token: req.params.token });
});

// Process reset password form
app.post("/reset/:token", resetPasswordLimiter, async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }

  // Update password
  await user.setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const subject = "Password Reset Confirmation";
  const message = `<p>Hello ${user.username} </p>
  <p>Your password has been successfully reset</p>
  <p>If you did this, you can safely disregard this email</p>
  <p>If you didn't dot his, please go to the log in page and click "Forgot password" to reset your password</p>
  <p>Thank you for using Cooks Companion</p>
  <hr>
  <p>Best regards,</p>
  <p>The Cooks Companion Team</p>, 
  `;

  // Send confirmation email
  await sendEmail(user.email, subject, message);
  req.flash("success", "Your password has been successfully reset.");
  res.redirect("/login");
});

const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

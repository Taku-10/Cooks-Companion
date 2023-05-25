if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = process.env.SPOONACULAR_API_KEY;
const mongoose = require("mongoose");
const User = require("./models/user.js");
const userRoutes = require("./routes/userRoutes.js");
const recipeRoutes = require("./routes/recipeRoutes.js");
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

app.get("/about-us", (req, res) => {
  res.render("about");
})

app.use("/", userRoutes);
app.use("/", recipeRoutes);


const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

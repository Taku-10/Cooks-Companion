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
const mongoSanitize = require('express-mongo-sanitize');
const {isLoggedIn, storeReturnTo, resetPasswordLimiter} = require("./middleware/authenticate.js")
const ExpressError = require("./helpers/ExpressError.js");
const MongoStore = require('connect-mongo');
const app = express();

const dbURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/Recipes";
const secret = process.env.SECRET || "thisisjustadevelopmentbackupsecret";

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
app.use(mongoSanitize())


const store = MongoStore.create({
  mongoUrl: dbURL,
  secret,
  touchAfter: 24 * 60 * 60
  
})

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e)
})

app.use(session({
  store,
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


app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not found", 404));
})

app.use((err, req, res, next) => {
  const {statusCode=500} = err;
  if (!err.message) err.message = "Oh No, Something Went Wrong!"
  res.status(statusCode).render("error", {err});
});

const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

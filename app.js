const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { default: axios } = require("axios");
const API_KEY = "74e0fd8da1164c0987880559c617e190";
const app = express();

app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "/views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index.ejs")
})


const port =  3000;
app.listen(port, () => {
    console.log(`Listening for requests on port ${port}`);
});

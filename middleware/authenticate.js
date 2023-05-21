const express = require("express");

const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in !");
    return res.redirect("/login");
    
}

  const storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
      res.locals.returnTo = req.session.returnTo;
    }
    next();
  }
 

  module.exports = {
    isLoggedIn,
    storeReturnTo
  };
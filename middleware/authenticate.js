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

  const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP address to 5 requests per windowMs
    onLimitReached: function (req, res, options) {
      req.flash("error", "Too many password reset attempts. Please try again later.");
    },
    // message: "Too many password reset attempts please try again later"
  });
 

  module.exports = {
    isLoggedIn,
    storeReturnTo,
    resetPasswordLimiter
  };
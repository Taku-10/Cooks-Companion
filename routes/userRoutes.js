if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  const express = require("express");
  const router = express.Router({ mergeParams: true });
  const User = require("../models/user");
  const passport = require("passport");
  const {isLoggedIn, resetPasswordLimiter, storeReturnTo} = require("../middleware/authenticate");
  const sgMail = require("@sendgrid/mail");
  const sendEmail = require("../helpers/sendEmail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const crypto = require("crypto");
  const rateLimit = require("express-rate-limit");
  

router.get("/register", (req, res) => {
    res.render("register")
  })


/*This route will be used to register a user thus submitting the user's details to the database*/
router.post("/register", async (req, res, next) => {
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
  
 
  router.get("/login", (req, res) => {
    res.render("login.ejs");
  })

/*This route will be used to log in the user by checking the provided details on the log in form correspond to the
 ones in the database*/
 router.post(
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
  router.get("/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash("success", "Goodbye!");
      res.redirect("/recipes");
    });
  });


// Process forgot password form
router.post("/forgot", async (req, res) => {
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
  router.get("/reset/:token", resetPasswordLimiter, async (req, res) => {
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
  router.post("/reset/:token", resetPasswordLimiter, async (req, res) => {
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
  
  router.get("/profile", isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    res.render("profile", { user });
  });
  
  // This route will post the users updates to the form
  router.put("/profile/:id", isLoggedIn, async (req, res, next) => {
    const userId = req.params.id;
    const updatedUser = await User.findByIdAndUpdate(userId, req.body, {new: true, runValidators: true});
    req.login(updatedUser, (err) => {
      if (err) {
        console.log(err);
        return next(err);
      }
      req.flash("success", "Successfully updated your details");
      res.redirect("/profile");
    });
  });
  
  // Route to render the password change form
  router.get("/password", isLoggedIn, (req, res) => {
    // Get the form data from the session
    const formData = req.flash("form")[0];
    res.render("changePassword", { formData });
  });
  
  router.post("/change-password", isLoggedIn, async (req, res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body;
    const user = req.user;
  
    // Check if the new password and confirmation match
    if (newPassword !== confirmNewPassword) {
      // Handle password mismatch error
      req.flash("error", "Passwords do not match");
  
      // Store the form data in the session to prepopulate the form
      req.flash("form", { oldPassword, newPassword, confirmNewPassword });
  
      return res.redirect("/password");
    }
  
    try {
      // Use the `changePassword` method provided by Passport.js to change the user's password
      await user.changePassword(oldPassword, newPassword);
  
      // Redirect to success page
      req.flash("success", "Password changed successfully");
      return res.redirect("/profile");
    } catch (err) {
      // Handle password change error
      req.flash("error", "Incorrect username and or password");
  
      // Store the form data in the session to prepopulate the form
      req.flash("form", { oldPassword, newPassword, confirmNewPassword });
  
      return res.redirect("/password");
    }
  });

  module.exports = router;
  
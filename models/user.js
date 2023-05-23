const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const crypto = require('crypto');
const {Schema} = mongoose;

const userSchema = new Schema({

    username: {
        type: String, 
        required: [true, "username must be supplied"]
    },

    email: {
        type: String,
        required: [true, "Email address must be supplied"],
        unique: true
    },

    favorites: [String],

    resetPasswordToken: String,
    
    resetPasswordExpires: Date


})

userSchema.plugin(passportLocalMongoose);

userSchema.methods.generateResetToken = function() {
    this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // Expires in 1 hour
  };

module.exports = mongoose.model("User", userSchema);
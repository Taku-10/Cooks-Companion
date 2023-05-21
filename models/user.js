const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
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

    favorites: [String]

})

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
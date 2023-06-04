if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
  const express = require("express")
  const { default: axios } = require("axios");

const apiKeys = [
    process.env.SPOONACULAR_API_KEY_1,
    process.env.SPOONACULAR_API_KEY_2,
    process.env.SPOONACULAR_API_KEY_3,
    process.env.SPOONACULAR_API_KEY_4,
    process.env.SPOONACULAR_API_KEY_5,
    process.env.SPOONACULAR_API_KEY_6,
    process.env.SPOONACULAR_API_KEY_7,
  ];
  

  let currentKeyIndex = 0; 

  
  const rotateAPIKey = (req, res, next) => {
    // Update the current key index every 5 minutes
    if (new Date().getMinutes() % 5 === 0) {
      currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    }
    
    // Set the API key in the request object
    req.API_KEY = apiKeys[currentKeyIndex];
    console.log("Current api key = ", req.API_KEY);
    
    next();
  };

module.exports = rotateAPIKey;
  

  
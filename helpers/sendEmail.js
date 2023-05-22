if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }
  
const express = require("express")
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (toEmail, subject, message) => {
    const msg = { 
        from: process.env.EMAIL_FROM,
        to: toEmail,
        subject: subject,
        html: message,
    };
    
    let retryCount = 0;
    while (retryCount < 3) {

        try { 

            await sgMail.send(msg);
            console.log("Email sent successfully!");
            return;
        } catch (error) {

            console.log(`Error sending email ${retryCount + 1} retries left: ${error}`);
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for seconds before retrying to send email again
        }
    }
    console.error("Maximum email sending attempts reached.");
};
    
module.exports = sendEmail;
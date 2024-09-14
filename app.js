


import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import jwt from 'jsonwebtoken';
import { nanoid } from "nanoid";
import cors from "cors";
import 'dotenv/config';
import bcrypt from 'bcryptjs';



// Import User model
import UserModel from "./models/UserModel.js";


const allowedOrigin = process.env.ALLOWED_ORIGIN;
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors({ origin: allowedOrigin }));



// Temporary storage for verification codes
const users = {};
const PORT = process.env.PORT 

// Connect to MongoDB
mongoose.connect(process.env.DB_LOCATION, {
    autoIndex: true
}).then(con => {
    console.log("Database connected successfully");
}).catch(err => {
    console.error("Database connection error:", err);
});

// Middleware for JWT verification
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) return res.status(401).json({ error: "No Access Token" });

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Access token is invalid" });
        req.user = user.id;
        next();
    });
};

// Send data to frontend
const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);
    return {
        access_token,
        profile_img: user.profile_img,
        username: user.username,
        fullname: user.fullname,
        email: user.email
    };
};

// Function to generate a unique username
const generateUsername = async (email) => {
    let username = email.split("@")[0];
    let isUsernameNotUnique = await UserModel.exists({ username });
    if (isUsernameNotUnique) {
        username += nanoid().substring(0, 3); // Add a unique suffix if needed
    }
    return username;
};

// Function to generate a random 6-digit verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

// Signup route
app.post('/signup', async (req, res) => {
    const { fullname, email, password } = req.body;

    // Validation
    if (fullname.length < 3) {
        return res.status(403).json({ error: 'Fullname must be at least 3 letters long' });
    }
    if (!email.length) {
        return res.status(403).json({ error: 'Enter email' });
    }
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        return res.status(403).json({ error: 'Email is invalid' });
    }
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if (!passwordRegex.test(password)) {
        return res.status(403).json({ error: 'Password should be 6 - 20 characters long with a numeric, 1 lowercase, and 1 uppercase letter' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const username = await generateUsername(email);

        // Save user temporarily in memory
        users[email] = {
            fullname,
            email,
            password: hashedPassword,
            username,
            verificationCode: generateVerificationCode(),
            expirationTime: Date.now() + 5 * 60 * 1000 // 5 minutes expiration
        };

        await transporter.sendMail({
            from: process.env.SMTP_MAIL,
            to: email,
            subject: 'Sign Up Verification Code',
       
            html: `
             <html>
                  <body>
                      <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
                          <h5 style="font-size: 20px">Welcome ${users[email].fullname}</h5>
                          <strong>Your verification code is:</strong> 
                          <span style="font-size: 20px; color: #007BFF; font-weight: bold;">${users[email].verificationCode}</span>
                      </p>
                      <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
                          It will expire in <strong style="color: #FF0000;">5 minutes</strong>.
                      </p>
                      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #555;">
                          If you did not request this, please ignore this email.
                      </p>
                      <h3 style="font-size: 10px">Token Flow Team</h3>
                    </body>
            </html>
    `,
        });

        res.status(200).json({ message: 'Signup successful. Please check your email for the verification code.' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(500).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Verification route
app.post('/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        const storedData = users[email];
        
        if (!storedData) {
            // No verification code found
            console.log('No verification code found for email:', email);
            return res.status(400).json({ success: false, message: 'Incorrect verification code' });
        }

        const { verificationCode, expirationTime } = storedData;

        if (Date.now() > expirationTime) {
            // Code has expired
            delete users[email]; // Delete the expired code
            console.log('Verification code has expired for email:', email);
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please sign up again.' });
        }

        if (verificationCode === code) {
            // Save user to the database
            const user = new UserModel({
                fullname: storedData.fullname,
                email: storedData.email,
                password: storedData.password,
                username: storedData.username,
                isVerified: true
            });

            await user.save().then((u) => {
                console.log('User successfully verified:', u.email);
                delete users[email]; // Remove the code after verification

                // Format data to send
                const dataToSend = formatDatatoSend(u);

                return res.status(200).json({ success: true, message: 'Email verified successfully', data: dataToSend });
            });

        } else {
            // Incorrect verification code
            console.log('Invalid verification code for email:', email);
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).json({ success: false, message: 'Email Already Exist' });
    }
});

//****sign in route */
app.post("/signin", (req, res) => {
    let { email, password } = req.body;

    // Find the user by email
    UserModel.findOne({ email })
        .then((user) => {
            if (!user) {
                // If the user is not found, return an error
                return res.status(403).json({ "error": "Email not found" });
            }

            // Compare the provided password with the hashed password in the database
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    return res.status(403).json({ "error": "Error occurred while trying to log in. Please try again." });
                }

                if (!result) {
                    // If the password is incorrect, return an error
                    return res.status(403).json({ "error": "Incorrect Password" });
                } else {
                    // If authentication is successful, return the formatted user data
                    return res.status(200).json(formatDatatoSend(user));
                }
            });
        })
        .catch((err) => {
            // Handle any errors that occur during the process
            console.log(err.message);
            return res.status(500).json({ "error": err.message });
        });
});


//****************change password route ****************************************************/
app.post("/api/v1/user/change-password", verifyJWT, (req,res)=>{
    let  { currentPassword, newPassword} = req.body;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
    if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
      return res.status(403).json({ error:"Password should be 6 - 20 characters long with a numeric, 1 lowercase and 1 uppercase letters "})
      }
  
      UserModel.findOne({_id: req.user})
      .then((user) =>{
         
          bcrypt.compare(currentPassword, user.password, (err, result) =>{
              if(err) {
                  return res.status(500).json({error: "Some error occured while changing the password, Please try again later" })
              }
  
              if(!result){
                  return res.status(403).json({ error: "Incorrect current password"  })
              }
  
              bcrypt.hash(newPassword, 10 , (err, hashed_password) =>{
  
                  UserModel.findOneAndUpdate({_id: req.user}, {"password": hashed_password})
                  .then((u) =>{
                      return res.status(200).json({status: 'Password Changed'})
                  })
                  .catch(err =>{
                      return res.status(500).json({error: "Some error occured while saving new password, Please try again later."})
                  })
              })
  
          
          })
      })
      .catch(err => {
          console.log(err);
          res.status(500).json({error: "User not found"})
      })
  })

// Start the server
app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
});


const express = require("express");
const router = express.Router();
const User = require("../models/User");

router.post('/signup', async (req, res) => {
    try {
        const { username, firstname, lastname, password } = req.body;

        if (!username || !firstname || !lastname || !password) {
            return res.status(400).json({
                message: "Please fill out all fields before continuing."
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).json({
                message: "Username already exists. Please enter a unique username."
            });
        }

        const newUser = User({
            username,
            firstname,
            lastname,
            password
        });

        await newUser.save();

        res.status(201).json({
            message: "User successfully registered!"
        });
    } catch (err) {
        console.error("Erorr with signup:", err);
        res.status(500).json({
            message: "Server error during signup."
        })
    }
});

router.post('/login', async (req, res) => {
    try {
        const username = req.body.username.toLowerCase();
        const { password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are both required."
            });
        }

        const user = await User.findOne({ username, password });

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials."
            });
        }

        res.status(200).json({
            message: "Login successful!",
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname
        });
    } catch (err) {
        console.error("Erorr with login:", err);
        res.status(500).json({
            message: "Server error during login."
        })
    }
});

module.exports = router;

const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register User
async function registerUser(req, res) {
    try {
        const { name, email, password } = req.body;

        // 1. Validate input fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        // 2. Check if user already exists
        const isUserAlreadyExists = await userModel.findOne({
            $or: [
                { email: email },
                { name: name }
            ]
        });

        if (isUserAlreadyExists) {
            return res.status(409).json({
                message: 'User already exists'
            });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Create new user
        const newUser = new userModel({
            name: name,
            email: email,
            password: hashedPassword
        });

        // 5. Save user in MongoDB
        await newUser.save();

        // 6. Generate JWT token
        const token = jwt.sign(
            { id: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 7. Store JWT in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1000
        });

        // 8. Send success response
        return res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

module.exports = { registerUser };

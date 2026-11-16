const {Router}=require('express');
const authcontroller=require('../controllers/auth.controller');
const requireAuth = require('../middleware/auth.middleware');

const authrouter=Router();
authrouter.post('/register', authcontroller.registerUser);

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 */

authrouter.post('/login', authcontroller.loginUser);
authrouter.get('/me', requireAuth, authcontroller.getCurrentUser);

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate JWT token
 * @access Public
 */
authrouter.post('/logout', requireAuth, authcontroller.logoutUser);

module.exports=authrouter;

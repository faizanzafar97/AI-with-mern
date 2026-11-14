const {Router}=require('express');
const authcontroller=require('../controllers/auth.controller');

const authrouter=Router();
authrouter.post('/register', authcontroller.registerUser);

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 */

authrouter.post('/login', authcontroller.loginUser);

/**
 * @route get /api/auth/logout
 * @desc Logout user and invalidate JWT token
 * @access Public
 */
authrouter.get('/logout', authcontroller.logoutUser);

module.exports=authrouter;
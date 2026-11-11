const {Router}=require('express');
const authcontroller=require('../controllers/auth.controller');

const authrouter=Router();
authrouter.post('/register', authcontroller.registerUser);

module.exports=authrouter;
const mongoose=require('mongoose');

const blacklistSchema=new mongoose.Schema({
    token:{
        type:String,
        required:[true, 'Token is required to be added in the black list'],
        unique:true,
        select:false,
    },
    expiresAt:{
        type:Date,
        required:true,
        expires:0,
    },
},{
    timestamps:true
});

const Blacklist=mongoose.model('Blacklist',blacklistSchema);

module.exports=Blacklist;

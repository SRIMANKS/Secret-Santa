const mongoose = require("mongoose");
exchangeSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    budget:{
        type:Number,
        required:true,
    },
    dateofexchange:{
        type:String,
        required:true,
    },
    location:{
        type:String,
        required:true,
    },
    participants: Array,
    participantsId: Array,
    adminId:{
        type:String,
        required:true,
    }    
});

module.exports = mongoose.model("Exchange", exchangeSchema);
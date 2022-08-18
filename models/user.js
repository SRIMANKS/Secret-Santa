const mongoose = require("mongoose");

userschema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobilenumber: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  exchanges:Array,
  exchangesId:Array,
});

module.exports = mongoose.model("User", userschema);

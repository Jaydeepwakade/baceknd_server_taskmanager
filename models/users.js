const { types } = require("@babel/core");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

  todo:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:"Todo"
    }
  ],

  createdAt:{
    type:Date,
    default:Date.now
  },

  assignedTo:[
    {type:String,unique:true}
  ]

});

const User = mongoose.model("User", userSchema);
module.exports = User;

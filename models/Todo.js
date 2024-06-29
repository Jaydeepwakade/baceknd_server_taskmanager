const mongoose=require("mongoose")

const checklistSchema = new mongoose.Schema({
    task: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  });

const TodoSchema=new mongoose.Schema({
    title:{
        type:String,
    },

    priority:{
        type:String,
    },

    status:{
        type:String
    },

    checklist:[checklistSchema],

    dueDate:{
        type:Date,
        required:false
    }
})

const Todo=mongoose.model("Todo",TodoSchema)
module.exports=Todo
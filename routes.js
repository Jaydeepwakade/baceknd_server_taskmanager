const express=require('express')
const router=express.Router()
const User=require('./models/users')
const crypto=require('crypto')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const Todo=require("./models/Todo")


router.post("/signup",async(req,res)=>{
    const {name,email,password}=req.body
    const user=await User.findOne({email:email})
    console.log(name)
    if(user){
        res.status(400).send({error:"User with this email address already exists"})
        return
    }else{
        const hashedPass=await bcrypt.hash(password,10)
        console.log(hashedPass)
        const newUser=new User({
            name:name,
            email:email,
            password:hashedPass
        })

        try{
            await newUser.save()
            res.status(200).send({message:"User Registered Successfully"})
        }catch(err){
            console.log(err)
            res.status(400).send({error:"Error occured while saving the user: ",err})
        }
    }
})

router.post("/login",async(req,res)=>{
    const generateKey = () => {
        const key = crypto.randomBytes(32).toString("hex");
        return key;
      };
    const {email,password}=req.body
    const savedUser = await User.findOne({ email: email });
    if (!savedUser) {
      return res.status(422).send({ error: "Invalid Credentials" });
    }
      try {
        bcrypt.compare(password, savedUser.password, (err, result) => {
          if (result) {
            const key = generateKey();
            const token = jwt.sign({ userId: savedUser._id }, key);
            return res.status(422).send({ message: "Logged IN", data: token,id:savedUser._id,name:savedUser.name });
          } else {
            console.log("Error");
            return res.status(422).send({ error: "Invalid Credentials2" });
          }
        });
      } catch (err) {
        console.log(err);
      }
    
})

router.post("/updateProfile",async(req,res)=>{
  const {name,email,password,newPassword}=req.body
  try{
    const user=await User.findOne({email:email})
    if(user){
      bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
          const hashedPass=bcrypt.hash(newPassword,10)
          user.password=hashedPass
          user.name=name
          res.status(200).send({message:"Password changed"})
        }else{
          res.status(500).send({error:"Invalid old password"})
        }
      })
    }else{
      res.send(400).send({error:"Please enter valid email"})
    }
  }catch(err){
    res.send(440).send({error:"Something went wrong"})
  }
})

router.post("/saveTask/:id",async(req,res)=>{
  try{
    const {id}=req.params
    const {title,priority,status,checklist,dueDate}=req.body
    const newTodo=await Todo({
      title,
      priority,
      status,
      checklist,
      dueDate
    })
  
    const savedTask=await newTodo.save()
  
    await User.findByIdAndUpdate(id,{$push:{todo:savedTask._id}})
    console.log("done")
  }catch(err){
    console.log(err)
  }
})

router.get("/fetchTask/:id",async(req,res)=>{
  try {
    console.log("hello")
    const { id } = req.params;
    const user = await User.findById(id).populate('todo');
    if (!user) {
      console.log("not done")
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(user.todo[0])
    res.status(200).json({message:"Done",data:user.todo});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

router.put("/updateTask/:taskId", async (req, res) => {
  const { taskId } = req.params;
  console.log(req.body)
  const { status} = req.body;

  try {
    const updatedTask = await Todo.findByIdAndUpdate(taskId, {
      status:status,
    }, { new: true });

    if (!updatedTask) {
      return res.status(404).send({ error: "Task not found" });
    }

    res.status(200).send({ message: "Task updated successfully", data:updatedTask });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Error updating task" });
  }
});
 
router.put('/updateChecklistItem/:taskId/:itemId', async (req, res) => {
  // console.log("update")
  const { taskId, itemId } = req.params;
  const { checked } = req.body;
  console.log(taskId,itemId,checked)

  try {
    const task = await Todo.findById(taskId);
    if (!task) {
      return res.status(404).send({ error: "Task not found" });
    }

    const checklistItem = task.checklist.id(itemId);
    if (!checklistItem) {
      return res.status(404).send({ error: "Checklist item not found" });
    }

    checklistItem.completed = checked;
    await task.save();

    res.status(200).send({message:"done",data:task});
  } catch (error) {  
    res.status(500).send(error);
  }
});

router.get('/generateShareLink/:taskId', async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await Todo.findById(taskId);
    if (!task) {
      return res.status(404).send({ error: "Task not found" });
    }
    // Generate a unique shareable link (in production, use a secure method like UUID)
    const shareLink = `http://localhost:5173/task/${taskId}/readonly`; // Example link
    res.send({ shareLink });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/fetchTaskById/:taskid",async(req,res)=>{
  console.log("Inside")
  const {taskid}=req.params
  const task=await Todo.findById(taskid)
  if(!task){
    res.status(400).send({error:"Something went wrong"})
  }else{
    res.send({data:task})
  }
})

router.put("/deleteTask/:userId/:taskId",async(req,res)=>{
  const {taskId,userId}=req.params
  try{
    await User.findByIdAndUpdate(userId,{$pull:{todo:taskId}},{new:true})
    await Todo.findByIdAndDelete(taskId);
    res.status(200).send({message:"Done"})
  }catch(err){
    console.log(err)
    res.status(400).send({error:"Failed to delete"})
  }
})


module.exports=router
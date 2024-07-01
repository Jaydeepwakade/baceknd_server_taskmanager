const express = require("express");
const router = express.Router();
const User = require("./models/users");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Todo = require("./models/Todo");

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(400)
        .send({ error: "User with this email address already exists" });
    }

    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name,
      email: email,
      password: hashedPass,
      friends: [],
    });
    await newUser.save();
    res.status(200).send({ message: "User Registered Successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ error: "Error occurred while saving the user: " + err.message });
  }
});

router.post("/login", async (req, res) => {
  const generateKey = () => {
    const key = crypto.randomBytes(32).toString("hex");
    return key;
  };
  const { email, password } = req.body;
  const savedUser = await User.findOne({ email: email });
  if (!savedUser) {
    return res.status(422).send({ error: "Invalid Credentials" });
  }
  try {
    bcrypt.compare(password, savedUser.password, (err, result) => {
      if (result) {
        const key = generateKey();
        const token = jwt.sign({ userId: savedUser._id }, key);
        return res.status(422).send({
          message: "Logged IN",
          data: token,
          id: savedUser._id,
          name: savedUser.name,
        });
      } else {
        return res.status(422).send({ error: "Invalid Credentials2" });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

router.post("/getDetails/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    const Newuser = {
      name: user.name,
      email: user.email,
    };
    res.send({ data: Newuser });
  } catch (err) {
    console.log(err);
  }
});

router.post("/updateProfile", async (req, res) => {
  const { name, email, password, newPassword, id } = req.body;

  try {
    const user = await User.findById(id);
    console.log(user);

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        const hashedPass = await bcrypt.hash(newPassword, 10);
        user.password = hashedPass;
        user.name = name;
        user.email = email;
        await user.save();
        return res.status(200).send({ message: "Password changed" });
      } else {
        return res.status(400).send({ errorPass: "Invalid old password" });
      }
    } else {
      return res.status(400).send({ error: "Please enter valid email" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("/saveTask/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, priority, status, checklist, duedate, assignee } = req.body;
    const newTodo = await Todo({
      title,
      priority,
      status,
      checklist,
      dueDate: duedate,
    });

    let user;
    if (assignee && assignee.value) {
      user = await User.findOne({ email: assignee.value });
    }
    if (user) {
      const mainUser = await User.findById(id);
      const newTodo2 = await Todo({
        title,
        priority,
        status,
        checklist,
        dueDate: duedate,
        name: user.name,
      });
      const savedTask = await newTodo2.save();
      await User.findByIdAndUpdate(id, { $push: { todo: savedTask._id } });
      user.todo.push(savedTask._id);
      await user.save();
      console.log("Data:", user);
    } else {
      const savedTask = await newTodo.save();
      await User.findByIdAndUpdate(id, { $push: { todo: savedTask._id } });
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/fetchTask/:id/:day", async (req, res) => {
  const { id, day } = req.params;

  try {
    const user = await User.findById(id).populate("todo");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const allTasks = user.todo;

    if (day === "today") {
      res.status(200).json({ message: "Done", data: allTasks });
    } else if (day === "next-week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const tasksNextWeek = allTasks.filter((task) => {
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < nextWeek;
      });
      res.status(200).json({ message: "Done", data: tasksNextWeek });
    } else if (day === "next-month") {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);

      const tasksNextMonth = allTasks.filter((task) => {
        const taskDate = new Date(task.dueDate);
        return taskDate >= today && taskDate < nextMonth;
      });
      res.status(200).json({ message: "Done", data: tasksNextMonth });
    } else {
      res.status(400).json({ error: "Invalid day parameter" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

router.put("/updateTask/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const updatedTask = await Todo.findByIdAndUpdate(
      taskId,
      {
        status: status,
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).send({ error: "Task not found" });
    }

    res
      .status(200)
      .send({ message: "Task updated successfully", data: updatedTask });
  } catch (error) {
    res.status(500).send({ error: "Error updating task" });
  }
});

router.put("/updateChecklistItem/:taskId/:itemId", async (req, res) => {
  const { taskId, itemId } = req.params;
  const { checked } = req.body;

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

    res.status(200).send({ message: "done", data: task });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/generateShareLink/:taskId", async (req, res) => {
  const { taskId } = req.params;
  try {
    const task = await Todo.findById(taskId);
    if (!task) {
      return res.status(404).send({ error: "Task not found" });
    }
    const shareLink =`https://task-manager-final.vercel.app/task/${taskId}/readonly`;
    res.send({ shareLink });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/fetchTaskById/:taskid", async (req, res) => {
  const { taskid } = req.params;
  const task = await Todo.findById(taskid);
  if (!task) {
    res.status(400).send({ error: "Something went wrong" });
  } else {
    res.send({ data: task });
  }
});

router.put("/deleteTask/:userId/:taskId", async (req, res) => {
  const { taskId, userId } = req.params;
  try {
    await User.findByIdAndUpdate(
      userId,
      { $pull: { todo: taskId } },
      { new: true }
    );
    await Todo.findByIdAndDelete(taskId);
    res.status(200).send({ message: "Done" });
  } catch (err) {
    res.status(400).send({ error: "Failed to delete" });
  }
});

router.put("/updateTaskDetails/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const { title, priority, status, checklist, duedate, assignee } = req.body;
  console.log(assignee);

  try {
    const updateData = { title, priority, status, checklist, dueDate: duedate };
    
    if (assignee) {
      updateData.name = assignee;
    }

    const updatedTask = await Todo.findByIdAndUpdate(taskId, updateData, { new: true });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (assignee) {
      const user = await User.findOne({ email: assignee });
      if (user) {
        if (!user.todo.includes(updatedTask._id)) {
          user.todo.push(updatedTask._id);
          await user.save();
        }
      } else {
        return res.status(404).json({ message: "Assignee not found" });
      }
    }

    res.status(200).json({ message: "Task updated successfully", task: updatedTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


router.put("/addEmails/:userId", async (req, res) => {
  const { userId } = req.params;
  const { email } = req.body;
  try {
    const user = await User.findById(userId);
    if (user) {
      if (user.friends.includes(email)) {
        res.status(400).send({ error: "Email already exists" });
      } else {
        user.friends.push(email);
        await user.save();
        res.status(200).send({ message: "Email Added" });
      }
    }
  } catch (err) {
    res
      .status(500)
      .send({ error: "Something went wrong please try again after few time" });
  }
});

router.post("/fetchAllEmails/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (user) {
      // console.log(user.assignedTo);
      res.status(200).send({ data: user.friends });
    }
  } catch (err) {
    res.status(500).send({ error: "Something went wrong" });
  }
});

router.post("/addData/:userId/:taskid", async (req, res) => {
  const { userId, taskid } = req.params;
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({ error: "Invalid Email" });
    } else {
      const task = await Todo.findById(taskid);
      if (!task) {
        return res.status(400).send({ error: "Error" });
      } else {
        user.todo.push(task._id);
        await user.save();
        res.status(200).json({ message: "Task assigned successfully", user });
      }
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/tasks/next-week", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    console.log(today, " ", nextWeek);

    const tasksNextWeek = await Todo.find({
      dueDate: {
        $gte: today,
        $lt: nextWeek,
      },
    });
    console.log(tasksNextWeek);
    res.status(200).json(tasksNextWeek);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/tasks/next-month", async (req, res) => {
  try {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const tasksNextMonth = await Todo.find({
      dueDate: {
        $gte: today,
        $lt: nextMonth,
      },
    });
    console.log(tasksNextMonth);
    res.status(200).json(tasksNextMonth);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;

const express=require('express')
const crypto=require('crypto')
const bodyParser=require('body-parser')
const mongoose=require('mongoose')

const app=express()
const cors=require('cors')
const port=4000
app.use(cors())
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
const jwt=require('jsonwebtoken')
const router=require('./routes')
app.use(router)

mongoose.connect("mongodb+srv://surveyshigh:harshv0606@cluster0.tgqgm4t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0").then(()=>{
    console.log("Connected to Mongo")
}).catch((error)=>{
    console.log("Falied to connect Mongo ",error)
})


app.listen(port,()=>{
    console.log("Server Running")
})
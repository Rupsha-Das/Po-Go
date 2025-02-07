const express = require("express")
const cors = require("cors")
require('dotenv').config()
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const User = require("./user.model.js")
const mongoose = require("mongoose")

const server = http.createServer(app);

app.use(express.json())
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.get("/",(req,res)=>{
    res.send("Server running fine!!!!!!")
})


const machineToUserEmail = new Map();
const userEmailToMachine = new Map();


const io = new Server(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});



io.on('connection',(socket)=>{
  console.log(`user connected - ${socket.id}`)
  
})



app.get('/login',async (req,res)=>{
    const {email,password}=req.body;
    let result  = await User.findOne({email});
    
    if(result && result.password === password){
        res.send({
            status:200,
            msg:"Success!!",
            data:result
        })
    }else {
        res.send({
            status:400,
            msg:"Invalid credentials!!",
            data:null
        })
    }
    
    
})
app.post('/signin',async (req,res)=>{
    const {name,email,password}=req.body;
    let result  = await User.findOne({email});
    if(result){
        res.send({
            status:400,
            msg:"User already registered!!",
            data:null
        })
    }else{

        const userObj = new User({
            name,
            email,
            password
        })
    
        result  = await userObj.save();
    
        if(result){
            res.send({
                status:200,
                msg:"Success!!",
                data:result
            })
        }else{
            res.send({
                status:400,
                msg:"Failed!!",
                data:null
            })
        }
    }
    
})
app.post('/update-posture',async (req,res)=>{
    const {machineId,posture}=req.body;
    // const email = machineToUserEmail.get(machineId);
    const email="rick@gmail.com";
    let result  = await User.findOne({email});
    
    if(result){
        await User.updateOne({email},{
            $set:{posture:[...posture,...result.posture]}
        })
        res.send({
            status:200,
            msg:"Success!!",
        })
    }else {
        res.send({
            status:400,
            msg:"Failed!!"
        })
    }
})



server.listen(process.env.PORT,()=>{
    console.log(`SERVER RUNNING AT PORT ${process.env.PORT}`);
})
const express = require("express")
require('dotenv').config()
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const User = require("./user.model.js")

const server = http.createServer(app);

app.use(express.json())

app.get("/",(req,res)=>{
    res.send("Server running fine!!!!!!")
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



server.listen(process.env.PORT,()=>{
    console.log(`SERVER RUNNING AT PORT ${process.env.PORT}`);
})
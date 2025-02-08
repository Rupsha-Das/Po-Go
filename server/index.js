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


const producers = new Map();
const consumers = new Map();
const consumerEmails = new Map();
// producers.set(4444,null)

function printPC(){
    console.log("producers\n___________");
    for(const [key,val] of producers){
        console.log(`${key} - ${val}`);
    }
    console.log("consumers\n___________");
    for(const [key,val] of consumers){
        console.log(`${key} - ${val}`);
    }
    console.log("emails\n___________");
    for(const [key,val] of consumerEmails){
        console.log(`${key} - ${val}`);
    }
}


const io = new Server(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});



io.on('connection',(socket)=>{
  console.log(`user connected - ${socket.id}`)
  socket.on('register',(deviceInfo)=>{
    if(deviceInfo.type==='producer'){
        producers.set(socket.id,null); 
    }else{//consumer
        consumers.set(socket.id,null);
        consumerEmails.set(socket.id,deviceInfo.email);
    }
    console.log(deviceInfo.type, socket.id)
  })

  socket.on('connect-to-producer',()=>{
    for (const [producerId, consumerId] of producers) {
        // console.log(`producesss  ${producerId} ${consumerId}`)
        if (consumerId == null) {
            producers.set(producerId,socket.id);
            consumers.set(socket.id,producerId);
            console.log(`Consumer:${socket.id} Connected to Producer:${producerId} `)
            break;
        }
    }
    if(!consumers.get(socket.id))console.log("Unable to Connect")
    socket.emit('connect-to-producer-result',{
        msg:consumers.get(socket.id)?"Connected to Device":"Unable to Connect"
    })
  })

  socket.on('send-data-to-consumer',async(data)=>{    
    console.log(data)//data received from viraj side
    printPC();
    const consumerId = producers.get(socket.id);
    const consumerEmail = consumerEmails.get(consumerId);
    printPC()
    console.log(`consumerId:${consumerId} and consumerEmail:${consumerEmail}`)
    let result  = await User.findOne({email:consumerEmail});
    console.log(result)
    let msg;
    if(!result){
        msg="User not exists!!"
    }else{
        await User.updateOne({email:consumerEmail},{
            $set:{posture:[...data,...result.posture]}
        })
        msg="Successful update";
    }
    console.log(msg);
    socket.emit('posture-data-update',{msg});
    
  })
  
  socket.on('disconnect',()=>{
    for (const [producerId, consumerId] of producers) {
        if (producerId == socket.id ) {
            producers.set(producerId,null);break;
        }
        if (consumerId == socket.id ) {
            producers.set(producerId,null);break;
        }
    }
    for (const [consumerId, producerId] of consumers) {
        if (producerId == socket.id ) {
            consumers.set(producerId,null);break;
        }
        if (consumerId == socket.id ) {
            consumers.set(producerId,null);break;
        }
    }
  })
  
})


app.post('/user-data',async (req,res)=>{
    const {email}=req.body;
    let result  = await User.findOne({email});
    
    if(result){
        res.send({
            status:200,
            msg:"Success!!",
            data:result
        })
    }else {
        res.send({
            status:400,
            msg:"Invalid email!!",
            data:null
        })
    }
    
    
})

app.post('/login',async (req,res)=>{
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
// app.post('/update-posture',async (req,res)=>{
//     const {machineId,posture}=req.body;
//     // const email = machineToUserEmail.get(machineId);
//     const email="rick@gmail.com";
//     let result  = await User.findOne({email});
    
//     if(result){
//         await User.updateOne({email},{
//             $set:{posture:[...posture,...result.posture]}
//         })
//         res.send({
//             status:200,
//             msg:"Success!!",
//         })
//     }else {
//         res.send({
//             status:400,
//             msg:"Failed!!"
//         })
//     }
// })



server.listen(process.env.PORT,()=>{
    console.log(`SERVER RUNNING AT PORT ${process.env.PORT}`);
})
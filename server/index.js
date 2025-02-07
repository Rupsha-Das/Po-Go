const express = require("express")
require('dotenv').config()
const http = require("http");
const { Server } = require("socket.io");
const app = express();

const server = http.createServer(app);


app.get("/",(req,res)=>{
    res.send("Server running fine!!!!!!")
})

server.listen(process.env.PORT,()=>{
    console.log(`SERVER RUNNING AT PORT ${process.env.PORT}`);
})
const express = require("express")
require('dotenv').config()


const app = express();

app.get("/",(req,res)=>{
    res.send("Server running fine!!!!!!")
})

app.listen(process.env.PORT,()=>{
    console.log(`SERVER RUNNING AT PORT ${process.env.PORT}`);
})
const express = require("express")

const app = express();

app.get("/",(req,res)=>{
    res.send("Server running fine!!!!!!")
})

app.listen(5002,()=>{
    console.log("SERVER RUNNING AT PORT 5002");
})
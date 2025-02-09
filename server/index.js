const WebSocket = require('ws');
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const app = express();
const User = require("./user.model.js");
const mongoose = require("mongoose");

// const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Maps to track connections
const producers = new Map();
const consumers = new Map();
const consumerEmails = new Map();

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
}));

app.get("/", (req, res) => {
  res.send("Server running fine!!!!!!");
});

function printPC() {
  console.log("producers\n___________");
  for (const [key, val] of producers) {
    console.log(`${key} - ${val}`);
  }
  console.log("consumers\n___________");
  for (const [key, val] of consumers) {
    console.log(`${key} - ${val}`);
  }
  console.log("emails\n___________");
  for (const [key, val] of consumerEmails) {
    console.log(`${key} - ${val}`);
  }
}

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`Client connected: ${clientId}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:\n' + JSON.stringify(data, null, 2));

      switch (data.action) {
        case 'register':
          if (data.type === 'producer') {

            // dev_id_temp <- (from mongo)
            // dev_id_temp++ if posture.overall == bad else dev_id_temp--
            // if dev_id_temp > threashold:
            //   send email to user
            // push


            producers.set(clientId, null);
          } else {
            consumers.set(clientId, null);
            consumerEmails.set(clientId, data.email);
          }
          ws.send(JSON.stringify({
            action: 'register_response',
            status: 'success',
            clientId: clientId
          }));
          break;

        case 'connect_to_producer':
          let connected = false;
          for (const [producerId, consumerId] of producers) {
            if (consumerId === null) {
              producers.set(producerId, clientId);
              consumers.set(clientId, producerId);
              connected = true;
              console.log(`Consumer:${clientId} Connected to Producer:${producerId}`);
              break;
            }
          }
          ws.send(JSON.stringify({
            action: 'connect_to_producer_result',
            status: connected ? 'success' : 'failure',
            message: connected ? 'Connected to Device' : 'Unable to Connect'
          }));
          break;

        case 'send_data_to_consumer':
          const consumerId = producers.get(clientId);
          const consumerEmail = consumerEmails.get(consumerId);
          console.log(`consumerId:${consumerId} and consumerEmail:${consumerEmail}`);
          
          let result = await User.findOne({ email: consumerEmail });
          let msg;
          
          if (!result) {
            msg = "User not exists!!";
          } else {
            await User.updateOne(
              { email: consumerEmail },
              {
                $set: { posture: [...data.posture, ...result.posture] },
              }
            );
            msg = "Successful update";
          }
          
          ws.send(JSON.stringify({
            action: 'posture_data_update',
            status: result ? 'success' : 'failure',
            message: msg
          }));
          break;

        default:
          ws.send(JSON.stringify({
            action: 'error',
            message: 'Unknown action'
          }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        action: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    
    // Clean up maps
    if (producers.has(clientId)) {
      producers.delete(clientId);
    }
    
    for (const [producerId, consumerId] of producers) {
      if (consumerId === clientId) {
        producers.set(producerId, null);
      }
    }
    
    if (consumers.has(clientId)) {
      consumers.delete(clientId);
    }
    
    if (consumerEmails.has(clientId)) {
      consumerEmails.delete(clientId);
    }
  });
});

// Keep the Express routes
app.get("/login", async (req, res) => {
  const { email, password } = req.body;
  let result = await User.findOne({ email });

  if (result && result.password === password) {
    res.send({
      status: 200,
      msg: "Success!!",
      data: result,
    });
  } else {
    res.send({
      status: 400,
      msg: "Invalid credentials!!",
      data: null,
    });
  }
});

app.post("/signin", async (req, res) => {
  const { name, email, password } = req.body;
  let result = await User.findOne({ email });
  
  if (result) {
    res.send({
      status: 400,
      msg: "User already registered!!",
      data: null,
    });
  } else {
    const userObj = new User({
      name,
      email,
      password,
    });

    result = await userObj.save();

    if (result) {
      res.send({
        status: 200,
        msg: "Success!!",
        data: result,
      });
    } else {
      res.send({
        status: 400,
        msg: "Failed!!",
        data: null,
      });
    }
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
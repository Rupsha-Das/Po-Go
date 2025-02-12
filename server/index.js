const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const app = express();
const User = require("./user.model.js");
const mongoose = require("mongoose");

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Maps to track connections
const producers = new Map();
const consumers = new Map();
const consumerEmails = new Map();

// New maps for client and device sockets
const clients = new Map();
const devices = new Map();

function sendToClient(email, payload) {
  const clientWs = clients.get(email);
  if (clientWs && clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify(payload));
  }
}

function sendToDevice(email, payload) {
  const deviceWs = devices.get(email);
  if (deviceWs && deviceWs.readyState === WebSocket.OPEN) {
    deviceWs.send(JSON.stringify(payload));
  }
}

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

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

wss.on("connection", (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`Client connected: ${clientId}`);

  // Send a connection response on new connection
  ws.send(
    JSON.stringify({
      action: "connection_response",
      status: "connected",
      message: "Connected to Device",
    })
  );

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      // Check for registration as a client or device
      if (data.type === "client") {
        clients.set(data.email, ws);
        console.log(`Registered client: ${data.email}`);
        return;
      }
      if (data.type === "device") {
        devices.set(data.email, ws);
        console.log(`Registered device: ${data.email}`);
        return;
      }

      console.log("Received:\n" + JSON.stringify(data, null, 2));
      switch (data.action) {
        case "update": {
          // Forward the update message to all clients
          for (const [email, clientWs] of clients.entries()) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(data));
            }
          }
          break;
        }
        case "register":
          if (data.type === "producer") {
            producers.set(clientId, null);
          } else {
            consumers.set(clientId, null);
            consumerEmails.set(clientId, data.email);
          }
          ws.send(
            JSON.stringify({
              action: "register_response",
              status: "success",
              clientId: clientId,
            })
          );
          break;

        case "connect_to_producer": {
          let connected = false;
          for (const [producerId, consumerId] of producers) {
            if (consumerId === null) {
              producers.set(producerId, clientId);
              consumers.set(clientId, producerId);
              connected = true;
              console.log(
                `Consumer:${clientId} Connected to Producer:${producerId}`
              );
              break;
            }
          }
          ws.send(
            JSON.stringify({
              action: "connect_to_producer_result",
              status: connected ? "success" : "failure",
              message: connected ? "Connected to Device" : "Unable to Connect",
            })
          );
          break;
        }

        case "send_data_to_consumer": {
          const consumerId = producers.get(clientId);
          const consumerEmail = consumerEmails.get(consumerId);
          console.log(
            `consumerId:${consumerId} and consumerEmail:${consumerEmail}`
          );

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

          ws.send(
            JSON.stringify({
              action: "posture_data_update",
              status: result ? "success" : "failure",
              message: msg,
            })
          );
          break;
        }

        default:
          console.log("Unknown action");
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          action: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
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

    // Remove from client and device maps
    for (const [email, socket] of clients) {
      if (socket === ws) {
        clients.delete(email);
      }
    }
    for (const [email, socket] of devices) {
      if (socket === ws) {
        devices.delete(email);
      }
    }
  });
});

// Express routes remain unchanged
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

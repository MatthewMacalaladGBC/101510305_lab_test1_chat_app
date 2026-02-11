const express = require("express");
const mongoose = require("mongoose");
const socketio = require("socket.io");

const app = express();

const server = app.listen(3000, () => {
    console.log(`Socket server running at http://localhost:3000/`);
});

const io = socketio(server);


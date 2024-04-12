import { initializeApp } from 'firebase/app';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDFzOgqAIICMGFvanomxjBXHcE3xWNkL94",
  authDomain: "unbored-e2c23.firebaseapp.com",
  projectId: "unbored-e2c23",
  storageBucket: "unbored-e2c23.appspot.com",
  messagingSenderId: "1048076691746",
  appId: "1:1048076691746:web:ccdd64785df38f3c23dd7b",
  databaseURL: "https://unbored-e2c23-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase
const initializeapp = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
const database = getDatabase(initializeapp);

const app = require("express")();
const http = require("http").createServer(app);
const cors = require("cors");
const PORT = process.env.PORT || 5000;

//Initialize new socket.io instance and pass the http server to it
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

io.on("connection", (socket) => {
  socket.on("login", ({ name, room }, callback) => {
    console.log("a user connected");
  });

  socket.on("create", function (room) {
    socket.join(room);
    console.log(socket.join(room));
  });
  socket.on("sendMessage", (message) => {});

  socket.on("connect", () => {
    console.log("user connected");
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

http.listen(PORT, () => {
  console.log(`Listening to ${PORT}`);
});

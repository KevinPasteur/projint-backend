import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDFzOgqAIICMGFvanomxjBXHcE3xWNkL94",
  authDomain: "unbored-e2c23.firebaseapp.com",
  projectId: "unbored-e2c23",
  storageBucket: "unbored-e2c23.appspot.com",
  messagingSenderId: "1048076691746",
  appId: "1:1048076691746:web:ccdd64785df38f3c23dd7b",
  databaseURL:
    "https://unbored-e2c23-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase
const appFirebase = initializeApp(firebaseConfig);
const database = getDatabase(appFirebase);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
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
    console.log(`Room ${room} joined`);
  });

  socket.on("sendMessage", (message) => {
    console.log("Message sent:", message);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

// Middleware pour analyser les corps de requête
app.use(bodyParser.json());

// Point de terminaison API pour créer un utilisateur
app.post("/create-user", async (req, res) => {
  try {
    const userData = req.body;
    const userId = Date.now().toString(); // Utilisez l'ID utilisateur généré par Firebase Auth
    await set(ref(database, `users/${userId}`), userData);
    res
      .status(200)
      .send({ message: "Utilisateur créé avec succès", userId: userId });
  } catch (error) {
    console.error("Erreur de création d'utilisateur", error);
    res.status(500).send({
      message: "Erreur lors de la création de l'utilisateur",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

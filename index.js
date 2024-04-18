import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get } from "firebase/database";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
dotenv.config();

console.log(process.env.VUE_APP_FIREBASE_DATABASE_URL);
const firebaseConfig = {
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
  databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
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
const secretKey = process.env.JWT_SECRET || "default_secret";
// Point de terminaison API pour créer un utilisateur
app.post("/create-user", async (req, res) => {
  try {
    // Check if the request body is missing or if essential fields are not provided
    if (
      !req.body ||
      !req.body.pseudo ||
      !req.body.prenom ||
      !req.body.nom ||
      !req.body.email ||
      !req.body.motDePasse
    ) {
      return res.status(400).send({
        message: "Missing required fields",
      });
    }

    const { pseudo, prenom, nom, email, motDePasse } = req.body;

    // Verify if name contains numbers
    if (/\d/.test(nom)) {
      return res.status(400).send({
        message: "Name must not contain numbers",
      });
    }

    // Verify if prenom contains numbers
    if (/\d/.test(prenom)) {
      return res.status(400).send({
        message: "First name must not contain numbers",
      });
    }

    // Verify password length
    if (motDePasse.length < 8) {
      return res.status(400).send({
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    // Check if pseudo or email already exists in the database
    const usersRef = ref(database, `users`);
    const usersSnapshot = await get(usersRef);
    let pseudoExists = false;
    let emailExists = false;

    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val();
        if (user.pseudo === pseudo) pseudoExists = true;
        if (user.email === email) emailExists = true;
      });
    }

    if (pseudoExists) {
      return res.status(400).send({
        message: "Pseudo already exists",
      });
    }

    if (emailExists) {
      return res.status(400).send({
        message: "Email already exists",
      });
    }

    // Create user data with the hashed password
    const userData = { ...req.body, motDePasse: hashedPassword };
    const userId = Date.now().toString();
    await set(ref(database, `users/${userId}`), userData);

    const token = jwt.sign({ uid: userId }, secretKey, {
      expiresIn: "24h",
    });

    res
      .status(201)
      .send({ token, message: "User created successfully", userId });
  } catch (error) {
    console.error("Error creating user", error);
    res.status(500).send({
      message: "Error creating the user",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, motDePasse } = req.body;
  const usersRef = ref(database, `users`);
  const snapshot = await get(usersRef);
  let userFound = null;

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      if (user.email === email) {
        userFound = user;
      }
    });
  }

  if (!userFound) {
    return res.status(404).send({ message: "Utilisateur non trouvé" });
  }

  const passwordIsValid = await bcrypt.compare(
    motDePasse,
    userFound.motDePasse
  );
  if (!passwordIsValid) {
    return res.status(401).send({ message: "Mot de passe incorrect" });
  }

  const token = jwt.sign({ uid: userFound.userId }, secretKey, {
    expiresIn: "24h",
  });
  res.send({ token });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, update, push } from "firebase/database";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateMultipleCodes, authenticateToken } from "./utils.js";
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

//saves the codes to the database
function saveCodes(codes) {
  const codesRef = ref(database, "codes");
  codes.forEach((code) => {
    set(ref(database, `codes/${code}`), { used: false });
  });
}

const codes = generateMultipleCodes(50);
//saveCodes(codes);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
const chatRooms = {};

io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté");

  // Rejoindre une chat room
  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`Test a rejoint la room ${roomId}`);

    // Envoyer l'historique des messages à l'utilisateur qui rejoint
    if (chatRooms[roomId]) {
      socket.emit("previousMessages", chatRooms[roomId].messages);
    }

    // Informer les autres utilisateurs de la room
    socket.to(roomId).emit("userJoined", "Test");

    socket.emit("roomJoined", { roomId }); // Envoyer le nom de la room au client
  });

  // Créer une chat room
  socket.on("createRoom", async (room) => {
    console.log(room.name);
    const roomId = push(ref(database, "rooms")).key; // Générer un ID unique

    const roomData = { roomId, ...room, messages: [] };

    console.log(roomData);

    chatRooms[roomId] = roomData;
    console.log(chatRooms[roomId]);

    await set(ref(database, `rooms/${roomId}`), roomData);
    console.log(`Room ${roomData.name} créée avec l'ID ${roomId}`);

    console.log("Room created", roomData);
    console.log("Room id", roomId);
    // Informer tous les utilisateurs de la nouvelle room
    io.emit("roomCreated", roomId);
  });

  socket.on("removeRoom", async (roomId) => {
    // Supprimer la room de la base de données
    await set(ref(database, `rooms/${roomId}`), null);

    // Informer tous les utilisateurs de la room
    io.emit("roomRemoved", roomId);
  });

  // Envoyer un message
  socket.on("sendMessage", async ({ roomId, message }) => {
    //@ Olivier Graber - HEIG-VD 2024 #pOWEREDBy ChatGPT 4 To be or not te be
    const roomsRef = ref(database, `rooms/${roomId}/roomId`);

    const snapshot = await get(roomsRef);

    if (snapshot.exists()) {
      const timestamp = Date.now();
      const messageData = { roomId, message, timestamp };

      console.log(messageData);

      // Stocker le message dans la base de données et en mémoire
      push(ref(database, `rooms/${roomId}/messages`), messageData);

      // Envoyer le message à tous les utilisateurs de la room
      io.to(roomId).emit("newMessage", messageData);
    }
  });

  socket.on("getMessages", async (roomId) => {
    try {
      const messagesRef = ref(database, `rooms/${roomId}/messages`);
      const snapshot = await get(messagesRef);

      if (snapshot.exists()) {
        const messagesData = Object.values(snapshot.val());
        socket.emit("previousMessages", messagesData);
      } else {
        // Handle the case where no messages exist
        socket.emit("previousMessages", []); // Send an empty list
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Handle error (e.g., send an error message to the client)
    }
  });

  socket.on("getChatRooms", async () => {
    try {
      const chatRoomsRef = ref(database, "rooms");
      const snapshot = await get(chatRoomsRef);

      if (snapshot.exists()) {
        const chatRoomsData = Object.values(snapshot.val()).map((room) => ({
          id: room.roomId, // Assuming you store the key in the room data
          name: room.name,
          description: room.description,
          createDate: room.createDate,
          expiryDate: room.expiryDate,
        }));
        socket.emit("chatRoomsList", chatRoomsData);
      } else {
        // Handle the case where no chat rooms exist
        socket.emit("chatRoomsList", []); // Send an empty list
      }
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      // Handle error (e.g., send an error message to the client)
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté");
  });
});

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

// Middleware pour analyser les corps de requête
app.use(bodyParser.json());
const secretKey = process.env.JWT_SECRET;
// Point de terminaison API pour créer un utilisateur

app.post("/verify-code", async (req, res) => {
  const { code } = req.body;
  const codeRef = ref(database, `codes/${code}`);
  const snapshot = await get(codeRef);

  if (snapshot.exists() && !snapshot.val().used) {
    //create a token

    const tokenC = jwt.sign({ code }, secretKey, {
      expiresIn: "24h",
    });

    res.send({ tokenC });
  } else {
    // Code invalide ou déjà utilisé
    res.status(400).send({ message: "Code invalide ou déjà utilisé." });
  }
});
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
        message:
          "Veuillez fournir un pseudo, un prénom, un nom, un email et un mot de passe",
      });
    }

    const { pseudo, prenom, nom, email, motDePasse, tokenC } = req.body;

    // Verify if name contains numbers
    if (/\d/.test(nom)) {
      return res.status(400).send({
        message: "Le nom ne doit pas contenir de chiffres",
      });
    }

    // Verify if prenom contains numbers
    if (/\d/.test(prenom)) {
      return res.status(400).send({
        message: "Le prénom ne doit pas contenir de chiffres",
      });
    }

    // Verify password length
    if (motDePasse.length < 8) {
      return res.status(400).send({
        message: "Le mot de passe doit contenir au moins 8 caractères",
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
        message: "Ce pseudo est déjà utilisé",
      });
    }

    if (emailExists) {
      return res.status(400).send({
        message: "Cette adresse email est déjà utilisée",
      });
    }

    // Create user data with the hashed password
    const userData = { ...req.body, motDePasse: hashedPassword };
    const userId = Date.now().toString();

    const decoded = jwt.verify(tokenC, secretKey);
    const codeRef = ref(database, `codes/${decoded.code}`);
    const snapshot = await get(codeRef);
    if (!snapshot.exists() || snapshot.val().used) {
      return res
        .status(400)
        .send({ message: "Code invalide ou déjà utilisé." });
    }
    await set(ref(database, `users/${userId}`), userData);
    await update(codeRef, { used: true });

    const token = jwt.sign({ uid: userId }, secretKey);

    res
      .status(201)
      .send({ token, message: "Ton compte a été crée avec succès", userId });
  } catch (error) {
    console.error("Il y a eu une erreur", error);
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

app.get("/boredRoom", authenticateToken, (req, res) => {
  // Logique spécifique à cette route, après vérification de l'authenticité du token
  res.json({ message: "Accès autorisé à la Bored Room" });
});

app.post("/validate-token", authenticateToken, (req, res) => {
  res.status(200).send({ valid: true }); // Le token est valide
});

app.get("/rooms/:id", async (req, res) => {
  try {
    const roomId = req.params.id;

    const roomRef = ref(database, `rooms/${roomId}/roomId`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const roomData = snapshot.val();
      res.send(roomData);
    } else {
      console.log("prout");
      res.status(404).send({ message: "Room not found" });
    }
  } catch (error) {
    console.error("Error retrieving room:", error);
    res.status(500).send({ message: "Error retrieving room" });
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

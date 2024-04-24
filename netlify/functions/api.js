import express from "express";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  push,
  increment,
} from "firebase/database";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateMultipleCodes, authenticateToken } from "../../utils.js";
dotenv.config();

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

const router = Router();

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

router.get("/hello", (req, res) => res.send("Hello World!"));

app.use("/api/", router);

export const handler = serverless(app);

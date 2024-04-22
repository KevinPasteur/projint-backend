import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";
function generateCode() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    // Génère un nombre entre 0 et 999, puis le formate pour avoir trois chiffres
    parts.push(("000" + Math.floor(Math.random() * 1000)).slice(-3));
  }
  return parts.join("-");
}

export function generateMultipleCodes(num) {
  const codes = new Set();
  while (codes.size < num) {
    codes.add(generateCode());
  }
  return Array.from(codes);
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

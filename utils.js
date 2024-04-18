function generateCode() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    // Génère un nombre entre 0 et 999, puis le formate pour avoir trois chiffres
    parts.push(("000" + Math.floor(Math.random() * 1000)).slice(-3));
  }
  return parts.join("-");
}

export default function generateMultipleCodes(num) {
  const codes = new Set();
  while (codes.size < num) {
    codes.add(generateCode());
  }
  return Array.from(codes);
}

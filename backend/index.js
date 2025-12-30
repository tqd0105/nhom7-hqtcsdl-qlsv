const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express backend " });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

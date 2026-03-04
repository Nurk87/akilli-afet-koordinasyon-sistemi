const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const db = require("./db");  // <- Bunu ekle

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Sistem Tasarımı ve Veritabanı Mimarisi Hazır.");
});

app.use("/api/auth", authRoutes);

app.listen(3000, () => {
  console.log("Server 3000 portunda çalışıyor");
});
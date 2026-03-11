const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const helpRequestRoutes = require("./routes/helpRequest"); // 4. Hafta rotası eklendi

const app = express();

app.use(cors());
app.use(express.json());

// HTML sayfalarımızı tarayıcıda göstermek için
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Sistem Tasarımı, Veritabanı Mimarisi ve Yardım Talep Modülü Hazır.");
});

// API Uç Noktaları
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/help-request", helpRequestRoutes); // 4. Hafta rotası sisteme bağlandı

app.listen(3000, () => {
  console.log("Server 3000 portunda çalışıyor...");
  console.log("Sistemi test etmek için: http://localhost:3000/register.html");
});
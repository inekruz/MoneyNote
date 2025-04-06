require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.SECRET_KEY || "none";

// Получение данных о пользователе
router.get("/getUser", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Получаем токен из заголовка

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Проверка и расшифровка токена
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    console.log("Decoded token data:", decoded);

    return res.status(200).json({ userData: decoded });
  });
});

module.exports = router;

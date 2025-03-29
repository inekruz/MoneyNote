require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.SECRET_KEY || "none";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, code) {
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: "Код подтверждения",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; text-align: center;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333;">Ваш код подтверждения</h2>
            <p style="font-size: 16px; color: #555;">Введите этот код для завершения входа или регистрации:</p>
            <div style="display: inline-block; padding: 10px 20px; font-size: 24px; font-weight: bold; color: #ffffff; background: #007bff; border-radius: 8px; letter-spacing: 2px;">
              ${code}
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #777;">Этот код действителен в течение 10 минут.</p>
          </div>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
  }

router.post("/register", async (req, res) => {
  const { login, email, password } = req.body;
  const verificationCode = generateCode();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (login, email, password, verification_code) VALUES ($1, $2, $3, $4)",
      [login, email, hashedPassword, verificationCode]
    );
    await sendVerificationEmail(email, verificationCode);
    res.status(201).json({ message: "Код подтверждения отправлен на email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при регистрации" });
  }
});

router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  const isEmail = identifier.includes("@");
  const field = isEmail ? "email" : "login";

  try {
    const result = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Неверный логин/email или пароль" });

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ error: "Неверный логин/email или пароль" });

    const verificationCode = generateCode();
    await pool.query("UPDATE users SET verification_code = $1 WHERE id = $2", [verificationCode, user.id]);
    await sendVerificationEmail(user.email, verificationCode);

    res.json({ message: "Код подтверждения отправлен на email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при входе" });
  }
});

router.post("/verify-code", async (req, res) => {
  const { identifier, code } = req.body;
  const isEmail = identifier.includes("@");
  const field = isEmail ? "email" : "login";

  try {
    const result = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Пользователь не найден" });

    const user = result.rows[0];
    if (user.verification_code !== code) return res.status(400).json({ error: "Неверный код" });

    await pool.query("UPDATE users SET verification_code = NULL WHERE id = $1", [user.id]);
    const token = jwt.sign({ id: user.id, login: user.login }, SECRET_KEY, { expiresIn: "24h" });
    res.json({ message: "Вход выполнен успешно", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка подтверждения кода" });
  }
});

module.exports = router;

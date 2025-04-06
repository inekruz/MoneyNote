const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');
const router = express.Router();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

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

const avatarsDir = path.join(__dirname, '..', 'avatars');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const tempName = Date.now() + ext;
    cb(null, tempName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Только изображения!'), false);
  }
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

// Получение данных о пользователе
router.get("/getUser", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
  
    if (!token) {
      return res.status(400).json({ error: "Токен не найден" });
    }
  
    // Проверка и расшифровка токена
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Ошибка при обработке токена" });
      }
  
      const { login } = decoded;
  
      try {
        const result = await pool.query(
          'SELECT * FROM users WHERE login = $1',
          [login]
        );
  
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Пользователь не найден" });
        }
  
        const userData = result.rows[0];
  
        return res.status(200).json({ userData });
      } catch (dbError) {
        console.error('Ошибка в бд:', dbError);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
    });
  });
  
// Обновление данных о пользователе
  router.post("/updUser", async (req, res) => {
    const { email, name, password } = req.body;
  
    if (!email || !name || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ error: "Токен не найден" });
  
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ error: "Ошибка токена" });
  
      const { login } = decoded;
  
      try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "Пользователь не найден" });
        }
  
        const user = result.rows[0];
  
        const verificationCode = generateCode();
  
        await pool.query('UPDATE users SET verification_code = $1 WHERE id = $2', [verificationCode, user.id]);
  
        await sendVerificationEmail(email, verificationCode);
  
        res.status(200).json({ message: "На вашу почту отправлен код подтверждения" });
  
      } catch (err) {
        console.error('Ошибка при отправке кода:', err);
        return res.status(500).json({ error: "Ошибка сервера" });
      }
    });
  });
  
  router.post("/verify-code", async (req, res) => {
    const { code } = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) return res.status(400).json({ error: "Токен не найден" });

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ error: "Ошибка токена" });
  
      const { login } = decoded;
  
      try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Пользователь не найден" });
  
        const user = result.rows[0];
  
        if (user.verification_code !== code) {
          return res.status(400).json({ error: "Неверный код" });
        }
  
        await pool.query("UPDATE users SET verification_code = NULL WHERE id = $1", [user.id]);
  
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await pool.query(
          `UPDATE users SET email = $1, name = $2, password = $3 WHERE login = $4`,
          [req.body.email, req.body.name, hashedPassword, login]
        );
  
        const newToken = jwt.sign({ id: user.id, login: user.login }, SECRET_KEY, { expiresIn: "24h" });
        res.json({ message: "Данные успешно обновлены", token: newToken });
  
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Ошибка подтверждения кода" });
      }
    });
  });

  
// Обновление аватарки пользователя
  router.post("/setAvatar", upload.single('avatar'), (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ error: "Токен не найден" });
  
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ error: "Ошибка токена" });
  
      const { login } = decoded;
      if (!req.file) return res.status(400).json({ error: "Аватарка не найдена" });
  
      const ext = path.extname(req.file.originalname).toLowerCase();
      const safeExt = ext.match(/\.jpg|\.jpeg|\.png|\.webp/) ? ext : '.png';
      const finalFileName = `avatar_${login}${safeExt}`;
      const finalFilePath = path.join(avatarsDir, finalFileName);
  
      try {

        const files = fs.readdirSync(avatarsDir);
        files.forEach(file => {
          if (file.startsWith(`avatar_${login}`) && file !== finalFileName) {
            fs.unlinkSync(path.join(avatarsDir, file));
          }
        });
  
        fs.renameSync(req.file.path, finalFilePath);
  
        await pool.query(
          'UPDATE users SET image_path = $1 WHERE login = $2',
          [finalFileName, login]
        );
  
        res.status(200).json({ message: "Аватарка успешно обновлена", imagePath: finalFileName });
      } catch (err) {
        console.error("Ошибка при сохранении аватарки:", err);
        res.status(500).json({ error: "Ошибка сервера" });
      }
    });
  });

// Получение аватарки пользователя
  router.get("/getAvatar", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ error: "Токен не найден" });
  
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ error: "Ошибка токена" });
  
      const { login } = decoded;
  
      try {
        const result = await pool.query(
          'SELECT image_path FROM users WHERE login = $1',
          [login]
        );
  
        const imageFile = result.rows[0]?.image_path;
        if (!imageFile) return res.status(404).json({ error: "Аватарка не найдена" });
  
        const fullPath = path.join(avatarsDir, imageFile);
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Аватарка не найдена" });
  
        res.sendFile(fullPath);
      } catch (err) {
        console.error("Ошибка при получении аватарки:", err);
        res.status(500).json({ error: "Ошибка сервера" });
      }
    });
  });

  
module.exports = router;

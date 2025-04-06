require("dotenv").config();
const express = require("express");
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

// Получение данных о пользователе
router.get("/getUser", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
  
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
  
    // Проверка и расшифровка токена
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Ошибка при обработке токена" });
      }
  
      const { login } = decoded;
  
      try {
        const result = await pool.query(
          'SELECT login, email, image_path FROM users WHERE login = $1',
          [login]
        );
  
        if (result.rows.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }
  
        const userData = result.rows[0];
  
        return res.status(200).json({ userData });
      } catch (dbError) {
        console.error('Ошибка в бд:', dbError);
        return res.status(500).json({ error: "Ошибка сервера" });
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

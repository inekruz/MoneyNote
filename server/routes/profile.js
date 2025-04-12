const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');
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

/**
 * @openapi
 * /user/getUser:
 *   get:
 *     summary: Получение данных о пользователе
 *     description: Получает данные о пользователе на основе токена
 *     responses:
 *       200:
 *         description: Данные о пользователе успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userData:
 *                   type: object
 *                   properties:
 *                     login:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     image_path:
 *                       type: string
 *       400:
 *         description: Токен не найден
 *       403:
 *         description: Ошибка при обработке токена
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Ошибка сервера
 */

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

/**
 * @openapi
 * /user/updateUser:
 *   post:
 *     summary: Обновление данных пользователя
 *     description: Обновляет данные пользователя (username, email, password)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Данные успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userData:
 *                   type: object
 *                   properties:
 *                     login:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Ошибка при обработке токена
 *       500:
 *         description: Ошибка сервера
 */

// Обновление данных пользователя
router.post("/updateUser", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;

    try {
      const { username, email, password } = req.body;

      const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const updateValues = [];
      const updateColumns = [];

      if (username) {
        updateColumns.push("username = $1");
        updateValues.push(username);
      }
      if (email) {
        updateColumns.push("email = $2");
        updateValues.push(email);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateColumns.push("password = $3");
        updateValues.push(hashedPassword);
      }

      if (updateColumns.length > 0) {
        const updateQuery = `UPDATE users SET ${updateColumns.join(", ")} WHERE login = $${updateValues.length + 1} RETURNING *`;
        const updatedUser = await pool.query(updateQuery, [...updateValues, login]);

        if (updatedUser.rows.length > 0) {
          res.status(200).json({ message: "Данные успешно обновлены", userData: updatedUser.rows[0] });
        } else {
          res.status(400).json({ error: "Ошибка при обновлении данных" });
        }
      } else {
        res.status(400).json({ error: "Нет данных для обновления" });
      }
    } catch (dbError) {
      console.error('Ошибка в бд:', dbError);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
});

/**
 * @openapi
 * /user/setAvatar:
 *   post:
 *     summary: Обновление аватарки пользователя
 *     description: Заменяет аватарку пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Аватарка успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imagePath:
 *                   type: string
 *       400:
 *         description: Токен не найден или аватарка не найдена
 *       403:
 *         description: Ошибка токена
 *       500:
 *         description: Ошибка при сохранении аватарки
 */

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

/**
 * @openapi
 * /user/getAvatar:
 *   get:
 *     summary: Получение аватарки пользователя
 *     description: Получает аватарку пользователя
 *     responses:
 *       200:
 *         description: Аватарка успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image:
 *                   type: string
 *       400:
 *         description: Токен не найден
 *       403:
 *         description: Ошибка токена
 *       404:
 *         description: Аватарка не найдена
 *       500:
 *         description: Ошибка сервера
 */
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

// Загружаем переменные окружения из файла .env
require("dotenv").config();

// Подключаем необходимые модули
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");

// Инициализация роутера и пула соединений с базой данных
const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Секретный ключ для JWT
const SECRET_KEY = process.env.SECRET_KEY || "none";

// Настройка транспортера для отправки email через SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Функция для генерации 6-значного кода
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Функция для отправки email с кодом подтверждения
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
    `,
  };
  
  // Отправляем email
  await transporter.sendMail(mailOptions);
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     description: Регистрирует нового пользователя в системе с подтверждением через код, отправляемый на email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Успешная регистрация, код отправлен на email
 *       500:
 *         description: Ошибка при регистрации
 */
router.post("/register", async (req, res) => {
  const { login, email, password } = req.body;
  const verificationCode = generateCode();

  try {
    // Хешируем пароль перед сохранением в базе данных
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Сохраняем данные пользователя в базе
    await pool.query(
      "INSERT INTO users (login, email, password, verification_code) VALUES ($1, $2, $3, $4)",
      [login, email, hashedPassword, verificationCode]
    );
    
    // Отправляем email с кодом подтверждения
    await sendVerificationEmail(email, verificationCode);
    res.status(201).json({ message: "Код подтверждения отправлен на email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при регистрации" });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Вход пользователя
 *     description: Вход в систему через логин или email, с отправкой кода подтверждения на email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Код подтверждения отправлен на email
 *       401:
 *         description: Неверный логин/email или пароль
 *       500:
 *         description: Ошибка при входе
 */
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  const isEmail = identifier.includes("@");
  const field = isEmail ? "email" : "login";

  try {
    // Проверяем наличие пользователя в базе данных по логину или email
    const result = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Неверный логин/email или пароль" });

    const user = result.rows[0];
    
    // Проверяем правильность пароля
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ error: "Неверный логин/email или пароль" });

    // Генерируем новый код подтверждения и обновляем его в базе
    const verificationCode = generateCode();
    await pool.query("UPDATE users SET verification_code = $1 WHERE id = $2", [verificationCode, user.id]);

    // Отправляем email с кодом подтверждения
    await sendVerificationEmail(user.email, verificationCode);

    res.json({ message: "Код подтверждения отправлен на email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка при входе" });
  }
});

/**
 * @openapi
 * /auth/verify-code:
 *   post:
 *     summary: Проверка кода подтверждения
 *     description: Проверяет введенный код подтверждения и выдает JWT токен при успешной проверке.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Вход выполнен успешно, JWT токен возвращен
 *       400:
 *         description: Неверный код
 *       500:
 *         description: Ошибка подтверждения кода
 */
router.post("/verify-code", async (req, res) => {
  const { identifier, code } = req.body;
  const isEmail = identifier.includes("@");
  const field = isEmail ? "email" : "login";

  try {
    // Проверяем наличие пользователя в базе данных
    const result = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [identifier]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Пользователь не найден" });

    const user = result.rows[0];
    
    // Проверяем правильность введенного кода
    if (user.verification_code !== code) return res.status(400).json({ error: "Неверный код" });

    // Очищаем код подтверждения в базе данных
    await pool.query("UPDATE users SET verification_code = NULL WHERE id = $1", [user.id]);

    // Генерируем JWT токен
    const token = jwt.sign({ id: user.id, login: user.login }, SECRET_KEY, { expiresIn: "24h" });

    res.json({ message: "Вход выполнен успешно", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Ошибка подтверждения кода" });
  }
});

// Экспорт маршрутов для использования в других частях приложения
module.exports = router;

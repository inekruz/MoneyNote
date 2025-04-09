const express = require('express');
const jwt = require('jsonwebtoken');
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

// Middleware для извлечения login из токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.login = decoded.login;
    next();
  });
};

// Добавление уведомления
router.post('/add', authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  const login = req.login;

  try {
    const result = await pool.query(
      'INSERT INTO notification (title, description, ulogin) VALUES ($1, $2, $3) RETURNING *',
      [title, description, login]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании уведомления' });
  }
});

// Получение всех уведомлений
router.get('/get', authenticateToken, async (req, res) => {
  const login = req.login;

  try {
    const result = await pool.query(
      'SELECT * FROM notification WHERE ulogin = $1 ORDER BY created_at DESC',
      [login]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении уведомлений' });
  }
});

// Удаление уведомлений
router.delete('/del/:id', authenticateToken, async (req, res) => {
  const login = req.login;
  const id = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM notification WHERE id = $1 AND ulogin = $2 RETURNING *',
      [id, login]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено или нет доступа' });
    }

    res.json({ message: 'Уведомление удалено', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении уведомления' });
  }
});

// GET количество новых уведомлений
router.get('/new', authenticateToken, async (req, res) => {
    const login = req.login;
  
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM notification WHERE ulogin = $1 AND is_read = false',
        [login]
      );
      const count = result.rows[0].count;
      res.json({ count: parseInt(count, 10) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка при подсчете новых уведомлений' });
    }
  });

  
module.exports = router;

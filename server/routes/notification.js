const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();
const webpush = require('../webpush');

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

    const subRes = await pool.query(
      'SELECT subscription FROM push_subscriptions WHERE ulogin = $1',
      [login]
    );

    if (subRes.rows.length > 0) {
      const subscription = subRes.rows[0].subscription;
      await webpush.sendNotification(subscription, JSON.stringify({ title, description }));
    }

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

// Маршрут для обновления состояния уведомлений (is_read = true)
router.patch('/read', authenticateToken, async (req, res) => {
    const login = req.login;
  
    try {
      const result = await pool.query(
        'UPDATE notification SET is_read = true WHERE ulogin = $1 AND is_read = false RETURNING *',
        [login]
      );
  
      res.json({ message: 'Уведомления обновлены', updated: result.rowCount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка при обновлении уведомлений' });
    }
  });

// Маршрут для получения состояния уведомлений в настройках ( вкл / выкл )
router.get('/getCheck', authenticateToken, async (req, res) => {
    const login = req.login;
  
    try {
      const result = await pool.query(
        'SELECT * FROM notification_check WHERE ulogin = $1',
        [login]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Настройки уведомлений не найдены' });
      }
  
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Ошибка при получении настроек уведомлений:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

router.post('/updateCheck', authenticateToken, async (req, res) => {
    const login = req.login;
    const { is_income, is_expense, is_goals, is_reports, is_auth } = req.body;
  
    try {
      const checkExist = await pool.query(
        'SELECT id FROM notification_check WHERE ulogin = $1',
        [login]
      );
  
      if (checkExist.rows.length === 0) {
        await pool.query(
          `INSERT INTO notification_check 
            (ulogin, is_income, is_expense, is_goals, is_reports, is_auth)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [login, is_income, is_expense, is_goals, is_reports, is_auth]
        );
      } else {
        await pool.query(
          `UPDATE notification_check SET 
            is_income = $1,
            is_expense = $2,
            is_goals = $3,
            is_reports = $4,
            is_auth = $5
           WHERE ulogin = $6`,
          [is_income, is_expense, is_goals, is_reports, is_auth, login]
        );
      }
  
      res.json({ message: 'Настройки уведомлений обновлены успешно' });
    } catch (error) {
      console.error('Ошибка при обновлении уведомлений:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  });

router.post('/subscribe', authenticateToken, async (req, res) => {
  const { subscription } = req.body;
  const login = req.login;

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (ulogin, subscription)
        VALUES ($1, $2)
        ON CONFLICT (ulogin) DO UPDATE SET subscription = EXCLUDED.subscription`,
      [login, subscription]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при сохранении подписки' });
  }
});

module.exports = router;

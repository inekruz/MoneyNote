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

/**
 * @openapi
 * /goals/create:
 *   post:
 *     summary: Создание новой цели
 *     description: Позволяет пользователю создать цель с указанием суммы, срока и заголовка.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Успешно создана цель
 *       500:
 *         description: Ошибка при создании цели
 */
router.post('/create', authenticateToken, async (req, res) => {
  const { title, amount, deadline } = req.body;
  const login = req.login;

  try {
    const result = await pool.query(
      `INSERT INTO goals (ulogin, title, amount, deadline, saved) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [login, title, amount, deadline, 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при создании цели' });
  }
});

/**
 * @openapi
 * /goals/getGoals:
 *   get:
 *     summary: Получение всех целей пользователя
 *     description: Возвращает список всех целей пользователя, отсортированных по дате создания.
 *     responses:
 *       200:
 *         description: Список целей пользователя
 *       500:
 *         description: Ошибка при получении целей
 */
router.get('/getGoals', authenticateToken, async (req, res) => {
  const login = req.login;

  try {
    const result = await pool.query(
      `SELECT * FROM goals WHERE ulogin = $1 ORDER BY created_at DESC`,
      [login]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении целей' });
  }
});

/**
 * @openapi
 * /goals/{id}:
 *   put:
 *     summary: Обновление информации о цели
 *     description: Обновляет информацию о цели пользователя, включая заголовок, сумму и срок.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели для обновления
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Цель обновлена успешно
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при обновлении цели
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, amount, deadline } = req.body;
  const login = req.login;

  try {
    const result = await pool.query(
      `UPDATE goals SET title = $1, amount = $2, deadline = $3
       WHERE id = $4 AND ulogin = $5 RETURNING *`,
      [title, amount, deadline, id, login]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Цель не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обновлении цели' });
  }
});

/**
 * @openapi
 * /goals/{id}/add:
 *   post:
 *     summary: Добавление суммы к накоплению по цели
 *     description: Добавляет сумму к уже накопленной на цель.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Сумма добавлена к цели
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при добавлении накоплений
 */
router.post('/:id/add', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const login = req.login;

  try {
    const result = await pool.query(
      `UPDATE goals SET saved = saved + $1 WHERE id = $2 AND ulogin = $3 RETURNING *`,
      [amount, id, login]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Цель не найдена' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при добавлении накоплений' });
  }
});

/**
 * @openapi
 * /goals/{id}:
 *   delete:
 *     summary: Удаление цели
 *     description: Удаляет указанную цель пользователя.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели для удаления
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Цель удалена
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при удалении цели
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const login = req.login;

  try {
    const result = await pool.query(
      `DELETE FROM goals WHERE id = $1 AND ulogin = $2 RETURNING *`,
      [id, login]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Цель не найдена' });
    res.json({ message: 'Цель удалена' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при удалении цели' });
  }
});

module.exports = router;

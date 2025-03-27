require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
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

const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Регистрация пользователя
router.post('/register', async (req, res) => {
    const { login, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (login, email, password) VALUES ($1, $2, $3) RETURNING id, login, email',
            [login, email, hashedPassword]
        );
        res.status(201).json({ message: 'Пользователь зарегистрирован', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Авторизация пользователя
router.post('/login', async (req, res) => {
    const { login, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }

        const token = jwt.sign({ id: user.id, login: user.login }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ message: 'Авторизация успешна', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

module.exports = router;

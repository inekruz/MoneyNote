require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Получение всех категорий
router.get("/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM expense_categories");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка получения категорий" });
  }
});

// Добавление дохода или расхода
router.post("/add", async (req, res) => {
  const { type, amount, description, category_id } = req.body;

  if (amount <= 0) {
    return res.status(400).json({ error: "Сумма должна быть положительной!" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO transactions (type, amount, description, category_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [type, amount, description, category_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка добавления данных" });
  }
});

// Получение всех транзакций
router.post("/alltransactions", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM transactions");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка получения всех категорий" });
  }
});

// Получение транзакций с фильтрацией 
router.post("/transactions", async (req, res) => {
    const { type, startDate, endDate, categoryId } = req.body;
  
    let query = `
      SELECT t.*, c.name AS category_name 
      FROM transactions t
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1; // Индексация параметров для SQL-запроса
  
    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (startDate && endDate) {
      query += ` AND t.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }
    if (categoryId) {
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }
  
    try {
      const result = await pool.query(query, params);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error("Ошибка при запросе в БД:", err);
      res.status(500).json({ error: "Ошибка получения данных" });
    }
  });
  

module.exports = router;

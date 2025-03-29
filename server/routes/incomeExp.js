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

// Получение всех операций с фильтрацией и добавлением названия категории
router.get("/transactions", async (req, res) => {
    const { type, startDate, endDate, categoryId } = req.query;
  
    let query = `
      SELECT t.*, c.name AS category_name 
      FROM transactions t
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
  
    if (type) {
      query += " AND t.type = $1";
      params.push(type);
    }
    if (startDate && endDate) {
      query += " AND t.date BETWEEN $2 AND $3";
      params.push(startDate, endDate);
    }
    if (categoryId) {
      query += " AND t.category_id = $4";
      params.push(categoryId);
    }
  
    try {
      const result = await pool.query(query, params);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения данных" });
    }
  });
  

module.exports = router;

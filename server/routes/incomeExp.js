require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const json2csv = require('json2csv').parse;
const { jsPDF } = require('jspdf');
const xlsx = require('xlsx');
const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.SECRET_KEY || "none";

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
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Сумма должна быть положительной!" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;

    try {
      const result = await pool.query(
        `INSERT INTO transactions (type, amount, description, category_id, ulogin)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [type, amount, description, category_id, login]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка добавления данных" });
    }
  });
});

// Получение всех транзакций
router.get("/alltransactions", async (req, res) => {
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
      const result = await pool.query("SELECT * FROM transactions WHERE ulogin = $1", [login]);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка получения всех категорий" });
    }
  });
});

// Получение транзакций с фильтрацией 
router.post("/transactions", async (req, res) => {
  const { type, startDate, endDate, categoryId } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;

    let query = `
      SELECT t.*, c.name AS category_name 
      FROM transactions t
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE t.ulogin = $1
    `;
    const params = [login];
    let paramIndex = 2;

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
});

// Функция для преобразования даты в формат dd/mm/yyyy
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Функция для перевода типа на русский
const translateType = (type) => {
  return type === 'income' ? 'Доход' : 'Расход';
};

// Маршрут для скачивания отчета
router.post("/download-report", async (req, res) => {
  const { type, startDate, endDate, categoryId, format } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;
    let query = `
      SELECT t.*, c.name AS category_name 
      FROM transactions t
      LEFT JOIN expense_categories c ON t.category_id = c.id
      WHERE t.ulogin = $1
    `;
    const params = [login];
    let paramIndex = 2;

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
      const data = result.rows;

      const formattedData = data.map((item, index) => ({
        index: index + 1,
        type: translateType(item.type),
        amount: item.amount,
        description: item.description || '—',
        category: item.category_name,
        date: formatDate(item.date),
      }));

      if (format === 'CSV') {
        const csv = json2csv(formattedData);
        res.header('Content-Type', 'text/csv');
        res.attachment('transactions.csv');
        return res.send(csv);
      }
      if (format === 'JSON') {
        res.header('Content-Type', 'application/json');
        res.attachment('transactions.json');
        return res.send(JSON.stringify(formattedData));
      }
      if (format === 'TXT') {
        const txt = formattedData.map(item => 
          `№: ${item.index}, Тип: ${item.type}, Сумма: ${item.amount}, Описание: ${item.description}, Категория: ${item.category}, Дата: ${item.date}`
        ).join('\n');
        res.header('Content-Type', 'text/plain');
        res.attachment('transactions.txt');
        return res.send(txt);
      }
      if (format === 'PDF') {
        let htmlContent = `
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  color: #333;
                  margin: 20px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                }
                table, th, td {
                  border: 1px solid #ccc;
                }
                th, td {
                  padding: 8px;
                  text-align: left;
                }
                th {
                  background-color: #f2f2f2;
                }
                tr:nth-child(even) {
                  background-color: #f9f9f9;
                }
                h1 {
                  text-align: center;
                  color: #1a73e8;
                }
                .footer {
                  text-align: center;
                  font-size: 10px;
                  color: #aaa;
                }
              </style>
            </head>
            <body>
              <h1>Отчет по транзакциям</h1>
              <table>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Описание</th>
                    <th>Категория</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
        `;

        formattedData.forEach(item => {
          htmlContent += `
            <tr>
              <td>${item.index}</td>
              <td>${item.type}</td>
              <td>${item.amount}</td>
              <td>${item.description}</td>
              <td>${item.category}</td>
              <td>${item.date}</td>
            </tr>
          `;
        });

        htmlContent += `
                </tbody>
              </table>
              <div class="footer">Сгенерировано автоматически</div>
            </body>
          </html>
        `;

        const doc = new jsPDF();

        doc.html(htmlContent, {
          callback: function (doc) {
            res.header('Content-Type', 'application/pdf');
            res.attachment('transactions.pdf');
            res.send(doc.output());
          },
          margin: [20, 20, 20, 20],
          x: 10,
          y: 10,
        });

        return;
      }
      if (format === 'EXCEL') {
        const ws = xlsx.utils.json_to_sheet(formattedData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Transactions');
        const file = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('transactions.xlsx');
        return res.send(file);
      }
      
      res.status(400).json({ error: "Неверный формат" });
    } catch (err) {
      console.error("Ошибка при запросе в БД:", err);
      res.status(500).json({ error: "Ошибка генерации отчета" });
    }
  });
});

module.exports = router;

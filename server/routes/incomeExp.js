require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');
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

/**
 * @openapi
 * /inex/categories:
 *   get:
 *     summary: Получение всех категорий расходов
 *     description: Получает список всех категорий для расходов.
 *     responses:
 *       200:
 *         description: Список категорий расходов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */

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

/**
 * @openapi
 * /inex/add:
 *   post:
 *     summary: Добавление новой транзакции (доход/расход)
 *     description: Добавляет новую транзакцию в базу данных, включая информацию о типе, сумме, описании и категории.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               category_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Транзакция успешно добавлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 type:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 description:
 *                   type: string
 *                 category_id:
 *                   type: integer
 *       400:
 *         description: Неверные данные в запросе
 *       500:
 *         description: Ошибка на сервере
 */

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

/**
 * @openapi
 * /inex/alltransactions:
 *   get:
 *     summary: Получение всех транзакций текущего пользователя
 *     description: Получает все транзакции для авторизованного пользователя.
 *     responses:
 *       200:
 *         description: Список транзакций
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   description:
 *                     type: string
 *                   category_id:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date-time
 */

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

/**
 * @openapi
 * /inex/transactions:
 *   post:
 *     summary: Получение транзакций с фильтрацией
 *     description: >
 *       Получает транзакции по фильтрам: типу, дате и категории.
 *       В параметрах запроса можно указать:
 *       - Тип транзакции (например, доход или расход)
 *       - Начальную и конечную дату
 *       - ID категории для фильтрации по категории.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               categoryId:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Список транзакций по фильтрам
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   description:
 *                     type: string
 *                   category_name:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date-time
 *       '400':
 *         description: Неверный формат данных
 *       '500':
 *         description: Ошибка на сервере
 */

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

const fontPath = path.join(__dirname, 'DejaVuSans.ttf');
const fontBase64 = fs.readFileSync(fontPath, 'base64');

/**
 * @openapi
 * /inex/download-report:
 *   post:
 *     summary: Генерация и скачивание отчета по транзакциям
 *     description: Создает отчет в выбранном формате (CSV, JSON, TXT, PDF, EXCEL) по транзакциям.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               categoryId:
 *                 type: integer
 *               format:
 *                 type: string
 *                 enum: [CSV, JSON, TXT, PDF, EXCEL]
 *     responses:
 *       200:
 *         description: Файл отчета успешно сгенерирован
 *       400:
 *         description: Ошибка генерации отчета или неверный формат
 *       500:
 *         description: Ошибка на сервере
 */

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
        const doc = new jsPDF();
      
        doc.addFileToVFS("DejaVuSans.ttf", fontBase64);
        doc.addFont("DejaVuSans.ttf", "dejavu", "normal");
        doc.setFont("dejavu", "normal");
        doc.setFontSize(12);
      
        doc.setTextColor(0, 51, 102);
        doc.setFontSize(18);
        doc.text("Отчет по транзакциям", 14, 20);
      
        const headers = ['№', 'Тип', 'Сумма', 'Описание', 'Категория', 'Дата'];
        let yOffset = 30;
      
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        doc.rect(10, yOffset, 190, 10, 'F');
      
        headers.forEach((header, index) => {
          doc.text(header, 15 + index * 32, yOffset + 7);
        });
      
        yOffset += 12;
        formattedData.forEach((item, index) => {
          doc.setFillColor(index % 2 === 0 ? 255 : 245, 245, 245);
          doc.rect(10, yOffset, 190, 10, 'F');
      
          doc.text(`${item.index}`, 15, yOffset + 7);
          doc.text(item.type, 45, yOffset + 7);
          doc.text(item.amount.toString(), 75, yOffset + 7);
          doc.text(item.description, 105, yOffset + 7);
          doc.text(item.category, 145, yOffset + 7);
          doc.text(item.date, 175, yOffset + 7);
      
          yOffset += 10;
        });
      
        res.header('Content-Type', 'application/pdf');
        res.attachment('transactions.pdf');
        return res.send(doc.output());
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

/**
 * @openapi
 * /inex/upload-report:
 *   post:
 *     summary: Загрузка отчета и добавление транзакций в базу
 *     description: Загружает транзакции из файла в базу данных для текущего пользователя.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 description:
 *                   type: string
 *                 category:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date-time
 *     responses:
 *       200:
 *         description: Данные успешно загружены
 *       400:
 *         description: Ошибка загрузки данных или неверная категория
 *       500:
 *         description: Ошибка на сервере
 */

// Маршрут для загрузки данных
router.post('/upload-report', async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;
    const transactions = req.body;

    try {
      for (const transaction of transactions) {
        const { type, amount, description, category, date } = transaction;

        const categoryResult = await pool.query(
          `SELECT id FROM expense_categories WHERE name = $1`,
          [category]
        );

        if (categoryResult.rows.length === 0) {
          return res.status(400).json({ error: `Категория "${category}" не найдена` });
        }

        const categoryId = categoryResult.rows[0].id;

        await pool.query(
          `INSERT INTO transactions (type, amount, description, category_id, date, ulogin)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [type, amount, description, categoryId, date, login]
        );
      }

      res.status(200).json({ success: true, message: 'Данные успешно загружены!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ошибка загрузки данных в базу" });
    }
  });
});


module.exports = router;

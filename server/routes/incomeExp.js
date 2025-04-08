require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const fs = require('fs');
const path = require('path');
const json2csv = require('json2csv').parse;
const { jsPDF } = require('jspdf');
const xlsx = require('xlsx');
const multer = require('multer');
const csv = require('csv-parser');
const router = express.Router();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.SECRET_KEY || "none";
const upload = multer({ dest: 'uploads/' });
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

const fontPath = path.join(__dirname, 'DejaVuSans.ttf');
const fontBase64 = fs.readFileSync(fontPath, 'base64');

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

// Маршрут для загрузки отчетов
router.post('/upload-report', upload.single('file'), (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(400).json({ error: "Токен не найден" });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Ошибка при обработке токена" });
    }

    const { login } = decoded;
    const filePath = req.file.path;

    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension === '.csv') {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', async () => {
          try {
            for (const row of results) {
              const { type, amount, description, category, date } = row;
              await pool.query(
                `INSERT INTO transactions (type, amount, description, category_name, date, ulogin)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [type, amount, description, category, date, login]
              );
            }
            res.status(200).json({ message: 'Данные из CSV успешно загружены' });
          } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Ошибка при загрузке данных' });
          }
        });
    }

    else if (fileExtension === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      try {
        for (const row of data) {
          const { type, amount, description, category, date } = row;
          await pool.query(
            `INSERT INTO transactions (type, amount, description, category_name, date, ulogin)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [type, amount, description, category, date, login]
          );
        }
        res.status(200).json({ message: 'Данные из EXCEL успешно загружены' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при загрузке данных' });
      }
    }

    else if (fileExtension === '.txt') {
      const results = [];
      fs.readFile(filePath, 'utf8', async (err, data) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка чтения файла' });
        }

        const lines = data.split('\n');
        lines.forEach(line => {
          const fields = line.split(',');
          results.push({
            type: fields[1],
            amount: fields[2],
            description: fields[3],
            category: fields[4],
            date: fields[5],
          });
        });

        try {
          for (const row of results) {
            const { type, amount, description, category, date } = row;
            await pool.query(
              `INSERT INTO transactions (type, amount, description, category_name, date, ulogin)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [type, amount, description, category, date, login]
            );
          }
          res.status(200).json({ message: 'Данные из TXT успешно загружены' });
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Ошибка при загрузке данных' });
        }
      });
    }

    else {
      res.status(400).json({ error: 'Неподдерживаемый формат файла' });
    }
  });
});
module.exports = router;

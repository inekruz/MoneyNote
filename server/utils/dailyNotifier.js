const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

const notificationsMap = {
  is_income: {
    title: "Доходы на сегодня",
    description: "Не забудьте добавить доходы за сегодня.",
  },
  is_expense: {
    title: "Расходы на сегодня",
    description: "Не забудьте добавить расходы за сегодня.",
  },
  is_goals: {
    title: "Финансовые цели",
    description: "Проверьте свои цели и прогресс за сегодня.",
  },
  is_reports: {
    title: "Отчеты",
    description: "Посмотрите отчеты за день.",
  },
  is_auth: {
    title: "Безопасность",
    description: "Проверьте последние входы и настройки аккаунта.",
  },
};

async function sendNotifications() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM notification_check");

    for (const row of res.rows) {
      const { ulogin, last_notified } = row;
      const now = new Date();
      const diffHours = (now - new Date(last_notified)) / 1000 / 60 / 60;

    //   if (diffHours < 24) continue;
    if (diffHours < 0.01) continue; // ~36 секунд

      for (const key of Object.keys(notificationsMap)) {
        if (row[key]) {
          const userRes = await client.query(
            "SELECT email FROM users WHERE login = $1",
            [ulogin]
          );
          const email = userRes.rows[0]?.email;
          if (!email) continue;

          const { title, description } = notificationsMap[key];

          await transporter.sendMail({
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: title,
            text: `Привет, ${ulogin}! ${description}`,
          });

          await client.query(
            "INSERT INTO notification (title, description, ulogin) VALUES ($1, $2, $3)",
            [title, description, ulogin]
          );
        }
      }

      await client.query(
        "UPDATE notification_check SET last_notified = NOW() WHERE ulogin = $1",
        [ulogin]
      );
    }
  } catch (err) {
    console.error("Ошибка при отправке уведомлений:", err);
  } finally {
    client.release();
  }
}

// function startDailyNotifications() {
//   cron.schedule("0 10 * * *", () => {
//     console.log("✅ Запуск ежедневной задачи уведомлений:", new Date().toLocaleString());
//     sendNotifications();
//   });
// }

function startDailyNotifications() {
    cron.schedule("*/30 * * * * *", () => {
      console.log("✅ [Тест] Запуск уведомлений:", new Date().toLocaleString());
      sendNotifications();
    });
  }

  
module.exports = startDailyNotifications;

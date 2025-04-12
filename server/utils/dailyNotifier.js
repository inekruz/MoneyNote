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
      title: "💸 Пора пополнить копилку!",
      description: "Не забудьте внести доходы за сегодня — дайте деньгам знать, что они вам нужны! 😉",
    },
    is_expense: {
      title: "📉 Расходы под контролем",
      description: "Добавьте сегодняшние траты и не дайте деньгам ускользнуть незамеченными!",
    },
    is_goals: {
      title: "🎯 Финансовые цели ждут вас",
      description: "Проверьте прогресс: каждая копейка приближает вас к мечте!",
    },
    is_reports: {
      title: "📊 Ваш дневной отчёт",
      description: "Загляните в отчёты и узнайте, как вы управляли своими финансами сегодня.",
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

      if (diffHours < 24) continue;

      for (const key of Object.keys(notificationsMap)) {
        if (row[key]) {
          const userRes = await client.query(
            "SELECT email FROM users WHERE login = $1",
            [ulogin]
          );
          const email = userRes.rows[0]?.email;
          if (!email) continue;
      
          let { title, description } = notificationsMap[key];
      
          if (key === "is_goals") {
            const goalsRes = await client.query(
              "SELECT title, amount, saved, deadline FROM goals WHERE ulogin = $1",
              [ulogin]
            );
      
            const goalMessages = [];
      
            const nowDate = new Date();
      
            for (const goal of goalsRes.rows) {
              const { title: goalTitle, amount, saved, deadline } = goal;
              const progress = saved / amount;
              const deadlineDate = new Date(deadline);
              const daysLeft = Math.ceil((deadlineDate - nowDate) / (1000 * 60 * 60 * 24));
      
              if (progress >= 0.8 && progress < 1) {
                goalMessages.push(`Вы почти накопили на ${goalTitle}! Осталось совсем чуть-чуть.`);
              }
      
              if (daysLeft <= 7 && progress < 1) {
                goalMessages.push(`Поторопитесь! До дедлайна цели "${goalTitle}" осталось ${daysLeft} дн${daysLeft === 1 ? "ь" : "я"}.`);
              }
            }
      
            if (goalMessages.length > 0) {
              description = goalMessages.join("\n");
            } else {
              description = "Проверьте прогресс: каждая копейка приближает вас к мечте!";
            }
          }
      
          await transporter.sendMail({
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: title,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
              <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h2 style="color: #2c3e50;">👋 Привет, <strong>${ulogin}</strong>!</h2>
                <p style="font-size: 16px; color: #34495e; line-height: 1.6;">${description.replace(/\n/g, "<br>")}</p>
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://minote.ru" style="background-color: #4CAF50; color: white; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Перейти в Minote</a>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />
                <p style="font-size: 13px; color: #95a5a6;">Это автоматическое сообщение. Вы можете отключить уведомления в настройках вашего профиля на Minote.ru</p>
              </div>
            </div>
          `,          
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

function startDailyNotifications() {
  cron.schedule("0 10 * * *", () => {
    console.log("✅ Запуск ежедневной задачи уведомлений:", new Date().toLocaleString());
    sendNotifications();
  });
}

module.exports = startDailyNotifications;

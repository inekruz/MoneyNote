// Импортируем необходимые библиотеки и модули
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const authRoutes = require('./routes/auth');
const InExpRoutes = require('./routes/incomeExp');
const UserRoutes = require('./routes/profile');
const GoalsRoutes = require('./routes/goals');
const NotificationRoutes = require('./routes/notification');
const startDailyNotifications = require('./utils/dailyNotifier');

// Создаем экземпляр приложения Express
const app = express();
const port = process.env.PORT || 3001;

// Настройка CORS для разрешения кросс-доменных запросов
app.use(cors());

// Настройка парсинга JSON в теле запросов
app.use(express.json());

// Настройка Swagger-JSDoc
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Документация проекта MINOTE',
      version: '1.0.0',
      description: `
        <h2>Документация</h2>
        <p>Документация создана для сторонних разработчиков, которые хотят использовать финансовый помощник MINOTE.</p>

        <h3>Адрес сервера</h3>
        <p><a href="https://api.minote.ru/">https://api.minote.ru/</a></p>

        <h3>Формат обращения к маршрутам</h3>
        <p>Для обращения к маршрутам используется следующий формат:</p>
        <p><code>https://api.minote.ru/%routes%</code></p>

        <h3>Маршруты</h3>
        <ul>
          <li>Для авторизации: <code>%routes% = auth</code></li>
          <li>Для учета доходов и расходов: <code>%routes% = inex</code></li>
          <li>Для профиля пользователя: <code>%routes% = user</code></li>
          <li>Для финансовых целей: <code>%routes% = goals</code></li>
          <li>Для уведомлений: <code>%routes% = ntf</code></li>
        </ul>

        <h3>Формат обращения к методам маршрутов</h3>
        <p>Для обращения к методам маршрутов используйте следующий формат:</p>
        <p><code>https://api.minote.ru/%routes%/%method%</code></p>

        <h3>Пример</h3>
        <p><code>https://api.minote.ru/auth/login</code></p>
      `,
    },
    servers: [
      {
        url: 'https://api.minote.ru/',
      },
    ],
  },
  apis: ['./openapi/openapi.js', './server.js'],
};


// Генерация UI документации
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Настройка маршрута для отображения документации
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Маршруты для различных частей API
app.use('/auth', authRoutes); // Маршруты для аутентификации
app.use('/inex', InExpRoutes); // Маршруты для учета доходов и расходов
app.use('/user', UserRoutes); // Маршруты для профиля пользователя
app.use('/goals', GoalsRoutes); // Маршруты для финансовых целей
app.use('/ntf', NotificationRoutes); // Маршруты для уведомлений

// Запуск сервера
app.listen(port, () => {
  console.log(`HTTP сервер запущен на порту ${port}`);
});

// Простейшая проверка работы сервера
app.get('/', (req, res) => {
  res.send(`Что тебе тут нужно? Ну держи время :) - ${new Date().toISOString()}`);
});

// Запуск функции для отправки ежедневных уведомлений
startDailyNotifications();

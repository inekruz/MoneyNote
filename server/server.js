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
        Документация создана для сторонних разработчиков, которые хотят использовать финансовый помощник MINOTE.\
        Проект предоставляет API для управления доходами, расходами, финансовыми целями, а также для работы с профилем пользователя и уведомлениями.

        Адрес сервера: https://api.minote.ru/  

        Для обращения к маршрутам используется следующий формат:  
        https://api.minote.ru/%routes%

        Маршруты:
        - Для авторизации: %routes% = auth
        - Для учета доходов и расходов: %routes% = inex
        - Для профиля пользователя: %routes% = user
        - Для финансовых целей: %routes% = goals
        - Для уведомлений: %routes% = ntf

        Для обращения к методам маршрутов используйте следующий формат:  
        https://api.minote.ru/%routes%/%method%

        Пример:
        https://api.minote.ru/auth/login
      `,
    },
    servers: [
      {
        url: 'https://api.minote.ru/',
      },
    ],
  },
  apis: ['./routes/*.js', './server.js'],
};

// Генерация спецификации документации
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
  res.json({ status: 'Что тебе тут нужно? Ну держи время :)', timestamp: new Date().toISOString() });
});

// Запуск функции для отправки ежедневных уведомлений
startDailyNotifications();

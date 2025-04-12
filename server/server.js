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
      description: `**MINOTE** — это финансовый помощник для сторонних разработчиков. 
        Документация предназначена для тех, кто хочет интегрировать функции управления доходами и расходами, профилем пользователя и другими возможностями в своем проекте.

        ## Основной сервер:
        🔗 [https://api.minote.ru/](https://api.minote.ru/)

        ## Структура URL:
        Для обращения к различным маршрутам (routes) используется следующий адрес:
        \`https://api.minote.ru/%routes%\`

        ### Примеры маршрутов:
        - **Авторизация**: \`%routes% = auth\`
        - **Учёт доходов и расходов**: \`%routes% = inex\`
        - **Профиль пользователя**: \`%routes% = user\`
        - и так далее...

        ### Использование методов:
        Для вызова конкретного метода API используйте следующий адрес:
        \`https://api.minote.ru/%routes%/%method%\`

        #### Пример:
        - **Авторизация**: \`https://api.minote.ru/auth/login\`
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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

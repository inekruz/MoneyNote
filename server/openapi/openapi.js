
// Простейшая проверка работы сервера

/**
 * @swagger
 * /:
 *   get:
 *     summary: Проверка состояния сервера
 *     description: Возвращает текущее время и сообщение о состоянии сервера.
 *     tags: [Default]
 *     responses:
 *       200:
 *         description: Успешный ответ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */

// --- Работа с авторизацией ---

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     description: Регистрирует нового пользователя в системе с подтверждением через код, отправляемый на email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Успешная регистрация, код отправлен на email
 *       500:
 *         description: Ошибка при регистрации
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Вход пользователя
 *     description: Вход в систему через логин или email, с отправкой кода подтверждения на email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Код подтверждения отправлен на email
 *       401:
 *         description: Неверный логин/email или пароль
 *       500:
 *         description: Ошибка при входе
 */

/**
 * @openapi
 * /auth/verify-code:
 *   post:
 *     summary: Проверка кода подтверждения
 *     description: Проверяет введенный код подтверждения и выдает JWT токен при успешной проверке.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Вход выполнен успешно, JWT токен возвращен
 *       400:
 *         description: Неверный код
 *       500:
 *         description: Ошибка подтверждения кода
 */

// --- Работа с целями ---

/**
 * @openapi
 * /goals/create:
 *   post:
 *     summary: Создание новой цели
 *     description: Позволяет пользователю создать цель с указанием суммы, срока и заголовка.
 *     tags: [Goals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Успешно создана цель
 *       500:
 *         description: Ошибка при создании цели
 */

/**
 * @openapi
 * /goals/getGoals:
 *   get:
 *     summary: Получение всех целей пользователя
 *     description: Возвращает список всех целей пользователя, отсортированных по дате создания.
 *     tags: [Goals]
 *     responses:
 *       200:
 *         description: Список целей пользователя
 *       500:
 *         description: Ошибка при получении целей
 */

/**
 * @openapi
 * /goals/{id}:
 *   put:
 *     summary: Обновление информации о цели
 *     description: Обновляет информацию о цели пользователя, включая заголовок, сумму и срок.
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели для обновления
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               amount:
 *                 type: number
 *               deadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Цель обновлена успешно
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при обновлении цели
 */

/**
 * @openapi
 * /goals/{id}/add:
 *   post:
 *     summary: Добавление суммы к накоплению по цели
 *     description: Добавляет сумму к уже накопленной на цель.
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Сумма добавлена к цели
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при добавлении накоплений
 */

/**
 * @openapi
 * /goals/{id}:
 *   delete:
 *     summary: Удаление цели
 *     description: Удаляет указанную цель пользователя.
 *     tags: [Goals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Идентификатор цели для удаления
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Цель удалена
 *       404:
 *         description: Цель не найдена
 *       500:
 *         description: Ошибка при удалении цели
 */

// --- Работа с транзакциями ---

/**
 * @openapi
 * /inex/categories:
 *   get:
 *     summary: Получение всех категорий расходов
 *     description: Получает список всех категорий для расходов.
 *     tags: [Income & Expense]
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

/**
 * @openapi
 * /inex/add:
 *   post:
 *     summary: Добавление новой транзакции (доход/расход)
 *     description: Добавляет новую транзакцию в базу данных, включая информацию о типе, сумме, описании и категории.
 *     tags: [Income & Expense]
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

/**
 * @openapi
 * /inex/alltransactions:
 *   get:
 *     summary: Получение всех транзакций текущего пользователя
 *     description: Получает все транзакции для авторизованного пользователя.
 *     tags: [Income & Expense]
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
 *     tags: [Income & Expense]
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

/**
 * @openapi
 * /inex/download-report:
 *   post:
 *     summary: Генерация и скачивание отчета по транзакциям
 *     description: Создает отчет в выбранном формате (CSV, JSON, TXT, PDF, EXCEL) по транзакциям.
 *     tags: [Income & Expense]
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

/**
 * @openapi
 * /inex/upload-report:
 *   post:
 *     summary: Загрузка отчета и добавление транзакций в базу
 *     description: Загружает транзакции из файла в базу данных для текущего пользователя.
 *     tags: [Income & Expense]
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

// --- Работа с уведомлением ---

/**
 * @openapi
 * /ntf/add:
 *   post:
 *     summary: Добавление уведомления
 *     description: Добавляет новое уведомление для пользователя
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Уведомление успешно добавлено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Ошибка при создании уведомления
 */

/**
 * @openapi
 * /ntf/get:
 *   get:
 *     summary: Получение всех уведомлений
 *     description: Получает список уведомлений для пользователя
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Список уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Ошибка при получении уведомлений
 */

/**
 * @openapi
 * /ntf/del/{id}:
 *   delete:
 *     summary: Удаление уведомления
 *     description: Удаляет уведомление по ID для пользователя
 *     tags: [Notification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID уведомления
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Уведомление удалено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Уведомление не найдено
 *       500:
 *         description: Ошибка при удалении уведомления
 */

/**
 * @openapi
 * /ntf/new:
 *   get:
 *     summary: Получение количества новых уведомлений
 *     description: Подсчитывает количество новых уведомлений для пользователя
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Количество новых уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       500:
 *         description: Ошибка при подсчете новых уведомлений
 */

/**
 * @openapi
 * /ntf/read:
 *   patch:
 *     summary: Обновление состояния уведомлений
 *     description: Устанавливает состояние уведомлений как прочитанное
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Уведомления обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Ошибка при обновлении уведомлений
 */

/**
 * @openapi
 * /ntf/getCheck:
 *   get:
 *     summary: Получение состояния уведомлений в настройках
 *     description: Получает настройки уведомлений для пользователя
 *     tags: [Notification]
 *     responses:
 *       200:
 *         description: Настройки уведомлений
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 is_income:
 *                   type: boolean
 *                 is_expense:
 *                   type: boolean
 *                 is_goals:
 *                   type: boolean
 *                 is_reports:
 *                   type: boolean
 *                 is_auth:
 *                   type: boolean
 *       404:
 *         description: Настройки уведомлений не найдены
 *       500:
 *         description: Ошибка при получении настроек уведомлений
 */

/**
 * @openapi
 * /ntf/updateCheck:
 *   post:
 *     summary: Обновление состояния уведомлений в настройках
 *     description: Обновляет настройки уведомлений для пользователя
 *     tags: [Notification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_income:
 *                 type: boolean
 *               is_expense:
 *                 type: boolean
 *               is_goals:
 *                 type: boolean
 *               is_reports:
 *                 type: boolean
 *               is_auth:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Настройки уведомлений обновлены успешно
 *       500:
 *         description: Ошибка при обновлении уведомлений
 */

// --- Работа с профилем пользователя ---

/**
 * @openapi
 * /user/getUser:
 *   get:
 *     summary: Получение данных о пользователе
 *     description: Получает данные о пользователе на основе токена
 *     tags: [Profile User]
 *     responses:
 *       200:
 *         description: Данные о пользователе успешно получены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userData:
 *                   type: object
 *                   properties:
 *                     login:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     image_path:
 *                       type: string
 *       400:
 *         description: Токен не найден
 *       403:
 *         description: Ошибка при обработке токена
 *       404:
 *         description: Пользователь не найден
 *       500:
 *         description: Ошибка сервера
 */

/**
 * @openapi
 * /user/updateUser:
 *   post:
 *     summary: Обновление данных пользователя
 *     description: Обновляет данные пользователя (username, email, password)
 *     tags: [Profile User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Данные успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userData:
 *                   type: object
 *                   properties:
 *                     login:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Ошибка при обработке токена
 *       500:
 *         description: Ошибка сервера
 */

/**
 * @openapi
 * /user/setAvatar:
 *   post:
 *     summary: Обновление аватарки пользователя
 *     description: Заменяет аватарку пользователя
 *     tags: [Profile User]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Аватарка успешно обновлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imagePath:
 *                   type: string
 *       400:
 *         description: Токен не найден или аватарка не найдена
 *       403:
 *         description: Ошибка токена
 *       500:
 *         description: Ошибка при сохранении аватарки
 */

/**
 * @openapi
 * /user/getAvatar:
 *   get:
 *     summary: Получение аватарки пользователя
 *     description: Получает аватарку пользователя
 *     tags: [Profile User]
 *     responses:
 *       200:
 *         description: Аватарка успешно получена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image:
 *                   type: string
 *       400:
 *         description: Токен не найден
 *       403:
 *         description: Ошибка токена
 *       404:
 *         description: Аватарка не найдена
 *       500:
 *         description: Ошибка сервера
 */
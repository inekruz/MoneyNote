const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const InExpRoutes = require('./routes/incomeExp');
const UserRoutes = require('./routes/profile');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/inex', InExpRoutes);
app.use('/user', UserRoutes);

app.listen(port, () => {
    console.log(`HTTP сервер запущен на порту ${port}`);
});

// Проверка работы сервера
app.get('/a', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const InExpRoutes = require('./routes/incomeExp');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/inex', InExpRoutes);

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/api.devsis.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/api.devsis.ru/fullchain.pem'),
};

https.createServer(options, app).listen(port, () => {
    console.log(`Server listening at https://api.devsis.ru`);
});

// Проверка работы сервера
app.get('/a', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

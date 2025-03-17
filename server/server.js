require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/api.devsis.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/api.devsis.ru/fullchain.pem'),
};

https.createServer(options, app).listen(port, () => {
    console.log(`Server listen to https://api.devsis.ru`);
});

app.get("/a", (req, res) => {
    res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});

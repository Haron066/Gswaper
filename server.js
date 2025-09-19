const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
    origin: ['https://haron066.github.io', 'https://gswap.onrender.com'],
    credentials: true
}));

app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Неверный токен' });
        req.user = user;
        next();
    });
}

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, email, password, phone } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO users (username, email, password, phone) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username`,
            [username, email, password, phone] // ⚠️ В реальном проекте хешируй пароль!
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Ошибка регистрации' });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    const { username, password, code } = req.body;
    try {
        // ⚠️ В реальном проекте: проверяй хеш пароля и 2FA
        const result = await pool.query(
            `SELECT id, username FROM users WHERE username = $1 AND password = $2`,
            [username, password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
        }

        // Генерация JWT
        const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Ошибка входа' });
    }
});

// Создание ордера (требует авторизации)
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { currency_from, amount_from, currency_to, amount_to, price, description } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, currency_from, amount_from, currency_to, amount_to, price, description) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [req.user.id, currency_from, amount_from, currency_to, amount_to, price, description]
        );
        res.json({ success: true, order: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});


const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: ['https://haron066.github.io', 'https://gswap.onrender.com'],
    credentials: true
}));

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_strong_jwt_secret_change_in_prod';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Требуется авторизация' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Неверный или просроченный токен' });
        req.user = user;
        next();
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/register', async (req, res) => {
    const { username, email, password, phone } = req.body;

    if (!password || password.length < 8) {
        return res.status(400).json({ success: false, error: 'Пароль должен быть не короче 8 символов' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (username, email, password, phone) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username`,
            [username, email, hashedPassword, phone]
        );
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Register error:', err);
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: 'Пользователь или email уже существует' });
        }
        res.status(500).json({ success: false, error: 'Ошибка регистрации' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT id, username, password FROM users WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, username: user.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Ошибка входа' });
    }
});

app.post('/api/orders', authenticateToken, async (req, res) => {
    const { currency_from, amount_from, currency_to, amount_to, price, description } = req.body;

    if (!currency_from || !currency_to || !amount_from || !amount_to) {
        return res.status(400).json({ success: false, error: 'Все поля обязательны' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, currency_from, amount_from, currency_to, amount_to, price, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') 
             RETURNING *`,
            [req.user.id, currency_from, amount_from, currency_to, amount_to, price, description]
        );
        res.status(201).json({ success: true, order: result.rows[0] });
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ success: false, error: 'Не удалось создать ордер' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.id, o.currency_from, o.amount_from, o.currency_to, o.amount_to, 
                   o.price, o.description, o.created_at, u.username
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.status = 'active'
            ORDER BY o.created_at DESC
            LIMIT 50
        `);
        res.json({ success: true, orders: result.rows });
    } catch (err) {
        console.error('Fetch orders error:', err);
        res.status(500).json({ success: false, error: 'Не удалось загрузить ордера' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

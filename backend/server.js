const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Поддержка статических файлов (index.html)
app.use(express.static('..'));

app.use(cors());
app.use(express.json());

// Подключение к PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'gswaper',
    password: 'haron.06', // ← ЗАМЕНИ НА СВОЙ ПАРОЛЬ ОТ POSTGRESQL
    port: 5432,
});

// Telegram Bot
const TELEGRAM_BOT_TOKEN = '8319521724:AAEgWC1rHGdAF5hlEE7LZ-u0hFwM5XtvieE';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Это Gswaper — P2P обмен криптовалют.\n\nНажми кнопку ниже, чтобы начать:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Открыть сайт", web_app: { url: "http://localhost:3001" } }]
            ]
        }
    });
});

// Эндпоинты API
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

app.post('/api/auth/telegram', async (req, res) => {
    const { id, first_name, username } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO users (telegram_id, first_name, username) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (telegram_id) DO NOTHING 
             RETURNING *`,
            [id, first_name, username]
        );
        res.json({ success: true, user: result.rows[0] || { telegram_id: id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'DB error' });
    }
});

app.post('/api/orders', async (req, res) => {
    const { user_id, currency_from, amount_from, currency_to, amount_to, price, description } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO orders (user_id, currency_from, amount_from, currency_to, amount_to, price, description) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [user_id, currency_from, amount_from, currency_to, amount_to, price, description]
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

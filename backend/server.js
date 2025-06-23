const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL database connection successful');
    connection.release();
  } catch (error) {
    console.error('MySQL database connection failed:', error.message);
    throw error;
  }
};

global.dbPool = pool;

const app = express();
const PORT = process.env.PORT;

app.use(cors({
  origin: [
    process.env.LOCALHOST_URL,
    process.env.DEVELOPMENT_URL,
    process.env.PRODUCTION_URL
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/recordings', express.static(path.join(__dirname, 'recordings')));
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/folders', require('./routes/folders'));
app.use('/api/recordings', require('./routes/recordings'));
app.use('/api/chunks', require('./routes/chunks'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'DalovaNote API Server',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message
  });
});

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
};

startServer(); 
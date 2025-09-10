// src/index.js
'use strict';

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const db = require('./models'); // khởi tạo kết nối
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));
// app.use('/api', require('./routes'));

const PORT = Number(process.env.PORT) || 8080;

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('DB connected (MySQL)');
    // if (process.env.NODE_ENV !== 'production') await db.sequelize.sync();
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  } catch (e) {
    console.error('DB connection error:', e.message);
    process.exit(1);
  }
})();

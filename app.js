// app.js
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { protect } = require('./middleware/auth');

// --- ROUTERS ---
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const kpiEvaluationRoutes = require('./routes/kpiEvaluation');
const companyKpiRoutes = require('./routes/companyKpiRoutes');
const companyKpiResultsRoutes = require('./routes/companyKpiResultsRoutes');
const monthlyAllocationRoutes = require('./routes/monthlyAllocationRoutes');
const dashboardRoutes = require('./routes/dashboard');
const departmentRoutes = require('./routes/departments');
const companyRoutes = require('./routes/companies');
const kpiLibraryRoutes = require('./routes/kpiLibraryRoutes');
const kpiAspectsRoutes = require('./routes/kpiAspects');
const kpiPlanRoutes = require('./routes/kpiPlan');
const unitKpiRoutes = require('./routes/unitKpiRoutes');
const payrollRoutes = require('./routes/payroll.routes');
const apiRoutes = require('./routes/api');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
const positionRoutes = require('./routes/positions');
const timekeepingRoutes = require('./routes/timekeeping');

const app = express();
app.set('trust proxy', 1);

// ---------------- CORS (dev thoáng, prod theo ENV) ----------------
const isDev = process.env.NODE_ENV !== 'production';

// Lấy danh sách origin từ ENV
const rawOrigins = [
  process.env.FRONTEND_URL,                         // 1 origin chính (prod)
  ...(process.env.CORS_ORIGINS || '').split(',')    // nhiều origin, cách nhau dấu phẩy
]
  .map(s => (s || '').trim().replace(/\/$/, ''))
  .filter(Boolean);

// Mặc định cho dev (CRA/Vite)
const defaultDev = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function normalize(o) { return (o || '').replace(/\/$/, ''); }
const allowList = [...rawOrigins, ...(isDev ? defaultDev : [])].map(normalize);

app.use(cors({
  origin(origin, cb) {
    // Cho phép tất cả khi dev hoặc bật công tắc ALLOW_ALL_ORIGINS=1
    if (isDev || process.env.ALLOW_ALL_ORIGINS === '1') return cb(null, true);
    if (!origin) return cb(null, true);                       // curl/Postman
    if (allowList.includes(normalize(origin))) return cb(null, true);
    console.warn('CORS blocked:', origin, 'Allowed:', allowList);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());

// ---------------- BODY PARSER ----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- NO-CACHE cho API ----------------
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ---------------- PUBLIC ROUTES ----------------
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes); // login/refresh... luôn public

// ---------------- BẢO VỆ TOÀN BỘ API CÒN LẠI ----------------
app.use('/api', protect);

// ---------------- REAL API ROUTES ----------------
app.use('/api/employees', employeeRoutes);
app.use('/api/kpi-evaluation', kpiEvaluationRoutes);
app.use('/api/company-kpi', companyKpiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/kpi-library', kpiLibraryRoutes);
app.use('/api/company-kpi-results', companyKpiResultsRoutes);
app.use('/api/monthly-allocations', monthlyAllocationRoutes);
app.use('/api/kpi-aspects', kpiAspectsRoutes);
app.use('/api/kpi', kpiPlanRoutes);
app.use('/api/unit-kpi', unitKpiRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/timekeeping', timekeepingRoutes);
app.use('/api/users', userRoutes);
app.use('/api', apiRoutes);

// 404 cho API (đặt trước SPA để không cản frontend)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ---------------- Serve frontend build (nếu có) ----------------
const clientBuildPath = path.join(__dirname, '../client/build');

if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.send('API server (dev) is running'));
}
// ---------------- ERROR HANDLERS ----------------
app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked: origin not allowed' });
  }
  return next(err);
});

app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  if (res.headersSent) return next(err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;

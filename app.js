// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');


// --- ROUTERS ---
const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employees');
const kpiEvaluationRoutes = require('./src/routes/kpiEvaluation');
const companyKpiRoutes = require('./src/routes/companyKpiRoutes');
const companyKpiResultsRoutes = require('./src/routes/companyKpiResultsRoutes');
const monthlyAllocationRoutes = require('./src/routes/monthlyAllocationRoutes');
const dashboardRoutes = require('./src/routes/dashboard');
const departmentRoutes = require('./src/routes/departments');
const companyRoutes = require('./src/routes/companies');
const kpiLibraryRoutes = require('./src/routes/kpiLibraryRoutes');
const kpiAspectsRoutes = require('./src/routes/kpiAspects');
const kpiPlanRoutes = require('./src/routes/kpiPlan');
const unitKpiRoutes = require('./src/routes/unitKpiRoutes');
const payrollRoutes = require('./src/routes/payroll.routes');
const apiRoutes = require('./src/routes/api');
const userRoutes = require('./src/routes/users');
const profileRoutes = require('./src/routes/profile');
const positionRoutes = require('./src/routes/positions');
const timekeepingRoutes = require('./src/routes/timekeeping');
const { protect } = require('./middleware/auth');

if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET is missing — login will fail');
 }
const app = express();

// --- CORS ---
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://huuthong1976.github.io',
  'https://huuthong1976.github.io/frontend',
  'https://thoidaiso.info.vn',
  'https://www.thoidaiso.info.vn', 
];

const extraOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_ORIGINS = Array.from(new Set([...defaultOrigins, ...extraOrigins]));

app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);            // cho phép curl/healthcheck
    if (ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HEALTH ---
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/health', (req, res) => res.json({ ok: true }));

// --- ROUTES ---
app.use('/api/auth', authRoutes);                     
app.use('/api/employees', employeeRoutes);
app.use('/api/kpi-evaluation', kpiEvaluationRoutes);
app.use('/api/company-kpi', companyKpiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/kpi-library', protect, kpiLibraryRoutes);
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

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// --- ERROR HANDLER (đặt CUỐI CÙNG) ---
app.use((err, req, res, next) => {
  console.error('ERROR', err);
  const code = err.status || 500;
  res.status(code).json({ message: code === 500 ? 'Server error' : err.message });
});

module.exports = app;


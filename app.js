// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { protect } = require('./src/middleware/auth'); 
// --- CÁC ROUTER CỦA ỨNG DỤNG ---
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
const timekeepingRoutes = require('./src/routes/timekeeping')
// Khởi tạo ứng dụng Express
const app = express();

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  // GitHub Pages (không dùng domain riêng)
  'https://huuthong1976.github.io',
  'https://huuthong1976.github.io/frontend',
  // Domain riêng (nếu dùng)
  'https://thoidaiso.info.vn',
];

// Cho phép truyền thêm origin qua biến môi trường (phân tách bằng dấu phẩy)
const extraOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_ORIGINS = Array.from(new Set([...defaultOrigins, ...extraOrigins]));

// Nếu bạn đăng nhập bằng cookie/Session phía server qua HTTPS (Railway có proxy)
app.set('trust proxy', 1);

app.use(cors({
  origin: function (origin, cb) {
    // Cho phép request không có Origin (ví dụ curl/healthcheck)
    if (!origin) return cb(null, true);
    if (ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 


// --- ĐĂNG KÝ ROUTER ---
// --- CÁC ROUTE CỤ THỂ ---
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });
  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });
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
app.use('/api/timekeeping', timekeepingRoutes );
// --- CÁC ROUTE CHUNG CHUNG (đặt ở cuối) ---

app.use('/api/users', userRoutes);
app.use('/api', apiRoutes);
// --- XỬ LÝ LỖI ---
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});
// --- XUẤT APP ĐỂ SERVER.JS SỬ DỤNG ---
module.exports = app;

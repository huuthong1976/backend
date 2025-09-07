require('dotenv').config();
const express = require('express');
const cors = require('cors');

// ---- Map ENV của Railway MySQL sang tên biến hiện có (nếu app đang dùng DB_*) ----
process.env.DB_HOST      = process.env.DB_HOST      || process.env.MYSQLHOST;
process.env.DB_PORT      = process.env.DB_PORT      || process.env.MYSQLPORT;
process.env.DB_USER      = process.env.DB_USER      || process.env.MYSQLUSER;
process.env.DB_PASSWORD  = process.env.DB_PASSWORD  || process.env.MYSQLPASSWORD;
process.env.DB_DATABASE  = process.env.DB_DATABASE  || process.env.MYSQLDATABASE;

// --- CÁC ROUTER CỦA ỨNG DỤNG ---
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
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
const userRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const positionRoutes = require('./routes/positions');

const app = express();

// ---- CORS: đọc từ biến ALLOWED_ORIGIN, cho phép mảng origin ----
const allowed = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',');
app.use(cors({
  origin: allowed,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicPaths = ['/health', '/auth/login', '/auth/register'];
app.use('/api', (req, res, next) => {
  if (publicPaths.includes(req.path)) return next();
  return auth(req, res, next);
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
app.use('/api/perspectives', kpiAspectsRoutes);
app.use('/api/kpi', kpiPlanRoutes);
app.use('/api/unit-kpi', unitKpiRoutes);
app.use('/api/payroll', payrollRoutes); 
app.use('/api/positions', positionRoutes);
app.use('/profile', profileRoutes);

// --- CÁC ROUTE CHUNG CHUNG (đặt ở cuối) ---
app.use('/api', userRoutes);
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
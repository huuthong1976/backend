require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Map ENV Railway → DB_* (nếu code chỗ khác còn dùng DB_*)
process.env.DB_HOST      = process.env.DB_HOST      || process.env.MYSQLHOST;
process.env.DB_PORT      = process.env.DB_PORT      || process.env.MYSQLPORT;
process.env.DB_USER      = process.env.DB_USER      || process.env.MYSQLUSER;
process.env.DB_PASSWORD  = process.env.DB_PASSWORD  || process.env.MYSQLPASSWORD;
process.env.DB_DATABASE  = process.env.DB_DATABASE  || process.env.MYSQLDATABASE;

/* ====== ROUTES (đúng với thư mục src/routes bạn đã chụp) ====== */
const employeeRoutes            = require('./src/routes/employees');
const authRoutes                = require('./src/routes/auth');
const auth                      = require('./src/routes/middleware_auth'); // file bạn có trong routes
const dashboardRoutes           = require('./src/routes/dashboard');
const departmentRoutes          = require('./src/routes/departments');
const companyRoutes             = require('./src/routes/companies');
const companyKpiRoutes          = require('./src/routes/companyKpiRoutes');
const companyKpiResultsRoutes   = require('./src/routes/companyKpiResultsRoutes');
const kpiEvaluationRoutes       = require('./src/routes/kpiEvaluation');
const kpiLibraryRoutes          = require('./src/routes/kpiLibraryRoutes');
const kpiPlanRoutes             = require('./src/routes/kpiPlan');
const kpiRoutes                 = require('./src/routes/KpiRoutes'); // chữ K viết hoa
const positionsRoutes           = require('./src/routes/positions');
const profileRoutes             = require('./src/routes/profile');
const projectsRoutes            = require('./src/routes/projects');
const plansRoutes               = require('./src/routes/plans');
const adminRoutes               = require('./src/routes/admin');
const hrmRoutes                 = require('./src/routes/hrm');
const notificationsRoutes       = require('./src/routes/notifications');
const payrollRoutes             = require('./src/routes/payroll.routes');
const monthlyAllocationRoutes   = require('./src/routes/monthlyAllocationRoutes');
const kpiAspectsRoutes          = require('./src/routes/kpiAspects');
const perspectivesRoutes        = require('./src/routes/perspectives');
const roomsRoutes               = require('./src/routes/rooms');
const apiRoutes                 = require('./src/routes/api'); // bạn có file này

/* ====== APP & CORS ====== */
const app = express();

// ALLOWED_ORIGIN cho phép nhiều origin, phân tách dấu phẩy
const allowed = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: allowed,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ====== HEALTH ====== */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ====== BẢO VỆ /api bằng middleware auth (trừ public paths) ====== */
const publicPaths = ['/health', '/auth/login', '/auth/register'];
app.use('/api', (req, res, next) => {
  if (publicPaths.some(p => req.path.startsWith(p))) return next();
  return auth(req, res, next);
});

/* ====== MOUNT ROUTES ====== */
app.use('/api/auth', authRoutes); // (đã thêm slash đầu)
app.use('/api/employees', employeeRoutes);
app.use('/api/kpi-evaluation', kpiEvaluationRoutes);
app.use('/api/company-kpi', companyKpiRoutes);
app.use('/api/company-kpi-results', companyKpiResultsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/kpi-library', kpiLibraryRoutes);
app.use('/api/kpi-plans', kpiPlanRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hrm', hrmRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/monthly-allocations', monthlyAllocationRoutes);
app.use('/api/kpi-aspects', kpiAspectsRoutes);
app.use('/api/perspectives', perspectivesRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api', apiRoutes); // các route chung nếu có

/* ====== 404 & ERROR HANDLER ====== */
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;

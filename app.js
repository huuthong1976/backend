// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { protect } = require('./middleware/auth'); 
// --- CÁC ROUTER CỦA ỨNG DỤNG ---
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
const timekeepingRoutes = require('./routes/timekeeping')
// Khởi tạo ứng dụng Express
const app = express();


// --- CẤU HÌNH MIDDLEWARE ---
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 


// --- ĐĂNG KÝ ROUTER ---
// --- CÁC ROUTE CỤ THỂ ---
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
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
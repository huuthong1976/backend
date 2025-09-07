// server.js - PHIÊN BẢN ĐÃ SỬA LỖI
const http = require('http');
require('dotenv').config(); 

const server = http.createServer(app);
// Lắng nghe kết nối trên cổng đã định
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const express = require('express');
const app = express();
const cors = require('cors');
// Import middleware và DB config
const { protect } = require('./middleware/auth'); 
const db = require('./config/db');

// Import tất cả các file routes
const authRoutes = require('./routes/auth');
const biRoutes = require('./routes/bi');
const companyRoutes = require('./routes/companies');
const dashboardRoutes = require('./routes/dashboard');
const departmentRoutes = require('./routes/departments');
//const employeePlansRoutes = require('./routes/employeePlans');
const employeeRoutes = require('./routes/employees');
const hrmRoutes = require('./routes/hrm');
const notificationRoutes = require('./routes/notifications');
const perspectiveRoutes = require('./routes/perspectives');
const positionRoutes = require('./routes/positions');
const projectRoutes = require('./routes/projects');
const recruitmentRoutes = require('./routes/recruitment');
const salaryRoutes = require('./routes/salary');
const timekeepingRoutes = require('./routes/timekeeping');
const trainingRoutes = require('./routes/training');
const userRoutes = require('./routes/users');
const workPlansRoutes = require('./routes/work_plans'); 
const workflowRoutes = require('./routes/workflows');
const plansRouter = require('./routes/plans');   // <-- tạo ở bước 2
const unitsRouter = require('./routes/units');   // <-- tạo ở bước 3
const roomsRouter = require('./routes/rooms');   // <-- tạo ở bước 3
const planningTemplatesRouter = require('./routes/planningTemplates');
// THAY ĐỔI: Tách biệt payrollRoutes và kpiRoutes ra khỏi các tên trùng lặp
const companyKpiRoutes = require('./routes/companyKpiRoutes');
const payrollRoutes = require('./routes/payroll.routes');


const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE CHUNG ---
app.use(cors({origin: ['http://localhost:3000'], methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/api/me', (req, res) => {
  // trả role & company cho FE
  res.json({ id: 1, username: 'admin', role: 'Admin', company_id: 1 });
});
// LOG mọi request tới backend
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Healthcheck: xác nhận server & prefix /api hoạt động
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.use(express.urlencoded({ extended: true }));

// --- ĐỊNH NGHĨA CÁC ROUTES ---
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/auth', authRoutes); 
app.use('/api/users', protect, userRoutes);
app.use('/api/companies', protect, companyRoutes);
app.use('/api/departments', protect, departmentRoutes);
app.use('/api/positions', protect, positionRoutes);
app.use('/api/employees', protect, employeeRoutes);

// Cập nhật: Sử dụng router chính xác và tránh trùng lặp
app.use('/api/kpi', protect, companyKpiRoutes); // SỬ DỤNG companyKpiRoutes
app.use('/api/payroll', protect, payrollRoutes); // THAY ĐỔI ĐƯỜNG DẪN TẠI ĐÂY

app.use('/api/workflows', protect, workflowRoutes);
app.use('/api/salary', protect, salaryRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/bi', protect, biRoutes);
app.use('/api/hrm', protect, hrmRoutes);
app.use('/api/projects', protect, projectRoutes);
app.use('/api/recruitment', protect, recruitmentRoutes);
app.use('/api/training', protect, trainingRoutes);
app.use('/api/timekeeping', protect, timekeepingRoutes);
app.use('/api/notifications', protect, notificationRoutes);
app.use('/api/perspectives', protect, perspectiveRoutes);
app.use('/api/work-plans', protect, workPlansRoutes);
app.use('/api/plans', plansRouter);
app.use('/api/units', unitsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/planning-templates', planningTemplatesRouter);
app.use('/api/payroll', require('./routes/payroll'));

// --- KHỞI ĐỘNG SERVER ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  db.getConnection()
    .then(() => console.log('>>> Kết nối Cơ sở dữ liệu thành công!'))
    .catch(err => {
        console.error('!!! Lỗi kết nối Cơ sở dữ liệu:', err.message);
        process.exit(1);
    });
});
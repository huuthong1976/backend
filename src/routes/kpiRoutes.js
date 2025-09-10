// src/routes/KpiRoutes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import các components trang

import ManagerKpiDashboard from '../pages/ManagerKpiDashboard';
// Giả sử bạn có một component để chấm điểm chi tiết
// import ManagerEvaluationDetail from '../components/kpi/ManagerEvaluationDetail'; 

// Import component bảo vệ
import ProtectedRoute from '../components/auth/ProtectedRoute';

const KpiRoutes = () => {
    // Placeholder cho component chấm điểm chi tiết
    const ManagerEvaluationDetailPlaceholder = () => (
        <div style={{padding: '40px', textAlign: 'center'}}>
            <h2>Trang Chấm điểm Chi tiết</h2>
            <p>Đây là nơi Trưởng đơn vị sẽ chấm điểm chi tiết cho nhân viên được chọn.</p>
        </div>
    );

    return (
        <Routes>
            {/* Route cho kế hoạch cá nhân, ai cũng có thể xem */}
          

            {/* Route cho bảng điều khiển của Trưởng đơn vị, được bảo vệ */}
            <Route 
                path="/manager-dashboard" 
                element={
                    <ProtectedRoute allowedRoles={['TruongDonVi', 'Admin', 'TongGiamDoc']}>
                        <ManagerKpiDashboard />
                    </ProtectedRoute>
                } 
            />

            {/* Route để chấm điểm chi tiết cho một nhân viên, được bảo vệ */}
            <Route 
                path="/evaluate/:employeeId" 
                element={
                    <ProtectedRoute allowedRoles={['TruongDonVi', 'Admin']}>
                        <ManagerEvaluationDetailPlaceholder />
                        {/* Thay bằng component thật: <ManagerEvaluationDetail /> */}
                    </ProtectedRoute>
                }
            />

            {/* Bạn có thể thêm các route khác của module KPI ở đây */}
        </Routes>
    );
};

export default KpiRoutes;
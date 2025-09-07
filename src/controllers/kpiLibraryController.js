// server/controllers/kpiLibraryController.js
//const db = require('../db');
const svc = require('../services/kpiLibraryService');

const getKpiLibrary = async (req, res) => {
  try {
    const { company_id } = req.query;
    const data = await svc.getKpiLibrary({ company_id }); // danh sách PHẲNG, đã thừa kế
    res.json(data);
  } catch (err) {
    console.error('[getKpiLibrary] ', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

const getKpiLibraryTree = async (req, res) => {
  try {
    const { company_id } = req.query;
    const data = await svc.getTreeByCompany(company_id); // CÂY, đã thừa kế
    res.json(data);
  } catch (err) {
    console.error('[getKpiLibraryTree] ', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

const createKpi = async (req, res) => {
    try {
      const kpiData = { ...req.body, company_id: req.body.company_id || req.user.company_id };
  
      console.log('API createKpi payload:', kpiData); // debug: kiểm tra body nhận được
  
      const newKpi = await kpiLibraryService.createKpi(kpiData); // gọi đúng tên
      res.status(201).json(newKpi);
    } catch (error) {
      console.error('Lỗi khi tạo KPI mới:', error);
      res.status(500).json({ error: error.message || 'Lỗi máy chủ hoặc dữ liệu không hợp lệ' });
    }
  };
  
  const updateKpi = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedKpi = await kpiLibraryService.updateKpi(id, req.body);
      res.status(200).json(updatedKpi);
    } catch (error) {
      console.error('Lỗi khi cập nhật KPI:', error);
      res.status(500).json({ error: error.message || 'Lỗi máy chủ' });
    }
  };
  
  const deleteKpi = async (req, res) => {
    try {
      const { id } = req.params;
      await kpiLibraryService.deleteKpi(id);
      res.status(200).json({ message: 'Xóa KPI thành công!' });
    } catch (error) {
      console.error('Lỗi khi xóa KPI:', error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  };

const exportKpis = async (req, res) => {
    try {
        const { companyId } = req.query;
        const workbook = await kpiLibraryService.exportKpis(companyId);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="ThuVien_KPI_${companyId}.xlsx"`);

        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const importKpis = async (req, res) => {
    try {
        const { companyId } = req.query;
        if (!req.file) {
            return res.status(400).json({ error: 'Không tìm thấy file.' });
        }
        await kpiLibraryService.importKpis(req.file, companyId);
        res.status(200).json({ message: 'Nhập dữ liệu thành công.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// BỔ SUNG: Khối module.exports để xuất tất cả các hàm
module.exports = {
    getKpiLibrary,
    getKpiLibraryTree,

    createKpi,
    updateKpi,
    deleteKpi,
    exportKpis,
    importKpis,
};
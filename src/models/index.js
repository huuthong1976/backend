// src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');

/* ========= 1) Kết nối DB (phù hợp Railway) ========= */
const DB_HOST = process.env.MYSQLHOST     || process.env.DB_HOST;
const DB_NAME = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
const DB_USER = process.env.MYSQLUSER     || process.env.DB_USER || 'root';
const DB_PASS = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const DB_PORT = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,            // bật true nếu muốn debug SQL
  define: {
    timestamps: false,       // bảng hiện dùng created_at/deleted_at tuỳ chỉnh
    underscored: true,       // map camelCase -> snake_case
  },
  timezone: '+07:00',        // nếu muốn giờ VN
  pool: { max: 7, min: 0, acquire: 30000, idle: 10000 },
});

/* ========= 2) Helper nạp model an toàn ========= */
function tryLoadModel(relativePath, exportName) {
  try {
    const factory = require(relativePath);
    const model = typeof factory === 'function'
      ? factory(sequelize, DataTypes)
      : factory.default?.(sequelize, DataTypes);
    if (model) return model;
    console.warn(`[models] ${exportName} loaded but returned empty`);
    return null;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      // Không có file model -> bỏ qua để app vẫn chạy
      // console.info(`[models] Skip ${exportName}: ${relativePath} not found`);
      return null;
    }
    console.error(`[models] Failed to load ${exportName}:`, err);
    return null;
  }
}

/* ========= 3) Nạp tất cả model của chương trình =========
*/
const Company          = tryLoadModel('./company', 'Company');
const Employee         = tryLoadModel('./employee', 'Employee');
const KpiAspect        = tryLoadModel('./kpiAspect', 'KpiAspect');
const KpiAspectWeight  = tryLoadModel('./kpiAspectWeight', 'KpiAspectWeight');
const KpiLibrary       = tryLoadModel('./kpiLibrary', 'KpiLibrary');



/* ========= 4) Khai báo quan hệ (nếu cả 2 model cùng tồn tại) ========= */
// Company 1 - n Employee
if (Company && Employee) {
  Employee.belongsTo(Company, { foreignKey: 'company_id' });
  Company.hasMany(Employee, { foreignKey: 'company_id' });
}

// Company 1 - n KpiAspectWeight; KpiAspectWeight n - 1 KpiAspect
if (Company && KpiAspectWeight) {
  KpiAspectWeight.belongsTo(Company, { foreignKey: 'company_id' });
  Company.hasMany(KpiAspectWeight, { foreignKey: 'company_id' });
}
if (KpiAspect && KpiAspectWeight) {
  KpiAspectWeight.belongsTo(KpiAspect, { foreignKey: 'perspective_id' });
  KpiAspect.hasMany(KpiAspectWeight, { foreignKey: 'perspective_id' });
}

// Company 1 - n KpiLibrary (tuỳ cấu trúc của bạn)
if (Company && KpiLibrary) {
  KpiLibrary.belongsTo(Company, { foreignKey: 'company_id' });
  Company.hasMany(KpiLibrary, { foreignKey: 'company_id' });
}

/* ========= 5) Export cho toàn app ========= */
module.exports = {
  sequelize,
  Sequelize,
  // Models
  Company,
  Employee,
  KpiAspect,
  KpiAspectWeight,
  KpiLibrary,
 
};

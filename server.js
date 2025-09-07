// server.js (ĐÃ SỬA ĐÚNG)


require('dotenv').config();
const http = require('http'); 
const app = require('./app');

// Chỉ giữ lại MỘT dòng khai báo PORT duy nhất
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
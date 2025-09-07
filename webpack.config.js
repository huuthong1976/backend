// trong file webpack.config.js
module.exports = {
    // ... các cấu hình khác
    module: {
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
          // Thêm dòng này để loại trừ toàn bộ thư mục node_modules
          exclude: /node_modules/,
        },
        // ... các rules khác
      ],
    },
  };
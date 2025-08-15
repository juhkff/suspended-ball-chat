module.exports = {
    devServer: {
        proxy: {
            '/nlweb': {
                target: 'http://10.114.32.207:8080',  // 后端服务器地址
                changeOrigin: true,
                pathRewrite: {
                    '^/api': '/api'  // 可选：重写路径
                }
            }
        }
    }
}

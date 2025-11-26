const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const { appLogger, logRequest } = require('./src/utils/logger');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件配置
app.use(express.json());

// 配置CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // 允许的前端域名
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// 使用自定义日志中间件
app.use(logRequest);

// 安全增强
app.use(helmet());

// 日志记录
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 请求速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP限制的请求数
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again later'
    }
});
app.use('/api', limiter);

// 连接数据库
connectDB();

// 导入路由
const llmRoutes = require('./src/routes/llmRoutes');
const ragRoutes = require('./src/routes/ragRoutes');

// 使用路由
app.use('/api/llm', llmRoutes);
app.use('/api/rag', ragRoutes);

// 根路径测试接口
// GET http://localhost:3000/
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'EC-Back API Service is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        availableEndpoints: [
            '/health',
            '/api/llm/*',
            '/api/rag/*'
        ]
    });
});

// 健康检查接口
// GET http://localhost:3000/health
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API is running'
    });
});

// 404错误处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    appLogger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (err) => {
    appLogger.error('Unhandled Rejection:', { error: err.message, stack: err.stack });
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    appLogger.info(`Server running on port ${PORT}`);
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
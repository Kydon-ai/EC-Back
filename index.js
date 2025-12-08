import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';
import { appLogger, logRequest } from './src/utils/logger.js';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 中间件配置
app.use(express.json());

// 配置CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], // 允许的前端域名
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
import llmRoutes from './src/routes/llmRoutes.js';
import ragRoutes from './src/routes/ragRoutes.js';
import knowledgeBaseRoutes from './src/routes/knowledgeBaseRoutes.js';
import statsRoutes from './src/routes/statsRoutes.js';

// 使用路由
// 对话
app.use('/api/llm', llmRoutes);
// rag
app.use('/api/rag', ragRoutes);
// 知识库
app.use('/api/knowledge-bases', knowledgeBaseRoutes);
// 统计
app.use('/api/stats', statsRoutes);

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
            '/api/rag/*',
            '/api/knowledge-bases/*',
            '/api/stats/*'
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

export default app;
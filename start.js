// 服务器启动脚本

const dotenv = require('dotenv');
const { appLogger } = require('./src/utils/logger');

// 加载环境变量
try {
  dotenv.config();
  appLogger.info('Environment variables loaded successfully');
} catch (error) {
  appLogger.error('Failed to load environment variables:', { error: error.message });
  console.error('Failed to load environment variables:', error.message);
  process.exit(1);
}

// 连接数据库
const { connectDB } = require('./src/config/db');

async function startServer() {
  try {
    // 连接数据库
    appLogger.info('Connecting to MongoDB...');
    await connectDB();

    // 导入应用程序
    appLogger.info('Initializing Express application...');
    const app = require('./index');

    // 获取端口配置
    const PORT = process.env.PORT || 3000;

    // 检查是否已经有监听事件，避免重复启动
    const server = app.listen(PORT, () => {
      appLogger.info(`Server started successfully on port ${PORT}`);
      console.log(`Server started successfully on port ${PORT}`);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      appLogger.info('SIGTERM signal received, shutting down gracefully...');
      server.close(() => {
        appLogger.info('Server has closed');
        process.exit(0);
      });
    });

    // 移除了不合理的自动超时关闭，让服务器可以持续运行

  } catch (error) {
    appLogger.error('Failed to start server:', { error: error.message, stack: error.stack });
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();
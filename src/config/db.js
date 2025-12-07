import mongoose from 'mongoose';
import { dbLogger } from '../utils/logger.js';

// 数据库连接配置
const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ec-backend';
    console.log("连接路径", MONGO_URI)
    // 连接选项
    const options = {
      serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
      socketTimeoutMS: 45000, // Socket连接超时时间
    };

    // 连接到MongoDB
    await mongoose.connect(MONGO_URI, options);

    dbLogger.info('MongoDB connected successfully');

    // 监听连接事件
    mongoose.connection.on('connected', () => {
      dbLogger.info('MongoDB connection is open');
    });

    mongoose.connection.on('error', (err) => {
      dbLogger.error('MongoDB connection error:', { error: err.message, stack: err.stack });
    });

    mongoose.connection.on('disconnected', () => {
      dbLogger.warn('MongoDB connection is disconnected');
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      dbLogger.info('MongoDB connection closed due to application termination');
      process.exit(0);
    });

  } catch (error) {
    dbLogger.error('MongoDB connection failed:', { error: error.message, stack: error.stack });
    console.log('MongoDB connection failed:', { error: error.message, stack: error.stack })
    // 实现重试逻辑
    dbLogger.info('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// 获取数据库连接状态
const getConnectionStatus = () => {
  return mongoose.connection.readyState;
};

export { connectDB, getConnectionStatus };
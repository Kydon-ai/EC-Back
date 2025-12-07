import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 创建日志目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 从环境变量获取日志级别，默认为 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// 创建通用日志格式
const commonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(info => {
    return `${info.timestamp} [${info.level.toUpperCase()}] ${info.message}`;
  })
);

// 创建带元数据的详细日志格式
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.json()
);

// 创建应用程序日志器
const appLogger = winston.createLogger({
  level: logLevel,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: commonFormat,
      colorize: true
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: detailedFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: detailedFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: detailedFormat
    })
  ]
});

// 创建API请求日志器
const apiLogger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'api.log'),
      format: detailedFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// 创建数据库日志器
const dbLogger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'db.log'),
      format: detailedFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// 导出日志器
export { appLogger, apiLogger, dbLogger };

// 日志中间件
export const logRequest = (req, res, next) => {
  // 记录请求开始
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  // 响应结束时记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // 根据状态码确定日志级别
    const logLevel = statusCode >= 500 ? 'error' :
      statusCode >= 400 ? 'warn' : 'info';

    // 构建日志消息
    const logMessage = {
      method,
      url: originalUrl,
      status: statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.headers['user-agent']
    };

    // 记录日志
    apiLogger[logLevel](JSON.stringify(logMessage));
  });

  next();
}
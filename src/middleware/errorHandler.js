const { appLogger } = require('../utils/logger');

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 构建错误日志对象
  const errorLog = {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
    error: {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err.code,
      status: err.status
    }
  };

  // 根据错误类型决定日志级别
  if (err.status && err.status < 500) {
    appLogger.warn('Client error occurred', errorLog);
  } else {
    appLogger.error('Server error occurred', errorLog);
  }

  // 处理Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      status: 'error',
      message,
      errorType: 'ValidationError',
      timestamp: new Date().toISOString()
    });
  }

  // 处理MongoDB唯一字段冲突
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      status: 'error',
      message: `The ${field} already exists`,
      errorType: 'DuplicateKeyError',
      timestamp: new Date().toISOString()
    });
  }

  // 处理无效的ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid ID format',
      errorType: 'CastError',
      timestamp: new Date().toISOString()
    });
  }

  // 处理MongoDB操作错误
  if (err.name === 'MongoError') {
    return res.status(500).json({
      status: 'error',
      message: 'Database operation failed',
      errorType: 'DatabaseError',
      timestamp: new Date().toISOString()
    });
  }

  // 处理认证错误
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      errorType: 'AuthError',
      timestamp: new Date().toISOString()
    });
  }

  // 使用错误对象中的状态码，如果没有则使用500
  const statusCode = err.status || 500;

  // 默认错误响应
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message,
    errorType: err.name || 'UnknownError',
    timestamp: new Date().toISOString(),
    // 在非生产环境中包含错误详情
    ...(process.env.NODE_ENV !== 'production' && {
      details: {
        stack: err.stack,
        code: err.code
      }
    })
  });
};

// 404错误处理中间件
const notFoundHandler = (req, res, next) => {
  // 记录404错误
  appLogger.warn('Resource not found', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    ip: req.ip
  });

  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
    errorType: 'NotFound',
    timestamp: new Date().toISOString(),
    resource: req.originalUrl
  });
};

module.exports = { errorHandler, notFoundHandler };
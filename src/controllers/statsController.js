import Conversation from '../models/Conversation.js';
import KnowledgeBase from '../models/KnowledgeBase.js';
import Document from '../models/Document.js';

// 获取对话统计信息
const getConversationStats = async (req, res) => {
  try {
    // 总对话数
    const totalConversations = await Conversation.countDocuments();

    // 今日新增对话数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayConversations = await Conversation.countDocuments({ 
      create_time: { $gte: today.getTime() }
    });

    // 平均对话长度（消息数）
    const avgMessages = await Conversation.aggregate([
      { $group: { _id: null, avgLength: { $avg: '$message_count' } } }
    ]);
    const averageMessageCount = avgMessages[0]?.avgLength || 0;

    // 对话活跃度（最近7天按日期分组）
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);

    const dailyActivity = await Conversation.aggregate([
      { $match: { create_time: { $gte: last7Days.getTime() } } },
      { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$create_time' } } } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 格式化每日活跃度数据
    const formattedActivity = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      formattedActivity[dateStr] = 0;
    }

    dailyActivity.forEach(item => {
      formattedActivity[item._id] = item.count;
    });

    // 按日期排序
    const sortedActivity = Object.entries(formattedActivity)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));

    res.status(200).json({
      status: 'success',
      data: {
        totalConversations,
        todayConversations,
        averageMessageCount: parseFloat(averageMessageCount.toFixed(2)),
        last7DaysActivity: sortedActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取知识库统计信息
const getKnowledgeBaseStats = async (req, res) => {
  try {
    // 总知识库数
    const totalKBs = await KnowledgeBase.countDocuments();

    // 激活状态知识库数
    const activeKBs = await KnowledgeBase.countDocuments({ status: 'active' });

    // 总文档数
    const totalDocuments = await Document.countDocuments();

    // 平均每个知识库的文档数
    const kbStats = await KnowledgeBase.aggregate([
      { $group: { _id: null, avgDocs: { $avg: '$documentCount' } } }
    ]);
    const averageDocsPerKB = kbStats[0]?.avgDocs || 0;

    // 按状态分组的知识库数量
    const statusDistribution = await KnowledgeBase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 格式化状态分布
    const formattedStatus = {
      active: 0,
      inactive: 0
    };
    statusDistribution.forEach(item => {
      formattedStatus[item._id] = item.count;
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalKnowledgeBases: totalKBs,
        activeKnowledgeBases: activeKBs,
        totalDocuments,
        averageDocumentsPerKB: parseFloat(averageDocsPerKB.toFixed(2)),
        statusDistribution: formattedStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取用户交互统计信息
const getUserInteractionStats = async (req, res) => {
  try {
    // 总消息数（用户和AI）
    const totalMessages = await Conversation.aggregate([
      { $group: { _id: null, total: { $sum: '$message_count' } } }
    ]);
    const totalMessageCount = totalMessages[0]?.total || 0;

    // 平均每对话消息数
    const avgMessages = await Conversation.aggregate([
      { $group: { _id: null, avg: { $avg: '$message_count' } } }
    ]);
    const averageMessagesPerConversation = avgMessages[0]?.avg || 0;

    // 基于参考资料的回答统计
    const referenceStats = await Conversation.aggregate([
      { $match: { reference_count: { $gt: 0 } } },
      { $group: { 
        _id: null, 
        conversationsWithReference: { $sum: 1 },
        totalReferences: { $sum: '$reference_count' }
      } }
    ]);

    const conversationsWithReferences = referenceStats[0]?.conversationsWithReference || 0;
    const totalReferences = referenceStats[0]?.totalReferences || 0;
    const avgReferencesPerConversation = totalReferences > 0 ? (totalReferences / conversationsWithReferences) : 0;

    // 最近7天的消息增长趋势
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    last7Days.setHours(0, 0, 0, 0);

    const messageGrowth = await Conversation.aggregate([
      { $match: { update_time: { $gte: last7Days.getTime() } } },
      { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$update_time' } } } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 格式化消息增长数据
    const formattedGrowth = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      formattedGrowth[dateStr] = 0;
    }

    messageGrowth.forEach(item => {
      formattedGrowth[item._id] = item.count;
    });

    // 按日期排序
    const sortedGrowth = Object.entries(formattedGrowth)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));

    res.status(200).json({
      status: 'success',
      data: {
        totalMessages: totalMessageCount,
        averageMessagesPerConversation: parseFloat(averageMessagesPerConversation.toFixed(2)),
        conversationsWithReferences,
        totalReferences,
        averageReferencesPerConversation: parseFloat(avgReferencesPerConversation.toFixed(2)),
        last7DaysMessageGrowth: sortedGrowth
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// 获取综合统计信息
const getAllStats = async (req, res) => {
  try {
    // 并行获取所有统计信息
    const [conversationStats, knowledgeBaseStats, userInteractionStats] = await Promise.all([
      getConversationStats(req, { json: (data) => data }),
      getKnowledgeBaseStats(req, { json: (data) => data }),
      getUserInteractionStats(req, { json: (data) => data })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        conversations: conversationStats.data,
        knowledgeBases: knowledgeBaseStats.data,
        userInteractions: userInteractionStats.data
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

export {
  getConversationStats,
  getKnowledgeBaseStats,
  getUserInteractionStats,
  getAllStats
};

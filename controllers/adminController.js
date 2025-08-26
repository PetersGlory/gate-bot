const Admin = require('../models/Admin');
const User = require('../models/User');
const Group = require('../models/Group');
const Transaction = require('../models/Transaction');
const Contribution = require('../models/Contribution');
const Rotation = require('../models/Rotation');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

class AdminController {
  // Authentication
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const admin = await Admin.findOne({ email, isActive: true });
      if (!admin || !await admin.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { adminId: admin._id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      });
    } catch (error) {
      logger.error('Admin login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async logout(req, res) {
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async getProfile(req, res) {
    try {
      const admin = await Admin.findById(req.admin.adminId).select('-password');
      res.json({ success: true, admin });
    } catch (error) {
      logger.error('Get admin profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Dashboard
  async getDashboardMetrics(req, res) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalGroups,
        activeGroups,
        weeklyContributions,
        monthlyContributions,
        pendingPayouts,
        totalTransactions
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Group.countDocuments(),
        Group.countDocuments({ isActive: true }),
        this.getWeeklyContributions(),
        this.getMonthlyContributions(),
        Rotation.countDocuments({ status: 'pending' }),
        Transaction.countDocuments()
      ]);

      const previousWeekContributions = await this.getPreviousWeekContributions();
      const previousMonthContributions = await this.getPreviousMonthContributions();

      res.json({
        success: true,
        metrics: {
          users: {
            total: totalUsers,
            active: activeUsers,
            growth: this.calculateGrowth(totalUsers, totalUsers - 100)
          },
          groups: {
            total: totalGroups,
            active: activeGroups,
            growth: this.calculateGrowth(totalGroups, totalGroups - 10)
          },
          contributions: {
            weekly: {
              amount: weeklyContributions.amount,
              count: weeklyContributions.count,
              growth: this.calculateGrowth(weeklyContributions.amount, previousWeekContributions.amount)
            },
            monthly: {
              amount: monthlyContributions.count,
              count: monthlyContributions.count,
              growth: this.calculateGrowth(monthlyContributions.amount, previousMonthContributions.amount)
            }
          },
          pendingPayouts,
          totalTransactions
        }
      });
    } catch (error) {
      logger.error('Dashboard metrics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAnalytics(req, res) {
    try {
      const { period = '30d' } = req.query;
      const days = parseInt(period.replace('d', ''));
      const startDate = moment().subtract(days, 'days').toDate();

      const [
        contributionTrends,
        userRegistrations,
        payoutStats,
        topGroups
      ] = await Promise.all([
        this.getContributionTrends(startDate),
        this.getUserRegistrationTrends(startDate),
        this.getPayoutStats(startDate),
        this.getTopGroups()
      ]);

      res.json({
        success: true,
        analytics: {
          contributionTrends,
          userRegistrations,
          payoutStats,
          topGroups
        }
      });
    } catch (error) {
      logger.error('Analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;

      const [
        recentUsers,
        recentGroups,
        recentContributions,
        recentPayouts
      ] = await Promise.all([
        User.find().sort({ createdAt: -1 }).limit(5).select('name whatsappId createdAt'),
        Group.find().sort({ createdAt: -1 }).limit(5).select('name creator createdAt').populate('creator', 'name'),
        Contribution.find({ status: 'confirmed' }).sort({ createdAt: -1 }).limit(5)
          .populate('user', 'name').populate('group', 'name'),
        Rotation.find({ status: 'paid' }).sort({ payoutDate: -1 }).limit(5)
          .populate('recipient', 'name').populate('group', 'name')
      ]);

      const activity = [
        ...recentUsers.map(user => ({
          type: 'user_registration',
          message: `${user.name} registered`,
          timestamp: user.createdAt,
          data: { userId: user._id, name: user.name }
        })),
        ...recentGroups.map(group => ({
          type: 'group_creation',
          message: `Group "${group.name}" created by ${group.creator.name}`,
          timestamp: group.createdAt,
          data: { groupId: group._id, name: group.name }
        })),
        ...recentContributions.map(contrib => ({
          type: 'contribution',
          message: `${contrib.user.name} contributed ₦${contrib.amount.toLocaleString()} to ${contrib.group.name}`,
          timestamp: contrib.createdAt,
          data: { contributionId: contrib._id, amount: contrib.amount }
        })),
        ...recentPayouts.map(payout => ({
          type: 'payout',
          message: `₦${payout.amount.toLocaleString()} paid to ${payout.recipient.name} from ${payout.group.name}`,
          timestamp: payout.payoutDate,
          data: { rotationId: payout._id, amount: payout.amount }
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

      res.json({ success: true, activity });
    } catch (error) {
      logger.error('Recent activity error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods
  async getWeeklyContributions() {
    const startOfWeek = moment().startOf('week').toDate();
    const endOfWeek = moment().endOf('week').toDate();

    const result = await Contribution.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { amount: 0, count: 0 };
  }

  async getMonthlyContributions() {
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate();

    const result = await Contribution.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { amount: 0, count: 0 };
  }

  async getPreviousWeekContributions() {
    const startOfPrevWeek = moment().subtract(1, 'week').startOf('week').toDate();
    const endOfPrevWeek = moment().subtract(1, 'week').endOf('week').toDate();

    const result = await Contribution.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startOfPrevWeek, $lte: endOfPrevWeek }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { amount: 0, count: 0 };
  }

  async getPreviousMonthContributions() {
    const startOfPrevMonth = moment().subtract(1, 'month').startOf('month').toDate();
    const endOfPrevMonth = moment().subtract(1, 'month').endOf('month').toDate();

    const result = await Contribution.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return result[0] || { amount: 0, count: 0 };
  }

  calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(2);
  }

  async getContributionTrends(startDate) {
    return await Contribution.aggregate([
      { $match: { status: 'confirmed', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
  }

  async getUserRegistrationTrends(startDate) {
    return await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
  }

  async getPayoutStats(startDate) {
    return await Rotation.aggregate([
      { $match: { status: 'paid', payoutDate: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$payoutDate' } }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
  }

  async getTopGroups() {
    return await Group.aggregate([
      {
        $lookup: {
          from: 'contributions',
          localField: '_id',
          foreignField: 'group',
          as: 'contributions'
        }
      },
      {
        $addFields: {
          totalContributed: {
            $sum: {
              $map: {
                input: { $filter: { input: '$contributions', cond: { $eq: ['$this.status', 'confirmed'] } } },
                as: 'contrib',
                in: '$contrib.amount'
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          contributionAmount: 1,
          membersCount: { $size: '$members' },
          totalContributed: 1
        }
      },
      { $sort: { totalContributed: -1 } },
      { $limit: 10 }
    ]);
  }

  // User Management
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) query.isActive = status === 'active';

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const users = await User.find(query)
        .populate('groups', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          whatsappId: user.whatsappId,
          phoneNumber: user.phoneNumber,
          balance: user.balance,
          groupsCount: user.groups.length,
          isActive: user.isActive,
          registeredAt: user.registeredAt,
          lastActivity: user.lastActivity
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).populate('groups');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const [contributions, transactions, rotations] = await Promise.all([
        Contribution.find({ user: id }).populate('group', 'name').sort({ createdAt: -1 }).limit(10),
        Transaction.find({ user: id }).populate('group', 'name').sort({ createdAt: -1 }).limit(10),
        Rotation.find({ recipient: id }).populate('group', 'name').sort({ payoutDate: -1 }).limit(5)
      ]);

      res.json({
        success: true,
        user: {
          ...user.toObject(),
          contributions,
          transactions,
          rotations
        }
      });
    } catch (error) {
      logger.error('Get user details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent updating sensitive fields
      delete updates.whatsappId;
      delete updates.balance;
      delete updates.groups;

      const user = await User.findByIdAndUpdate(id, updates, { new: true });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, user });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async activateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, message: 'User activated successfully' });
    } catch (error) {
      logger.error('Activate user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deactivateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
      logger.error('Deactivate user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Group Management
  async getGroups(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {};
      if (search) {
        query.name = { $regex: search, $options: 'i' };
      }
      if (status) query.isActive = status === 'active';

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const groups = await Group.find(query)
        .populate('creator', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Group.countDocuments(query);

      res.json({
        success: true,
        groups: groups.map(group => ({
          id: group._id,
          name: group.name,
          creator: group.creator,
          contributionAmount: group.contributionAmount,
          maxMembers: group.maxMembers,
          membersCount: group.members.length,
          currentCycle: group.currentCycle,
          totalContributions: group.totalContributions,
          isActive: group.isActive,
          startDate: group.startDate,
          createdAt: group.createdAt
        })),
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get groups error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getGroupDetails(req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findById(id)
        .populate('creator', 'name email')
        .populate('members.user', 'name email whatsappId');

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const [contributions, rotations] = await Promise.all([
        Contribution.find({ group: id }).populate('user', 'name').sort({ createdAt: -1 }).limit(20),
        Rotation.find({ group: id }).populate('recipient', 'name').sort({ createdAt: -1 }).limit(10)
      ]);

      res.json({
        success: true,
        group: {
          ...group.toObject(),
          contributions,
          rotations
        }
      });
    } catch (error) {
      logger.error('Get group details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getGroupMembers(req, res) {
    try {
      const { id } = req.params;
      
      const group = await Group.findById(id).populate('members.user', 'name email whatsappId balance');
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Get contribution stats for each member
      const membersWithStats = await Promise.all(
        group.members.map(async (member) => {
          const contributionStats = await Contribution.aggregate([
            { $match: { user: member.user._id, group: group._id } },
            {
              $group: {
                _id: null,
                totalContributions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                confirmedContributions: {
                  $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
                }
              }
            }
          ]);

          const stats = contributionStats[0] || {
            totalContributions: 0,
            totalAmount: 0,
            confirmedContributions: 0
          };

          return {
            ...member.toObject(),
            stats
          };
        })
      );

      res.json({ success: true, members: membersWithStats });
    } catch (error) {
      logger.error('Get group members error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Transaction Management
  async getTransactions(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        startDate,
        endDate,
        userId,
        groupId
      } = req.query;

      const query = {};
      if (type) query.type = type;
      if (status) query.status = status;
      if (userId) query.user = userId;
      if (groupId) query.group = groupId;
      
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await Transaction.find(query)
        .populate('user', 'name email')
        .populate('group', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        transactions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Reports
  async getFinancialReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);

      const [
        totalContributions,
        totalPayouts,
        transactionStats
      ] = await Promise.all([
        Contribution.aggregate([
          { $match: { status: 'confirmed', ...(Object.keys(dateQuery).length && { createdAt: dateQuery }) } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Rotation.aggregate([
          { $match: { status: 'paid', ...(Object.keys(dateQuery).length && { payoutDate: dateQuery }) } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Transaction.aggregate([
          { $match: { ...(Object.keys(dateQuery).length && { createdAt: dateQuery }) } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              amount: { $sum: '$amount' }
            }
          }
        ])
      ]);

      res.json({
        success: true,
        report: {
          contributions: totalContributions[0] || { total: 0, count: 0 },
          payouts: totalPayouts[0] || { total: 0, count: 0 },
          transactionStats,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      logger.error('Financial report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Messaging
  async sendBroadcast(req, res) {
    try {
      const { message, userIds, groupIds, type = 'all' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let recipients = [];

      if (type === 'all') {
        const users = await User.find({ isActive: true }, 'whatsappId name');
        recipients = users;
      } else if (type === 'users' && userIds) {
        const users = await User.find({ _id: { $in: userIds }, isActive: true }, 'whatsappId name');
        recipients = users;
      } else if (type === 'groups' && groupIds) {
        const groups = await Group.find({ _id: { $in: groupIds } }).populate('members.user', 'whatsappId name');
        recipients = groups.flatMap(group => 
          group.members.filter(member => member.isActive).map(member => member.user)
        );
      }

      // Send messages
      const results = await Promise.allSettled(
        recipients.map(recipient => 
          whatsappService.sendMessage(recipient.whatsappId, message)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.json({
        success: true,
        message: 'Broadcast sent',
        stats: {
          total: recipients.length,
          successful,
          failed
        }
      });
    } catch (error) {
      logger.error('Send broadcast error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMessageTemplates(req, res) {
    try {
      // For now, return static templates. In production, store in database
      const templates = [
        {
          id: 1,
          name: 'Welcome Message',
          content: 'Welcome to {group_name}! Your weekly contribution is ₦{amount}.',
          variables: ['group_name', 'amount']
        },
        {
          id: 2,
          name: 'Payment Reminder',
          content: 'Hi {user_name}, reminder to make your contribution of ₦{amount} to {group_name}.',
          variables: ['user_name', 'amount', 'group_name']
        },
        {
          id: 3,
          name: 'Payout Notification',
          content: 'Congratulations {user_name}! You received ₦{amount} from {group_name}.',
          variables: ['user_name', 'amount', 'group_name']
        }
      ];

      res.json({ success: true, templates });
    } catch (error) {
      logger.error('Get message templates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createMessageTemplate(req, res) {
    try {
      const { name, content, variables } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
      }

      // In production, save to database
      const template = {
        id: Date.now(),
        name,
        content,
        variables: variables || [],
        createdAt: new Date()
      };

      res.json({ success: true, template });
    } catch (error) {
      logger.error('Create message template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSettings(req, res) {
    try {
      // In production, store in database or config file
      const settings = {
        bot: {
          name: 'Thrift Bot',
          description: 'WhatsApp Thrift Management Bot',
          version: '1.0.0'
        },
        whatsapp: {
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          verifyToken: '***hidden***',
          webhookUrl: process.env.WEBHOOK_URL
        },
        payment: {
          provider: 'paystack',
          currency: 'NGN',
          minimumAmount: 1000,
          maximumAmount: 1000000
        },
        business: {
          minimumGroupSize: 2,
          maximumGroupSize: 50,
          defaultContributionFrequency: 'weekly',
          latePenaltyPercentage: 5,
          allowPartialPayments: false
        },
        notifications: {
          enableEmailNotifications: true,
          enableSMSBackup: false,
          reminderFrequency: 'daily'
        }
      };

      res.json({ success: true, settings });
    } catch (error) {
      logger.error('Get settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateSettings(req, res) {
    try {
      const updates = req.body;
      
      // In production, validate and save to database
      // For now, just return success
      
      res.json({ 
        success: true, 
        message: 'Settings updated successfully',
        settings: updates
      });
    } catch (error) {
      logger.error('Update settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async exportUsers(req, res) {
    try {
      const users = await User.find().populate('groups', 'name');
      
      const csvData = users.map(user => ({
        Name: user.name,
        Email: user.email,
        Phone: user.phoneNumber,
        WhatsAppID: user.whatsappId,
        Balance: user.balance,
        Groups: user.groups.map(g => g.name).join('; '),
        Status: user.isActive ? 'Active' : 'Inactive',
        RegisteredAt: user.registeredAt.toISOString(),
        LastActivity: user.lastActivity ? user.lastActivity.toISOString() : 'Never'
      }));

      res.json({ success: true, data: csvData });
    } catch (error) {
      logger.error('Export users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async exportTransactions(req, res) {
    try {
      const { startDate, endDate, type, status } = req.query;
      
      const query = {};
      if (type) query.type = type;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await Transaction.find(query)
        .populate('user', 'name email')
        .populate('group', 'name')
        .sort({ createdAt: -1 });

      const csvData = transactions.map(txn => ({
        Reference: txn.reference,
        User: txn.user ? txn.user.name : 'N/A',
        UserEmail: txn.user ? txn.user.email : 'N/A',
        Group: txn.group ? txn.group.name : 'N/A',
        Amount: txn.amount,
        Type: txn.type,
        Status: txn.status,
        Description: txn.description,
        CreatedAt: txn.createdAt.toISOString()
      }));

      res.json({ success: true, data: csvData });
    } catch (error) {
      logger.error('Export transactions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTransactionDetails(req, res) {
    try {
      const { id } = req.params;
      
      const transaction = await Transaction.findById(id)
        .populate('user', 'name email whatsappId')
        .populate('group', 'name contributionAmount');

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({ success: true, transaction });
    } catch (error) {
      logger.error('Get transaction details error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTransactionStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const transaction = await Transaction.findByIdAndUpdate(
        id,
        { 
          status,
          ...(notes && { 'metadata.adminNotes': notes }),
          ...(status === 'completed' && { completedAt: new Date() })
        },
        { new: true }
      );

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json({ success: true, transaction });
    } catch (error) {
      logger.error('Update transaction status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent updating sensitive fields
      delete updates.members;
      delete updates.creator;
      delete updates.totalContributions;

      const group = await Group.findByIdAndUpdate(id, updates, { new: true })
        .populate('creator', 'name');

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      res.json({ success: true, group });
    } catch (error) {
      logger.error('Update group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async activateGroup(req, res) {
    try {
      const { id } = req.params;
      const group = await Group.findByIdAndUpdate(id, { isActive: true }, { new: true });
      
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      res.json({ success: true, message: 'Group activated successfully' });
    } catch (error) {
      logger.error('Activate group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deactivateGroup(req, res) {
    try {
      const { id } = req.params;
      const group = await Group.findByIdAndUpdate(id, { isActive: false }, { new: true });
      
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      res.json({ success: true, message: 'Group deactivated successfully' });
    } catch (error) {
      logger.error('Deactivate group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);

      const [
        registrationStats,
        activityStats,
        topUsers
      ] = await Promise.all([
        User.aggregate([
          { $match: { ...(Object.keys(dateQuery).length && { createdAt: dateQuery }) } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
              avgBalance: { $avg: '$balance' }
            }
          }
        ]),
        User.aggregate([
          {
            $lookup: {
              from: 'contributions',
              localField: '_id',
              foreignField: 'user',
              as: 'contributions'
            }
          },
          {
            $addFields: {
              totalContributions: {
                $sum: {
                  $map: {
                    input: { $filter: { input: '$contributions', cond: { $eq: ['$this.status', 'confirmed'] } } },
                    as: 'contrib',
                    in: '$contrib.amount'
                  }
                }
              }
            }
          },
          {
            $project: {
              name: 1,
              email: 1,
              totalContributions: 1,
              contributionsCount: { $size: '$contributions' }
            }
          },
          { $sort: { totalContributions: -1 } },
          { $limit: 10 }
        ])
      ]);

      res.json({
        success: true,
        report: {
          registrationStats,
          activityStats: activityStats[0] || { totalUsers: 0, activeUsers: 0, avgBalance: 0 },
          topUsers,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      logger.error('User report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getGroupReport(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);

      const [
        groupStats,
        performanceStats
      ] = await Promise.all([
        Group.aggregate([
          { $match: { ...(Object.keys(dateQuery).length && { createdAt: dateQuery }) } },
          {
            $group: {
              _id: null,
              totalGroups: { $sum: 1 },
              activeGroups: { $sum: { $cond: ['$isActive', 1, 0] } },
              avgContributionAmount: { $avg: '$contributionAmount' },
              avgMembersPerGroup: { $avg: { $size: '$members' } }
            }
          }
        ]),
        Group.aggregate([
          {
            $lookup: {
              from: 'contributions',
              localField: '_id',
              foreignField: 'group',
              as: 'contributions'
            }
          },
          {
            $addFields: {
              totalContributed: {
                $sum: {
                  $map: {
                    input: { $filter: { input: '$contributions', cond: { $eq: ['$this.status', 'confirmed'] } } },
                    in: '$contrib.amount'
                  }
                }
              },
              contributionRate: {
                $cond: [
                  { $gt: [{ $size: '$members' }, 0] },
                  {
                    $divide: [
                      { $size: { $filter: { input: '$contributions', cond: { $eq: ['$this.status', 'confirmed'] } } } },
                      { $multiply: [{ $size: '$members' }, '$currentCycle'] }
                    ]
                  },
                  0
                ]
              }
            }
          },
          {
            $project: {
              name: 1,
              contributionAmount: 1,
              membersCount: { $size: '$members' },
              totalContributed: 1,
              contributionRate: 1,
              currentCycle: 1
            }
          },
          { $sort: { totalContributed: -1 } }
        ])
      ]);

      res.json({
        success: true,
        report: {
          groupStats: groupStats[0] || { 
            totalGroups: 0, 
            activeGroups: 0, 
            avgContributionAmount: 0, 
            avgMembersPerGroup: 0 
          },
          performanceStats,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      logger.error('Group report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AdminController();

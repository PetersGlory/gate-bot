const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/adminAuth');
const permissionMiddleware = require('../middleware/permissions');

// Authentication routes
router.post('/auth/login', adminController.login);
router.post('/auth/logout', authMiddleware, adminController.logout);
router.get('/auth/me', authMiddleware, adminController.getProfile);

// Dashboard routes
router.get('/dashboard/metrics', authMiddleware, adminController.getDashboardMetrics);
router.get('/dashboard/analytics', authMiddleware, adminController.getAnalytics);
router.get('/dashboard/activity', authMiddleware, adminController.getRecentActivity);

// User management routes
router.get('/users', authMiddleware, permissionMiddleware('users'), adminController.getUsers);
router.get('/users/:id', authMiddleware, permissionMiddleware('users'), adminController.getUserDetails);
router.put('/users/:id', authMiddleware, permissionMiddleware('users'), adminController.updateUser);
router.post('/users/:id/activate', authMiddleware, permissionMiddleware('users'), adminController.activateUser);
router.post('/users/:id/deactivate', authMiddleware, permissionMiddleware('users'), adminController.deactivateUser);
router.get('/users/export', authMiddleware, permissionMiddleware('users'), adminController.exportUsers);

// Group management routes
router.get('/groups', authMiddleware, permissionMiddleware('groups'), adminController.getGroups);
router.get('/groups/:id', authMiddleware, permissionMiddleware('groups'), adminController.getGroupDetails);
router.get('/groups/:id/members', authMiddleware, permissionMiddleware('groups'), adminController.getGroupMembers);
router.put('/groups/:id', authMiddleware, permissionMiddleware('groups'), adminController.updateGroup);
router.post('/groups/:id/activate', authMiddleware, permissionMiddleware('groups'), adminController.activateGroup);
router.post('/groups/:id/deactivate', authMiddleware, permissionMiddleware('groups'), adminController.deactivateGroup);

// Transaction routes
router.get('/transactions', authMiddleware, permissionMiddleware('transactions'), adminController.getTransactions);
router.get('/transactions/:id', authMiddleware, permissionMiddleware('transactions'), adminController.getTransactionDetails);
router.put('/transactions/:id/status', authMiddleware, permissionMiddleware('transactions'), adminController.updateTransactionStatus);
router.get('/transactions/export', authMiddleware, permissionMiddleware('transactions'), adminController.exportTransactions);

// Reports routes
router.get('/reports/financial', authMiddleware, permissionMiddleware('reports'), adminController.getFinancialReport);
router.get('/reports/users', authMiddleware, permissionMiddleware('reports'), adminController.getUserReport);
router.get('/reports/groups', authMiddleware, permissionMiddleware('reports'), adminController.getGroupReport);

// Messaging routes
router.post('/messages/broadcast', authMiddleware, permissionMiddleware('messaging'), adminController.sendBroadcast);
router.get('/messages/templates', authMiddleware, permissionMiddleware('messaging'), adminController.getMessageTemplates);
router.post('/messages/templates', authMiddleware, permissionMiddleware('messaging'), adminController.createMessageTemplate);

// Settings routes
router.get('/settings', authMiddleware, permissionMiddleware('settings'), adminController.getSettings);
router.put('/settings', authMiddleware, permissionMiddleware('settings'), adminController.updateSettings);

module.exports = router;

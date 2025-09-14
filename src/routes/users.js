const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/auth');

// Define the route for creating a user
// POST /api/users
router.post('/', protect, authorizeRoles(['Admin']), userController.createUser);

// You can add other user-related routes here in the future
// GET /api/users
// router.get('/', protect, authorize('Admin'), userController.listUsers);

module.exports = router;
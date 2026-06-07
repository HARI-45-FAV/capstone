const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communicationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/contacts/:courseId', protect, communicationController.getContactRoster);
router.post('/send-email', protect, communicationController.sendCustomEmail);

module.exports = router;

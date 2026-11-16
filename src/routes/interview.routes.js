const { Router } = require('express');
const requireAuth = require('../middleware/auth.middleware');
const interviewController = require('../controllers/interview.controller');

const router = Router();

router.use(requireAuth);
router.get('/', interviewController.listInterviews);
router.post('/start', interviewController.startInterview);
router.get('/:id', interviewController.getInterview);
router.post('/:id/answer', interviewController.submitAnswer);

module.exports = router;

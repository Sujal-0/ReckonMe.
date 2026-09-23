import express from 'express';
import { uploadQuestions, getStats, getQuestions, updateQuestion, deleteQuestion, bulkDeleteQuestions, getAIQuestions, discardQuestions, autoScrape, removeDuplicateQuestions } from '../controllers/AdminController.js';

const router = express.Router();

// Super simple secret-based auth for the admin route since it's just for the owner
const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden: Invalid admin secret" });
  }
  next();
};

router.post('/upload-questions', adminAuth, uploadQuestions);
router.post('/discard-questions', adminAuth, discardQuestions);
router.post('/auto-scrape', adminAuth, autoScrape);
router.get('/stats', adminAuth, getStats);
router.get('/ai-questions', adminAuth, getAIQuestions);
router.get('/questions', adminAuth, getQuestions);
router.post('/questions/bulk-delete', adminAuth, bulkDeleteQuestions);
router.post('/questions/remove-duplicates', adminAuth, removeDuplicateQuestions);
router.put('/questions/:id', adminAuth, updateQuestion);
router.delete('/questions/:id', adminAuth, deleteQuestion);

export default router;

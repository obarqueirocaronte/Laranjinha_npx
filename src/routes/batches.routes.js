const express = require('express');
const router = express.Router();
const controller = require('../controllers/batches.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Applying auth to all batch routes (if required)
router.use(authMiddleware.authenticate);

router.get('/', controller.listBatches);
router.get('/:id', controller.getBatchDetails);
router.put('/:id', controller.updateBatchTags);
router.delete('/:id', controller.deleteBatch);

module.exports = router;

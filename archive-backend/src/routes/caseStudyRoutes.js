const express = require('express');
const controller = require('../controllers/caseStudyController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireAuth, controller.create);
router.post('/:id/media', requireAuth, controller.addMedia);
router.post('/auto-import', requireAuth, controller.autoImport);

module.exports = router;

const express = require('express');
const controller = require('../controllers/resourceController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../config/upload');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireAuth, upload.single('file'), controller.upload);
router.delete('/:id', requireAuth, controller.remove);

module.exports = router;

const express = require('express');
const controller = require('../controllers/collectionController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All collection routes are personal — require auth throughout.
router.use(requireAuth);

router.get('/', controller.listMine);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

router.post('/:id/items', controller.addItem);
router.delete('/:id/items/:itemId', controller.removeItem);

module.exports = router;

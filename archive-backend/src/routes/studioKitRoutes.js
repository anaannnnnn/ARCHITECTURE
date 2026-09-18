const express = require('express');
const controller = require('../controllers/studioKitController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.post('/', requireAuth, controller.create);
router.delete('/:id', requireAuth, controller.remove);

router.post('/:id/resources', requireAuth, controller.addResource);
router.delete('/:id/resources/:resourceId', requireAuth, controller.removeResource);

router.post('/:id/case-studies', requireAuth, controller.addCaseStudy);
router.delete('/:id/case-studies/:caseStudyId', requireAuth, controller.removeCaseStudy);

module.exports = router;

const studioKitModel = require('../models/studioKitModel');
const resourceModel = require('../models/resourceModel');
const caseStudyModel = require('../models/caseStudyModel');

function list(req, res) {
  const { q, limit, offset } = req.query;
  const results = studioKitModel.list({
    q,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ results });
}

function getOne(req, res) {
  const kit = studioKitModel.findById(Number(req.params.id));
  if (!kit) return res.status(404).json({ error: 'Not found' });
  res.json(kit);
}

function create(req, res) {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const kit = studioKitModel.create({
    title,
    description,
    created_by_user_id: req.user?.id || null,
  });
  res.status(201).json(kit);
}

function addResource(req, res) {
  const kitId = Number(req.params.id);
  const { resource_id } = req.body;

  if (!studioKitModel.findById(kitId)) return res.status(404).json({ error: 'Studio kit not found' });
  if (!resourceModel.findById(resource_id)) return res.status(404).json({ error: 'Resource not found' });

  studioKitModel.addResource(kitId, resource_id);
  res.status(201).json(studioKitModel.findById(kitId));
}

function removeResource(req, res) {
  const kitId = Number(req.params.id);
  const resourceId = Number(req.params.resourceId);
  studioKitModel.removeResource(kitId, resourceId);
  res.json(studioKitModel.findById(kitId));
}

function addCaseStudy(req, res) {
  const kitId = Number(req.params.id);
  const { case_study_id } = req.body;

  if (!studioKitModel.findById(kitId)) return res.status(404).json({ error: 'Studio kit not found' });
  if (!caseStudyModel.findById(case_study_id)) return res.status(404).json({ error: 'Case study not found' });

  studioKitModel.addCaseStudy(kitId, case_study_id);
  res.status(201).json(studioKitModel.findById(kitId));
}

function removeCaseStudy(req, res) {
  const kitId = Number(req.params.id);
  const caseStudyId = Number(req.params.caseStudyId);
  studioKitModel.removeCaseStudy(kitId, caseStudyId);
  res.json(studioKitModel.findById(kitId));
}

function remove(req, res) {
  const kit = studioKitModel.findById(Number(req.params.id));
  if (!kit) return res.status(404).json({ error: 'Not found' });
  studioKitModel.remove(kit.id);
  res.status(204).send();
}

module.exports = {
  list,
  getOne,
  create,
  addResource,
  removeResource,
  addCaseStudy,
  removeCaseStudy,
  remove,
};

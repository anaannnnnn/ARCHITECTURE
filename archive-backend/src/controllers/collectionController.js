const collectionModel = require('../models/collectionModel');
const caseStudyModel = require('../models/caseStudyModel');
const resourceModel = require('../models/resourceModel');

function listMine(req, res) {
  const collections = collectionModel.listForUser(req.user.id);
  res.json({ results: collections });
}

function getOne(req, res) {
  const collection = collectionModel.findById(Number(req.params.id));
  if (!collection) return res.status(404).json({ error: 'Not found' });
  if (collection.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your collection' });
  }
  res.json(collection);
}

function create(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const collection = collectionModel.create({ user_id: req.user.id, name });
  res.status(201).json(collection);
}

function addItem(req, res) {
  const collectionId = Number(req.params.id);
  if (!collectionModel.belongsToUser(collectionId, req.user.id)) {
    return res.status(403).json({ error: 'Not your collection' });
  }

  const { item_type, item_id } = req.body;
  if (!['case_study', 'resource'].includes(item_type)) {
    return res.status(400).json({ error: "item_type must be 'case_study' or 'resource'" });
  }

  const exists =
    item_type === 'case_study' ? caseStudyModel.findById(item_id) : resourceModel.findById(item_id);
  if (!exists) return res.status(404).json({ error: `${item_type} not found` });

  collectionModel.addItem(collectionId, { item_type, item_id });
  res.status(201).json(collectionModel.findById(collectionId));
}

function removeItem(req, res) {
  const collectionId = Number(req.params.id);
  if (!collectionModel.belongsToUser(collectionId, req.user.id)) {
    return res.status(403).json({ error: 'Not your collection' });
  }

  collectionModel.removeItem(collectionId, Number(req.params.itemId));
  res.json(collectionModel.findById(collectionId));
}

function remove(req, res) {
  const collectionId = Number(req.params.id);
  if (!collectionModel.belongsToUser(collectionId, req.user.id)) {
    return res.status(403).json({ error: 'Not your collection' });
  }

  collectionModel.remove(collectionId);
  res.status(204).send();
}

module.exports = { listMine, getOne, create, addItem, removeItem, remove };

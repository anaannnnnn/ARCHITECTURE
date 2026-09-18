const caseStudyModel = require('../models/caseStudyModel');
const wikidata = require('../integrations/wikidata');
const wikimediaCommons = require('../integrations/wikimediaCommons');
const getty = require('../integrations/getty');
const europeana = require('../integrations/europeana');

function list(req, res) {
  const { typology, architect, climate_zone, q, limit, offset } = req.query;
  const results = caseStudyModel.search({
    typology,
    architect,
    climate_zone,
    q,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  res.json({ results });
}

function getOne(req, res) {
  const caseStudy = caseStudyModel.findById(Number(req.params.id));
  if (!caseStudy) return res.status(404).json({ error: 'Not found' });
  res.json(caseStudy);
}

function create(req, res) {
  const caseStudy = caseStudyModel.create({
    ...req.body,
    source: req.body.source || 'student',
    created_by_user_id: req.user?.id || null,
  });
  res.status(201).json(caseStudy);
}

function addMedia(req, res) {
  const id = Number(req.params.id);
  const caseStudy = caseStudyModel.findById(id);
  if (!caseStudy) return res.status(404).json({ error: 'Case study not found' });

  const mediaId = caseStudyModel.addMedia(id, req.body);
  res.status(201).json({ id: mediaId });
}

/**
 * Auto-import: search Wikidata for buildings matching a keyword, then pull
 * images/drawings for each from every configured source (Wikimedia Commons,
 * Getty, Europeana), and save as case studies. This is what powers the
 * "auto-generated" case studies described in the product plan.
 *
 * Each image source is fetched independently and failures are non-fatal —
 * a source with no results (or, for Europeana, no API key configured) simply
 * contributes nothing rather than failing the whole import.
 */
async function autoImport(req, res) {
  const { keyword, typology } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword is required' });

  const buildings = await wikidata.searchBuildings(keyword, 5);
  const created = [];

  for (const b of buildings) {
    const caseStudy = caseStudyModel.create({
      title: b.title,
      architect: b.architect,
      location: b.location,
      year_built: b.year_built,
      typology: typology || null,
      source: 'wikidata',
      source_ref: b.wikidata_uri,
      created_by_user_id: req.user?.id || null,
    });

    const mediaFetches = [
      // Wikimedia Commons — photos/drawings, no key required
      wikimediaCommons
        .searchImages(b.title, 3)
        .then((images) =>
          images
            .filter((img) => img.url)
            .map((img) => ({
              media_type: 'photo',
              url: img.url,
              license: img.license,
              source: 'wikimedia_commons',
            }))
        )
        .catch((err) => {
          console.warn(`Wikimedia Commons fetch failed for "${b.title}":`, err.message);
          return [];
        }),

      // Getty — museum collection objects (drawings/photos), no key required
      getty
        .searchObjects(b.title, 2)
        .then((results) => Promise.all(results.map((r) => getty.getObject(r.objectId))))
        .then((objects) =>
          objects
            .filter((o) => o.imageUrl)
            .map((o) => ({
              media_type: 'photo',
              url: o.imageUrl,
              license: o.metadataLicense,
              source: 'getty',
            }))
        )
        .catch((err) => {
          console.warn(`Getty fetch failed for "${b.title}":`, err.message);
          return [];
        }),

      // Europeana — requires EUROPEANA_API_KEY; skips silently if unset
      europeana
        .searchItems(b.title, 2)
        .then((items) =>
          items
            .filter((i) => i.imageUrl)
            .map((i) => ({
              media_type: 'photo',
              url: i.imageUrl,
              license: i.rights,
              source: 'europeana',
            }))
        )
        .catch((err) => {
          console.warn(`Europeana fetch skipped for "${b.title}":`, err.message);
          return [];
        }),
    ];

    const mediaGroups = await Promise.all(mediaFetches);
    mediaGroups.flat().forEach((media) => caseStudyModel.addMedia(caseStudy.id, media));

    created.push(caseStudyModel.findById(caseStudy.id));
  }

  res.status(201).json({ created });
}

module.exports = { list, getOne, create, addMedia, autoImport };

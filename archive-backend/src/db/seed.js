/**
 * Seeds an admin account, then pulls REAL starter data from the live
 * integrations (no hardcoded/fake rows) so the app isn't empty on first run:
 *   - A handful of real case studies from Wikidata + Wikimedia Commons images
 *   - A starter Studio Kit grouping them
 *
 * Run with: npm run seed
 * Requires network access (calls Wikidata + Wikimedia Commons live).
 */
require('dotenv').config();
const userModel = require('../models/userModel');
const caseStudyModel = require('../models/caseStudyModel');
const studioKitModel = require('../models/studioKitModel');
const wikidata = require('../integrations/wikidata');
const wikimediaCommons = require('../integrations/wikimediaCommons');

async function seedAdmin() {
  if (userModel.findByEmail('admin@archive.local')) {
    console.log('Admin user already exists — skipping.');
    return;
  }
  userModel.create({
    name: 'Admin',
    email: 'admin@archive.local',
    password: 'ChangeMe123!',
    role: 'admin',
  });
  console.log('Created admin user: admin@archive.local / ChangeMe123!  <-- change this password immediately');
}

async function seedCaseStudies(keyword, typology) {
  console.log(`Fetching real case studies for "${keyword}" from Wikidata...`);
  const buildings = await wikidata.searchBuildings(keyword, 3);

  const createdIds = [];
  for (const b of buildings) {
    if (!b.title) continue;

    const caseStudy = caseStudyModel.create({
      title: b.title,
      architect: b.architect,
      location: b.location,
      year_built: b.year_built,
      typology,
      source: 'wikidata',
      source_ref: b.wikidata_uri,
    });

    try {
      const images = await wikimediaCommons.searchImages(b.title, 2);
      images.forEach((img) => {
        if (img.url) {
          caseStudyModel.addMedia(caseStudy.id, {
            media_type: 'photo',
            url: img.url,
            license: img.license,
            source: 'wikimedia_commons',
          });
        }
      });
    } catch (err) {
      console.warn(`  Image fetch failed for "${b.title}": ${err.message}`);
    }

    console.log(`  Added case study: ${b.title}`);
    createdIds.push(caseStudy.id);
  }
  return createdIds;
}

async function main() {
  await seedAdmin();

  const museumIds = await seedCaseStudies('museum', 'museum');
  const housingIds = await seedCaseStudies('housing', 'housing');

  const kit = studioKitModel.create({
    title: 'Starter Kit: Public Buildings',
    description:
      'Auto-seeded starter kit combining museum and housing precedents. Replace/expand via POST /api/studio-kits.',
  });
  [...museumIds, ...housingIds].forEach((id) => studioKitModel.addCaseStudy(kit.id, id));
  console.log(`Created studio kit "${kit.title}" with ${museumIds.length + housingIds.length} case studies.`);

  console.log('\nSeed complete. Note: no resource (CAD block/texture/etc) rows were seeded —');
  console.log('those come from real file uploads via POST /api/resources, since there is no');
  console.log('open API for downloadable production assets (see README).');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

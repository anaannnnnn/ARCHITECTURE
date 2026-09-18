const fetch = require('node-fetch');

const WD_API = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'ArchiveBArchApp/0.1 (educational project; contact: set-a-real-contact-here)';

/**
 * IMPORTANT: this deliberately does NOT use a raw SPARQL query with an
 * unbound property-path scan (e.g. `?building wdt:P31/wdt:P279* wd:Q41176`
 * combined with a label CONTAINS filter). That pattern forces Wikidata's
 * shared query endpoint to scan/join across its entire building dataset and
 * reliably times out (502) on real keywords — confirmed while building this.
 *
 * Instead: use the indexed `wbsearchentities` search API (fast, like a
 * normal search box) to get candidate entity IDs, then `wbgetentities` to
 * pull just those entities' claims. Two bounded API calls instead of one
 * unbounded graph scan.
 */

async function wdFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Wikidata API request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function searchBuildings(keyword, limit = 15) {
  // Step 1: fast indexed entity search by label/description.
  const searchUrl =
    `${WD_API}?action=wbsearchentities&search=${encodeURIComponent(keyword)}` +
    `&language=en&type=item&limit=${limit}&format=json&origin=*`;
  const searchData = await wdFetch(searchUrl);
  const ids = (searchData.search || []).map((r) => r.id);
  if (ids.length === 0) return [];

  // Step 2: pull claims + labels for exactly those entities (bounded, fast).
  const getUrl =
    `${WD_API}?action=wbgetentities&ids=${ids.join('|')}` +
    `&props=claims|labels&languages=en&format=json&origin=*`;
  const entityData = await wdFetch(getUrl);
  const entities = entityData.entities || {};

  // Collect referenced architect/location QIDs so we can resolve their
  // labels in one more batched call rather than one call per entity.
  const refIds = new Set();
  const parsed = ids
    .map((id) => entities[id])
    .filter(Boolean)
    .map((entity) => {
      const label = entity.labels?.en?.value || null;
      const architectId = entity.claims?.P84?.[0]?.mainsnak?.datavalue?.value?.id || null;
      const locationId = entity.claims?.P131?.[0]?.mainsnak?.datavalue?.value?.id || null;
      const inceptionRaw = entity.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time || null;
      const instanceOfIds = (entity.claims?.P31 || [])
        .map((c) => c.mainsnak?.datavalue?.value?.id)
        .filter(Boolean);

      if (architectId) refIds.add(architectId);
      if (locationId) refIds.add(locationId);

      return {
        id: entity.id,
        title: label,
        architectId,
        locationId,
        year_built: inceptionRaw ? parseInt(inceptionRaw.slice(1, 5), 10) : null, // "+1965-00-00T..." -> 1965
        instanceOfIds,
        wikidata_uri: `https://www.wikidata.org/wiki/${entity.id}`,
      };
    })
    // Keep only entities that look like actual buildings/structures, i.e.
    // have at least a location or an architect claim — filters out
    // unrelated entities (people, books, etc.) that matched by keyword.
    .filter((b) => b.title && (b.architectId || b.locationId || b.instanceOfIds.length));

  // Step 3: resolve architect/location QIDs to human-readable labels.
  let refLabels = {};
  if (refIds.size > 0) {
    const refUrl =
      `${WD_API}?action=wbgetentities&ids=${[...refIds].join('|')}` +
      `&props=labels&languages=en&format=json&origin=*`;
    const refData = await wdFetch(refUrl);
    refLabels = Object.fromEntries(
      Object.entries(refData.entities || {}).map(([id, e]) => [id, e.labels?.en?.value || null])
    );
  }

  return parsed.map((b) => ({
    title: b.title,
    architect: b.architectId ? refLabels[b.architectId] || null : null,
    location: b.locationId ? refLabels[b.locationId] || null : null,
    year_built: b.year_built,
    wikidata_uri: b.wikidata_uri,
  }));
}

module.exports = { searchBuildings };

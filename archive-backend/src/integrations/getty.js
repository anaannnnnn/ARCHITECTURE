const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = process.env.GETTY_API_BASE || 'https://data.getty.edu/museum/collection';

/**
 * Getty's Museum Collection API is a Linked.Art / CIDOC-CRM REST API with no
 * auth or key required. It doesn't expose a plain keyword search endpoint —
 * discovery happens via its SPARQL endpoint, then individual objects are
 * fetched by ID for full metadata + IIIF image links.
 */
async function searchObjects(keyword, limit = 10) {
  const query = `
    PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?obj ?label WHERE {
      ?obj a crm:E22_Human-Made_Object ;
           rdfs:label ?label .
      FILTER(CONTAINS(LCASE(?label), LCASE("${keyword}")))
    }
    LIMIT ${limit}
  `;

  const url = `${API_BASE}/sparql?query=${encodeURIComponent(query)}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json' },
  });

  if (!res.ok) {
    throw new Error(`Getty SPARQL query failed: ${res.status}`);
  }

  const data = await res.json();
  return data.results.bindings.map((row) => ({
    label: row.label?.value,
    objectUri: row.obj?.value,
    objectId: row.obj?.value?.split('/').pop(),
  }));
}

/**
 * Fetch full metadata + IIIF image URL for a single Getty object by ID
 * (as returned by searchObjects).
 */
async function getObject(objectId) {
  const url = `${API_BASE}/object/${objectId}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!res.ok) {
    throw new Error(`Getty object fetch failed: ${res.status}`);
  }

  const data = await res.json();

  const label = Array.isArray(data.identified_by)
    ? data.identified_by.find((i) => i.type === 'Name')?.content
    : null;

  // NOTE: `representation[0].id` is already the complete, ready-to-use
  // image URL (e.g. https://media.getty.edu/iiif/image/<asset>/full/full/0/default.jpg),
  // not a IIIF base to append a size/format path onto — confirmed by
  // inspecting the raw API response. Getty's own response also flags this
  // `representation` field as deprecated in favor of a `shows` property
  // that exposes the full IIIF Image API endpoints for higher-resolution
  // images; worth wiring `shows` in later once full-res is needed.
  const imageUrl = data.representation?.[0]?.id || null;

  return {
    id: objectId,
    label: label || data._label || null,
    imageUrl,
    iiifManifest: null,
    metadataLicense: 'CC0 (Getty Open Content Program — verify imageCopyrightStatus per object)',
    sourceUri: url,
  };
}

module.exports = { searchObjects, getObject };

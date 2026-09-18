const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = 'https://api.europeana.eu/record/v2/search.json';

/**
 * Europeana Search API. Requires a free API key from
 * https://pro.europeana.eu/pages/get-api — set EUROPEANA_API_KEY in .env.
 * Returns architectural drawings/photos from European museums & archives.
 */
async function searchItems(keyword, limit = 10) {
  const apiKey = process.env.EUROPEANA_API_KEY;
  if (!apiKey) {
    throw new Error(
      'EUROPEANA_API_KEY is not set. Get a free key at https://pro.europeana.eu/pages/get-api and add it to .env'
    );
  }

  const params = new URLSearchParams({
    wskey: apiKey,
    query: keyword,
    qf: 'TYPE:IMAGE',
    rows: String(limit),
    media: 'true',
  });

  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Europeana search failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`Europeana search returned an error: ${data.error || 'unknown'}`);
  }

  return (data.items || []).map((item) => ({
    title: Array.isArray(item.title) ? item.title[0] : item.title,
    imageUrl: item.edmPreview?.[0] || null,
    dataProvider: Array.isArray(item.dataProvider) ? item.dataProvider[0] : item.dataProvider,
    rights: Array.isArray(item.rights) ? item.rights[0] : item.rights,
    europeanaId: item.id,
    landingUrl: item.guid,
  }));
}

module.exports = { searchItems };

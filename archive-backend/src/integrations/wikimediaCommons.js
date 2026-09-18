const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = process.env.WIKIMEDIA_COMMONS_API || 'https://commons.wikimedia.org/w/api.php';

/**
 * Search Wikimedia Commons for images/drawings matching a query
 * (e.g. a building name) and return direct image URLs + license info.
 */
async function searchImages(query, limit = 10) {
  const searchUrl = `${API_BASE}?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    query
  )}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error(`Wikimedia Commons search failed: ${res.status}`);

  const data = await res.json();
  const pages = data.query?.pages || {};

  return Object.values(pages).map((page) => {
    const info = page.imageinfo?.[0];
    return {
      title: page.title,
      url: info?.url,
      license: info?.extmetadata?.License?.value || 'unknown',
      artist: info?.extmetadata?.Artist?.value || null,
      descriptionUrl: info?.descriptionurl,
    };
  });
}

module.exports = { searchImages };

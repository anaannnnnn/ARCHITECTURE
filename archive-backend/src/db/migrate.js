const db = require('./connection');

// Runs on `npm run migrate`. Safe to re-run (IF NOT EXISTS everywhere).

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student', -- student | admin
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Case studies: aggregated from Wikidata/Wikipedia/Getty/Europeana/Commons,
-- or contributed by students.
CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  architect TEXT,
  typology TEXT,             -- e.g. museum, housing, school
  location TEXT,
  climate_zone TEXT,
  year_built INTEGER,
  structural_system TEXT,
  area_sqm REAL,
  summary TEXT,
  source TEXT,                -- e.g. 'wikidata', 'getty', 'student'
  source_ref TEXT,             -- external ID/URL for the source record
  created_by_user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Images/drawings attached to a case study (plans, sections, photos)
CREATE TABLE IF NOT EXISTS case_study_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_study_id INTEGER NOT NULL,
  media_type TEXT NOT NULL,   -- plan | section | elevation | axonometric | photo
  url TEXT NOT NULL,
  caption TEXT,
  license TEXT,
  source TEXT,
  FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE
);

-- Downloadable production assets: CAD blocks, Revit families, textures, etc.
-- The actual file lives on Google Drive; this row stores its metadata + link.
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,       -- cad_block | revit_family | sketchup_model | texture | hatch_pattern | portfolio_template | reading
  software TEXT,                -- autocad | revit | sketchup | rhino | lumion | photoshop | indesign | any
  building_typology TEXT,       -- optional tag: housing, museum, school...
  description TEXT,
  drive_file_id TEXT,           -- Google Drive file ID
  drive_download_url TEXT,      -- resolved shareable link
  file_format TEXT,             -- dwg, rfa, skp, pat, png, psd, etc.
  license_note TEXT,
  uploaded_by_user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Studio Kits: curated bundles of resources + case studies for a project type
CREATE TABLE IF NOT EXISTS studio_kits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_by_user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS studio_kit_resources (
  studio_kit_id INTEGER NOT NULL,
  resource_id INTEGER NOT NULL,
  PRIMARY KEY (studio_kit_id, resource_id),
  FOREIGN KEY (studio_kit_id) REFERENCES studio_kits(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS studio_kit_case_studies (
  studio_kit_id INTEGER NOT NULL,
  case_study_id INTEGER NOT NULL,
  PRIMARY KEY (studio_kit_id, case_study_id),
  FOREIGN KEY (studio_kit_id) REFERENCES studio_kits(id) ON DELETE CASCADE,
  FOREIGN KEY (case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE
);

-- Student personal collections ("save for later" / per-project folders)
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,   -- 'case_study' | 'resource'
  item_id INTEGER NOT NULL,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_studies_typology ON case_studies(typology);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_software ON resources(software);
`);

console.log('Migration complete. Tables ready in', process.env.DATABASE_PATH || 'src/db/archive.sqlite');

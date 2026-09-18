# Archive — B-Arch Student Platform Backend

Backend for a study & resource platform for B-Arch / architecture students:
case studies (aggregated from open APIs + student-contributed), drawing
references, downloadable production assets (CAD blocks, Revit families,
textures, portfolio templates) stored on Google Drive, curated "Studio Kit"
bundles, and personal saved collections.

## Stack

- **Node.js + Express** — API server
- **SQLite** (via `better-sqlite3`) — all structured/searchable data (case
  studies, resource metadata, users, studio kits, collections). Ships as a
  single file, zero setup, swappable for PostgreSQL later.
- **Google Drive API** — file storage for the actual downloadable assets
  (CAD blocks, RFA families, textures, etc). The database stores a link to
  the file, not the file itself.
- **Wikidata, Wikimedia Commons, Getty Museum, Europeana** — live open APIs
  used to auto-generate case studies with real facts and images. No API key
  needed for Wikidata, Wikimedia Commons, or Getty; Europeana needs a free key.

## Local setup

```bash
npm install
cp .env.example .env
```

### 1. Configure Google Drive access

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project.
2. Enable the **Google Drive API**.
3. Create a **Service Account** → generate a JSON key → download it.
4. In Google Drive, create a folder for your assets, then **share it** with
   the service account's email (found in the JSON key as `client_email`) as
   an Editor.
5. Copy that folder's ID (from its URL) into `GOOGLE_DRIVE_ROOT_FOLDER_ID` in `.env`.
6. For **local dev**: save the downloaded key file at
   `src/config/google-service-account.json` (already git-ignored) and set
   `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `.env` to that path.
   For **Render deployment**, see step 3 below instead — you'll paste the
   JSON directly as an env var rather than using a file.

### 2. Get a free Europeana API key (optional but recommended)

Case study auto-import still works without this — Europeana is just skipped.
Get a key at [pro.europeana.eu/pages/get-api](https://pro.europeana.eu/pages/get-api)
and set `EUROPEANA_API_KEY` in `.env`.

### 3. Set up the database

```bash
npm run migrate   # creates tables
npm run seed        # optional: creates an admin user + pulls real starter
                     # case studies live from Wikidata/Wikimedia Commons
```

### 4. Run

```bash
npm run dev    # with auto-reload
# or
npm start
```

Server runs at `http://localhost:4000` by default.

## Deploying to Render

This repo includes `render.yaml` (a Render "Blueprint") so most of the setup
is automatic.

1. Push this repo to GitHub (see commands at the end of this file).
2. In the Render dashboard: **New → Blueprint**, connect your GitHub repo.
   Render reads `render.yaml` and provisions the service automatically.
3. **Important — read this before deploying:** Render's **Free** web service
   tier does not support persistent disks, which means the SQLite database
   would be wiped on every restart/redeploy. `render.yaml` is set to the
   `starter` plan (paid) specifically so the attached disk persists your
   data. If you want to stay free while testing, edit `render.yaml`: change
   `plan: starter` to `plan: free` and remove the `disk:` block — just know
   your data won't survive a redeploy under that setup.
4. In the Render dashboard, under your service's **Environment** tab, set
   these secret values (they're declared as `sync: false` in `render.yaml`,
   meaning Render won't auto-generate them — you provide them):
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — paste the **entire contents** of your
     downloaded service account JSON key as one value (not a file path).
   - `GOOGLE_DRIVE_ROOT_FOLDER_ID` — your Drive folder's ID.
   - `EUROPEANA_API_KEY` — optional.
5. Deploy. Render runs `npm install && npm run migrate` as the build step,
   then `npm start`. Your API will be live at the `.onrender.com` URL Render
   gives you.
6. Run `npm run seed` once against the live database if you want starter
   case studies — either via Render's Shell (paid plans only) or by
   temporarily pointing your local `.env`'s `DATABASE_PATH` at a copy and
   syncing, since Free/Starter plans differ in shell access.

## API Overview

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a student account |
| POST | `/api/auth/login` | Get a JWT |

### Case studies
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/case-studies` | — | Search/filter (`typology`, `architect`, `climate_zone`, `q`) |
| GET | `/api/case-studies/:id` | — | Get one, with media |
| POST | `/api/case-studies` | required | Create manually (student-contributed) |
| POST | `/api/case-studies/:id/media` | required | Attach an image/drawing |
| POST | `/api/case-studies/auto-import` | required | Pull buildings from Wikidata, images from Wikimedia Commons + Getty + Europeana, by keyword |

### Resources (downloadable production assets)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/resources` | — | Search/filter (`category`, `software`, `building_typology`, `q`) |
| GET | `/api/resources/:id` | — | Get one |
| POST | `/api/resources` | required | Upload a file (multipart `file` field) → stored on Drive, metadata in DB |
| DELETE | `/api/resources/:id` | required | Remove (also deletes from Drive) |

`category` values: `cad_block`, `revit_family`, `sketchup_model`, `texture`,
`hatch_pattern`, `portfolio_template`, `reading`.
`software` values: `autocad`, `revit`, `sketchup`, `rhino`, `lumion`,
`photoshop`, `indesign`, `any`.

### Studio Kits (curated bundles)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/studio-kits` | — | List/search kits |
| GET | `/api/studio-kits/:id` | — | Get one, with its resources + case studies |
| POST | `/api/studio-kits` | required | Create a kit |
| DELETE | `/api/studio-kits/:id` | required | Delete a kit |
| POST | `/api/studio-kits/:id/resources` | required | Add a resource (`{ resource_id }`) |
| DELETE | `/api/studio-kits/:id/resources/:resourceId` | required | Remove a resource |
| POST | `/api/studio-kits/:id/case-studies` | required | Add a case study (`{ case_study_id }`) |
| DELETE | `/api/studio-kits/:id/case-studies/:caseStudyId` | required | Remove a case study |

### Collections (personal "save for later" folders)
All routes require auth and are scoped to the logged-in user.
| Method | Route | Description |
|---|---|---|
| GET | `/api/collections` | List my collections |
| GET | `/api/collections/:id` | Get one, with items |
| POST | `/api/collections` | Create (`{ name }`) |
| DELETE | `/api/collections/:id` | Delete |
| POST | `/api/collections/:id/items` | Add item (`{ item_type: 'case_study'|'resource', item_id }`) |
| DELETE | `/api/collections/:id/items/:itemId` | Remove item |

## Project structure

```
render.yaml            Render Blueprint (service, plan, disk, env vars)
src/
  app.js                Express app + route mounting
  server.js              Entry point
  config/                Multer upload config, Google service account key (gitignored, local dev only)
  db/                    SQLite connection, migration, seed script
  integrations/          Wikidata, Wikimedia Commons, Getty, Europeana (open APIs)
  services/               Google Drive file storage
  models/                 SQLite data access (users, case studies, resources, studio kits, collections)
  controllers/             Request handlers
  routes/                  Express routers
  middleware/               JWT auth
```

## Where each open data source is used

| Source | Auth needed | Used for |
|---|---|---|
| Wikidata (SPARQL) | none | Structured facts: architect, location, year built |
| Wikimedia Commons | none | Photos/drawings |
| Getty Museum Collection | none | Museum collection objects, images via IIIF |
| Europeana | free key | European archive drawings/photos |

None of ArchDaily, Archnet, Archinect, or CAD-block sites (Bibliocad,
CADblocksfree, etc.) expose a public developer API — this backend does not
scrape them. Downloadable production assets (`resources`) exist only via
real uploads through `POST /api/resources`, which pushes the file to Google
Drive and stores its metadata in SQLite.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial backend: auth, case studies, resources, studio kits, collections"
git branch -M main
git remote add origin <your-new-repo-url>
git push -u origin main
```

## Next steps worth considering

- Swap SQLite for PostgreSQL if you outgrow a single file — replace
  `src/db/connection.js` and translate `migrate.js`'s schema; the model
  layer's SQL is close enough to standard SQL to port with minor changes.
- Add per-user rate limiting (currently global) if abuse becomes a concern.
- Add a scheduled job to periodically re-run `auto-import` for common
  typology keywords to keep the case study library growing on its own.
- Add the "sheet layout checker" and "site & climate data" features
  discussed earlier — both would be new integrations/ modules following the
  same pattern as `getty.js` or `wikidata.js`.

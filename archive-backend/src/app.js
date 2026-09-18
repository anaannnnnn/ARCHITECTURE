const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const caseStudyRoutes = require('./routes/caseStudyRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const studioKitRoutes = require('./routes/studioKitRoutes');
const collectionRoutes = require('./routes/collectionRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/case-studies', caseStudyRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/studio-kits', studioKitRoutes);
app.use('/api/collections', collectionRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { clientUrl, nodeEnv } = require('./config/env');

const app = express();
app.use(helmet());
app.use(cors({ origin: clientUrl.split(','), credentials: true }));
app.use(express.json({ limit: '100kb' }));
if (nodeEnv !== 'test') app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;

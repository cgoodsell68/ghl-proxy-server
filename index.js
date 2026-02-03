const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// GHL API configuration
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const PROXY_KEY = process.env.PROXY_KEY;
const GHL_API_KEY = process.env.GHL_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Validate proxy key middleware
const validateProxyKey = (req, res, next) => {
  const proxyKey = req.headers['x-proxy-key'];
  if (!proxyKey || proxyKey !== PROXY_KEY) {
    return res.status(401).json({ error: 'Invalid or missing proxy key' });
  }
  next();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'GHL Proxy Server is running' });
});

// Apply proxy key validation to all /v1 routes
app.use('/v1', validateProxyKey);

// Proxy helper function
const proxyRequest = async (req, res, method, path, data = null) => {
  try {
    const url = `${GHL_API_BASE}${path}`;
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    };
    if (data) config.data = data;
    if (req.query && Object.keys(req.query).length > 0) {
      config.params = req.query;
    }
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};

// Locations endpoints
app.get('/v1/locations', (req, res) => proxyRequest(req, res, 'GET', '/locations/'));
app.get('/v1/locations/:locationId', (req, res) => proxyRequest(req, res, 'GET', `/locations/${req.params.locationId}`));

// Contacts endpoints
app.get('/v1/contacts/search', (req, res) => proxyRequest(req, res, 'GET', '/contacts/', req.body));
app.post('/v1/contacts', (req, res) => proxyRequest(req, res, 'POST', '/contacts/', req.body));

// Pipelines endpoints
app.get('/v1/pipelines', (req, res) => proxyRequest(req, res, 'GET', `/locations/${req.query.locationId}/pipelines`));
app.get('/v1/pipelines/:pipelineId/stages', (req, res) => proxyRequest(req, res, 'GET', `/locations/${req.query.locationId}/pipelines/${req.params.pipelineId}/stages`));

// Opportunities endpoints
app.get('/v1/opportunities/search', (req, res) => proxyRequest(req, res, 'GET', '/opportunities/search'));
app.post('/v1/opportunities', (req, res) => proxyRequest(req, res, 'POST', '/opportunities/', req.body));

// Workflows endpoints
app.get('/v1/workflows', (req, res) => proxyRequest(req, res, 'GET', `/locations/${req.query.locationId}/workflows`));
app.get('/v1/workflows/:workflowId', (req, res) => proxyRequest(req, res, 'GET', `/locations/${req.query.locationId}/workflows/${req.params.workflowId}`));

// Messages endpoint
app.post('/v1/messages/send', (req, res) => proxyRequest(req, res, 'POST', '/conversations/messages', req.body));

app.listen(PORT, () => {
  console.log(`GHL Proxy Server running on port ${PORT}`);
});

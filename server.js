const express = require('express');
const proxy = require('http-proxy-middleware');
const cors = require('cors');
const apicache = require('apicache');

require('dotenv').config();

const app = express();
const cache = apicache.middleware;

const { PORT, ZZE_USER, ZZE_KEY, CACHE_TIME, DARKSKY_KEY } = process.env;
const app_port = PORT || '3000';

if (!ZZE_USER || !ZZE_KEY) {
  throw('Missing ZZE_USER or ZZE_KEY in environment!');
}

if (!DARKSKY_KEY) {
  throw('Missing DARKSKY_KEY in environment!');
}

app.use(cors());
app.use(cache(CACHE_TIME || '3 minutes'));

app.use(express.static(__dirname + '/dist'));

app.use('/api/darksky/novo-hamburgo', proxy({
  target: `https://api.darksky.net/forecast/${DARKSKY_KEY}/-29.686505199999996,-51.127883000000004/`,
  changeOrigin: true,
  proxyTimeout: 30 * 1000,
  pathRewrite: {
    '^.*': '',
  },
  logLevel: 'debug'
}));

app.use('/api/organizze', proxy({
  target: 'https://api.organizze.com.br/',
  auth: `${ZZE_USER}:${ZZE_KEY}`,
  changeOrigin: true,
  proxyTimeout: 30 * 1000,
  pathRewrite: {
    '^/api/organizze': '/rest/v2',
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Content-Type', 'application/json; charset=utf-8');
    proxyReq.setHeader('User-Agent', 'MyPlan');
  },
  logLevel: 'debug'
}));


app.listen(app_port, () => console.log(`server running in ${app_port}`));

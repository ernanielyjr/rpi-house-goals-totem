const express = require('express');
const proxy = require('http-proxy-middleware');
const cors = require('cors');
const apicache = require('apicache');

require('dotenv').config();

const app = express();
const cache = apicache.middleware;

const { ZZE_USER, ZZE_KEY, CACHE_TIME } = process.env;
const port = process.env.PORT || '3000';

if (!ZZE_USER || !ZZE_KEY) {
  throw('Missing ZZE_USER or ZZE_KEY in environment!');
}

app.use(cors());
app.use(cache(CACHE_TIME || '3 minutes'));

app.use(express.static(__dirname + '/dist'));

app.use('/rest/v2/', proxy({
  target: 'https://api.organizze.com.br/',
  auth: `${ZZE_USER}:${ZZE_KEY}`,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('Content-Type', 'application/json; charset=utf-8');
    proxyReq.setHeader('User-Agent', 'MyPlan');
  },
  logLevel: 'debug'
}));


app.listen(port, () => console.log(`server running in ${port}`));

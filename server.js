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

// TRELLO =====================================
const baseUrl = 'https://api.trello.com/1';
const boardId = '5ac60dd9d5aea227a6392044';
const key = '3cc854551447ab23b087c03b9060c6d5';
const token = '06cbd0e7102620385e0e6333b31518dd56c30ef0954eee8f31225d5984c67e00';
const filters = ['cards=open', 'fields=all', 'lists=open'].join('&');
const url = `${baseUrl}/boards/${boardId}?key=${key}&token=${token}&${filters}`;
app.use('/api/trello', proxy({
  target: `${url}`,
  changeOrigin: true,
  proxyTimeout: 30 * 1000,
  pathRewrite: {
    '^.*': '',
  },
  logLevel: 'debug'
}));


// WEATHER =====================================
app.use('/api/weather/novo-hamburgo', proxy({
  target: `https://api.darksky.net/forecast/${DARKSKY_KEY}/-29.686505199999996,-51.127883000000004/`,
  changeOrigin: true,
  proxyTimeout: 30 * 1000,
  pathRewrite: {
    '^.*': '',
  },
  logLevel: 'debug'
}));

// ORGANIZZE =====================================
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

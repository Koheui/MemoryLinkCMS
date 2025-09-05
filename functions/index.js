const functions = require('firebase-functions');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

exports.nextjs = functions.https.onRequest((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

// Stripe Webhook関数をエクスポート
const { stripeWebhook } = require('./src/stripe-webhook');
exports.stripeWebhook = stripeWebhook;


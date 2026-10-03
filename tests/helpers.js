const os = require('node:os');
const mongoose = require('mongoose');
const session = require('express-session');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../app');

let mongod;

async function startDatabase() {
    mongod = await MongoMemoryServer.create();
    // MongoDB driver >= 7.6 loads `os` with a dynamic import(), which Jest's
    // CommonJS sandbox rejects; handing the driver `os` directly avoids it.
    await mongoose.connect(mongod.getUri('short-links-test'), { runtimeAdapters: { os } });
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

async function stopDatabase() {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
}

async function clearDatabase() {
    await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
}

/** A fresh app with an in-memory session store and generous rate limits. */
function buildApp(options = {}) {
    return createApp({ sessionStore: new session.MemoryStore(), limits: { auth: 1000, shorten: 1000 }, ...options });
}

/** Reads the CSRF token out of a rendered page, the way a browser form would send it. */
function csrfFrom(html) {
    const m = html.match(/name="_csrf" value="([^"]+)"/);
    if (!m) throw new Error('no CSRF token on page');
    return m[1];
}

/** A cookie-keeping agent with a helper that posts a form with a fresh CSRF token. */
function browser(app) {
    const agent = request.agent(app);
    agent.submit = async (url, fields = {}, from = '/') => {
        const page = await agent.get(from);
        return agent.post(url).type('form').send({ _csrf: csrfFrom(page.text), ...fields });
    };
    return agent;
}

async function registered(app, username = 'alice', password = 'correct-horse') {
    const agent = browser(app);
    const res = await agent.submit('/register', { username, password }, '/register');
    if (res.status !== 302) throw new Error(`register failed: ${res.status}`);
    return agent;
}

module.exports = { startDatabase, stopDatabase, clearDatabase, buildApp, browser, registered, csrfFrom };

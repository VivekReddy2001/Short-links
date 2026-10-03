// The other suites inject an in-memory session store for speed. This one
// builds the app as production does, with sessions persisted to MongoDB
// through connect-mongo, so a breaking change in that integration fails the
// build instead of the deploy.
const mongoose = require('mongoose');
const { createApp } = require('../app');
const { startDatabase, stopDatabase, clearDatabase, browser } = require('./helpers');

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
    await clearDatabase();
    await mongoose.connection.db.collection('sessions').deleteMany({});
});

test('sessions are stored in MongoDB and honoured on the next request', async () => {
    const agent = browser(createApp());
    const res = await agent.submit('/register', { username: 'dora', password: 'correct-horse' }, '/register');
    expect(res.status).toBe(302);
    expect(await mongoose.connection.db.collection('sessions').countDocuments()).toBeGreaterThanOrEqual(1);
    const dash = await agent.get('/dashboard');
    expect(dash.status).toBe(200);
    expect(dash.text).toContain('Hi, dora');
});

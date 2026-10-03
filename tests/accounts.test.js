const request = require('supertest');
const User = require('../Schemas/User');
const UrlMap = require('../Schemas/UrlMaps');
const { startDatabase, stopDatabase, clearDatabase, buildApp, browser, registered } = require('./helpers');

let app;
beforeAll(async () => {
    await startDatabase();
    app = buildApp();
});
afterAll(stopDatabase);
beforeEach(clearDatabase);

const sessionCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('shortlinks.sid='));

describe('registration', () => {
    test('creates an account with a hashed password and signs in', async () => {
        const agent = browser(app);
        const res = await agent.submit('/register', { username: 'alice', password: 'correct-horse' }, '/register');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/dashboard');

        const user = await User.findOne({ username: 'alice' }).lean();
        expect(user.password).not.toBe('correct-horse');
        expect(user.password).toMatch(/^\$2[aby]\$/);

        const dash = await agent.get('/dashboard');
        expect(dash.status).toBe(200);
        expect(dash.text).toContain('Hi, alice');
    });

    test.each([
        ['ab', 'correct-horse'],
        ['alice', 'short'],
        ['has space', 'correct-horse'],
        ['alice', 'x'.repeat(73)],
    ])('rejects username %j / password of length %#', async (username, password) => {
        const res = await browser(app).submit('/register', { username, password }, '/register');
        expect(res.status).toBe(400);
        expect(await User.countDocuments()).toBe(0);
    });

    test('rejects a taken username', async () => {
        await registered(app, 'alice');
        const res = await browser(app).submit('/register', { username: 'alice', password: 'other-pass' }, '/register');
        expect(res.status).toBe(409);
        expect(res.text).toContain('already taken');
    });
});

describe('login and logout', () => {
    beforeEach(async () => {
        await registered(app, 'alice', 'correct-horse');
    });

    test('wrong password and unknown user get the same answer', async () => {
        const wrong = await browser(app).submit('/login', { username: 'alice', password: 'nope-nope' }, '/login');
        const unknown = await browser(app).submit('/login', { username: 'bob', password: 'nope-nope' }, '/login');
        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(wrong.text).toContain('Wrong username or password');
        expect(unknown.text).toContain('Wrong username or password');
    });

    test('query-operator injection in form fields is treated as plain text', async () => {
        const agent = browser(app);
        const page = await agent.get('/login');
        const token = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
        const res = await agent
            .post('/login')
            .type('form')
            .send(`_csrf=${token}&username[$ne]=x&password[$ne]=x`);
        expect(res.status).toBe(401);
    });

    test('logging in issues a new session id (no session fixation)', async () => {
        const agent = browser(app);
        const before = sessionCookie(await agent.get('/login'));
        const res = await agent.submit('/login', { username: 'alice', password: 'correct-horse' }, '/login');
        expect(res.status).toBe(302);
        const after = sessionCookie(res);
        expect(before).toBeDefined();
        expect(after).toBeDefined();
        expect(after.split(';')[0]).not.toBe(before.split(';')[0]);
    });

    test('logout is a POST and ends the session', async () => {
        const agent = browser(app);
        await agent.submit('/login', { username: 'alice', password: 'correct-horse' }, '/login');
        expect((await agent.get('/dashboard')).status).toBe(200);

        expect((await agent.get('/logout')).status).toBe(404);
        const out = await agent.submit('/logout', {}, '/dashboard');
        expect(out.status).toBe(302);
        const dash = await agent.get('/dashboard');
        expect(dash.status).toBe(302);
        expect(dash.headers.location).toBe('/login');
    });

    test('auth endpoints are rate limited', async () => {
        const limited = buildApp({ limits: { auth: 2, shorten: 1000 } });
        const agent = browser(limited);
        for (let i = 0; i < 2; i++) {
            expect((await agent.submit('/login', { username: 'alice', password: 'bad-bad-bad' }, '/login')).status).toBe(
                401
            );
        }
        const res = await agent.submit('/login', { username: 'alice', password: 'correct-horse' }, '/login');
        expect(res.status).toBe(429);
    });
});

describe('pages that need an account', () => {
    test.each(['/dashboard'])('%s redirects anonymous visitors to /login', async (path) => {
        const res = await request(app).get(path);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/login');
    });

    test('a custom link made while logged out is created after registering', async () => {
        const agent = browser(app);
        const bounced = await agent.submit('/app/', {
            longUrl: 'https://example.com/resume',
            customCode: 'resume-me',
            description: 'made before signing up',
        });
        expect(bounced.status).toBe(302);
        expect(bounced.headers.location).toBe('/login');
        expect(await UrlMap.countDocuments()).toBe(0);

        await agent.submit('/register', { username: 'carol', password: 'correct-horse' }, '/register');
        const link = await UrlMap.findOne({ shortUrl: 'resume-me' }).lean();
        const carol = await User.findOne({ username: 'carol' }).lean();
        expect(link.longUrl).toBe('https://example.com/resume');
        expect(link.description).toBe('made before signing up');
        expect(String(link.owner)).toBe(String(carol._id));
    });
});

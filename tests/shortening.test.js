const request = require('supertest');
const UrlMap = require('../Schemas/UrlMaps');
const { startDatabase, stopDatabase, clearDatabase, buildApp, browser } = require('./helpers');

let app;
beforeAll(async () => {
    await startDatabase();
    app = buildApp();
});
afterAll(stopDatabase);
beforeEach(clearDatabase);

describe('anonymous shortening', () => {
    test('home page renders the form', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Turn a long URL into a short one');
        expect(res.text).toContain('name="_csrf"');
    });

    test('shortens a URL and the short link redirects, counting clicks', async () => {
        const res = await browser(app).submit('/', {
            longUrl: 'https://example.com/a/very/long/path',
            submit: 'Generate Short URL',
        });
        expect(res.status).toBe(200);
        const code = res.text.match(/class="short-link" href="[^"]*\/([a-zA-Z0-9]{6})"/)[1];

        const link = await UrlMap.findOne({ shortUrl: code }).lean();
        expect(link.owner).toBeNull();
        expect(link.clicks).toBe(0);

        const hop = await request(app).get(`/${code}`);
        expect(hop.status).toBe(302);
        expect(hop.headers.location).toBe('https://example.com/a/very/long/path');
        await request(app).get(`/${code}`);
        expect((await UrlMap.findOne({ shortUrl: code })).clicks).toBe(2);
    });

    test('following a short link does not create a session', async () => {
        await UrlMap.create({ shortUrl: 'abc123', longUrl: 'https://example.com' });
        const hop = await request(app).get('/abc123');
        expect(hop.status).toBe(302);
        expect(hop.headers['set-cookie']).toBeUndefined();
    });

    test.each(['javascript:alert(1)', 'data:text/html,hi', 'not a url', 'ftp://example.com'])(
        'rejects %s',
        async (longUrl) => {
            const res = await browser(app).submit('/', { longUrl, submit: 'Generate Short URL' });
            expect(res.status).toBe(400);
            expect(res.text).toContain('does not look like a valid URL');
            expect(await UrlMap.countDocuments()).toBe(0);
        }
    );

    test('unknown codes get a 404 naming the code', async () => {
        const res = await request(app).get('/nothere');
        expect(res.status).toBe(404);
        expect(res.text).toContain('/nothere');
    });

    test('paths that cannot be codes fall through to the generic 404', async () => {
        const res = await request(app).get('/a.b');
        expect(res.status).toBe(404);
        expect(res.text).toContain("There's nothing here");
    });
});

describe('CSRF protection', () => {
    test('a form post without the token is refused', async () => {
        const res = await request(app)
            .post('/')
            .type('form')
            .send({ longUrl: 'https://example.com', submit: 'Generate Short URL' });
        expect(res.status).toBe(403);
        expect(await UrlMap.countDocuments()).toBe(0);
    });

    test('a token from a different session is refused', async () => {
        const attacker = browser(app);
        const page = await attacker.get('/');
        const stolen = page.text.match(/name="_csrf" value="([^"]+)"/)[1];
        const victim = request.agent(app);
        await victim.get('/');
        const res = await victim
            .post('/')
            .type('form')
            .send({ _csrf: stolen, longUrl: 'https://example.com', submit: 'Generate Short URL' });
        expect(res.status).toBe(403);
    });
});

describe('rate limiting', () => {
    test('link creation is throttled per client', async () => {
        const limited = buildApp({ limits: { auth: 1000, shorten: 2 } });
        const agent = browser(limited);
        const fields = { longUrl: 'https://example.com', submit: 'Generate Short URL' };
        expect((await agent.submit('/', fields)).status).toBe(200);
        expect((await agent.submit('/', fields)).status).toBe(200);
        const third = await agent.submit('/', fields);
        expect(third.status).toBe(429);
        expect(third.text).toContain('too quickly');
        // page views are not throttled
        expect((await agent.get('/')).status).toBe(200);
    });
});

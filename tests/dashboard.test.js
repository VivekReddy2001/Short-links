const request = require('supertest');
const UrlMap = require('../Schemas/UrlMaps');
const Collection = require('../Schemas/Collection');
const { startDatabase, stopDatabase, clearDatabase, buildApp, registered } = require('./helpers');

let app;
beforeAll(async () => {
    await startDatabase();
    app = buildApp();
});
afterAll(stopDatabase);
beforeEach(clearDatabase);

const custom = (agent, customCode, extra = {}) =>
    agent.submit('/app/', { longUrl: `https://example.com/${customCode}`, customCode, ...extra }, '/dashboard');

describe('custom aliases', () => {
    test('creates a link under the chosen alias, owned by the user', async () => {
        const alice = await registered(app);
        const res = await custom(alice, 'my-link', { description: 'Launch post' });
        expect(res.headers.location).toBe('/dashboard');
        const link = await UrlMap.findOne({ shortUrl: 'my-link' }).lean();
        expect(link.description).toBe('Launch post');
        expect(link.owner).not.toBeNull();
        expect((await request(app).get('/my-link')).headers.location).toBe('https://example.com/my-link');
    });

    test.each(['ab', 'has space', 'x'.repeat(33), 'emoji-😀'])('rejects alias %j', async (alias) => {
        const alice = await registered(app);
        const res = await custom(alice, alias);
        expect(decodeURIComponent(res.headers.location)).toContain('Custom aliases are 3-32 characters');
        expect(await UrlMap.countDocuments()).toBe(0);
    });

    test('rejects an alias that is already taken', async () => {
        const alice = await registered(app);
        await custom(alice, 'taken');
        const bob = await registered(app, 'bob');
        const res = await custom(bob, 'taken');
        expect(decodeURIComponent(res.headers.location)).toContain('already taken');
        expect(await UrlMap.countDocuments()).toBe(1);
    });
});

describe('collections', () => {
    test('create, reject duplicates, file a link, delete the collection but keep the link', async () => {
        const alice = await registered(app);
        await alice.submit('/addcollections', { name: 'Work' }, '/dashboard');
        const dup = await alice.submit('/addcollections', { name: 'Work' }, '/dashboard');
        expect(decodeURIComponent(dup.headers.location)).toContain('already have a collection');

        await custom(alice, 'filed');
        const link = await UrlMap.findOne({ shortUrl: 'filed' });
        const work = await Collection.findOne({ name: 'Work' });
        await alice.submit('/change_collection', { urlId: String(link._id), collectionId: String(work._id) }, '/dashboard');
        expect(String((await UrlMap.findById(link._id)).collectionId)).toBe(String(work._id));

        const page = await alice.get('/dashboard');
        expect(page.text).toContain('<h2>Work</h2>');

        await alice.submit(`/collections/${work._id}/delete`, {}, '/dashboard');
        expect(await Collection.countDocuments()).toBe(0);
        const kept = await UrlMap.findById(link._id);
        expect(kept).not.toBeNull();
        expect(kept.collectionId).toBeNull();
    });

    test("users cannot touch each other's links or collections", async () => {
        const alice = await registered(app);
        await custom(alice, 'alices');
        await alice.submit('/addcollections', { name: 'Private' }, '/dashboard');
        const link = await UrlMap.findOne({ shortUrl: 'alices' });
        const coll = await Collection.findOne({ name: 'Private' });

        const bob = await registered(app, 'bob');
        await bob.submit('/addcollections', { name: 'Bobs' }, '/dashboard');
        const bobs = await Collection.findOne({ name: 'Bobs' });

        const move = await bob.submit(
            '/change_collection',
            { urlId: String(link._id), collectionId: String(bobs._id) },
            '/dashboard'
        );
        expect(decodeURIComponent(move.headers.location)).toContain('Link not found');

        await bob.submit(`/links/${link._id}/delete`, {}, '/dashboard');
        await bob.submit(`/collections/${coll._id}/delete`, {}, '/dashboard');
        expect(await UrlMap.exists({ _id: link._id })).not.toBeNull();
        expect(await Collection.exists({ _id: coll._id })).not.toBeNull();

        const page = await bob.get('/dashboard');
        expect(page.text).not.toContain('alices');
    });

    test('malformed ids are handled, not crashed on', async () => {
        const alice = await registered(app);
        for (const [url, fields] of [
            ['/change_collection', { urlId: 'not-an-id', collectionId: '' }],
            ['/links/not-an-id/delete', {}],
            ['/collections/not-an-id/delete', {}],
        ]) {
            const res = await alice.submit(url, fields, '/dashboard');
            expect(res.status).toBe(302);
            expect(decodeURIComponent(res.headers.location)).toContain('not found');
        }
    });
});

describe('deleting and searching links', () => {
    test('deleting a link frees its alias', async () => {
        const alice = await registered(app);
        await custom(alice, 'gone');
        const link = await UrlMap.findOne({ shortUrl: 'gone' });
        await alice.submit(`/links/${link._id}/delete`, {}, '/dashboard');
        expect(await UrlMap.countDocuments()).toBe(0);
        expect((await request(app).get('/gone')).status).toBe(404);
        await custom(alice, 'gone');
        expect(await UrlMap.countDocuments()).toBe(1);
    });

    test('search matches description, destination and alias, case-insensitively', async () => {
        const alice = await registered(app);
        await custom(alice, 'spring', { description: 'Spring CAMPAIGN landing page' });
        await custom(alice, 'docs-link', { description: 'API reference' });
        await custom(alice, 'other', { description: 'nothing to see' });

        const byNote = await alice.get('/dashboard?q=campaign');
        expect(byNote.text).toContain('/spring');
        expect(byNote.text).not.toContain('/docs-link');
        expect(byNote.text).toContain('1 match for');

        const byAlias = await alice.get('/dashboard?q=DOCS');
        expect(byAlias.text).toContain('/docs-link');
        expect(byAlias.text).not.toContain('/spring"');

        const none = await alice.get('/dashboard?q=zzz');
        expect(none.text).toContain('No links match that search');
    });

    test('search input is matched literally, not as a regular expression', async () => {
        const alice = await registered(app);
        await custom(alice, 'plain', { description: 'plain text' });
        const res = await alice.get('/dashboard?q=' + encodeURIComponent('.*'));
        expect(res.status).toBe(200);
        expect(res.text).toContain('No links match that search');
    });
});

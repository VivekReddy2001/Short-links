require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const { MongoStore } = require('connect-mongo');

const database = require('./database');
const csrf = require('./lib/csrf');
const { authLimiter, shortenLimiter } = require('./lib/rateLimit');

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Builds the Express app. Kept separate from start() so the test suite can
 * create isolated instances against an in-memory database.
 *
 * @param {object} [options]
 * @param {import('express-session').Store} [options.sessionStore] defaults to
 *   MongoDB via connect-mongo; tests pass a MemoryStore for speed.
 * @param {{auth?: number, shorten?: number}} [options.limits] requests allowed
 *   per 15 minutes per IP on the sign-in and shortening endpoints.
 */
function createApp({ sessionStore, limits = {} } = {}) {
    if (!process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET is not set. Copy .env.example to .env and fill it in.');
    }

    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.use(
        session({
            name: 'shortlinks.sid',
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store:
                sessionStore ||
                MongoStore.create({
                    client: mongoose.connection.getClient(),
                    collectionName: 'sessions',
                    ttl: ONE_WEEK_MS / 1000,
                }),
            cookie: {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: ONE_WEEK_MS,
            },
        })
    );

    app.use(express.static(path.join(__dirname, 'public')));
    // extended: false keeps every field a plain string (or an array of
    // strings for repeated keys); nested objects such as username[$ne]=x can
    // never reach a database query.
    app.use(express.urlencoded({ extended: false, limit: '20kb' }));

    // Makes `user` and the CSRF token available in every view.
    app.use((req, res, next) => {
        res.locals.user = req.session.user || null;
        next();
    });
    app.use(csrf.attach);
    app.use(csrf.verify);

    const auth = authLimiter(limits.auth);
    const shorten = shortenLimiter(limits.shorten);

    // Routers. Order matters: homeRouter owns a catch-all GET /:code (to resolve
    // short links), so it has to be mounted last or it would swallow every path
    // mounted after it.
    app.use('/login', auth, require('./Routes/loginRouter'));
    app.use('/logout', require('./Routes/logoutRouter'));
    app.use('/register', auth, require('./Routes/registerRouter'));
    app.use('/dashboard', require('./Routes/dashboardRouter'));
    app.use('/addcollections', require('./Routes/addCollections'));
    app.use('/collections', require('./Routes/collectionsRouter'));
    app.use('/links', require('./Routes/linksRouter'));
    app.use('/change_collection', require('./Routes/ChangeCollectionRoutner'));
    app.use('/app/', shorten, require('./Routes/CustumUrlRouteres'));
    app.use('/', shorten, require('./Routes/homeRouter'));

    app.use((req, res) => {
        res.status(404).render('404', { code: null });
    });

    // Express 5 forwards rejected promises from async handlers here.
    app.use((err, req, res, next) => {
        if (err.code === 'EBADCSRFTOKEN') {
            return res.status(403).render('403');
        }
        console.error(err);
        res.status(500).render('500');
    });

    return app;
}

async function start() {
    if (!process.env.SESSION_SECRET) {
        console.error('SESSION_SECRET is not set. Copy .env.example to .env and fill it in.');
        process.exit(1);
    }
    await database.connect();
    const port = process.env.PORT || 3000;
    const app = createApp();
    return app.listen(port, () => {
        console.log(`server is running on port ${port}`);
    });
}

if (require.main === module) {
    start().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { createApp, start };

require('dotenv').config();
require('express-async-errors'); // forwards rejected async route handlers to the error middleware below

const express = require('express');
const session = require('express-session');
const path = require('path');
const DataBase = require('./database'); // connects on require, as before

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
}

app.set('trust proxy', 1);
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        },
    })
);

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Makes `user` available in every view without every route having to pass it.
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Routers. Order matters: homeRouter owns a catch-all GET /:code (to resolve
// short links), so it has to be mounted last or it would swallow every path
// mounted after it.
app.use('/login', require('./Routes/loginRouter'));
app.use('/logout', require('./Routes/logoutRouter'));
app.use('/register', require('./Routes/registerRouter'));
app.use('/dashboard', require('./Routes/dashboardRouter'));
app.use('/addcollections', require('./Routes/addCollections'));
app.use('/change_collection', require('./Routes/ChangeCollectionRoutner'));
app.use('/app/', require('./Routes/CustumUrlRouteres'));
app.use('/', require('./Routes/homeRouter'));

app.use((req, res) => {
    res.status(404).render('404', { code: null });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('500');
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});

module.exports = app;

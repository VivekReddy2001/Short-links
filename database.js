const mongoose = require('mongoose');

/**
 * Connects Mongoose to MONGODB_URI. Fails loudly and immediately rather than
 * letting Mongoose sit there retrying forever against an undefined
 * connection string.
 */
async function connect(uri = process.env.MONGODB_URI) {
    if (!uri) {
        console.error(
            'MONGODB_URI is not set. Copy .env.example to .env and fill it in ' +
                '(see README.md > Getting started).'
        );
        process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('Database is connected');
    return mongoose.connection;
}

module.exports = { connect };

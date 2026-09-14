const mongoose = require('mongoose');

class DataBase {
    constructor() {
        this.connect();
    }

    connect() {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            // Fail loudly and immediately rather than letting mongoose sit there
            // retrying forever against an undefined connection string.
            console.error(
                'MONGODB_URI is not set. Copy .env.example to .env and fill it in ' +
                    '(see README.md > Getting started).'
            );
            process.exit(1);
        }
        mongoose
            .connect(uri)
            .then(() => {
                console.log('Database is connected');
            })
            .catch((err) => {
                console.log(err);
            });
    }
}

module.exports = new DataBase();

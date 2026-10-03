const crypto = require('crypto');
const UrlMaps = require('../Schemas/UrlMaps');

const alphanumeric = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const LENGTH = 6;

// Picks a random 6-character code and keeps rolling until it finds one that
// isn't already taken. Collisions are rare (62^6 ≈ 56 billion combinations)
// but far from impossible, so this loop is what actually guarantees
// uniqueness rather than the code length alone. crypto.randomInt (not
// Math.random) keeps codes unpredictable, so nobody can enumerate other
// people's links by guessing the generator's next output.
const generateHash = async () => {
    for (;;) {
        let code = '';
        for (let i = 0; i < LENGTH; i++) {
            code += alphanumeric[crypto.randomInt(alphanumeric.length)];
        }
        const existing = await UrlMaps.exists({ shortUrl: code });
        if (!existing) {
            return code;
        }
    }
};

module.exports = generateHash;

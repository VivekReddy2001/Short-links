const UrlMaps = require('./Schemas/UrlMaps');

const alphanumeric =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Picks a random 6-character code and keeps rolling until it finds one that
// isn't already taken. Collisions are rare (62^6 ≈ 56 billion combinations)
// but far from impossible, so this loop is what actually guarantees
// uniqueness rather than the code length alone.
const generateHash = async () => {
    while (true) {
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
        }
        const existing = await UrlMaps.findOne({ shortUrl: code });
        if (existing == null) {
            return code;
        }
    }
};

module.exports = generateHash;

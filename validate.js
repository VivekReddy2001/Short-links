const URL = require('url').URL;

// Only accept http(s) links. Without this, `new URL(s)` alone happily
// parses schemes like javascript: or data: too — harmless as a redirect
// Location header in every modern browser, but there's no reason to let a
// non-web scheme into the database in the first place.
const stringIsAValidUrl = (s) => {
    try {
        const url = new URL(s);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (err) {
        return false;
    }
};

module.exports = stringIsAValidUrl;

const mongoose = require('mongoose');

/** A trimmed string from a form field, or '' for anything else (missing, repeated keys). */
const str = (value) => (typeof value === 'string' ? value.trim() : '');

const isObjectId = (value) => typeof value === 'string' && mongoose.isValidObjectId(value);

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

/** Escapes a user-supplied string for use inside a RegExp. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const errorRedirect = (res, message) => res.redirect('/dashboard?error=' + encodeURIComponent(message));

module.exports = { str, isObjectId, ALIAS_RE, escapeRegex, errorRedirect };

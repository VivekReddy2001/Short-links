const mongoose = require('mongoose');

const urlMapSchema = new mongoose.Schema(
    {
        // The random (or, for signed-in users, custom) code that redirects to longUrl.
        shortUrl: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        longUrl: {
            type: String,
            required: true,
            trim: true,
        },
        // null for links created anonymously from the home page.
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        // null until the owner files it into a collection.
        collectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection',
            default: null,
            index: true,
        },
        clicks: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.UrlMap || mongoose.model('UrlMap', urlMapSchema);

const mongoose = require('mongoose');

// A collection is just a named folder a user can file their short links into
// (see Routes/addCollections.js and Routes/ChangeCollectionRoutner.js).
const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 64,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

collectionSchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

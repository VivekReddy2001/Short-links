const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 32,
        },
        password: {
            // bcrypt hash, never the plaintext password
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

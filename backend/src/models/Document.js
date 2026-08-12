const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: { type: String, default: 'Untitled Document' },
    data: { type: Object, default: {} }, // Will store Quill document delta
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            permission: { type: String, enum: ['Viewer', 'Commenter', 'Editor'], default: 'Viewer' }
        }
    ],
    lastModified: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);

const Document = require('../models/Document');

// @route   POST /api/docs
// @desc    Create a new document
exports.createDocument = async (req, res) => {
    try {
        const document = await Document.create({
            title: req.body.title || 'Untitled Document',
            owner: req.user._id,
            data: '' // Initial empty doc
        });
        res.status(201).json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/docs
// @desc    Get all documents for a user (owned and shared)
exports.getDocuments = async (req, res) => {
    try {
        const ownedDocs = await Document.find({ owner: req.user._id }).sort('-updatedAt');
        const sharedDocs = await Document.find({ 'sharedWith.user': req.user._id }).sort('-updatedAt');
        res.json({ ownedDocs, sharedDocs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/docs/:id
// @desc    Get single document
exports.getDocumentById = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('sharedWith.user', 'name email');

        if (!document) return res.status(404).json({ message: 'Document not found' });

        // Check access
        const isOwner = document.owner._id.toString() === req.user._id.toString();
        const isShared = document.sharedWith.some(share => share.user._id.toString() === req.user._id.toString());

        if (!isOwner && !isShared) {
            return res.status(403).json({ message: 'Not authorized to access this document' });
        }

        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   PUT /api/docs/:id/rename
// @desc    Rename a document
exports.renameDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        // allow owner or authorized person (simplification: just owner can rename from dashboard)
        if (document.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        document.title = req.body.title;
        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   DELETE /api/docs/:id
// @desc    Delete a document
exports.deleteDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (document.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete' });
        }

        await document.deleteOne();
        res.json({ message: 'Document removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   POST /api/docs/:id/duplicate
// @desc    Duplicate a document
exports.duplicateDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        // Make a copy
        const copy = await Document.create({
            title: document.title + ' (Copy)',
            owner: req.user._id,
            data: document.data
        });

        res.status(201).json(copy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   POST /api/docs/:id/share
// @desc    Share document with user
exports.shareDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (document.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only owner can share' });
        }

        const { email, permission } = req.body;
        const User = require('../models/User'); // inline require to avoid circular deps
        const userToShareWith = await User.findOne({ email });

        if (!userToShareWith) return res.status(404).json({ message: 'User not found' });
        if (userToShareWith._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You own this document' });
        }

        const existingShareIndex = document.sharedWith.findIndex(s => s.user.toString() === userToShareWith._id.toString());
        if (existingShareIndex > -1) {
            document.sharedWith[existingShareIndex].permission = permission;
        } else {
            document.sharedWith.push({ user: userToShareWith._id, permission });
        }

        await document.save();
        res.json(document);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

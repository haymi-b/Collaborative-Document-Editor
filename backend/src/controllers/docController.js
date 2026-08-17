const Document = require('../models/Document');

exports.createDocument = async (req, res) => {
    try {
        let docTitle = req.body.title || 'Untitled Document';
        const doc = await Document.create({
            title: docTitle,
            owner: req.user._id,
            data: '' // init empty doc 
        });
        // console.log("doc created", doc)
        res.status(201).json(doc);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        // get all my docs
        const owned = await Document.find({ owner: req.user._id }).sort('-updatedAt');

        const shared = await Document.find({ 'sharedWith.user': req.user._id }).sort('-updatedAt');
        res.json({ ownedDocs: owned, sharedDocs: shared });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

exports.getDocumentById = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('sharedWith.user', 'name email');

        if (!doc) return res.status(404).json({ message: 'cant find document' });

        let isOwner = doc.owner._id.toString() == req.user._id.toString();
        let isShared = doc.sharedWith.some(s => s.user._id.toString() == req.user._id.toString());

        if (!isOwner && !isShared) {
            return res.status(403).json({ message: 'not authorized to view this' });
        }

        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.renameDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

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

exports.duplicateDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

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

exports.shareDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) return res.status(404).json({ message: 'Document not found' });

        if (document.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only owner can share' });
        }

        const { email, permission } = req.body;
        const User = require('../models/User');
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

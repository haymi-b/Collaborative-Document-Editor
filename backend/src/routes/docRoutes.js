const express = require('express');
const { createDocument, getDocuments, getDocumentById, renameDocument, deleteDocument, duplicateDocument, shareDocument } = require('../controllers/docController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);

router.route('/')
    .post(createDocument)
    .get(getDocuments);

router.route('/:id')
    .get(getDocumentById)
    .delete(deleteDocument);

router.put('/:id/rename', renameDocument);
router.post('/:id/duplicate', duplicateDocument);
router.post('/:id/share', shareDocument);

module.exports = router;

import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Plus, FileText, Trash2, Copy, LogOut, Users, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [documents, setDocuments] = useState({ ownedDocs: [], sharedDocs: [] });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/docs');
            setDocuments(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to load documents. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const makeNewDoc = async () => {
        if (creating) return;
        setCreating(true);
        setError('');
        try {
            // new doc
            const res = await api.post('/docs', { title: 'Untitled Document' });
            navigate(`/document/${res.data._id}`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Could not create document. Please try again.');
            setCreating(false);
        }
    };

    const removeDoc = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Delete this document?')) return;
        try {
            await api.delete(`/docs/${id}`);
            fetchDocuments(); // refresh
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete doc.');
        }
    };

    const handleDuplicate = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.post(`/docs/${id}/duplicate`);
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to duplicate document.');
        }
    };

    const renderDocCard = (doc, isShared = false) => (
        <div
            key={doc._id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow group relative cursor-pointer"
            onClick={() => navigate(`/document/${doc._id}`)}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
                        {isShared ? <Users size={22} /> : <FileText size={22} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
                            {doc.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isShared ? `Shared by ${doc.owner?.name || 'someone'}` : 'You own this'}
                            {' · '}
                            {format(new Date(doc.updatedAt || doc.lastModified), 'MMM d, yyyy')}
                        </p>
                    </div>
                </div>
            </div>

            {!isShared && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => handleDuplicate(e, doc._id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={15} />
                    </button>
                    <button
                        onClick={(e) => removeDoc(e, doc._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <FileText className="text-blue-600" size={26} />
                            <span className="text-xl font-bold text-slate-800 tracking-tight">SyncWrite</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-600 hidden sm:block">
                                Hello, {user?.name}
                            </span>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 px-3 py-2 rounded-md hover:bg-slate-100 transition"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Your Documents</h1>
                    <button
                        onClick={makeNewDoc}
                        disabled={creating}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-colors"
                    >
                        {creating
                            ? <><Loader2 size={18} className="animate-spin" /> Creating…</>
                            : <><Plus size={18} /> New Document</>
                        }
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 font-bold">✕</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-24">
                        <Loader2 size={36} className="animate-spin text-blue-400" />
                    </div>
                ) : documents.ownedDocs.length === 0 && documents.sharedDocs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                        <FileText className="mx-auto text-slate-300 mb-4" size={60} />
                        <h3 className="text-lg font-medium text-slate-700">No documents yet</h3>
                        <p className="text-slate-400 mt-2 mb-6 text-sm">Create your first collaborative document to get started.</p>
                        <button
                            onClick={makeNewDoc}
                            disabled={creating}
                            className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-blue-700 px-5 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            {creating ? 'Creating…' : 'Create Document'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {documents.ownedDocs.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText size={16} /> My Documents
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.ownedDocs.map(doc => renderDocCard(doc))}
                                </div>
                            </div>
                        )}

                        {documents.sharedDocs.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Users size={16} /> Shared with Me
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.sharedDocs.map(doc => renderDocCard(doc, true))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;

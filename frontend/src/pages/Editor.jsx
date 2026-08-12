import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Edit2, Users, Save, Share2, X, Check } from 'lucide-react';

const SAVE_INTERVAL_MS = 2000;

const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ align: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link', 'image', 'blockquote', 'code-block'],
    ['clean'],
];

const Editor = () => {
    const { id: documentId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const socketRef = useRef(null);
    const quillRef = useRef(null);
    const editorDivRef = useRef(null);
    const loadedRef = useRef(false);
    const activeUsersRef = useRef(new Map());

    const [document, setDocument] = useState(null);
    const [activeUsers, setActiveUsers] = useState([]);
    const [title, setTitle] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved'

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('Viewer');
    const [shareMsg, setShareMsg] = useState('');

    const updateActiveUsersState = useCallback(() => {
        setActiveUsers(Array.from(activeUsersRef.current.values()));
    }, []);

    // Initialize Quill editor using a ref callback
    const initQuill = useCallback((node) => {
        if (node && !quillRef.current) {
            editorDivRef.current = node;
            const q = new Quill(node, {
                theme: 'snow',
                modules: { toolbar: TOOLBAR_OPTIONS },
            });
            quillRef.current = q;
        }
    }, []);

    // Socket setup
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const s = io(socketUrl);
        socketRef.current = s;

        s.on('user-joined', (u) => {
            if (!activeUsersRef.current.has(u._id)) {
                activeUsersRef.current.set(u._id, u);
                updateActiveUsersState();
            }
        });

        s.on('user-left', (u) => {
            activeUsersRef.current.delete(u._id);
            updateActiveUsersState();
        });

        return () => {
            s.emit('leave-document');
            s.disconnect();
            socketRef.current = null;
        };
    }, [updateActiveUsersState]);

    // Fetch document & join room
    useEffect(() => {
        if (!socketRef.current || !documentId || !user) return;
        socketRef.current.emit('join-document', { documentId, user });

        api.get(`/docs/${documentId}`)
            .then(res => {
                setDocument(res.data);
                setTitle(res.data.title);
                setIsOwner(res.data.owner._id === user._id);
            })
            .catch(err => {
                console.error(err);
                if (err.response?.status === 403) {
                    alert('You do not have permission to access this document.');
                    navigate('/');
                }
            });
    }, [documentId, user, navigate]);

    // Load initial contents once Quill and document are ready
    useEffect(() => {
        const q = quillRef.current;
        if (q && document && !loadedRef.current) {
            if (document.data && Object.keys(document.data).length > 0) {
                q.setContents(document.data);
            }
            loadedRef.current = true;
        }
    }, [document]);

    // Poll until quill is initialized then load (handles timing between ref init and document fetch)
    useEffect(() => {
        if (!document || loadedRef.current) return;
        const interval = setInterval(() => {
            const q = quillRef.current;
            if (q && !loadedRef.current) {
                if (document.data && Object.keys(document.data).length > 0) {
                    q.setContents(document.data);
                }
                loadedRef.current = true;
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [document]);

    // Receive changes from other collaborators
    useEffect(() => {
        const s = socketRef.current;
        if (!s) return;
        const handler = (delta) => {
            quillRef.current?.updateContents(delta);
        };
        s.on('receive-changes', handler);
        return () => s.off('receive-changes', handler);
    }, []);

    // Send changes to collaborators
    useEffect(() => {
        const q = quillRef.current;
        if (!q) return;
        const handler = (delta, _oldDelta, source) => {
            if (source !== 'user') return;
            socketRef.current?.emit('send-changes', delta);
        };
        // Wait for quill to be initialized
        const timer = setTimeout(() => {
            quillRef.current?.on('text-change', handler);
        }, 200);
        return () => {
            clearTimeout(timer);
            quillRef.current?.off('text-change', handler);
        };
    }, []);

    // Auto save
    useEffect(() => {
        const interval = setInterval(() => {
            const q = quillRef.current;
            const s = socketRef.current;
            if (q && s) {
                setSaveStatus('saving');
                const data = q.getContents();
                s.emit('save-document', data);
                setTimeout(() => setSaveStatus('saved'), 600);
            }
        }, SAVE_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    const handleTitleChange = async (e) => {
        setTitle(e.target.value);
        await api.put(`/docs/${documentId}/rename`, { title: e.target.value }).catch(() => { });
    };

    const handleShare = async (e) => {
        e.preventDefault();
        setShareMsg('');
        try {
            await api.post(`/docs/${documentId}/share`, { email: shareEmail, permission: shareRole });
            setShareMsg('✓ Shared successfully!');
            setShareEmail('');
            setTimeout(() => setShowShareModal(false), 1500);
        } catch (err) {
            setShareMsg(err.response?.data?.message || 'Failed to share');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc', position: 'relative' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                zIndex: 10,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '8px', borderRadius: '50%', border: 'none', background: 'none',
                            color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="text"
                            value={title}
                            onChange={handleTitleChange}
                            disabled={!isOwner}
                            style={{
                                fontWeight: '600', fontSize: '1.1rem', color: '#1e293b',
                                background: 'transparent', border: 'none', borderBottom: '2px solid transparent',
                                outline: 'none', padding: '2px 4px', transition: 'border-color 0.2s',
                                cursor: isOwner ? 'text' : 'default',
                            }}
                            onFocus={e => { if (isOwner) e.target.style.borderBottomColor = '#0284c7'; }}
                            onBlur={e => e.target.style.borderBottomColor = 'transparent'}
                        />
                        {isOwner && <Edit2 size={14} style={{ color: '#94a3b8' }} />}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Active users */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                        <Users size={16} />
                        {activeUsers.length > 0 ? (
                            <div style={{ display: 'flex', marginLeft: '-4px' }}>
                                {activeUsers.map((u, i) => (
                                    <div key={i} title={u.name} style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                        border: '2px solid white', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '11px', fontWeight: '700',
                                        color: 'white', marginLeft: '-6px', textTransform: 'uppercase',
                                    }}>
                                        {u.name.charAt(0)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span>Only you</span>
                        )}
                    </div>

                    {/* Save status */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.75rem', fontWeight: '500',
                        color: saveStatus === 'saved' ? '#16a34a' : '#0284c7',
                        background: saveStatus === 'saved' ? '#f0fdf4' : '#eff6ff',
                        padding: '6px 12px', borderRadius: '99px',
                    }}>
                        {saveStatus === 'saved'
                            ? <><Check size={13} /> Saved</>
                            : <><Save size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                        }
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setShowShareModal(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '0.875rem', background: '#0284c7', color: 'white',
                                border: 'none', padding: '8px 16px', borderRadius: '8px',
                                cursor: 'pointer', fontWeight: '500', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#0369a1'}
                            onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
                        >
                            <Share2 size={15} /> Share
                        </button>
                    )}
                </div>
            </header>

            {/* Editor area */}
            <main style={{ flex: 1, overflow: 'auto', backgroundColor: '#f1f5f9', padding: '32px 16px' }}>
                <div style={{ maxWidth: '860px', margin: '0 auto' }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
                        minHeight: '600px', overflow: 'hidden',
                    }}>
                        <div ref={initQuill} style={{ height: '100%', minHeight: '600px' }} />
                    </div>
                </div>
            </main>

            {/* Share Modal */}
            {showShareModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: '16px',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
                        width: '100%', maxWidth: '400px', padding: '28px', margin: '16px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
                                Share Document
                            </h3>
                            <button
                                onClick={() => { setShowShareModal(false); setShareMsg(''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {shareMsg && (
                            <div style={{
                                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem',
                                background: shareMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2',
                                color: shareMsg.startsWith('✓') ? '#16a34a' : '#dc2626',
                                border: `1px solid ${shareMsg.startsWith('✓') ? '#bbf7d0' : '#fecaca'}`,
                            }}>
                                {shareMsg}
                            </div>
                        )}

                        <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>
                                    User Email
                                </label>
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#0284c7'}
                                    onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>
                                    Permission
                                </label>
                                <select
                                    value={shareRole}
                                    onChange={(e) => setShareRole(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: '8px',
                                        border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem',
                                        backgroundColor: 'white', cursor: 'pointer',
                                    }}
                                >
                                    <option value="Viewer">Viewer — can read only</option>
                                    <option value="Commenter">Commenter — can comment</option>
                                    <option value="Editor">Editor — can edit</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: '100%', padding: '11px', borderRadius: '8px',
                                    background: '#0284c7', color: 'white', border: 'none',
                                    fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
                                    marginTop: '4px',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#0369a1'}
                                onMouseLeave={e => e.currentTarget.style.background = '#0284c7'}
                            >
                                Send Invite
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .ql-toolbar.ql-snow {
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    border-left: none !important;
                    border-right: none !important;
                    border-top: none !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    padding: 12px 16px !important;
                    background: #f8fafc;
                }
                .ql-container.ql-snow {
                    border: none !important;
                    font-size: 1rem;
                    font-family: 'Inter', system-ui, sans-serif;
                }
                .ql-editor {
                    min-height: 560px;
                    padding: 32px 40px;
                    font-size: 1.05rem;
                    line-height: 1.7;
                    color: #1e293b;
                }
                .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
            `}</style>
        </div>
    );
};

export default Editor;

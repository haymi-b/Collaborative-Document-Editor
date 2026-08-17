import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(name, email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'register failed :(');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '64px', height: '64px', borderRadius: '20px',
                        background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
                        marginBottom: '16px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
                    }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </div>
                    <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>
                        SyncWrite
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', marginTop: '6px' }}>
                        Start collaborating on documents in real-time
                    </p>
                </div>

                <div className="auth-card" style={{ padding: '36px' }}>
                    <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
                        Create your account
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '28px' }}>
                        Join thousands of teams writing together
                    </p>

                    {error && <div className="auth-error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="auth-label">Full name</label>
                            <input
                                type="text"
                                className="auth-input"
                                placeholder=""
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="auth-label">Email address</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder=""
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="auth-label">Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength="6"
                            />
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading} style={{ marginTop: '8px' }}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : 'Sign Up →'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                        {['✓ Free forever', '✓ Real-time sync', '✓ Secure'].map(f => (
                            <span key={f} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{f}</span>
                        ))}
                    </div>

                    <p className="auth-divider" style={{ marginTop: '20px' }}>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>


            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Register;

'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

type UserRole = 'FARMER' | 'GOVERNMENT' | 'RESEARCHER';

const ROLE_OPTIONS: { value: UserRole; label: string; icon: string; desc: string }[] = [
    { value: 'FARMER', label: 'Farmer', icon: '🌾', desc: 'Manage your farms and irrigation' },
    { value: 'GOVERNMENT', label: 'Government Officer', icon: '🏛️', desc: 'Monitor regional agriculture' },
    { value: 'RESEARCHER', label: 'Researcher', icon: '🔬', desc: 'Analyze agricultural data' },
];

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('FARMER');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });

            if (response.ok) {
                // Auto-login after successful registration
                const result = await signIn('credentials', {
                    email,
                    password,
                    redirect: false,
                });

                if (result?.error) {
                    setError('Registration successful but login failed. Please try logging in manually.');
                    setLoading(false);
                } else {
                    router.push('/dashboard');
                }
            } else {
                const data = await response.json();
                setError(data.message || 'Registration failed');
                setLoading(false);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl: '/dashboard' });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p>Join GreenGuard AI today</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>I am a</label>
                        <div className="role-selector">
                            {ROLE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`role-option ${role === opt.value ? 'role-active' : ''}`}
                                    onClick={() => setRole(opt.value)}
                                >
                                    <span className="role-icon">{opt.icon}</span>
                                    <span className="role-label">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="divider">
                    <span>OR</span>
                </div>

                <button onClick={handleGoogleSignIn} className="btn-google">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                            fill="#4285F4"
                        />
                        <path
                            d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z"
                            fill="#34A853"
                        />
                        <path
                            d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.33z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.003 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--gradient-subtle);
                    padding: var(--spacing-lg);
                }

                .auth-card {
                    background: var(--color-surface);
                    border-radius: var(--radius-2xl);
                    padding: var(--spacing-2xl);
                    box-shadow: var(--shadow-xl);
                    width: 100%;
                    max-width: 480px;
                    animation: fadeIn 0.5s ease-out;
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: var(--spacing-xl);
                }

                .auth-header h1 {
                    font-size: var(--font-size-3xl);
                    margin-bottom: var(--spacing-sm);
                }

                .auth-header p {
                    color: var(--color-text-muted);
                    font-size: var(--font-size-base);
                }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-lg);
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .form-group label {
                    font-weight: 600;
                    color: var(--color-text-primary);
                    font-size: var(--font-size-sm);
                }

                .role-selector {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                }

                .role-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.75rem 0.5rem;
                    border: 2px solid var(--color-primary-light, #e0e0e0);
                    border-radius: var(--radius-lg, 12px);
                    background: var(--color-surface, #fff);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 0.75rem;
                }

                .role-option:hover {
                    border-color: var(--color-primary, #10B981);
                    background: rgba(16, 185, 129, 0.05);
                }

                .role-active {
                    border-color: var(--color-primary, #10B981);
                    background: rgba(16, 185, 129, 0.1);
                    box-shadow: 0 0 0 1px var(--color-primary, #10B981);
                }

                .role-icon {
                    font-size: 1.5rem;
                }

                .role-label {
                    font-weight: 600;
                    color: var(--color-text-primary);
                    text-align: center;
                    line-height: 1.2;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid var(--color-error);
                    color: var(--color-error);
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    text-align: center;
                }

                .auth-btn {
                    width: 100%;
                    margin-top: var(--spacing-md);
                }

                .auth-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    margin: var(--spacing-xl) 0;
                    color: var(--color-text-muted);
                }

                .divider::before,
                .divider::after {
                    content: '';
                    flex: 1;
                    border-bottom: 1px solid var(--color-primary-light);
                }

                .divider span {
                    padding: 0 var(--spacing-md);
                    font-size: var(--font-size-sm);
                    font-weight: 600;
                }

                .btn-google {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-md) var(--spacing-xl);
                    border: 2px solid var(--color-primary-light);
                    border-radius: var(--radius-lg);
                    background: var(--color-surface);
                    color: var(--color-text-primary);
                    font-size: var(--font-size-base);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all var(--transition-base);
                }

                .btn-google:hover {
                    background: var(--color-surface-elevated);
                    border-color: var(--color-primary);
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }

                .auth-footer {
                    text-align: center;
                    margin-top: var(--spacing-xl);
                    padding-top: var(--spacing-xl);
                    border-top: 1px solid var(--color-primary-light);
                }

                .auth-footer p {
                    color: var(--color-text-muted);
                    font-size: var(--font-size-sm);
                    margin: 0;
                }

                .auth-footer a {
                    color: var(--color-primary);
                    font-weight: 600;
                    text-decoration: none;
                    transition: color var(--transition-fast);
                }

                .auth-footer a:hover {
                    color: var(--color-primary-dark);
                    text-decoration: underline;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 640px) {
                    .auth-card {
                        padding: var(--spacing-xl);
                    }

                    .auth-header h1 {
                        font-size: var(--font-size-2xl);
                    }

                    .role-selector {
                        grid-template-columns: 1fr;
                    }

                    .role-option {
                        flex-direction: row;
                        gap: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
}

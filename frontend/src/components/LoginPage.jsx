import { useState } from 'react';
import { login, register } from '../api.js';

export default function LoginPage({ onLogin, notice }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = isLogin
        ? await login(username, password)
        : await register(username, password);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isLogin ? 'register' : 'login');
    setError('');
  }

  return (
    <main className="auth-screen">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Employee Manager</h1>
        <p className="muted">{isLogin ? 'Sign in to continue' : 'Create a new account'}</p>

        {notice && isLogin && <div className="alert info">{notice}</div>}
        {error && <div className="alert error">{error}</div>}

        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
        </label>

        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>

        <p className="switch">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" className="link" onClick={switchMode}>
            {isLogin ? 'Register' : 'Sign in'}
          </button>
        </p>

        {isLogin && <p className="hint">Default account: admin / admin123</p>}
      </form>
    </main>
  );
}

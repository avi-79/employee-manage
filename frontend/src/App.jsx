import { useEffect, useState } from 'react';
import { clearSession, loadSession, onUnauthorized } from './api.js';
import LoginPage from './components/LoginPage.jsx';
import EmployeesPage from './components/EmployeesPage.jsx';

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [notice, setNotice] = useState('');

  useEffect(() => {
    onUnauthorized(() => {
      setSession(null);
      setNotice('Your session has expired. Please log in again.');
    });
  }, []);

  function handleLogin(newSession) {
    setNotice('');
    setSession(newSession);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} notice={notice} />;
  }

  return <EmployeesPage username={session.username} onLogout={handleLogout} />;
}

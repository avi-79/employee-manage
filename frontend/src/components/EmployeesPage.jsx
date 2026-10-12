import { useCallback, useEffect, useMemo, useState } from 'react';
import { employeesApi } from '../api.js';
import EmployeeForm from './EmployeeForm.jsx';

export default function EmployeesPage({ username, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // null = form closed, {} = creating, employee object = editing
  const [editing, setEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEmployees(await employeesApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) =>
      [e.name, e.email, e.department].some((v) => v?.toLowerCase().includes(term))
    );
  }, [employees, search]);

  async function handleSave(data) {
    if (editing?.id) {
      const updated = await employeesApi.update(editing.id, data);
      setEmployees((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    } else {
      const created = await employeesApi.create(data);
      setEmployees((list) => [...list, created]);
    }
    setEditing(null);
  }

  async function handleDelete(id) {
    setError('');
    try {
      await employeesApi.remove(id);
      setEmployees((list) => list.filter((e) => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="layout">
      <header className="topbar">
        <h1>Employee Manager</h1>
        <div className="user">
          <span className="muted">Signed in as <strong>{username}</strong></span>
          <button className="btn" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <input
            className="search"
            placeholder="Search by name, email or department"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" onClick={loadEmployees} disabled={loading}>Refresh</button>
          <button className="btn primary" onClick={() => setEditing({})}>+ Add employee</button>
        </div>

        {error && <div className="alert error">{error}</div>}

        {editing && (
          <EmployeeForm
            employee={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan="5" className="empty">Loading…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty">
                    {employees.length === 0 ? 'No employees yet. Add the first one.' : 'No matches.'}
                  </td>
                </tr>
              )}
              {!loading && filtered.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.id}</td>
                  <td>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>{emp.department}</td>
                  <td className="actions">
                    {confirmDeleteId === emp.id ? (
                      <>
                        <span className="muted">Delete?</span>
                        <button className="btn danger small" onClick={() => handleDelete(emp.id)}>Yes</button>
                        <button className="btn small" onClick={() => setConfirmDeleteId(null)}>No</button>
                      </>
                    ) : (
                      <>
                        <button className="btn small" onClick={() => setEditing(emp)}>Edit</button>
                        <button className="btn danger small" onClick={() => setConfirmDeleteId(emp.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted count">{employees.length} employee(s)</p>
      </main>
    </div>
  );
}

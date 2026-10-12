import { useState } from 'react';

export default function EmployeeForm({ employee, onSave, onCancel }) {
  const isEdit = Boolean(employee.id);
  const [form, setForm] = useState({
    name: employee.name ?? '',
    email: employee.email ?? '',
    department: employee.department ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="card employee-form" onSubmit={handleSubmit}>
      <h2>{isEdit ? `Edit employee #${employee.id}` : 'Add employee'}</h2>
      {error && <div className="alert error">{error}</div>}

      <div className="fields">
        <label>
          Name
          <input value={form.name} onChange={update('name')} required autoFocus />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          Department
          <input value={form.department} onChange={update('department')} required />
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
        </button>
      </div>
    </form>
  );
}

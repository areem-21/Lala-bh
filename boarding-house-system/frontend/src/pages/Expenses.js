import React, { useEffect, useState, useCallback } from 'react';
import API from '../api';
import { Link } from 'react-router-dom';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [notes, setNotes] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('token');

  const load = useCallback(async () => {
    try {
      const res = await API.get('/expenses/all', { headers: { Authorization: `Bearer ${token}` } });
      setExpenses(res.data || []);
    } catch (err) {
      console.error('LOAD EXPENSES ERROR:', err);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filteredExpenses = expenses.filter(e => {
    if (!e.created_at) return false;
    const dt = new Date(e.created_at);
    const now = new Date();
    if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return dt >= weekAgo && dt <= now;
    }
    if (filter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return dt >= monthAgo && dt <= now;
    }
    if (filter === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(now.getFullYear() - 1);
      return dt >= yearAgo && dt <= now;
    }
    return true; // all
  });

  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const exportToCSV = () => {
    const header = ['Title', 'Amount', 'Category', 'Expense Date', 'Notes'];
    const rows = filteredExpenses.map(e => [
      (e.title || '').replace(/"/g, '""'),
      Number(e.amount || 0).toFixed(2),
      e.category || '',
      new Date(e.created_at).toISOString(),
      (e.notes || '').replace(/"/g, '""')
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const stamp = d.toISOString().slice(0,10);
    a.download = `expenses_${filter}_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleAdd = async () => {
    if (!title || !amount || Number(amount) <= 0) return alert('Please enter valid title and amount');
    try {
      await API.post('/expenses/add', { title, amount, category, notes }, { headers: { Authorization: `Bearer ${token}` } });
      setShowAdd(false);
      setTitle(''); setAmount(''); setNotes('');
      setCategory('maintenance');
      load();
      alert('Expense added');
    } catch (err) {
      console.error('ADD EXPENSE ERROR:', err);
      alert('Failed to add expense');
    }
  };

  const openEdit = (exp) => {
    setEditingId(exp.id);
    setTitle(exp.title || '');
    setAmount(exp.amount || '');
    setCategory(exp.category || 'maintenance');
    setNotes(exp.notes || '');
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!title || !amount || Number(amount) <= 0) return alert('Please enter valid title and amount');
    try {
      await API.put(`/expenses/update/${editingId}`, { title, amount, category, notes }, { headers: { Authorization: `Bearer ${token}` } });
      setShowEdit(false);
      setEditingId(null);
      setTitle(''); setAmount(''); setNotes(''); setCategory('maintenance');
      load();
      alert('Expense updated');
    } catch (err) {
      console.error('UPDATE EXPENSE ERROR:', err);
      alert('Failed to update expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await API.delete(`/expenses/delete/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      load();
      alert('Expense deleted');
    } catch (err) {
      console.error('DELETE EXPENSE ERROR:', err);
      alert('Failed to delete expense');
    }
  };

  return (
    <div style={{ padding: 20, background: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <Link to="/admin/dashboard"><button style={{ marginRight: 12 }}>Back</button></Link>
        <h1 style={{ margin: 0 }}>Expenses</h1>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => setShowAdd(true)} style={{ padding: '8px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>+ Add Expense</button>
        </div>
      </div>

      {showAdd && (
        <div style={{ marginBottom: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="maintenance">Maintenance</option>
              <option value="utility">Utility</option>
              <option value="supplies">Supplies</option>
              <option value="other">Other</option>
            </select>
            
            <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAdd} style={{ padding: '8px 12px' }}>Save</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 12px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 'bold' }}>Total Expenses: ₱{totalExpenses.toLocaleString()}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '6px' }}>
              <option value="all">All</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="year">Last 365 days</option>
            </select>
            <div style={{ color: '#6b7280' }}>Count: {filteredExpenses.length}</div>
            <button onClick={exportToCSV} style={{ padding: '6px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>Export</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Title</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Category</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Expense Date</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Notes</th>
              <th style={{ textAlign: 'left', padding: 8, border: '1px solid #e5e7eb', background: '#f8fafc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(e => (
              <tr key={e.id}>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{e.title}</td>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>₱{Number(e.amount || 0).toLocaleString()}</td>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{e.category || '-'}</td>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{e.created_at ? new Date(e.created_at).toLocaleString() : '-'}</td>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{e.notes || '-'}</td>
                <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>
                  <button onClick={() => openEdit(e)} style={{ marginRight: 8, padding: '6px 8px' }}>Edit</button>
                  <button onClick={() => handleDelete(e.id)} style={{ padding: '6px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      {showEdit && (
        <div style={{ marginTop: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
          <h3>Edit Expense</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="maintenance">Maintenance</option>
              <option value="utility">Utility</option>
              <option value="supplies">Supplies</option>
              <option value="other">Other</option>
            </select>
            <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleUpdate} style={{ padding: '8px 12px' }}>Save Changes</button>
              <button onClick={() => { setShowEdit(false); setEditingId(null); }} style={{ padding: '8px 12px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Expenses;

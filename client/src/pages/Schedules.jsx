import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Schedules() {
    const [schedules, setSchedules] = useState([]);
    const [appliances, setAppliances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ appliance_id: '', frequency_days: 90, next_due: '', reminder_days_before: 7 });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [schRes, appRes] = await Promise.all([
                axios.get('/api/schedules'), axios.get('/api/appliances')
            ]);
            setSchedules(schRes.data.schedules);
            setAppliances(appRes.data.appliances);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await axios.post('/api/schedules', form);
            toast.success('Schedule created!');
            setShowForm(false);
            setForm({ appliance_id: '', frequency_days: 90, next_due: '', reminder_days_before: 7 });
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    async function handleUpdate(id, updates) {
        try {
            await axios.put(`/api/schedules/${id}`, updates);
            toast.success('Schedule updated');
            fetchAll();
        } catch { toast.error('Failed to update'); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this schedule?')) return;
        try { await axios.delete(`/api/schedules/${id}`); toast.success('Deleted'); fetchAll(); }
        catch { toast.error('Failed'); }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    // Filter appliances that don't already have schedules
    const scheduledAppIds = schedules.map(s => s.appliance_id);
    const availableAppliances = appliances.filter(a => !scheduledAppIds.includes(a.id));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Maintenance Schedules 📅</h1>
                    <p className="text-slate-500 mt-1">{schedules.length} schedules configured</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {showForm ? 'Cancel' : '+ Add Schedule'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">Create Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Appliance *</label>
                            <select value={form.appliance_id} onChange={e => setForm({ ...form, appliance_id: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="">Select</option>
                                {availableAppliances.map(a => <option key={a.id} value={a.id}>{a.name} ({a.property_name})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Frequency (days) *</label>
                            <input type="number" value={form.frequency_days} onChange={e => setForm({ ...form, frequency_days: parseInt(e.target.value) })} required min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Next Due Date</label>
                            <input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Remind Before (days)</label>
                            <input type="number" value={form.reminder_days_before} onChange={e => setForm({ ...form, reminder_days_before: parseInt(e.target.value) })} min="1" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Create Schedule</button>
                </form>
            )}

            {schedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">📅</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No schedules yet</h3>
                    <p className="text-slate-500">Configure maintenance schedules for automatic reminders.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {schedules.map(s => {
                        const daysUntil = s.next_due ? Math.ceil((new Date(s.next_due) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                        const urgency = daysUntil === null ? 'text-slate-500' : daysUntil <= 0 ? 'text-red-600' : daysUntil <= 7 ? 'text-amber-600' : 'text-emerald-600';

                        return (
                            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-xl">📅</div>
                                        <div>
                                            <h3 className="font-semibold text-navy-900">{s.appliance_name}</h3>
                                            <p className="text-sm text-slate-500">{s.property_name} • {s.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500">Frequency</p>
                                            <p className="font-semibold text-navy-900">{s.frequency_days} days</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500">Last Service</p>
                                            <p className="font-semibold text-navy-900">{s.last_service || '—'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500">Next Due</p>
                                            <p className={`font-bold ${urgency}`}>{s.next_due || '—'}</p>
                                            {daysUntil !== null && (
                                                <p className={`text-xs font-medium ${urgency}`}>
                                                    {daysUntil <= 0 ? 'Overdue!' : `${daysUntil}d left`}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

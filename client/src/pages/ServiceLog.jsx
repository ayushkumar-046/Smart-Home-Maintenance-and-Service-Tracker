import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ServiceCard from '../components/ServiceCard';
import toast from 'react-hot-toast';

export default function ServiceLog() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [appliances, setAppliances] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({ appliance_id: '', vendor_id: '', scheduled_date: '', cost: '', notes: '' });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [svcRes, appRes, venRes] = await Promise.all([
                axios.get('/api/services' + (statusFilter ? `?status=${statusFilter}` : '')),
                axios.get('/api/appliances').catch(() => ({ data: { appliances: [] } })),
                axios.get('/api/vendors').catch(() => ({ data: { vendors: [] } }))
            ]);
            setServices(svcRes.data.services);
            setAppliances(appRes.data.appliances);
            setVendors(venRes.data.vendors);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchAll(); }, [statusFilter]);

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await axios.post('/api/services', { ...form, cost: form.cost ? parseFloat(form.cost) : 0 });
            toast.success('Service scheduled!');
            setShowForm(false);
            setForm({ appliance_id: '', vendor_id: '', scheduled_date: '', cost: '', notes: '' });
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    async function handleStatusUpdate(id, status) {
        try {
            await axios.put(`/api/services/${id}/status`, { status });
            toast.success(`Status updated to ${status}!`);
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    async function handleFeedback(serviceId) {
        const rating = prompt('Rate this service (1-5):');
        if (!rating || isNaN(rating) || rating < 1 || rating > 5) return;
        const comment = prompt('Leave a comment (optional):');
        try {
            await axios.post(`/api/services/${serviceId}/feedback`, { rating: parseInt(rating), comment });
            toast.success('Feedback submitted!');
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Service Log 📋</h1>
                    <p className="text-slate-500 mt-1">{services.length} service records</p>
                </div>
                {user?.role === 'homeowner' && (
                    <button onClick={() => setShowForm(!showForm)} className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                        {showForm ? 'Cancel' : '+ Schedule Service'}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${statusFilter === s ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'}`}>
                        {s ? s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All'}
                    </button>
                ))}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">Schedule New Service</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Appliance *</label>
                            <select value={form.appliance_id} onChange={e => setForm({ ...form, appliance_id: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="">Select</option>
                                {appliances.map(a => <option key={a.id} value={a.id}>{a.name} ({a.property_name})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Vendor</label>
                            <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="">Select vendor</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} (⭐{v.rating})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Scheduled Date *</label>
                            <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Estimated Cost (₹)</label>
                            <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="0.00" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-navy-900 mb-1">Notes</label>
                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="Service details..." />
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">Schedule Service</button>
                </form>
            )}

            {services.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">📋</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No service records</h3>
                    <p className="text-slate-500">Schedule your first service to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(s => (
                        <div key={s.id}>
                            <ServiceCard service={s} onStatusUpdate={handleStatusUpdate} showActions={user?.role !== 'homeowner' || s.status !== 'completed'} />
                            {s.status === 'completed' && user?.role === 'homeowner' && (
                                <button onClick={() => handleFeedback(s.id)} className="w-full mt-1 text-xs text-sky-500 hover:text-sky-600 font-medium py-1">
                                    ⭐ Leave Feedback
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

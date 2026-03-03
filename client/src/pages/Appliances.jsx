import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Appliances() {
    const [appliances, setAppliances] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [filter, setFilter] = useState('');
    const [form, setForm] = useState({
        property_id: '', name: '', category: 'Appliance Maintenance',
        brand: '', model: '', purchase_date: '', warranty_expiry: '', lifecycle_stage: 'active', notes: ''
    });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [appRes, propRes] = await Promise.all([
                axios.get('/api/appliances'), axios.get('/api/properties')
            ]);
            setAppliances(appRes.data.appliances);
            setProperties(propRes.data.properties);
        } catch { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`/api/appliances/${editId}`, form);
                toast.success('Appliance updated!');
            } else {
                await axios.post('/api/appliances', form);
                toast.success('Appliance added!');
            }
            setShowForm(false); setEditId(null);
            setForm({ property_id: '', name: '', category: 'Appliance Maintenance', brand: '', model: '', purchase_date: '', warranty_expiry: '', lifecycle_stage: 'active', notes: '' });
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete appliance and all related data?')) return;
        try { await axios.delete(`/api/appliances/${id}`); toast.success('Deleted'); fetchAll(); }
        catch { toast.error('Failed'); }
    }

    function startEdit(a) {
        setEditId(a.id);
        setForm({ property_id: a.property_id || '', name: a.name, category: a.category, brand: a.brand || '', model: a.model || '', purchase_date: a.purchase_date || '', warranty_expiry: a.warranty_expiry || '', lifecycle_stage: a.lifecycle_stage, notes: a.notes || '' });
        setShowForm(true);
    }

    const filtered = filter ? appliances.filter(a => a.category === filter) : appliances;
    const categories = ['Appliance Maintenance', 'Utility Services', 'Home Infrastructure Care'];

    const stageColors = {
        new: 'bg-emerald-100 text-emerald-700', active: 'bg-blue-100 text-blue-700',
        aging: 'bg-amber-100 text-amber-700', end_of_life: 'bg-red-100 text-red-700'
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Appliances ⚙️</h1>
                    <p className="text-slate-500 mt-1">{appliances.length} appliances tracked</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {showForm ? 'Cancel' : '+ Add Appliance'}
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!filter ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'}`}>All</button>
                {categories.map(c => (
                    <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === c ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'}`}>{c}</button>
                ))}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">{editId ? 'Edit Appliance' : 'Add New Appliance'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Property *</label>
                            <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="">Select property</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="e.g. Central AC" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Category *</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                {categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Brand</label>
                            <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="e.g. Carrier" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Model</label>
                            <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="e.g. Infinity 24" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Lifecycle Stage</label>
                            <select value={form.lifecycle_stage} onChange={e => setForm({ ...form, lifecycle_stage: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="new">New</option>
                                <option value="active">Active</option>
                                <option value="aging">Aging</option>
                                <option value="end_of_life">End of Life</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Purchase Date</label>
                            <input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Warranty Expiry</label>
                            <input type="date" value={form.warranty_expiry} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Notes</label>
                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none" placeholder="Additional info" />
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">{editId ? 'Update' : 'Add'}</button>
                </form>
            )}

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">⚙️</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No appliances found</h3>
                    <p className="text-slate-500">Add appliances to your properties to track their maintenance.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(a => (
                        <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition hover:border-sky-200 group">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-navy-900 group-hover:text-sky-600 transition">{a.name}</h3>
                                    <p className="text-sm text-slate-500">{a.property_name}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${stageColors[a.lifecycle_stage]}`}>{a.lifecycle_stage?.replace('_', ' ')}</span>
                            </div>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{a.category}</span></div>
                                {a.brand && <div className="flex justify-between"><span className="text-slate-500">Brand</span><span className="font-medium">{a.brand} {a.model}</span></div>}
                                {a.warranty_expiry && <div className="flex justify-between"><span className="text-slate-500">Warranty</span><span className={`font-medium ${new Date(a.warranty_expiry) < new Date() ? 'text-red-500' : 'text-emerald-600'}`}>{a.warranty_expiry}</span></div>}
                                <div className="flex justify-between"><span className="text-slate-500">Services</span><span className="font-medium">{a.service_count || 0}</span></div>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                <button onClick={() => startEdit(a)} className="text-sky-500 hover:text-sky-600 text-sm font-medium">Edit</button>
                                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Properties() {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', type: 'House' });

    useEffect(() => { fetchProperties(); }, []);

    async function fetchProperties() {
        try {
            const { data } = await axios.get('/api/properties');
            setProperties(data.properties);
        } catch (err) { toast.error('Failed to load properties'); }
        finally { setLoading(false); }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editId) {
                await axios.put(`/api/properties/${editId}`, form);
                toast.success('Property updated!');
            } else {
                await axios.post('/api/properties', form);
                toast.success('Property added!');
            }
            setShowForm(false); setEditId(null); setForm({ name: '', address: '', type: 'House' });
            fetchProperties();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Operation failed');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this property and all its appliances?')) return;
        try {
            await axios.delete(`/api/properties/${id}`);
            toast.success('Property deleted');
            fetchProperties();
        } catch (err) { toast.error('Failed to delete'); }
    }

    function startEdit(p) {
        setEditId(p.id);
        setForm({ name: p.name, address: p.address, type: p.type });
        setShowForm(true);
    }

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Properties 🏠</h1>
                    <p className="text-slate-500 mt-1">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'} registered</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', address: '', type: 'House' }); }}
                    className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-500/25"
                >
                    {showForm ? 'Cancel' : '+ Add Property'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">{editId ? 'Edit Property' : 'Add New Property'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Property Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition" placeholder="My Home" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Address</label>
                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition" placeholder="123 Main St" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Type</label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option>House</option>
                                <option>Apartment</option>
                                <option>Condo</option>
                                <option>Vacation Home</option>
                                <option>Office</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
                        {editId ? 'Update' : 'Add'} Property
                    </button>
                </form>
            )}

            {properties.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">🏘️</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No properties yet</h3>
                    <p className="text-slate-500">Add your first property to start tracking maintenance.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map(p => (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition hover:border-sky-200 group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center text-xl">🏠</div>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{p.type}</span>
                            </div>
                            <h3 className="font-bold text-navy-900 text-lg mb-1 group-hover:text-sky-600 transition">{p.name}</h3>
                            <p className="text-sm text-slate-500 mb-3">{p.address}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                <span className="text-sm text-slate-500">
                                    <span className="font-semibold text-navy-900">{p.appliance_count || 0}</span> appliances
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(p)} className="text-sky-500 hover:text-sky-600 text-sm font-medium">Edit</button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

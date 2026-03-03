import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [statsRes, usersRes, catRes] = await Promise.all([
                axios.get('/api/admin/stats'),
                axios.get('/api/admin/users'),
                axios.get('/api/admin/categories')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data.users);
            setCategories(catRes.data.categories);
        } catch (err) {
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    }

    async function updateRole(userId, role) {
        try {
            await axios.put(`/api/admin/users/${userId}/role`, { role });
            toast.success('User role updated');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update role');
        }
    }

    async function deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/admin/users/${userId}`);
            toast.success('User deleted');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete');
        }
    }

    async function addCategory() {
        if (!newCategory.trim()) return;
        try {
            await axios.post('/api/admin/categories', { name: newCategory });
            toast.success('Category added');
            setNewCategory('');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add');
        }
    }

    async function deleteCategory(id) {
        try {
            await axios.delete(`/api/admin/categories/${id}`);
            toast.success('Category deleted');
            fetchAll();
        } catch (err) {
            toast.error('Failed to delete');
        }
    }

    async function downloadReport() {
        try {
            const response = await axios.get('/api/admin/report', { responseType: 'arraybuffer' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            // Open PDF in a new browser tab for viewing
            window.open(url, '_blank');
            // Also trigger a file download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'platform_report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            // Clean up after a short delay
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
            toast.success('Report opened as PDF!');
        } catch (err) {
            console.error('Report error:', err);
            toast.error('Failed to generate report');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Admin Dashboard 🛡️</h1>
                    <p className="text-slate-500 mt-1">Platform overview and management</p>
                </div>
                <button onClick={downloadReport} className="bg-navy-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-navy-800 transition">
                    📄 Download Report
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Users', value: stats?.totalUsers, icon: '👥', color: 'bg-sky-50' },
                    { label: 'Premium Users', value: stats?.premiumUsers, icon: '⭐', color: 'bg-amber-50' },
                    { label: 'Properties', value: stats?.totalProperties, icon: '🏠', color: 'bg-emerald-50' },
                    { label: 'Appliances', value: stats?.totalAppliances, icon: '⚙️', color: 'bg-indigo-50' },
                    { label: 'Total Services', value: stats?.totalServices, icon: '📋', color: 'bg-purple-50' },
                    { label: 'Sub Revenue', value: `₹${(stats?.subscriptionRevenue || 0).toFixed(0)}`, icon: '💳', color: 'bg-rose-50' }
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
                        <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
                        <p className="text-xl font-bold text-navy-900">{s.value}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-navy-900 mb-4">Jobs by Month</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stats?.jobsByMonth?.reverse() || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-navy-900 mb-4">Users by Role</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={stats?.usersByRole || []} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label>
                                {(stats?.usersByRole || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-navy-900">User Management</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Plan</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-medium text-navy-900">{u.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={u.role}
                                            onChange={e => updateRole(u.id, e.target.value)}
                                            className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-sky-500"
                                        >
                                            <option value="homeowner">Homeowner</option>
                                            <option value="service_provider">Provider</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {u.plan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => deleteUser(u.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-navy-900 mb-4">Service Categories</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                    <button onClick={addCategory} className="bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-400 transition">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                        <div key={c.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-navy-900">{c.name}</span>
                            <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

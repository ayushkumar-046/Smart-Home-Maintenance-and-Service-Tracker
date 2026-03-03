import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ServiceCard from '../components/ServiceCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export default function ProviderDashboard() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        try {
            const { data } = await axios.get('/api/services');
            setServices(data.services);
        } catch (err) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusUpdate(id, status) {
        try {
            await axios.put(`/api/services/${id}/status`, { status });
            toast.success(`Job ${status === 'completed' ? 'completed' : 'updated'}!`);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const activeJobs = services.filter(s => s.status === 'scheduled' || s.status === 'in_progress');
    const completed = services.filter(s => s.status === 'completed');
    const totalEarned = completed.reduce((sum, s) => sum + (s.cost || 0), 0);

    // Earnings by month
    const earningsByMonth = {};
    completed.forEach(s => {
        if (s.completed_date) {
            const month = s.completed_date.substring(0, 7);
            earningsByMonth[month] = (earningsByMonth[month] || 0) + (s.cost || 0);
        }
    });
    const earningsData = Object.entries(earningsByMonth).map(([month, total]) => ({ month, total })).reverse();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-navy-900">Provider Dashboard 👷</h1>
                <p className="text-slate-500 mt-1">Welcome back, {user?.name}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Jobs', value: activeJobs.length, icon: '📋', color: 'bg-amber-50' },
                    { label: 'Completed', value: completed.length, icon: '✅', color: 'bg-emerald-50' },
                    { label: 'Total Jobs', value: services.length, icon: '📊', color: 'bg-indigo-50' },
                    { label: 'Total Earned', value: `₹${totalEarned.toFixed(0)}`, icon: '💰', color: 'bg-sky-50' }
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
                        <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-lg mb-3`}>{s.icon}</div>
                        <p className="text-2xl font-bold text-navy-900">{s.value}</p>
                        <p className="text-sm text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Active jobs */}
            <div>
                <h2 className="text-lg font-bold text-navy-900 mb-4">Active Jobs</h2>
                {activeJobs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <p className="text-4xl mb-3">🎉</p>
                        <p className="text-slate-500 font-medium">No active jobs right now</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeJobs.map(s => (
                            <ServiceCard key={s.id} service={s} onStatusUpdate={handleStatusUpdate} />
                        ))}
                    </div>
                )}
            </div>

            {/* Earnings chart */}
            {earningsData.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-navy-900 mb-4">Monthly Earnings</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={earningsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={v => `₹${v.toFixed(2)}`} />
                            <Bar dataKey="total" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Recent completed */}
            <div>
                <h2 className="text-lg font-bold text-navy-900 mb-4">Service History</h2>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Appliance</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Customer</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Earned</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {services.slice(0, 10).map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-medium text-navy-900">{s.appliance_name}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.homeowner_name || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{s.completed_date || s.scheduled_date}</td>
                                    <td className="px-4 py-3 font-semibold text-navy-900">{s.cost > 0 ? `₹${s.cost.toFixed(2)}` : '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            s.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                                s.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                            }`}>{s.status.replace('_', ' ')}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

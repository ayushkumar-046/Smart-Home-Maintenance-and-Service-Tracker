import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ServiceCard from '../components/ServiceCard';
import ExpenseChart from '../components/ExpenseChart';
import WarrantyAlert from '../components/WarrantyAlert';
import toast from 'react-hot-toast';

export default function HomeownerDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [services, setServices] = useState([]);
    const [appliances, setAppliances] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [statsRes, servicesRes, appliancesRes, schedulesRes] = await Promise.all([
                axios.get('/api/services/stats'),
                axios.get('/api/services'),
                axios.get('/api/appliances'),
                axios.get('/api/schedules')
            ]);
            setStats(statsRes.data);
            setServices(servicesRes.data.services);
            setAppliances(appliancesRes.data.appliances);
            setSchedules(schedulesRes.data.schedules);
        } catch (err) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusUpdate(id, status) {
        try {
            await axios.put(`/api/services/${id}/status`, { status });
            toast.success(`Service ${status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : 'started'}!`);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update status');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const upcomingServices = services.filter(s => s.status === 'scheduled' || s.status === 'in_progress');
    const recentCompleted = services.filter(s => s.status === 'completed').slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 mt-1">Here's your home maintenance overview</p>
                </div>
                {user?.plan === 'free' && (
                    <Link to="/subscription" className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition shadow-sky-500/25">
                        ⚡ Upgrade to Premium
                    </Link>
                )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Properties', value: new Set(appliances.map(a => a.property_name)).size, icon: '🏠', color: 'bg-sky-50 text-sky-600' },
                    { label: 'Appliances', value: appliances.length, icon: '⚙️', color: 'bg-indigo-50 text-indigo-600' },
                    { label: 'Active Services', value: upcomingServices.length, icon: '📋', color: 'bg-amber-50 text-amber-600' },
                    { label: 'Total Spent', value: `₹${(stats?.totals?.total_cost || 0).toFixed(0)}`, icon: '💰', color: 'bg-emerald-50 text-emerald-600' }
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition">
                        <div className={`w-10 h-10 ${s.color.split(' ')[0]} rounded-lg flex items-center justify-center text-lg mb-3`}>
                            {s.icon}
                        </div>
                        <p className="text-2xl font-bold text-navy-900">{s.value}</p>
                        <p className="text-sm text-slate-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Warranty alerts */}
            <WarrantyAlert appliances={appliances} />

            {/* Upcoming services */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-navy-900">Upcoming Services</h2>
                    <Link to="/services" className="text-sm text-sky-500 hover:text-sky-600 font-medium">View all →</Link>
                </div>
                {upcomingServices.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <p className="text-4xl mb-3">📅</p>
                        <p className="text-slate-500 font-medium">No upcoming services</p>
                        <Link to="/services" className="text-sky-500 text-sm font-medium hover:underline mt-1 inline-block">Schedule a service →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingServices.slice(0, 6).map(s => (
                            <ServiceCard key={s.id} service={s} onStatusUpdate={handleStatusUpdate} />
                        ))}
                    </div>
                )}
            </div>

            {/* Expense charts */}
            <ExpenseChart barData={stats?.byMonth?.reverse()} pieData={stats?.byCategory} />

            {/* Upcoming schedule */}
            {schedules.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-navy-900 mb-4">Maintenance Schedule</h3>
                    <div className="space-y-3">
                        {schedules.slice(0, 5).map(s => {
                            const daysUntil = Math.ceil((new Date(s.next_due) - new Date()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-navy-900">{s.appliance_name}</p>
                                        <p className="text-sm text-slate-500">Every {s.frequency_days} days</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-navy-900">{s.next_due}</p>
                                        <p className={`text-xs font-medium ${daysUntil <= 7 ? 'text-red-500' : daysUntil <= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {daysUntil <= 0 ? 'Overdue!' : `${daysUntil} days left`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

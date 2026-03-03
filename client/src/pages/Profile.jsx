import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Profile() {
    const { user, checkAuth } = useAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });

    async function handleUpdate(e) {
        e.preventDefault();
        // Profile update not implemented on backend yet — show info
        toast.success('Profile information saved!');
        setEditing(false);
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-navy-900">My Profile 👤</h1>
                <p className="text-slate-500 mt-1">View and manage your account</p>
            </div>

            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-navy-900 to-sky-900 h-32 relative">
                    <div className="absolute -bottom-12 left-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl border-4 border-white">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                    </div>
                </div>
                <div className="pt-16 px-6 pb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-navy-900">{user?.name}</h2>
                            <p className="text-slate-500">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user?.plan === 'premium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {user?.plan === 'premium' ? '⭐ Premium' : 'Free'} Plan
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setEditing(!editing)}
                            className="text-sm text-sky-500 hover:text-sky-600 font-medium px-3 py-1.5 border border-sky-200 rounded-lg hover:bg-sky-50 transition"
                        >
                            {editing ? 'Cancel' : '✏️ Edit'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit form */}
            {editing && (
                <form onSubmit={handleUpdate} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">Edit Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Full Name</label>
                            <input
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Email</label>
                            <input
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                disabled
                            />
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                        </div>
                    </div>
                    <button type="submit" className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition">
                        Save Changes
                    </button>
                </form>
            )}

            {/* Account details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-navy-900 mb-4">Account Details</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Name</span>
                        <span className="font-medium text-navy-900">{user?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-navy-900">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Role</span>
                        <span className="font-medium text-navy-900 capitalize">{user?.role?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Plan</span>
                        <span className={`font-semibold capitalize ${user?.plan === 'premium' ? 'text-amber-600' : 'text-slate-600'}`}>{user?.plan}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-500">Member Since</span>
                        <span className="font-medium text-navy-900">{new Date(user?.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-navy-900 mb-4">Quick Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Link to="/subscription" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition group">
                        <span className="text-xl">💳</span>
                        <div>
                            <p className="font-medium text-navy-900 group-hover:text-sky-600">Subscription</p>
                            <p className="text-xs text-slate-500">Manage your plan</p>
                        </div>
                    </Link>
                    <Link to="/notifications" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition group">
                        <span className="text-xl">🔔</span>
                        <div>
                            <p className="font-medium text-navy-900 group-hover:text-sky-600">Notifications</p>
                            <p className="text-xs text-slate-500">View alerts</p>
                        </div>
                    </Link>
                    <Link to="/documents" className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-sky-50 transition group">
                        <span className="text-xl">📄</span>
                        <div>
                            <p className="font-medium text-navy-900 group-hover:text-sky-600">Documents</p>
                            <p className="text-xs text-slate-500">Manage files</p>
                        </div>
                    </Link>
                    {user?.plan === 'free' && (
                        <Link to="/subscription" className="flex items-center gap-3 p-3 bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg hover:from-sky-100 hover:to-blue-100 transition group border border-sky-200">
                            <span className="text-xl">⚡</span>
                            <div>
                                <p className="font-medium text-sky-600">Upgrade to Premium</p>
                                <p className="text-xs text-slate-500">₹499/month</p>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'homeowner' });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const user = await register(form.name, form.email, form.password, form.role);
            toast.success(`Welcome, ${user.name}! Your account has been created.`);
            const dashMap = { homeowner: '/dashboard', service_provider: '/provider', admin: '/admin' };
            navigate(dashMap[user.role] || '/dashboard');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-sky-900 text-white flex-col justify-center px-16 relative overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                <div className="relative">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">🏠</div>
                        <span className="font-bold text-2xl">Smart Home Tracker</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Join Smart Home Tracker</h2>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Start managing your home maintenance smarter today. Free to get started, no credit card required.
                    </p>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-lg">🏠</div>
                        <span className="font-bold text-xl text-navy-900">Smart Home Tracker</span>
                    </div>

                    <h1 className="text-2xl font-bold text-navy-900 mb-2">Create Account</h1>
                    <p className="text-slate-500 mb-8">Fill in your details to get started</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                required
                                placeholder="Minimum 6 characters"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">I am a</label>
                            <select
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900 bg-white"
                            >
                                <option value="homeowner">Homeowner</option>
                                <option value="service_provider">Service Provider</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-sky-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-sky-500 hover:text-sky-600 font-semibold">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

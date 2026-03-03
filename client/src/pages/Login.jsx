import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const user = await login(email, password);
            toast.success(`Welcome back, ${user.name}!`);
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
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-sky-900 text-white flex-col justify-center px-12 relative overflow-hidden">
                <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">🏠</div>
                        <span className="font-bold text-2xl">Smart Home Tracker</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Your Home, Intelligently Managed</h2>
                    <p className="text-slate-300 text-base leading-relaxed mb-6">
                        Smart Home Tracker is a comprehensive platform to manage all your home maintenance needs — from tracking appliances and scheduling services to managing vendors and analyzing expenses. Powered by AI insights.
                    </p>

                    {/* Key features */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {[
                            { icon: '📅', text: 'Service Scheduling' },
                            { icon: '🤖', text: 'AI Predictions' },
                            { icon: '📊', text: 'Expense Analytics' },
                            { icon: '👷', text: 'Vendor Management' },
                            { icon: '📄', text: 'Document Storage' },
                            { icon: '🔔', text: 'Smart Reminders' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                                <span className="text-base">{f.icon}</span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Pricing comparison */}
                    <div className="border-t border-slate-700 pt-6">
                        <h3 className="font-bold text-lg mb-4">Choose Your Plan</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Free */}
                            <div className="bg-white/5 border border-slate-700 rounded-xl p-4">
                                <p className="font-bold text-base mb-1">Free</p>
                                <p className="text-2xl font-extrabold text-white mb-2">₹0<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                                <ul className="space-y-1.5">
                                    {['2 properties', '5 service logs', 'Basic scheduling', 'Document uploads'].map((f, i) => (
                                        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <span className="text-emerald-400">✓</span>{f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* Premium */}
                            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 relative">
                                <div className="absolute -top-2 right-3 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</div>
                                <p className="font-bold text-base mb-1 text-sky-300">Premium</p>
                                <p className="text-2xl font-extrabold text-white mb-2">₹499<span className="text-xs text-slate-400 font-normal">/mo</span></p>
                                <ul className="space-y-1.5">
                                    {['Unlimited everything', 'AI-powered insights', 'Cost forecasting', 'Priority support'].map((f, i) => (
                                        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                                            <span className="text-sky-400">✓</span>{f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-lg">🏠</div>
                        <span className="font-bold text-xl text-navy-900">Smart Home Tracker</span>
                    </div>

                    <h1 className="text-2xl font-bold text-navy-900 mb-2">Sign In</h1>
                    <p className="text-slate-500 mb-8">Enter your credentials to access your account</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-navy-900"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-sky-500 hover:text-sky-600 font-semibold">Create one</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

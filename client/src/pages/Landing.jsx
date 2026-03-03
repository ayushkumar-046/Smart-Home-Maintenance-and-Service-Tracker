import { Link } from 'react-router-dom';
import { HiOutlineLightningBolt, HiOutlineShieldCheck, HiOutlineChartBar, HiOutlineCheck } from 'react-icons/hi';

export default function Landing() {
    return (
        <div className="min-h-screen bg-navy-900 text-white">
            {/* Hero */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-sky-900 opacity-90"></div>
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                </div>

                <nav className="relative flex items-center justify-between px-6 md:px-12 py-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                            🏠
                        </div>
                        <span className="font-bold text-xl">Smart Home Tracker</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-slate-300 hover:text-white transition font-medium px-4 py-2">Login</Link>
                        <Link to="/register" className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-lg shadow-sky-500/25">
                            Get Started
                        </Link>
                    </div>
                </nav>

                <div className="relative px-6 md:px-12 py-20 md:py-32 max-w-6xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-6">
                        <HiOutlineLightningBolt className="w-4 h-4 text-sky-400" />
                        <span className="text-sm text-sky-300 font-medium">AI-Powered Home Maintenance</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
                        Never Miss a <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">Home Maintenance</span> Again
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
                        Track appliances, schedule services, manage vendors, and get AI-powered insights
                        to keep your home running perfectly.
                    </p>
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link to="/register" className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition shadow-xl shadow-sky-500/30 hover:shadow-sky-400/40">
                            Start Free Trial
                        </Link>
                        <a href="#pricing" className="border border-slate-600 hover:border-slate-400 text-white px-8 py-3.5 rounded-xl font-semibold transition">
                            View Pricing
                        </a>
                    </div>
                </div>
            </header>

            {/* Features */}
            <section className="py-20 px-6 md:px-12 bg-navy-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Comprehensive tools to manage your entire home maintenance lifecycle.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: '🏠', title: 'Property Management', desc: 'Manage multiple properties, track appliances, and monitor their lifecycle stages.' },
                            { icon: '📅', title: 'Smart Scheduling', desc: 'Set service frequencies, get automated reminders, and never miss maintenance dates.' },
                            { icon: '📊', title: 'Expense Analytics', desc: 'Track costs by category and month, visualize spending patterns with charts.' },
                            { icon: '🤖', title: 'AI Predictions', desc: 'Get predictive maintenance alerts, cost forecasts, and anomaly detection.' },
                            { icon: '👷', title: 'Vendor Management', desc: 'Rate vendors, get AI recommendations, and manage your service provider network.' },
                            { icon: '📄', title: 'Document Storage', desc: 'Upload warranties, invoices, and service reports. Everything in one place.' }
                        ].map((f, i) => (
                            <div key={i} className="bg-navy-900/50 border border-slate-700/50 rounded-2xl p-6 hover:border-sky-500/30 transition group">
                                <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                                    {f.icon}
                                </div>
                                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-20 px-6 md:px-12 bg-navy-900">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
                        <p className="text-slate-400">Start free, upgrade when you need more.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Free */}
                        <div className="bg-navy-800 border border-slate-700 rounded-2xl p-8">
                            <h3 className="font-bold text-xl mb-1">Free</h3>
                            <p className="text-slate-400 text-sm mb-6">For getting started</p>
                            <div className="text-4xl font-extrabold mb-6">₹0<span className="text-lg text-slate-500 font-normal">/month</span></div>
                            <ul className="space-y-3 mb-8">
                                {['Up to 2 properties', 'Up to 5 service logs', 'Basic scheduling', 'Document uploads', 'Email reminders'].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <HiOutlineCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                        <span className="text-slate-300">{f}</span>
                                    </li>
                                ))}
                                {['AI Insights', 'Unlimited properties', 'Unlimited services'].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm opacity-50">
                                        <span className="w-5 h-5 text-center text-slate-600">✕</span>
                                        <span className="text-slate-500">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="block text-center border border-slate-600 hover:border-white text-white py-3 rounded-xl font-semibold transition">
                                Get Started
                            </Link>
                        </div>

                        {/* Premium */}
                        <div className="bg-gradient-to-br from-sky-500/10 to-blue-600/10 border-2 border-sky-500 rounded-2xl p-8 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                RECOMMENDED
                            </div>
                            <h3 className="font-bold text-xl mb-1">Premium</h3>
                            <p className="text-sky-300 text-sm mb-6">For serious homeowners</p>
                            <div className="text-4xl font-extrabold mb-1">₹499<span className="text-lg text-slate-400 font-normal">/month</span></div>
                            <p className="text-sm text-slate-400 mb-6">Unlock all AI features</p>
                            <ul className="space-y-3 mb-8">
                                {['Unlimited properties', 'Unlimited service logs', 'AI Predictive Maintenance', 'AI Cost Forecasting', 'AI Anomaly Detection', 'AI Vendor Recommendations', 'Priority email support', 'PDF reports & receipts'].map((f, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <HiOutlineCheck className="w-5 h-5 text-sky-400 flex-shrink-0" />
                                        <span className="text-slate-200">{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="block text-center bg-sky-500 hover:bg-sky-400 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-sky-500/25">
                                Start Premium
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-500 text-sm">
                <p>© 2026 Smart Home Tracker. All rights reserved.</p>
            </footer>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCheck, HiOutlineLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Subscription() {
    const { user, checkAuth } = useAuth();
    const [searchParams] = useSearchParams();
    const [subscription, setSubscription] = useState(null);
    const [limits, setLimits] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    useEffect(() => { fetchSubscription(); }, []);

    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            toast.success('🎉 Premium subscription activated!');
            checkAuth();
            fetchSubscription();
        }
        if (searchParams.get('cancelled') === 'true') {
            toast.error('Checkout cancelled.');
        }
    }, [searchParams]);

    async function fetchSubscription() {
        try {
            const { data } = await axios.get('/api/subscriptions');
            setSubscription(data.subscription);
            setLimits(data.limits);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    async function handleCheckout() {
        setCheckoutLoading(true);
        try {
            const { data } = await axios.post('/api/subscriptions/checkout');
            if (data.mock) {
                toast.success('🎉 Premium activated (development mode)!');
                checkAuth();
                fetchSubscription();
            } else if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
        finally { setCheckoutLoading(false); }
    }

    async function handleMockActivate() {
        try {
            await axios.post('/api/subscriptions/activate-mock');
            toast.success('Premium activated!');
            checkAuth();
            fetchSubscription();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    }

    async function downloadReceipt(subId) {
        try {
            const response = await axios.get(`/api/subscriptions/receipt/${subId}`, { responseType: 'arraybuffer' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipt_${subId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
            toast.success('Receipt opened as PDF!');
        } catch (err) {
            console.error('Receipt error:', err);
            toast.error('Failed to download receipt');
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const isPremium = user?.plan === 'premium';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-navy-900">Subscription 💳</h1>
                <p className="text-slate-500 mt-1">Manage your plan and billing</p>
            </div>

            {/* Current plan */}
            <div className={`rounded-xl border-2 p-6 ${isPremium ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-500' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-navy-900">{isPremium ? '⭐ Premium Plan' : 'Free Plan'}</h2>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isPremium ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                                {isPremium ? 'Active' : 'Current'}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm">{isPremium ? 'Unlimited access to all features' : 'Limited access with basic features'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-extrabold text-navy-900">{isPremium ? '₹499' : '₹0'}</p>
                        <p className="text-sm text-slate-500">/month</p>
                    </div>
                </div>

                {limits && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-white/60 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">Properties</p>
                            <p className="font-bold text-navy-900">{limits.maxProperties}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">Service Logs</p>
                            <p className="font-bold text-navy-900">{limits.maxServiceLogs}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">AI Features</p>
                            <p className="font-bold text-navy-900">{limits.aiFeatures ? '✅' : '❌'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Upgrade section */}
            {!isPremium && (
                <div className="bg-gradient-to-br from-navy-900 to-sky-900 rounded-2xl p-8 text-white">
                    <div className="flex items-center gap-2 mb-3">
                        <HiOutlineLightningBolt className="w-6 h-6 text-sky-400" />
                        <h3 className="text-xl font-bold">Upgrade to Premium</h3>
                    </div>
                    <p className="text-slate-300 mb-6">Unlock the full power of Smart Home Tracker</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {['Unlimited properties & service logs', 'AI Predictive Maintenance', 'AI Cost Forecasting', 'AI Anomaly Detection', 'AI Vendor Recommendations', 'Lifespan Optimization Tips', 'PDF Reports & Receipts', 'Priority Email Support'].map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <HiOutlineCheck className="w-5 h-5 text-sky-400 flex-shrink-0" />
                                <span className="text-sm text-slate-200">{f}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={handleCheckout}
                            disabled={checkoutLoading}
                            className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-sky-500/30 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {checkoutLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                            {checkoutLoading ? 'Processing...' : 'Subscribe — ₹499/mo'}
                        </button>
                        <button
                            onClick={handleMockActivate}
                            className="border border-slate-500 hover:border-white text-white px-6 py-3 rounded-xl font-semibold transition text-sm"
                        >
                            🧪 Activate (Dev Mode)
                        </button>
                    </div>
                </div>
            )}

            {/* Subscription history */}
            {subscription && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-navy-900 mb-4">Subscription Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-medium capitalize">{subscription.plan}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span>
                            <span className={`font-medium ${subscription.status === 'active' ? 'text-emerald-600' : subscription.status === 'payment_failed' ? 'text-red-600' : 'text-slate-600'}`}>{subscription.status}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-slate-500">Start Date</span><span className="font-medium">{subscription.start_date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">End Date</span><span className="font-medium">{subscription.end_date}</span></div>
                    </div>
                    <button onClick={() => downloadReceipt(subscription.id)} className="mt-4 text-sky-500 hover:text-sky-600 text-sm font-medium">
                        📄 Download Receipt PDF
                    </button>
                </div>
            )}
        </div>
    );
}

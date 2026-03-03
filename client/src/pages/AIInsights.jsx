import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AIInsights() {
    const { user } = useAuth();
    const [appliances, setAppliances] = useState([]);
    const [selectedAppliance, setSelectedAppliance] = useState('');
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [results, setResults] = useState({});
    const [activeTab, setActiveTab] = useState('predict');

    useEffect(() => { fetchAppliances(); }, []);

    async function fetchAppliances() {
        try {
            const { data } = await axios.get('/api/appliances');
            setAppliances(data.appliances);
            if (data.appliances.length > 0) setSelectedAppliance(data.appliances[0].id);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    async function runAI(endpoint, body) {
        setAiLoading(true);
        try {
            const { data } = await axios.post(`/api/ai/${endpoint}`, body);
            setResults(prev => ({ ...prev, [endpoint]: data }));
        } catch (err) {
            if (err.response?.data?.upgrade_required) {
                toast.error('Premium subscription required for AI features');
            } else {
                toast.error(err.response?.data?.error || 'AI analysis failed');
            }
        } finally { setAiLoading(false); }
    }

    const isPremium = user?.plan === 'premium' || user?.role === 'admin';

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">🔒</div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-3">AI Insights — Premium Feature</h2>
                    <p className="text-slate-500 mb-6">
                        Unlock AI-powered predictive maintenance, cost forecasting, anomaly detection, vendor recommendations, and lifespan optimization.
                    </p>
                    <Link to="/subscription" className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition inline-block">
                        ⚡ Upgrade to Premium
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: 'predict', label: '🔮 Predictive Maintenance', desc: 'Predict next breakdown' },
        { key: 'cost-forecast', label: '💰 Cost Forecast', desc: 'Estimate future costs' },
        { key: 'anomaly', label: '🚨 Anomaly Detection', desc: 'Detect unusual patterns' },
        { key: 'recommend-vendor', label: '👷 Vendor Recommendation', desc: 'Find best vendors' },
        { key: 'optimize', label: '🔧 Lifespan Optimization', desc: 'Extend appliance life' },
    ];

    const selectedApp = appliances.find(a => a.id === Number(selectedAppliance));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-navy-900">AI Insights 🤖</h1>
                <p className="text-slate-500 mt-1">AI-powered analysis for your home maintenance</p>
            </div>

            {/* Appliance selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <label className="block text-sm font-medium text-navy-900 mb-2">Select Appliance</label>
                <select value={selectedAppliance} onChange={e => setSelectedAppliance(e.target.value)} className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                    {appliances.map(a => <option key={a.id} value={a.id}>{a.name} — {a.property_name} ({a.category})</option>)}
                </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === t.key ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Action */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-navy-900">{tabs.find(t => t.key === activeTab)?.label}</h3>
                        <p className="text-sm text-slate-500">{tabs.find(t => t.key === activeTab)?.desc}</p>
                    </div>
                    <button
                        onClick={() => {
                            if (activeTab === 'recommend-vendor' && selectedApp) {
                                runAI(activeTab, { category: selectedApp.category });
                            } else {
                                runAI(activeTab, { appliance_id: Number(selectedAppliance) });
                            }
                        }}
                        disabled={aiLoading || !selectedAppliance}
                        className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-5 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {aiLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                        {aiLoading ? 'Analyzing...' : '✨ Run Analysis'}
                    </button>
                </div>

                {/* Results */}
                {results[activeTab] && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-sky-50 rounded-xl border border-sky-100 animate-fade-in">
                        {!results[activeTab].ai_powered && (
                            <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 inline-block">
                                ⚠️ Using estimated data. Configure OpenAI API key for AI-powered results.
                            </div>
                        )}

                        {activeTab === 'predict' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <p className="text-xs text-slate-500">Predicted Date</p>
                                        <p className="text-lg font-bold text-navy-900">{results[activeTab].predicted_date}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <p className="text-xs text-slate-500">Confidence</p>
                                        <p className={`text-lg font-bold ${results[activeTab].confidence === 'high' ? 'text-emerald-600' : results[activeTab].confidence === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>{results[activeTab].confidence?.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-1">Recommendation</p>
                                    <p className="text-sm text-navy-900">{results[activeTab].recommendation}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cost-forecast' && (
                            <div className="space-y-3">
                                {results[activeTab].forecasts?.map((f, i) => (
                                    <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-navy-900">{f.service}</p>
                                            <p className="text-xs text-slate-500">{f.timeframe}</p>
                                        </div>
                                        <p className="text-lg font-bold text-sky-600">₹{f.estimated_cost}</p>
                                    </div>
                                ))}
                                {results[activeTab].summary && (
                                    <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border">{results[activeTab].summary}</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'anomaly' && (
                            <div className={`p-4 rounded-lg border ${results[activeTab].anomaly_detected ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{results[activeTab].anomaly_detected ? '🚨' : '✅'}</span>
                                    <h4 className="font-bold">{results[activeTab].anomaly_detected ? 'Anomaly Detected!' : 'No Anomaly Detected'}</h4>
                                </div>
                                <p className="text-sm">{results[activeTab].explanation}</p>
                                {results[activeTab].recommendation && <p className="text-sm mt-2 font-medium">{results[activeTab].recommendation}</p>}
                            </div>
                        )}

                        {activeTab === 'recommend-vendor' && (
                            <div className="space-y-3">
                                {results[activeTab].recommendations?.map((r, i) => (
                                    <div key={i} className="bg-white rounded-lg p-4 border border-slate-200 flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>#{r.rank}</div>
                                        <div>
                                            <p className="font-semibold text-navy-900">{r.vendor_name}</p>
                                            <p className="text-sm text-slate-500">⭐ {r.rating} • {r.total_jobs} jobs</p>
                                            <p className="text-sm text-slate-600 mt-1">{r.reasoning}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'optimize' && (
                            <div className="space-y-3">
                                <div className="bg-white rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs text-slate-500 mb-2">Tips to Extend Lifespan</p>
                                    <ul className="space-y-1.5">
                                        {results[activeTab].tips?.map((tip, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm"><span className="text-sky-500 mt-0.5">•</span><span>{tip}</span></li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <p className="text-xs text-slate-500">Estimated Remaining Life</p>
                                        <p className="text-lg font-bold text-sky-600">{results[activeTab].estimated_remaining_life}</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                                        <p className="text-xs text-slate-500">Replacement</p>
                                        <p className="text-sm text-navy-900">{results[activeTab].replacement_recommendation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

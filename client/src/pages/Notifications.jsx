import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => { fetchNotifications(); }, []);

    async function fetchNotifications() {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    async function markRead(id) {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            fetchNotifications();
        } catch { }
    }

    async function markAllRead() {
        try {
            await axios.put('/api/notifications/read-all');
            toast.success('All marked as read');
            fetchNotifications();
        } catch { toast.error('Failed'); }
    }

    async function deleteNotification(id) {
        try {
            await axios.delete(`/api/notifications/${id}`);
            fetchNotifications();
        } catch { toast.error('Failed'); }
    }

    const typeIcon = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', reminder: '⏰' };
    const typeColor = {
        success: 'border-l-emerald-500 bg-emerald-50/30', warning: 'border-l-amber-500 bg-amber-50/30',
        error: 'border-l-red-500 bg-red-50/30', info: 'border-l-sky-500 bg-sky-50/30', reminder: 'border-l-purple-500 bg-purple-50/30'
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Notifications 🔔</h1>
                    <p className="text-slate-500 mt-1">
                        {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-sm text-sky-500 hover:text-sky-600 font-medium px-3 py-1.5 rounded-lg hover:bg-sky-50 transition">
                        ✓ Mark all read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">🔔</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No notifications</h3>
                    <p className="text-slate-500">You're all caught up! Notifications will appear here.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => (
                        <div
                            key={n.id}
                            className={`bg-white rounded-xl border border-slate-200 border-l-4 p-4 hover:shadow-md transition cursor-pointer ${typeColor[n.type] || 'border-l-slate-300'} ${!n.read ? 'shadow-sm' : 'opacity-75'}`}
                            onClick={() => !n.read && markRead(n.id)}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon[n.type] || 'ℹ️'}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-semibold ${!n.read ? 'text-navy-900' : 'text-slate-600'}`}>{n.title}</h3>
                                        {!n.read && <span className="w-2 h-2 bg-sky-500 rounded-full flex-shrink-0"></span>}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                                    <p className="text-xs text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}
                                    className="text-slate-400 hover:text-red-500 transition text-sm p-1"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

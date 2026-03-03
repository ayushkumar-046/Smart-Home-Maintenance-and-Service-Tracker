import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { HiOutlineBell } from 'react-icons/hi';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function fetchNotifications() {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data.notifications.slice(0, 5));
            setUnreadCount(data.unreadCount);
        } catch { }
    }

    async function markRead(id) {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            fetchNotifications();
        } catch { }
    }

    const typeIcon = {
        success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', reminder: '⏰'
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition"
            >
                <HiOutlineBell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-glow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-fade-in overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-semibold text-navy-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-semibold">{unreadCount} new</span>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-400">
                                <HiOutlineBell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer ${!n.read ? 'bg-sky-50/50' : ''}`}
                                    onClick={() => markRead(n.id)}
                                >
                                    <div className="flex gap-2">
                                        <span className="text-sm flex-shrink-0">{typeIcon[n.type] || 'ℹ️'}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!n.read ? 'font-semibold text-navy-900' : 'text-slate-700'}`}>{n.title}</p>
                                            <p className="text-xs text-slate-500 truncate">{n.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                        </div>
                                        {!n.read && <div className="w-2 h-2 bg-sky-500 rounded-full mt-1.5 flex-shrink-0"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Link
                        to="/notifications"
                        onClick={() => setOpen(false)}
                        className="block p-2 text-center text-sm text-sky-600 hover:text-sky-700 font-medium hover:bg-sky-50 transition"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}

import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineHome, HiOutlineOfficeBuilding, HiOutlineCog, HiOutlineClipboardList, HiOutlineCalendar, HiOutlineDocumentText, HiOutlineLightningBolt, HiOutlineCreditCard, HiOutlineBell, HiOutlineUserGroup, HiOutlineChartBar, HiOutlineTruck } from 'react-icons/hi';
import { useState } from 'react';

export default function Sidebar() {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    const homeownerLinks = [
        { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/properties', icon: HiOutlineOfficeBuilding, label: 'Properties' },
        { to: '/appliances', icon: HiOutlineCog, label: 'Appliances' },
        { to: '/services', icon: HiOutlineClipboardList, label: 'Service Log' },
        { to: '/schedules', icon: HiOutlineCalendar, label: 'Schedules' },
        { to: '/documents', icon: HiOutlineDocumentText, label: 'Documents' },
        { to: '/ai-insights', icon: HiOutlineLightningBolt, label: 'AI Insights', premium: true },
        { to: '/subscription', icon: HiOutlineCreditCard, label: 'Subscription' },
        { to: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
    ];

    const providerLinks = [
        { to: '/provider', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/services', icon: HiOutlineClipboardList, label: 'My Jobs' },
        { to: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
    ];

    const adminLinks = [
        { to: '/admin', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/properties', icon: HiOutlineOfficeBuilding, label: 'Properties' },
        { to: '/appliances', icon: HiOutlineCog, label: 'Appliances' },
        { to: '/services', icon: HiOutlineClipboardList, label: 'Services' },
        { to: '/schedules', icon: HiOutlineCalendar, label: 'Schedules' },
        { to: '/documents', icon: HiOutlineDocumentText, label: 'Documents' },
        { to: '/subscription', icon: HiOutlineCreditCard, label: 'Subscriptions' },
        { to: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
    ];

    const links = user?.role === 'admin' ? adminLinks : user?.role === 'service_provider' ? providerLinks : homeownerLinks;

    return (
        <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-navy-900 text-white flex flex-col transition-all duration-300 hidden md:flex`}>
            <div className="p-4 border-b border-slate-700">
                <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'service_provider' ? '/provider' : '/dashboard'} className="flex items-center gap-3 hover:opacity-80 transition">
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                        🏠
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Smart Home</h1>
                            <p className="text-xs text-sky-400">Maintenance Tracker</p>
                        </div>
                    )}
                </Link>
            </div>

            <button
                onClick={() => setCollapsed(!collapsed)}
                className="mx-2 mt-2 p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition text-xs"
            >
                {collapsed ? '→' : '← Collapse'}
            </button>

            <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium group ${isActive
                                ? 'bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/10'
                                : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                            }`
                        }
                    >
                        <link.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <>
                                <span>{link.label}</span>
                                {link.premium && user?.plan === 'free' && (
                                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">PRO</span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {
                !collapsed && (
                    <div className="p-4 border-t border-slate-700">
                        <div className="bg-navy-800 rounded-xl p-3">
                            <p className="text-xs text-slate-400">Logged in as</p>
                            <p className="text-sm font-semibold truncate">{user?.name}</p>
                            <p className="text-xs text-sky-400 capitalize">{user?.plan} Plan</p>
                        </div>
                    </div>
                )
            }
        </aside >
    );
}

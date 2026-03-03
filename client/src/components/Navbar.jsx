import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { HiOutlineSearch } from 'react-icons/hi';

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3 flex-1">
                <div className="relative hidden md:block">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent w-64 transition"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <NotificationBell />

                <div className="flex items-center gap-3">
                    <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-semibold text-navy-900">{user?.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')} • {user?.plan}</p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                    </Link>
                    <button
                        onClick={logout}
                        className="text-sm text-slate-500 hover:text-red-500 transition font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

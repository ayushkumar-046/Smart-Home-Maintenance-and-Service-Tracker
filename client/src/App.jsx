import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import HomeownerDashboard from './pages/HomeownerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Properties from './pages/Properties';
import Appliances from './pages/Appliances';
import ServiceLog from './pages/ServiceLog';
import Schedules from './pages/Schedules';
import Documents from './pages/Documents';
import AIInsights from './pages/AIInsights';
import Subscription from './pages/Subscription';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const dashMap = { homeowner: '/dashboard', service_provider: '/provider', admin: '/admin' };
        return <Navigate to={dashMap[user.role] || '/dashboard'} replace />;
    }
    return children;
}

function DashboardLayout({ children }) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
                    <div className="animate-fade-in">{children}</div>
                </main>
            </div>
        </div>
    );
}

export default function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={user ? <Navigate to={
                user.role === 'admin' ? '/admin' : user.role === 'service_provider' ? '/provider' : '/dashboard'
            } replace /> : <Landing />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

            <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['homeowner']}>
                    <DashboardLayout><HomeownerDashboard /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/provider" element={
                <ProtectedRoute allowedRoles={['service_provider']}>
                    <DashboardLayout><ProviderDashboard /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout><AdminDashboard /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/properties" element={
                <ProtectedRoute allowedRoles={['homeowner', 'admin']}>
                    <DashboardLayout><Properties /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/appliances" element={
                <ProtectedRoute allowedRoles={['homeowner', 'admin']}>
                    <DashboardLayout><Appliances /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/services" element={
                <ProtectedRoute>
                    <DashboardLayout><ServiceLog /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/schedules" element={
                <ProtectedRoute allowedRoles={['homeowner', 'admin']}>
                    <DashboardLayout><Schedules /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/documents" element={
                <ProtectedRoute>
                    <DashboardLayout><Documents /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
                <ProtectedRoute allowedRoles={['homeowner', 'admin']}>
                    <DashboardLayout><AIInsights /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/subscription" element={
                <ProtectedRoute>
                    <DashboardLayout><Subscription /></DashboardLayout>
                </ProtectedRoute>
            } />
            <Route path="/notifications" element={
                <ProtectedRoute>
                    <DashboardLayout><Notifications /></DashboardLayout>
                </ProtectedRoute>
            } />

            <Route path="/profile" element={
                <ProtectedRoute>
                    <DashboardLayout><Profile /></DashboardLayout>
                </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

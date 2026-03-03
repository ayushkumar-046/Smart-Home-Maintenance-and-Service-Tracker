import { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const initialState = {
    user: null,
    loading: true,
    error: null
};

function authReducer(state, action) {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload, loading: false, error: null };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'LOGOUT':
            return { ...state, user: null, loading: false, error: null };
        case 'UPDATE_PLAN':
            return { ...state, user: state.user ? { ...state.user, plan: action.payload } : null };
        default:
            return state;
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        checkAuth();
    }, []);

    // Session timeout - refresh every 25 min
    useEffect(() => {
        if (!state.user) return;
        const interval = setInterval(() => {
            axios.put('/api/auth/refresh').catch(() => {
                dispatch({ type: 'LOGOUT' });
            });
        }, 25 * 60 * 1000);
        return () => clearInterval(interval);
    }, [state.user]);

    async function checkAuth() {
        try {
            const { data } = await axios.get('/api/auth/me');
            dispatch({ type: 'SET_USER', payload: data.user });
        } catch {
            dispatch({ type: 'SET_USER', payload: null });
        }
    }

    async function login(email, password) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const { data } = await axios.post('/api/auth/login', { email, password });
            dispatch({ type: 'SET_USER', payload: data.user });
            return data.user;
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            dispatch({ type: 'SET_ERROR', payload: msg });
            throw new Error(msg);
        }
    }

    async function register(name, email, password, role) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const { data } = await axios.post('/api/auth/register', { name, email, password, role });
            dispatch({ type: 'SET_USER', payload: data.user });
            return data.user;
        } catch (err) {
            const msg = err.response?.data?.error || 'Registration failed';
            dispatch({ type: 'SET_ERROR', payload: msg });
            throw new Error(msg);
        }
    }

    async function logout() {
        try {
            await axios.post('/api/auth/logout');
        } catch { }
        dispatch({ type: 'LOGOUT' });
    }

    function updatePlan(plan) {
        dispatch({ type: 'UPDATE_PLAN', payload: plan });
    }

    return (
        <AuthContext.Provider value={{ ...state, login, register, logout, updatePlan, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export default AuthContext;

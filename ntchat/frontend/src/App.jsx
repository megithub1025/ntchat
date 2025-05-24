import React from 'react';
import { Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage'; 
import ChatPage from './pages/ChatPage';
import OrganizationPage from './pages/OrganizationPage'; // Import OrganizationPage
import authService from './services/authService';
import './App.css';

// Simple ProtectedRoute component
const ProtectedRoute = ({ children }) => {
    const token = authService.getCurrentUserToken();
    if (!token) {
        // User not authenticated, redirect to login
        return <Navigate to="/login" replace />;
    }
    return children;
};


function App() {
    // This is a simple way to force re-render on login/logout for nav updates.
    // A more robust solution might use context or a state management library.
    const [isAuthenticated, setIsAuthenticated] = React.useState(!!authService.getCurrentUserToken());

    const handleLogout = () => {
        authService.logout();
        setIsAuthenticated(false);
        // Navigation to /login will be handled by ProtectedRoute or manually if needed
    };
    
    // Effect to update isAuthenticated state if token changes (e.g. after login)
    // This is a bit of a hack; a proper global state for auth is better.
    React.useEffect(() => {
        const checkAuth = () => setIsAuthenticated(!!authService.getCurrentUserToken());
        // Listen for storage changes or custom events if you want to be more reactive
        window.addEventListener('storage', checkAuth); // Basic check, might not cover all cases
        
        // Simulate a login event listener for this simple example
        const handleLoginEvent = ()_ => checkAuth();
        window.addEventListener('loginEvent', handleLoginEvent);


        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('loginEvent', handleLoginEvent);
        };
    }, []);


    return (
        <>
            <nav>
                <ul>
                    <li><Link to="/">Home</Link></li>
                    {isAuthenticated && <li><Link to="/chat">Chat</Link></li>}
                    {isAuthenticated && <li><Link to="/organization">Organization</Link></li>}
                    {!isAuthenticated && <li><Link to="/login">Login</Link></li>}
                    {!isAuthenticated && <li><Link to="/register">Register</Link></li>}
                    {isAuthenticated && (
                        <li>
                            <button onClick={() => {
                                handleLogout();
                                window.location.pathname = "/login"; // Simple redirect
                            }}>Logout</button>
                        </li>
                    )}
                </ul>
            </nav>
            <Routes>
                <Route path="/" element={<HomePage />} /> {/* HomePage can be public or also protected */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route 
                    path="/chat" 
                    element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/organization"
                    element={
                        <ProtectedRoute>
                            <OrganizationPage />
                        </ProtectedRoute>
                    }
                />
                {/* Add other routes here */}
            </Routes>
        </>
    );
}

export default App;

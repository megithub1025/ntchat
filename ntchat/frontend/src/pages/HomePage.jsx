import React from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

function HomePage() {
    const navigate = useNavigate();
    const user = authService.getCurrentUserDetails();
    const token = authService.getCurrentUserToken();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    return (
        <div>
            <h1>Welcome to NTChat</h1>
            {token ? (
                <div>
                    <p>You are logged in.</p>
                    {user && <p>Username: {user.username}</p>}
                    <button onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <div>
                    <p>You are not logged in.</p>
                    <button onClick={() => navigate('/login')}>Login</button>
                    <button onClick={() => navigate('/register')}>Register</button>
                </div>
            )}
        </div>
    );
}

export default HomePage;

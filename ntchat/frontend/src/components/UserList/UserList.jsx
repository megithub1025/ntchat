import React from 'react';

function UserList({ users, title = "Users" }) {
    if (!users || users.length === 0) {
        return (
            <div>
                <h4>{title}</h4>
                <p>No users to display.</p>
            </div>
        );
    }

    return (
        <div>
            <h4>{title}</h4>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {users.map((user) => (
                    <li key={user.id} style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                        <strong>{user.username}</strong> ({user.email})
                        {/* Optional: Button for future direct message functionality */}
                        {/* <button style={{ marginLeft: '10px' }}>DM</button> */}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default UserList;

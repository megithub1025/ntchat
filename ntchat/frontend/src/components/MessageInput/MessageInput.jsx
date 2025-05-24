import React, { useState } from 'react';

function MessageInput({ onSendMessage, disabled = false }) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && onSendMessage) {
            onSendMessage(message.trim());
            setMessage(''); // Clear input after sending
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', padding: '10px', borderTop: '1px solid #ccc' }}>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={disabled ? "Select a room to send messages" : "Type your message..."}
                style={{ flexGrow: 1, marginRight: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                disabled={disabled}
            />
            <button type="submit" style={{ padding: '8px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }} disabled={disabled}>
                Send
            </button>
        </form>
    );
}

export default MessageInput;

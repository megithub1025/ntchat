import React, { useEffect, useRef } from 'react';

function MessageDisplay({ messages = [] }) { // Default to empty array
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); // Scroll when messages change

    if (!messages || messages.length === 0) {
        return (
            <div style={{ border: '1px solid #ccc', padding: '10px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No messages yet, or select a room to start chatting.</p>
            </div>
        );
    }

    return (
        <div style={{ border: '1px solid #ccc', padding: '10px', height: '100%', overflowY: 'scroll' }}>
            {messages.map((msg, index) => (
                <div key={msg.id || index} style={{ marginBottom: '10px', padding: '5px', borderRadius: '5px', backgroundColor: '#f0f0f0' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>
                        {msg.sender_username || msg.senderUsername || 'Unknown User'}
                        <span style={{ fontSize: '0.8em', color: '#555', marginLeft: '10px' }}>
                            {new Date(msg.created_at || msg.createdAt || Date.now()).toLocaleTimeString()}
                        </span>
                    </p>
                    <p style={{ margin: '5px 0 0 0' }}>{msg.content}</p>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageDisplay;

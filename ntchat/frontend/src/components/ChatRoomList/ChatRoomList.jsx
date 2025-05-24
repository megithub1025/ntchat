import React, { useState, useEffect } from 'react';
import chatService from '../../services/chatService';

function ChatRoomList({ onRoomSelect, currentRoomId }) {
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRooms = async () => {
            setIsLoading(true);
            setError('');
            try {
                const fetchedRooms = await chatService.getRooms();
                setRooms(fetchedRooms || []); // Ensure rooms is always an array
                 if (fetchedRooms && fetchedRooms.length > 0 && !currentRoomId) {
                    // Automatically select the first room if none is selected
                    // onRoomSelect(fetchedRooms[0].id); 
                    // Decided against auto-selecting here to let ChatPage manage initial selection logic.
                }
            } catch (err) {
                console.error('Failed to fetch rooms:', err);
                setError(err.message || 'Failed to load rooms.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRooms();
    }, []); // Removed onRoomSelect from dependencies to prevent re-fetch unless rooms list changes

    if (isLoading) {
        return <p>Loading rooms...</p>;
    }

    if (error) {
        return <p style={{ color: 'red' }}>{error}</p>;
    }

    return (
        <div style={{ border: '1px solid #ccc', padding: '10px', height: '100%', overflowY: 'auto' }}>
            <h3>Chat Rooms</h3>
            {rooms.length === 0 && !isLoading && <p>No rooms available.</p>}
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {rooms.map((room) => (
                    <li
                        key={room.id}
                        onClick={() => onRoomSelect(room.id)}
                        style={{
                            padding: '8px',
                            cursor: 'pointer',
                            backgroundColor: room.id === currentRoomId ? '#e0e0e0' : 'transparent',
                            borderBottom: '1px solid #eee'
                        }}
                    >
                        {room.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ChatRoomList;

import React, { useState, useEffect, useCallback } from 'react';
import ChatRoomList from '../components/ChatRoomList/ChatRoomList';
import MessageDisplay from '../components/MessageDisplay/MessageDisplay';
import MessageInput from '../components/MessageInput/MessageInput';
import authService from '../services/authService';
import socketService from '../services/socketService';
import chatService from '../services/chatService'; // Import chatService

const chatPageStyle = {
    display: 'flex',
    height: 'calc(100vh - 50px)', // Adjust based on nav height if App.jsx nav is fixed
    fontFamily: 'Arial, sans-serif'
};

const sidebarStyle = {
    width: '25%',
    borderRight: '1px solid #ccc',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f7f7f7'
};

const mainContentStyle = {
    width: '75%',
    display: 'flex',
    flexDirection: 'column',
    padding: '10px',
};

const messageDisplayContainerStyle = {
    flexGrow: 1,
    marginBottom: '10px',
    overflowY: 'hidden', // MessageDisplay will handle its own scroll
    display: 'flex', // To make MessageDisplay fill height
    flexDirection: 'column'
};

function ChatPage() {
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [error, setError] = useState('');

    // Socket.IO connection
    useEffect(() => {
        const token = authService.getCurrentUserToken();
        if (token) {
            socketService.connect(token);
        } else {
            console.warn('ChatPage: No token found, socket connection not attempted.');
        }

        return () => {
            socketService.disconnect();
        };
    }, []);

    // Socket.IO message listener
    useEffect(() => {
        const socket = socketService.getSocket();
        if (!socket || !currentRoomId) { // Also ensure currentRoomId is set before listening
            console.log('Socket not available or no room selected for message listener setup.');
            return;
        }

        const handleNewMessage = (newMessageData) => {
            console.log('Received new message via socket:', newMessageData);
            
            // Check if the message belongs to the currently active room
            if (newMessageData && newMessageData.room_id && newMessageData.room_id.toString() === currentRoomId.toString()) {
                const displayMessage = {
                    ...newMessageData,
                    sender_username: newMessageData.sender_username || newMessageData.senderUsername,
                    created_at: newMessageData.created_at || newMessageData.createdAt,
                    id: newMessageData.id || `socket-${Date.now()}-${Math.random()}` // Ensure unique key for socket messages
                };
                setMessages((prevMessages) => {
                    // Avoid adding duplicate messages if server broadcasts back to sender and client also adds optimistically
                    if (prevMessages.find(msg => msg.id === displayMessage.id)) {
                        return prevMessages;
                    }
                    return [...prevMessages, displayMessage];
                });
            } else if (newMessageData && !newMessageData.room_id && newMessageData.receiver_id) {
                console.log("Direct message received, not handled in current room view:", newMessageData);
            }
        };
        
        socket.on('newMessage', handleNewMessage);
        socket.on('newDirectMessage', handleNewMessage); // Assuming DMs might also use this event or a similar structure

        return () => {
            if (socket) {
                socket.off('newMessage', handleNewMessage);
                socket.off('newDirectMessage', handleNewMessage);
            }
        };
    }, [currentRoomId]); // Only re-subscribe if currentRoomId changes (socket instance itself is stable)

    const handleRoomSelect = useCallback(async (roomId) => {
        if (roomId === currentRoomId) return;

        console.log(`Switching to room: ${roomId}`);
        setCurrentRoomId(roomId); // Triggers the above useEffect for socket listeners
        setError('');
        setMessages([]); // Clear previous room's messages immediately
        setIsLoadingMessages(true);

        // Optional: Socket.IO room joining/leaving logic
        // const socket = socketService.getSocket();
        // if (socket) {
        //     if (currentRoomId) { // currentRoomId here is the *previous* room ID
        //         socket.emit('leaveRoom', { roomId: currentRoomId });
        //     }
        //     socket.emit('joinRoom', { roomId });
        // }

        try {
            const historicalMessages = await chatService.getMessages(roomId);
            setMessages(historicalMessages.map(msg => ({
                ...msg,
                sender_username: msg.sender_username || msg.senderUsername,
                created_at: msg.created_at || msg.createdAt
            })) || []);
        } catch (err) {
            console.error(`Failed to fetch messages for room ${roomId}:`, err);
            setError(`Failed to load messages for room ${roomId}.`);
            setMessages([]); // Ensure messages is empty on error
        } finally {
            setIsLoadingMessages(false);
        }
    }, [currentRoomId]); // currentRoomId as dependency to correctly reference previous room ID if needed

    const handleSendMessage = (content) => {
        if (!currentRoomId) {
            setError('No room selected. Please select a room to send a message.');
            return;
        }
        if (!content.trim()) return;

        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            const messageData = {
                roomId: currentRoomId,
                content: content.trim(),
                messageType: 'text', // Or derive from input if more types are supported
            };
            socket.emit('sendMessage', messageData, (response) => {
                if (response && response.status === 'ok') {
                    console.log('Message sent successfully and acknowledged by server:', response.data);
                    // Message will be added to state via the 'newMessage' listener
                    // if server broadcasts it back to sender.
                    // If server doesn't broadcast back to sender, add it here:
                    // setMessages((prevMessages) => [...prevMessages, response.data]);
                } else {
                    console.error('Failed to send message or server error:', response ? response.message : 'No response');
                    setError(response ? response.message : 'Failed to send message.');
                }
            });
        } else {
            setError('Socket not connected. Cannot send message.');
            console.error('Socket not connected or available.');
        }
    };

    // Initial loading of rooms (moved to ChatRoomList, ChatPage doesn't need to manage 'rooms' state directly)
    // useEffect(() => {
    //     const fetchInitialRooms = async () => {
    //         try {
    //             const fetchedRooms = await chatService.getRooms();
    //             setRooms(fetchedRooms || []);
    //             // Optionally, select the first room by default
    //             if (fetchedRooms && fetchedRooms.length > 0) {
    //                 // handleRoomSelect(fetchedRooms[0].id); // This would trigger message fetching
    //             }
    //         } catch (err) {
    //             setError('Failed to load initial room list.');
    //         }
    //     };
    //     fetchInitialRooms();
    // }, [handleRoomSelect]);


    return (
        <div style={chatPageStyle}>
            <div style={sidebarStyle}>
                <ChatRoomList onRoomSelect={handleRoomSelect} currentRoomId={currentRoomId} />
            </div>
            <div style={mainContentStyle}>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div style={messageDisplayContainerStyle}>
                    {isLoadingMessages ? <p>Loading messages...</p> : <MessageDisplay messages={messages} />}
                </div>
                <MessageInput onSendMessage={handleSendMessage} disabled={!currentRoomId || isLoadingMessages} />
            </div>
        </div>
    );
}

export default ChatPage;

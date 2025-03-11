import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { io } from 'socket.io-client';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const chatContainerRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('previousMessages', (previousMessages) => {
      setMessages(previousMessages);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const messageData = {
        content: newMessage.trim(),
        sender: user.email,
        timestamp: new Date().toISOString()
      };
      
      socket.emit('message', messageData);
      setNewMessage('');
    }
  };

  return (
    <Card className="h-100">
      <Card.Header>Chat</Card.Header>
      <div 
        ref={chatContainerRef}
        className="chat-container p-3"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.sender === user.email ? 'sent' : 'received'}`}
          >
            <div className="small text-muted mb-1">
              {message.sender === user.email ? 'You' : message.sender}
            </div>
            {message.content}
            <div className="small text-muted mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
      <Card.Footer>
        <Form onSubmit={handleSubmit}>
          <div className="d-flex gap-2">
            <Form.Control
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <Button type="submit" variant="primary">
              Send
            </Button>
          </div>
        </Form>
      </Card.Footer>
    </Card>
  );
}

export default Chat;

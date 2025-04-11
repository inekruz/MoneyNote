import React, { useState} from 'react';
import './css/notification.css';

let showNotification;

export const Notification = () => {
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [visible, setVisible] = useState(false);

    showNotification = (msg, type) => {
        setNotification({ message: msg, type });
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
    };

    return (
        <div className={`notification ${notification.type} ${visible ? 'show' : ''}`}>
            {notification.type === 'success' && '✅'}
            {notification.type === 'error' && '❌'}
            {notification.message}
        </div>
    );
};

export const notif = (msg, type) => {
    if (showNotification) {
        showNotification(msg, type);
    }
};
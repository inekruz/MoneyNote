import React, { useState } from 'react';
import './css/notification.css';


// Вспомогательная переменная для отображения уведомлений из вне
let showNotification;


// Компонент для отображения уведомлений
export const Notification = () => {
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [visible, setVisible] = useState(false);


  // Функция показа уведомления
  showNotification = (msg, type) => {
    setNotification({ message: msg, type });
    setVisible(true);
    setTimeout(() => setVisible(false), 3000); // скрыть через 3 секунды
  };


  return (
    <div className={`notification ${notification.type} ${visible ? 'show' : ''}`}>
      {notification.type === 'success' && '✅'}
      {notification.type === 'error' && '❌'}
      {notification.message}
    </div>
  );
};


// Глобальная функция вызова уведомлений
export const notif = (msg, type) => {
  if (showNotification) {
    showNotification(msg, type);
  }
};

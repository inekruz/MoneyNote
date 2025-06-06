import React, { useState, useEffect } from "react";
import "./css/notification.css";


// Компонент всплывающего окна с уведомлениями
const NotificationPopup = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);


  // Функция для получения уведомлений с сервера
  const fetchNotifications = async () => {
    try {
      const response = await fetch('https://api.minote.ru/ntf/get', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        console.error("Ошибка при получении уведомлений");
      }
    } catch (error) {
      console.error("Ошибка подключения к серверу", error);
    }
  };


  // Функция для отметки уведомлений как прочитанных
  const markNotificationsAsRead = async () => {
    try {
      const response = await fetch('https://api.minote.ru/ntf/read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((note) => ({ ...note, is_read: true })));
      } else {
        console.error("Ошибка при обновлении уведомлений");
      }
    } catch (error) {
      console.error("Ошибка подключения к серверу", error);
    }
  };


  // Вызов функции получения уведомлений и отметки прочитанных при монтировании компонента
  useEffect(() => {
    fetchNotifications();
    markNotificationsAsRead();
  }, []);


  // Функция для удаления уведомлений
  const handleDelete = async (indexToDelete, id) => {
    try {
      const response = await fetch(`https://api.minote.ru/ntf/del/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((_, index) => index !== indexToDelete));
      } else {
        console.error("Ошибка при удалении уведомления");
      }
    } catch (error) {
      console.error("Ошибка подключения к серверу", error);
    }
  };

  return (
    <div className="notification-popup">
      <div className="notification-header">
        <h3>Уведомления</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="notification-list">
        {/* Отображение списка уведомлений */}
        {notifications.map((note, index) => (
          <div className={`notification-item ${note.is_read ? 'read' : 'unread'}`} key={note.id}>
            <div className="notification-content">
              <div className="notification-title">{note.title}</div>
              <div className="notification-description">{note.description}</div>
              <div className="notification-date">{note.date}</div>
            </div>
            <button
              className="delete-button"
              onClick={() => handleDelete(index, note.id)}
              title="Удалить"
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        ))}
        {/* Если уведомлений нет, отображаем текст */}
        {notifications.length === 0 && (
          <div className="no-notifications">Нет новых уведомлений.</div>
        )}
      </div>
    </div>
  );
};

export default NotificationPopup;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserAlt, FaSignOutAlt, FaBell } from "react-icons/fa";
import './css/header.css';

const Header = ({ onToggleNotifications }) => {
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const navigate = useNavigate();

  const fetchNewNotificationsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.minote.ru/ntf/new', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNewNotificationsCount(data.count);
      } else {
        console.error('Ошибка при получении количества новых уведомлений');
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  useEffect(() => {
    fetchNewNotificationsCount();
  }, []);

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  return (
    <header className="header">
      <div className="logo" onClick={() => navigate("/")}>
        MINOTE
      </div>
      <div className="header-buttons">
        <button className="notification-button" onClick={onToggleNotifications}>
          <FaBell />
          {newNotificationsCount > 0 && (
            <span className="notification-count">{newNotificationsCount}</span>
          )}
        </button>
        <button className="profile-button" onClick={handleProfileClick}>
          <FaUserAlt />
        </button>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
};

export default Header;

import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserAlt, FaSignOutAlt } from "react-icons/fa";
import './css/header.css';

const Header = () => {
  const navigate = useNavigate();

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
      <button className="profile-button" onClick={handleProfileClick}>
          <FaUserAlt  />
        </button>
        <button className="logout-button" onClick={handleLogout}>
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
};

export default Header;
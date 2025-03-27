import React from "react";
import { useNavigate } from "react-router-dom";
import './css/home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  return (
    <div className="home-container">
      <h1>Добро пожаловать!</h1>
      <button onClick={handleLogout} className="logout-button">
        Выйти
      </button>
    </div>
  );
};

export default Home;

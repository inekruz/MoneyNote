import React, { useState } from "react";
import Header from "../components/Header";
import NotificationPopup from "./Notification";
import IncomeExpense from "./home_pages/IncomeExp";
import Goals from "./home_pages/Goals";
import Charts from "./home_pages/Charts";
import Reports from "./home_pages/Reports";
import Settings from "./home_pages/Settings";
import './css/home.css';

const Home = () => {
  const [activeTab, setActiveTab] = useState('income');
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'income':
        return <IncomeExpense />;
      case 'goals':
        return <Goals />;
      case 'charts':
        return <Charts />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <div>Выберите опцию из меню</div>;
    }
  };

  return (
    <div className="home-container" style={{ position: "relative" }}>
      <Header onToggleNotifications={toggleNotifications} />
      {showNotifications && <NotificationPopup onClose={toggleNotifications} />}

      <div className="navigation">
        <button onClick={() => setActiveTab('income')}>Доходы & Расходы</button>
        <button onClick={() => setActiveTab('charts')}>Графики</button>
        <button onClick={() => setActiveTab('goals')}>Цели</button>
        <button onClick={() => setActiveTab('reports')}>Отчеты</button>
        <button onClick={() => setActiveTab('settings')}>Настройки</button>
      </div>

      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;
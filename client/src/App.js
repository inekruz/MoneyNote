import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import "./App.css";


// Защищённый маршрут — проверяет наличие токена
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/auth");
    }
  }, [navigate]);

  return children;
};


function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/auth" element={<Auth />} /> {/* Страница авторизации */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} /> {/* Главная */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} /> {/* Профиль */}
        </Routes>
      </div>
    </Router>
  );
}


export default App;

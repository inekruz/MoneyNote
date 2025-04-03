import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import "./App.css";
import AnimatedBackground from './components/AnimatedBackground';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { // !token ( если сервер включен )
      navigate("/auth");
    }
  }, [navigate]);

  return children;
};

function App() {
  return (
    <Router>
      <div className="app">
      <AnimatedBackground />
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
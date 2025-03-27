import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Notification, notif } from './notification';
import './css/auth.css';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const validateLogin = (login) => /^[a-zA-Z0-9_]+$/.test(login);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 6 && password.length <= 30;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegister) {
      if (!validateLogin(identifier)) {
        notif("Логин должен содержать только латинские буквы, цифры и _", "error");
        return;
      }
      if (!validateEmail(email)) {
        notif("Некорректный email", "error");
        return;
      }
      if (!validatePassword(password)) {
        notif("Пароль должен быть от 6 до 30 символов", "error");
        return;
      }
      if (password !== confirmPassword) {
        notif("Пароли не совпадают!", "error");
        return;
      }
    }

    const endpoint = isRegister ? "register" : "login";
    const requestData = isRegister
      ? { login: identifier, email, password }
      : { identifier, password };

    try {
      const response = await fetch(`https://api.devsis.ru/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isRegister) {
          localStorage.setItem("token", data.token);
          navigate("/");
        } else {
          notif("Регистрация успешна! Теперь войдите в систему.", "success");
          setIsRegister(false);
        }
      } else {
        notif(data.error || "Ошибка сервера", "error");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notif("Ошибка сети", "error");
    }
  };

  return (
    <div className="auth-container">
      <Notification />
      <h2>{isRegister ? "Регистрация" : "Вход"}</h2>
      <form onSubmit={handleSubmit}>
        {isRegister ? (
          <>
            <input
              type="text"
              placeholder="Логин"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </>
        ) : (
          <input
            type="text"
            placeholder="Логин или E-mail"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        )}
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {isRegister && (
          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        <button type="submit">{isRegister ? "Зарегистрироваться" : "Войти"}</button>
      </form>
      <p className="toggle-text" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
      </p>
    </div>
  );
};

export default Auth;
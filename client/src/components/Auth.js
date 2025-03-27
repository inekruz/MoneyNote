import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegister && password !== confirmPassword) {
      alert("Пароли не совпадают!");
      return;
    }

    const endpoint = isRegister ? "register" : "login";
    const requestData = isRegister ? { login, email, password } : { login, password };

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
          alert("Регистрация успешна! Теперь войдите в систему.");
          setIsRegister(false);
        }
      } else {
        alert(data.error || "Ошибка сервера");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка сети");
    }
  };

  return (
    <div className="auth-container">
      <h2>{isRegister ? "Регистрация" : "Вход"}</h2>
      <form onSubmit={handleSubmit}>
        {isRegister && (
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={isRegister}
        />
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

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Notification, notif } from "./notification";
import { sendNotification } from './sendNotification';
import { UAParser } from "ua-parser-js";
import { FaCode } from "react-icons/fa";
import "./css/auth.css";


const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);

  const inputsRef = useRef([]);
  const navigate = useNavigate();


  // Определение устройства и браузера
  const getDeviceName = () => {
    const parser = new UAParser();
    const result = parser.getResult();

    const osName = result.os.name || "";
    const osVersion = result.os.version || "";
    const browser = result.browser.name || "";

    let deviceName = result.device.model || "";

    if (!deviceName) {
      if (result.device.type === "mobile") {
        deviceName = "Смартфон";
      } else if (result.device.type === "tablet") {
        deviceName = "Планшет";
      } else if (result.device.type === "desktop" || result.os.name === "Windows" || result.os.name === "Mac OS") {
        deviceName = "Компьютер";
      } else {
        deviceName = "Неизвестное устройство";
      }
    }

    return `${deviceName} (${osName} ${osVersion}, ${browser})`;
  };


  // Отправка формы входа или регистрации
  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isRegister ? "register" : "login";
    const requestData = isRegister
      ? { login: identifier, email, password }
      : { identifier, password };

    try {
      const response = await fetch(`https://api.qoka.ru/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsVerifying(true);
        notif("Код отправлен на email", "success");
      } else {
        notif(data.error || "Ошибка сервера", "error");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notif("Ошибка сети", "error");
    }
  };


  // Проверка введённого кода
  const handleVerifyCode = async () => {
    const code = verificationCode.join("");

    try {
      const response = await fetch(`https://api.qoka.ru/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);

        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        const ipAddress = ipData.ip;

        const device = getDeviceName();

        await sendNotification(
          "Вход с нового устройства",
          `Вошли с ${device}\nIP: ${ipAddress}`
        );

        navigate("/");
      } else {
        notif(data.error || "Неверный код", "error");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      notif("Ошибка сети", "error");
    }
  };


  // Обработка ввода кода
  const handleCodeChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };


  // Обработка клавиш при вводе кода
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };


  // Вставка кода из буфера обмена
  const handlePaste = (e) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6).split("");
    const newCode = [...verificationCode];

    pastedData.forEach((char, i) => {
      newCode[i] = char;
    });

    setVerificationCode(newCode);
    inputsRef.current[pastedData.length - 1]?.focus();
  };

  // Переход на страницу документации для разработчиков
  const handleDeveloperDocsClick = () => {
    window.open("https://api.qoka.ru/docs", "_blank");
  };

  return (
    <div className="auth-container">
      <Notification />

      {!isVerifying ? (
        <>
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
        </>
      ) : (
        <div>
          <h2>Подтвердите email</h2>
          <p>Введите код, отправленный на вашу почту</p>
          <div className="code-input-container" onPaste={handlePaste}>
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="code-input"
              />
            ))}
          </div>
          <button onClick={handleVerifyCode}>Подтвердить</button>
        </div>
      )}

      {!isVerifying && (
        <p className="toggle-text" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
        </p>
      )}
      <div className="docs-container">
        <button className="developer-docs-button-auth" onClick={handleDeveloperDocsClick}>
            <FaCode />  <span>Документация qoka</span>
          </button>
      </div>
    </div>
  );
};


export default Auth;

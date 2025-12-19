import React, { useEffect, useState } from 'react';
import './css/settings.css';

const Settings = () => {
  // Состояние для хранения текущих настроек уведомлений
  const [settings, setSettings] = useState({
    is_income: false,
    is_expense: false,
    is_goals: false,
    is_reports: false,
    is_auth: false,
  });

  // Используем useEffect для загрузки настроек при первом рендере компонента
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Получаем текущие настройки уведомлений с сервера
        const res = await fetch('https://api.qoka.ru/ntf/getCheck', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}` // Используем токен из localStorage
          }
        });

        if (res.status === 404) {
          // Если настройки не найдены, устанавливаем их по умолчанию
          await fetch('https://api.qoka.ru/ntf/updateCheck', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}` // Отправляем запрос с токеном
            },
            body: JSON.stringify({
              is_income: false,
              is_expense: false,
              is_goals: false,
              is_reports: false,
              is_auth: false
            })
          });
        } else {
          // Если настройки найдены, сохраняем их в состояние
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Ошибка при получении настроек:', error);
      }
    };

    fetchSettings();
  }, []); // useEffect запускается один раз при монтировании компонента

  // Обработчик изменения состояния уведомлений
  const handleToggle = async (field) => {
    const updatedSettings = {
      ...settings,
      [field]: !settings[field] // Переключаем состояние выбранного уведомления
    };
    setSettings(updatedSettings); // Обновляем состояние в компоненте

    try {
      // Отправляем обновленные настройки на сервер
      await fetch('https://api.qoka.ru/ntf/updateCheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` // Отправляем запрос с токеном
        },
        body: JSON.stringify(updatedSettings) // Отправляем обновленные настройки
      });
    } catch (error) {
      console.error('Ошибка при обновлении настроек:', error);
    }
  };

  return (
    <div className="settings-page">
      <h2>Настройки и уведомления</h2>
      <div className="settings-container">
        {/* Перебираем настройки и генерируем элементы для каждого из них */}
        {[
          { key: 'is_income', label: 'Уведомления о доходах' },
          { key: 'is_expense', label: 'Уведомления о расходах' },
          { key: 'is_goals', label: 'Уведомления о целях' },
          { key: 'is_reports', label: 'Уведомления об отчетах' },
          { key: 'is_auth', label: 'Уведомления о входе' }
        ].map(({ key, label }) => (
          <div key={key} className="setting-item">
            <span className="setting-label">{label}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings[key]} // Состояние чекбокса зависит от текущих настроек
                onChange={() => handleToggle(key)} // Обработчик переключения
              />
              <span className="slider round"></span>
            </label>
          </div>
        ))}
      </div>
      <div className="notifications-info">
        <h3><span className="info-title-icon">⚠️</span> Как приходят уведомления?</h3>
        <p>
          Уведомления будут приходить как 
          <span className="pill push-pill">PUSH</span> и 
          <span className="pill email-pill">EMAIL</span>
        </p>
        <div className="warning-box">
          <strong>Внимание:</strong> если у вас указана устаревшая или неверная почта — 
          <span className="highlight"> обязательно обновите её</span>, чтобы не потерять доступ к аккаунту 
          и получать важные уведомления.
        </div>
      </div>
    </div>
  );
};

export default Settings;


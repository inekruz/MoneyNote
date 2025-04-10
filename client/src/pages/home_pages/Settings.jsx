import React, { useEffect, useState } from 'react';
import './css/settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    is_income: false,
    is_expense: false,
    is_goals: false,
    is_reports: false,
    is_auth: false,
  });

  // Получение состояния при загрузке
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('https://api.devsis.ru/ntf/getCheck', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (res.status === 404) {
          // Если запись не найдена — создаём дефолтную
          await fetch('https://api.devsis.ru/ntf/updateCheck', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
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
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Ошибка при получении настроек:', error);
      }
    };

    fetchSettings();
  }, []);

  // Обновление состояния чекбокса
  const handleToggle = async (field) => {
    const updatedSettings = {
      ...settings,
      [field]: !settings[field]
    };
    setSettings(updatedSettings);

    try {
      await fetch('https://api.devsis.ru/ntf/updateCheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedSettings)
      });
    } catch (error) {
      console.error('Ошибка при обновлении настроек:', error);
    }
  };

  return (
    <div className="income-page">
      <h2>Настройки и уведомления</h2>
      <div className="settings-container">
        {[
          { key: 'is_income', label: 'Уведомления о доходах' },
          { key: 'is_expense', label: 'Уведомления о расходах' },
          { key: 'is_goals', label: 'Уведомления о целях' },
          { key: 'is_reports', label: 'Уведомления о отчетах' },
          { key: 'is_auth', label: 'Уведомления о входе' }
        ].map(({ key, label }) => (
          <div key={key} className="setting-item">
            <span className="setting-label">{label}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={() => handleToggle(key)}
              />
              <span className="slider round"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;

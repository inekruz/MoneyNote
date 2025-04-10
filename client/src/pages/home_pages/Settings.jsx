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
    <div className="settings-page">
      <h2>Настройки и уведомления</h2>
      <div className="settings-container">
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
                checked={settings[key]}
                onChange={() => handleToggle(key)}
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

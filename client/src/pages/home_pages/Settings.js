import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import settings_anim from './lottie/settings.json';

const Settings = () => {
  return (
    <div className="income-page">
      <h2>Настройки и уведомления</h2>
      <lottie-player 
              src={settings_anim} 
              background="transparent"  
              speed="1"  
              class="lottie-player" 
              loop 
              autoplay>
            </lottie-player>
    </div>
  );
};

export default Settings;
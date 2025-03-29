import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import reports_anim from './lottie/reports.json';

const Reports = () => {
  return (
    <div className="income-page">
      <h2>Генерация отчетов</h2>
      <lottie-player 
              src={reports_anim} 
              background="transparent"  
              speed="1"  
              class="lottie-player" 
              loop 
              autoplay>
            </lottie-player>
    </div>
  );
};

export default Reports;
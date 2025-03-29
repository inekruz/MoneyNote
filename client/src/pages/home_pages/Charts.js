import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import charts_anim from './lottie/charts.json';

const Charts = () => {
  return (
    <div className="income-page">
      <h2>Графики и диаграммы</h2>
      <lottie-player 
              src={charts_anim} 
              background="transparent"  
              speed="1"  
              class="lottie-player" 
              loop 
              autoplay>
            </lottie-player>
    </div>
  );
};

export default Charts;
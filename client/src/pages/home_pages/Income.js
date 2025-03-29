import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import income_anim from './lottie/income.json';

const Income = () => {
  return (
    <div className="income-page">
      <h2>Учет доходов</h2>
      <lottie-player 
        src={income_anim} 
        background="transparent"  
        speed="1"  
        class="lottie-player" 
        loop 
        autoplay>
      </lottie-player>
    </div>
  );
};

export default Income;
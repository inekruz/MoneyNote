import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import goals_anim from './lottie/goals.json';

const Goals = () => {
  return (
    <div className="income-page">
      <h2>Финансовые цели</h2>
            <lottie-player 
              src={goals_anim} 
              background="transparent"  
              speed="1"  
              class="lottie-player" 
              loop 
              autoplay>
            </lottie-player>
    </div>
  );
};

export default Goals;
import React from 'react';
import '@lottiefiles/lottie-player';
import './css/income.css';
import expenses_anim from './lottie/expenses.json';

const Expenses = () => {
  return (
    <div className="income-page">
      <h2>Учет Расходов</h2>
      <lottie-player 
        src={expenses_anim} 
        background="transparent"  
        speed="1"  
        class="lottie-player" 
        loop 
        autoplay>
      </lottie-player>
    </div>
  );
};

export default Expenses;
import React, { useState, useEffect } from "react";
import './css/credit.css';
import { Notification, notif } from "../../components/notification";

const Credit = () => {
  const [formData, setFormData] = useState({
    amount: '',
    termMonths: 12,
    purpose: 'other'
  });
  
  const [userData, setUserData] = useState({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    creditScore: 0,
    existingDebts: 0
  });
  
  const [loanResult, setLoanResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [maxOffer, setMaxOffer] = useState(null);

  // Загрузка данных пользователя
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.qoka.ru/credit/user-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      notif('Ошибка загрузки данных пользователя', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateMaxAmount = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.qoka.ru/credit/calculate-max', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaxOffer(data);
        notif('Рассчитана максимальная доступная сумма', 'success');
      }
    } catch (error) {
      notif('Ошибка расчета', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCredit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (formData.amount < 1000 || formData.amount > 1000000000) {
      notif('Сумма кредита должна быть от 1,000 до 1,000,000,000 рублей', 'warning');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.qoka.ru/credit/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLoanResult(data.decision);
        setAlternatives(data.alternatives || []);
        
        if (data.decision.status === 'approved') {
          notif('Кредит одобрен!', 'success');
        } else if (data.decision.status === 'alternative_offered') {
          notif('Предложены альтернативные варианты', 'info');
        } else {
          notif('Кредит не одобрен. ' + data.decision.reason, 'warning');
        }
      } else {
        notif(data.error || 'Ошибка проверки кредита', 'error');
      }
    } catch (error) {
      notif('Ошибка соединения', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptAlternative = async (alternative) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://api.qoka.ru/credit/accept-alternative', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alternative)
      });
      
      if (response.ok) {
        notif('Кредит оформлен!', 'success');
        setLoanResult(null);
        setAlternatives([]);
      }
    } catch (error) {
      notif('Ошибка оформления кредита', 'error');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

//   const calculateMonthlyPayment = (amount, annualRate, termMonths) => {
//     const monthlyRate = annualRate / 100 / 12;
//     const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
//                     (Math.pow(1 + monthlyRate, termMonths) - 1);
//     return Math.round(payment);
//   };

  return (
    <div className="credit-page">
      <Notification />
      <h2 className="credit-title">Кредитный калькулятор</h2>
      
      <div className="credit-container">
        <div className="user-summary">
          <h3>Ваша финансовая ситуация</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Среднемесячный доход:</span>
              <span className="summary-value income">{formatCurrency(userData.monthlyIncome)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Среднемесячные расходы:</span>
              <span className="summary-value expense">{formatCurrency(userData.monthlyExpenses)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Свободные средства:</span>
              <span className="summary-value free">
                {formatCurrency(userData.monthlyIncome - userData.monthlyExpenses)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Кредитный рейтинг:</span>
              <span className={`summary-value score score-${Math.floor(userData.creditScore/200)}`}>
                {userData.creditScore}
              </span>
            </div>
          </div>
          
          <button 
            className="btn-calculate-max"
            onClick={calculateMaxAmount}
            disabled={isLoading}
          >
            {isLoading ? 'Расчет...' : 'Узнать максимальную сумму'}
          </button>
          
          {maxOffer && (
            <div className="max-offer">
              <h4>Максимальное предложение</h4>
              <p>Сумма: {formatCurrency(maxOffer.amount)}</p>
              <p>Срок: {maxOffer.termMonths} месяцев</p>
              <p>Процент: {maxOffer.annualRate}%</p>
              <p>Ежемесячный платеж: {formatCurrency(maxOffer.monthlyPayment)}</p>
            </div>
          )}
        </div>

        <form onSubmit={checkCredit} className="credit-form">
          <h3>Заявка на кредит</h3>
          
          <div className="form-group">
            <label htmlFor="amount">Сумма кредита (руб.)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              min="1000"
              max="1000000000"
              step="1000"
              required
              placeholder="Введите сумму"
            />
            <div className="input-hint">От 1,000 до 1,000,000,000 ₽</div>
          </div>

          <div className="form-group">
            <label htmlFor="termMonths">Срок кредита (месяцев)</label>
            <select
              id="termMonths"
              name="termMonths"
              value={formData.termMonths}
              onChange={handleInputChange}
              required
            >
              <option value="3">3 месяца</option>
              <option value="6">6 месяцев</option>
              <option value="12">12 месяцев</option>
              <option value="24">24 месяца</option>
              <option value="36">36 месяцев</option>
              <option value="48">48 месяцев</option>
              <option value="60">60 месяцев</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="purpose">Цель кредита</label>
            <select
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleInputChange}
              required
            >
              <option value="consumer">Потребительский</option>
              <option value="car">Автокредит</option>
              <option value="home">Ипотека</option>
              <option value="business">Бизнес</option>
              <option value="education">Образование</option>
              <option value="medical">Медицина</option>
              <option value="other">Другое</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Проверка...' : 'Проверить кредит'}
          </button>
        </form>
      </div>

      {loanResult && (
        <div className={`loan-result ${loanResult.status}`}>
          <h3>Результат проверки</h3>
          
          <div className="decision-header">
            <span className={`status-badge ${loanResult.status}`}>
              {loanResult.status === 'approved' ? 'ОДОБРЕНО' : 
               loanResult.status === 'alternative_offered' ? 'АЛЬТЕРНАТИВА' : 'ОТКАЗ'}
            </span>
            <span className="decision-reason">{loanResult.reason}</span>
          </div>

          {loanResult.details && (
            <div className="decision-details">
              <p><strong>Предложение:</strong> {formatCurrency(loanResult.details.approvedAmount || formData.amount)}</p>
              <p><strong>Процентная ставка:</strong> {loanResult.details.annualRate}%</p>
              <p><strong>Ежемесячный платеж:</strong> {formatCurrency(loanResult.details.monthlyPayment)}</p>
              <p><strong>Общая сумма выплат:</strong> {formatCurrency(loanResult.details.totalPayment)}</p>
              <p><strong>Соотношение платеж/доход:</strong> {loanResult.details.debtToIncome}%</p>
            </div>
          )}
        </div>
      )}

      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h3>Альтернативные предложения</h3>
          <div className="alternatives-grid">
            {alternatives.map((alt, index) => (
              <div key={index} className="alternative-card">
                <div className="alternative-header">
                  <span className="alt-badge">ВЫГОДНО</span>
                  <span className="alt-type">{alt.type === 'less_amount' ? 'Меньшая сумма' : 
                                            alt.type === 'longer_term' ? 'Дольше срок' : 
                                            'Спецпредложение'}</span>
                </div>
                
                <div className="alternative-body">
                  <div className="alt-param">
                    <span>Сумма:</span>
                    <strong>{formatCurrency(alt.approvedAmount)}</strong>
                  </div>
                  <div className="alt-param">
                    <span>Срок:</span>
                    <strong>{alt.termMonths} мес.</strong>
                  </div>
                  <div className="alt-param">
                    <span>Ставка:</span>
                    <strong className={`rate ${alt.annualRate > 20 ? 'high' : 'low'}`}>
                      {alt.annualRate}%
                    </strong>
                  </div>
                  <div className="alt-param">
                    <span>Платеж в месяц:</span>
                    <strong>{formatCurrency(alt.monthlyPayment)}</strong>
                  </div>
                  <div className="alt-param">
                    <span>Общая выплата:</span>
                    <strong>{formatCurrency(alt.totalPayment)}</strong>
                  </div>
                </div>
                
                <div className="alternative-footer">
                  <button 
                    className="btn-accept"
                    onClick={() => acceptAlternative(alt)}
                  >
                    Выбрать этот вариант
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Credit;
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.SECRET_KEY || "none";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.login = decoded.login;
    next();
  });
};

// Рассчитать максимальную доступную сумму
router.post('/calculate-max', authenticateToken, async (req, res) => {
  try {
    const { login } = req;
    
    // Получаем финансовые данные пользователя
    const userData = await getUserFinancialData(login);
    
    // Рассчитываем кредитный рейтинг
    const creditScore = calculateCreditScore(userData);
    
    // Рассчитываем максимальный доступный платеж (не более 40% от дохода)
    const maxMonthlyPayment = userData.monthlyIncome * 0.4 - userData.monthlyExpenses;
    
    if (maxMonthlyPayment <= 0) {
      return res.json({
        amount: 0,
        termMonths: 12,
        annualRate: calculateIndividualRate(creditScore, 12, 0),
        monthlyPayment: 0,
        reason: 'Недостаточно дохода для кредита'
      });
    }
    
    // Рассчитываем максимальную сумму для разных сроков
    const terms = [12, 24, 36, 48, 60];
    let bestOffer = null;
    let maxAmount = 0;
    
    for (const term of terms) {
      const rate = calculateIndividualRate(creditScore, term, 0);
      const monthlyRate = rate / 100 / 12;
      
      // Формула аннуитетного платежа: A = P * (r * (1+r)^n) / ((1+r)^n - 1)
      // Выражаем P: P = A * ((1+r)^n - 1) / (r * (1+r)^n)
      const amount = maxMonthlyPayment * (Math.pow(1 + monthlyRate, term) - 1) / 
                    (monthlyRate * Math.pow(1 + monthlyRate, term));
      
      if (amount > maxAmount) {
        maxAmount = amount;
        bestOffer = {
          amount: Math.floor(amount / 1000) * 1000, // Округляем до тысяч
          termMonths: term,
          annualRate: rate,
          monthlyPayment: maxMonthlyPayment,
          totalPayment: maxMonthlyPayment * term
        };
      }
    }
    
    res.json(bestOffer);
    
  } catch (error) {
    console.error('Error calculating max:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверка кредитной заявки
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { login } = req;
    const { amount, termMonths, purpose } = req.body;
    
    // Валидация входных данных
    if (!amount || !termMonths || amount < 1000 || amount > 1000000000) {
      return res.status(400).json({ error: 'Неверные параметры кредита' });
    }
    
    // Получаем финансовые данные пользователя
    const userData = await getUserFinancialData(login);
    
    // Рассчитываем кредитный рейтинг
    const creditScore = calculateCreditScore(userData);
    
    // Рассчитываем индивидуальную ставку
    const baseRate = calculateIndividualRate(creditScore, termMonths, amount);
    
    // Проверяем возможность кредита
    const decision = await analyzeCreditRequest(
      login, 
      amount, 
      termMonths, 
      baseRate, 
      userData, 
      creditScore
    );
    
    res.json(decision);
    
  } catch (error) {
    console.error('Error checking credit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Принятие альтернативного предложения
router.post('/accept-alternative', authenticateToken, async (req, res) => {
  try {
    const { login } = req;
    const alternative = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Сохраняем кредит в базу
      const insertQuery = `
        INSERT INTO loans (
          ulogin, 
          requested_amount, 
          approved_amount, 
          term_months, 
          annual_rate, 
          monthly_payment, 
          total_payment, 
          status, 
          decision_reason,
          income,
          expenses,
          credit_score,
          debt_to_income,
          processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING id
      `;
      
      const values = [
        login,
        alternative.requestedAmount || alternative.approvedAmount,
        alternative.approvedAmount,
        alternative.termMonths,
        alternative.annualRate,
        alternative.monthlyPayment,
        alternative.totalPayment,
        'approved',
        'Альтернативное предложение принято',
        alternative.income,
        alternative.expenses,
        alternative.creditScore,
        alternative.debtToIncome
      ];
      
      const result = await client.query(insertQuery, values);
      
      // Создаем уведомление
      const notificationQuery = `
        INSERT INTO notification (ulogin, title, description)
        VALUES ($1, $2, $3)
      `;
      
      await client.query(notificationQuery, [
        login,
        'Кредит одобрен',
        `Ваш кредит на сумму ${alternative.approvedAmount} ₽ одобрен. Ставка: ${alternative.annualRate}%`
      ]);
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        loanId: result.rows[0].id,
        message: 'Кредит успешно оформлен'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error accepting alternative:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение данных пользователя
router.get('/user-data', authenticateToken, async (req, res) => {
  try {
    const { login } = req;
    const userData = await getUserFinancialData(login);
    const creditScore = calculateCreditScore(userData);
    
    res.json({
      monthlyIncome: userData.monthlyIncome,
      monthlyExpenses: userData.monthlyExpenses,
      creditScore: creditScore,
      existingDebts: userData.existingDebts
    });
    
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Вспомогательные функции

async function getUserFinancialData(login) {
  // Получаем доходы за последние 3 месяца
  const incomeQuery = `
    SELECT COALESCE(AVG(amount), 0) as avg_income
    FROM transactions 
    WHERE ulogin = $1 
      AND type = 'income' 
      AND date >= NOW() - INTERVAL '3 months'
  `;
  
  // Получаем расходы за последние 3 месяца
  const expenseQuery = `
    SELECT COALESCE(AVG(amount), 0) as avg_expense
    FROM transactions 
    WHERE ulogin = $1 
      AND type = 'expense' 
      AND date >= NOW() - INTERVAL '3 months'
  `;
  
  // Получаем активные кредиты
  const debtQuery = `
    SELECT COALESCE(SUM(monthly_payment), 0) as total_debt
    FROM loans 
    WHERE ulogin = $1 
      AND status = 'approved'
  `;
  
  const [incomeResult, expenseResult, debtResult] = await Promise.all([
    pool.query(incomeQuery, [login]),
    pool.query(expenseQuery, [login]),
    pool.query(debtQuery, [login])
  ]);
  
  return {
    monthlyIncome: parseFloat(incomeResult.rows[0]?.avg_income || 0),
    monthlyExpenses: parseFloat(expenseResult.rows[0]?.avg_expense || 0),
    existingDebts: parseFloat(debtResult.rows[0]?.total_debt || 0)
  };
}

function calculateCreditScore(userData) {
  let score = 500; // Базовый балл
  
  // Фактор дохода (до 300 баллов)
  const incomeFactor = Math.min(userData.monthlyIncome / 10000, 30) * 10;
  score += incomeFactor;
  
  // Фактор соотношения доход/расход (до 200 баллов)
  if (userData.monthlyIncome > 0) {
    const expenseRatio = userData.monthlyExpenses / userData.monthlyIncome;
    if (expenseRatio < 0.3) score += 200;
    else if (expenseRatio < 0.5) score += 100;
    else if (expenseRatio < 0.7) score += 50;
  }
  
  // Фактор наличия долгов (-100 баллов если есть)
  if (userData.existingDebts > 0) {
    score -= 100;
  }
  
  // Ограничиваем диапазон 300-850 (как в FICO)
  return Math.max(300, Math.min(850, Math.round(score)));
}

function calculateIndividualRate(creditScore, termMonths, amount) {
  let baseRate = 15; // Базовая ставка 15%
  
  // Корректировка по кредитному рейтингу
  if (creditScore >= 750) baseRate -= 6;
  else if (creditScore >= 650) baseRate -= 3;
  else if (creditScore >= 550) baseRate += 0;
  else if (creditScore >= 450) baseRate += 5;
  else baseRate += 10;
  
  // Корректировка по сроку
  if (termMonths <= 12) baseRate -= 2;
  else if (termMonths <= 36) baseRate += 0;
  else baseRate += 3;
  
  // Корректировка по сумме
  if (amount > 500000) baseRate -= 1;
  else if (amount < 50000) baseRate += 2;
  
  // Ограничиваем диапазон 5%-35%
  return Math.max(5, Math.min(35, baseRate));
}

function calculateAnnuityPayment(amount, annualRate, termMonths) {
  const monthlyRate = annualRate / 100 / 12;
  const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}

async function analyzeCreditRequest(login, amount, termMonths, rate, userData, creditScore) {
  const monthlyPayment = calculateAnnuityPayment(amount, rate, termMonths);
  const totalPayment = monthlyPayment * termMonths;
  
  // Рассчитываем соотношение платеж/доход
  const debtToIncome = ((monthlyPayment + userData.existingDebts) / userData.monthlyIncome) * 100;
  
  // Основные критерии проверки
  const canAfford = monthlyPayment <= (userData.monthlyIncome * 0.4 - userData.monthlyExpenses);
  const goodCreditScore = creditScore >= 600;
  const acceptableDTI = debtToIncome <= 40;
  
  // Если все условия выполнены
  if (canAfford && goodCreditScore && acceptableDTI) {
    await saveLoanToDB(login, {
      requestedAmount: amount,
      approvedAmount: amount,
      termMonths,
      annualRate: rate,
      monthlyPayment,
      totalPayment,
      status: 'approved',
      reason: 'Кредит одобрен',
      income: userData.monthlyIncome,
      expenses: userData.monthlyExpenses,
      creditScore,
      debtToIncome
    });
    
    return {
      decision: {
        status: 'approved',
        reason: 'Кредит одобрен',
        details: {
          approvedAmount: amount,
          annualRate: rate,
          monthlyPayment,
          totalPayment,
          debtToIncome: debtToIncome.toFixed(2)
        }
      }
    };
  }
  
  // Если условия не выполнены, предлагаем альтернативы
  const alternatives = generateAlternatives(
    login, amount, termMonths, rate, userData, creditScore
  );
  
  if (alternatives.length > 0) {
    await saveLoanToDB(login, {
      requestedAmount: amount,
      approvedAmount: null,
      termMonths,
      annualRate: rate,
      monthlyPayment,
      totalPayment,
      status: 'alternative_offered',
      reason: 'Предложены альтернативные варианты',
      income: userData.monthlyIncome,
      expenses: userData.monthlyExpenses,
      creditScore,
      debtToIncome,
      alternativeData: alternatives
    });
    
    return {
      decision: {
        status: 'alternative_offered',
        reason: 'Основная заявка не одобрена. Рассмотрите альтернативные варианты',
        details: {
          requestedAmount: amount,
          requestedTerm: termMonths,
          annualRate: rate,
          debtToIncome: debtToIncome.toFixed(2)
        }
      },
      alternatives
    };
  }
  
  // Если альтернатив нет - отказ
  await saveLoanToDB(login, {
    requestedAmount: amount,
    approvedAmount: null,
    termMonths,
    annualRate: rate,
    monthlyPayment,
    totalPayment,
    status: 'rejected',
    reason: 'Кредит не одобрен по финансовым показателям',
    income: userData.monthlyIncome,
    expenses: userData.monthlyExpenses,
    creditScore,
    debtToIncome
  });
  
  return {
    decision: {
      status: 'rejected',
      reason: 'Кредит не одобрен. Платеж превышает ваши финансовые возможности'
    }
  };
}

function generateAlternatives(login, amount, termMonths, rate, userData, creditScore) {
  const alternatives = [];
  const maxAffordablePayment = userData.monthlyIncome * 0.4 - userData.monthlyExpenses;
  
  // Вариант 1: Меньшая сумма на тот же срок
  if (maxAffordablePayment > 0) {
    const monthlyRate = rate / 100 / 12;
    const affordableAmount = maxAffordablePayment * (Math.pow(1 + monthlyRate, termMonths) - 1) / 
                           (monthlyRate * Math.pow(1 + monthlyRate, termMonths));
    
    if (affordableAmount >= 1000) {
      const altAmount = Math.min(amount, Math.floor(affordableAmount / 1000) * 1000);
      const altPayment = calculateAnnuityPayment(altAmount, rate, termMonths);
      
      if (altAmount > 0 && altPayment <= maxAffordablePayment) {
        alternatives.push({
          type: 'less_amount',
          requestedAmount: amount,
          approvedAmount: altAmount,
          termMonths,
          annualRate: rate,
          monthlyPayment: altPayment,
          totalPayment: altPayment * termMonths,
          income: userData.monthlyIncome,
          expenses: userData.monthlyExpenses,
          creditScore,
          debtToIncome: ((altPayment + userData.existingDebts) / userData.monthlyIncome * 100).toFixed(2)
        });
      }
    }
  }
  
  // Вариант 2: Больший срок с той же суммой
  for (let extendedTerm of [termMonths * 2, 60].filter(t => t > termMonths && t <= 60)) {
    const extendedPayment = calculateAnnuityPayment(amount, rate, extendedTerm);
    
    if (extendedPayment <= maxAffordablePayment) {
      alternatives.push({
        type: 'longer_term',
        requestedAmount: amount,
        approvedAmount: amount,
        termMonths: extendedTerm,
        annualRate: rate + 1, // +1% за больший срок
        monthlyPayment: extendedPayment,
        totalPayment: extendedPayment * extendedTerm,
        income: userData.monthlyIncome,
        expenses: userData.monthlyExpenses,
        creditScore,
        debtToIncome: ((extendedPayment + userData.existingDebts) / userData.monthlyIncome * 100).toFixed(2)
      });
      break;
    }
  }
  
  // Вариант 3: Специальное предложение с повышенной ставкой
  if (creditScore >= 500) {
    const specialRate = Math.min(rate + 5, 35); // +5% но не более 35%
    const specialPayment = calculateAnnuityPayment(amount, specialRate, termMonths);
    
    if (specialPayment <= maxAffordablePayment * 1.1) { // Допускаем +10% к платежу
      alternatives.push({
        type: 'special_offer',
        requestedAmount: amount,
        approvedAmount: amount,
        termMonths,
        annualRate: specialRate,
        monthlyPayment: specialPayment,
        totalPayment: specialPayment * termMonths,
        income: userData.monthlyIncome,
        expenses: userData.monthlyExpenses,
        creditScore,
        debtToIncome: ((specialPayment + userData.existingDebts) / userData.monthlyIncome * 100).toFixed(2)
      });
    }
  }
  
  return alternatives;
}

async function saveLoanToDB(login, loanData) {
  const query = `
    INSERT INTO loans (
      ulogin, 
      requested_amount, 
      approved_amount, 
      term_months, 
      annual_rate, 
      monthly_payment, 
      total_payment, 
      status, 
      decision_reason,
      income,
      expenses,
      credit_score,
      debt_to_income,
      alternative_data,
      processed_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
  `;
  
  const values = [
    login,
    loanData.requestedAmount,
    loanData.approvedAmount,
    loanData.termMonths,
    loanData.annualRate,
    loanData.monthlyPayment,
    loanData.totalPayment,
    loanData.status,
    loanData.reason,
    loanData.income,
    loanData.expenses,
    loanData.creditScore,
    loanData.debtToIncome,
    loanData.alternativeData ? JSON.stringify(loanData.alternativeData) : null
  ];
  
  await pool.query(query, values);
}

module.exports = router;
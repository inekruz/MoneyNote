import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import '@lottiefiles/lottie-player';
import './css/charts.css';
import { format, parseISO } from 'date-fns';

// Цвета для диаграмм
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#ff6666', '#66cccc'];

const Charts = () => {
  // Состояния для данных
  const [categories, setCategories] = useState([]); // Категории
  const [transactions, setTransactions] = useState([]); // Транзакции
  const [allTransactions, setAllTransactions] = useState([]); // Все транзакции
  const [selectedCategory, setSelectedCategory] = useState(''); // Выбранная категория
  const [startDate, setStartDate] = useState(''); // Дата начала
  const [endDate, setEndDate] = useState(''); // Дата окончания
  const [adviceText, setAdviceText] = useState(''); // Рекомендации

  // Получение всех транзакций
  const fetchAllTransactions = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch('https://api.minote.ru/inex/alltransactions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setAllTransactions(data); // Сохранение всех транзакций
  };

  // Получение категорий
  const fetchCategories = async () => {
    const res = await fetch('https://api.minote.ru/inex/categories');
    const data = await res.json();
    setCategories(data); // Сохранение категорий
  };

  // Получение транзакций с учетом выбранных фильтров
  const fetchTransactions = useCallback(async () => {
    const token = localStorage.getItem("token");
    const res = await fetch('https://api.minote.ru/inex/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        categoryId: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    });
    const data = await res.json();
    setTransactions(data); // Сохранение транзакций
  }, [selectedCategory, startDate, endDate]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchCategories();
    fetchAllTransactions();
  }, []);

  // Получение транзакций при изменении фильтров
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Вычисление общего дохода
  const totalIncome = allTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  // Вычисление общего расхода
  const totalExpense = allTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  // Баланс
  const balance = Math.max(0, totalIncome - totalExpense);

  // Вычисление и генерация рекомендаций по финансовому состоянию
  useEffect(() => {
    if (transactions.length === 0) return;

    const income = transactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const expense = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const rawBalance = income - expense;

    const expenseCategories = transactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        const category = tx.category_name || tx.category?.name || tx.category || 'Без категории';
        const amount = parseFloat(tx.amount);
        if (isNaN(amount)) return acc;

        acc[category] = acc[category] || { name: category, value: 0 };
        acc[category].value += amount;
        return acc;
      }, {});

    const highExpenseCategories = Object.values(expenseCategories)
      .filter(cat => cat.value > expense * 0.25)
      .sort((a, b) => b.value - a.value);

    // Генерация рекомендаций
    const generateFinancialAdvice = () => {
      const advice = [];

      const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
      const expenseRate = income > 0 ? (expense / income) * 100 : 0;

      if (rawBalance < 0) {
        advice.push(`❗ Ваши расходы превышают доходы на ${Math.abs(rawBalance).toFixed(2)} ₽.`);
      } else if (rawBalance === 0) {
        advice.push("⚠️ Баланс на нуле. Пересмотрите расходы и доходы.");
      } else {
        advice.push(`✅ Положительный баланс: ${rawBalance.toFixed(2)} ₽.`);
      }

      if (savingsRate < 10) {
        advice.push("💡 Вы сохраняете менее 10% доходов. Попробуйте хотя бы 20%.");
      } else if (savingsRate > 30) {
        advice.push("👏 Отличная дисциплина — более 30% доходов сохраняются.");
      }

      if (highExpenseCategories.length > 0) {
        const categoriesList = highExpenseCategories
          .map(cat => `${cat.name} (${cat.value.toFixed(0)} ₽)`)
          .join(', ');
        advice.push(`🔍 Основные траты: ${categoriesList}.`);
      }

      if (expenseRate > 90) {
        advice.push("🚨 Вы тратите почти весь доход. Попробуйте составить бюджет.");
      }

      if (income === 0) {
        advice.push("📉 Доходы отсутствуют. Найдите источник дохода.");
      }

      return advice;
    };

    const finalAdvice = generateFinancialAdvice();
    setAdviceText(finalAdvice.join('\n')); // Установка текста рекомендаций
  }, [transactions]);

  // Подготовка данных для графика
  const chartData = transactions.map(tx => ({
    date: format(parseISO(tx.date), 'dd.MM.yy'),
    amount: tx.amount,
    category: tx.category_name,
  }));

  // Общее количество транзакций
  const totalTransactions = transactions.length;
  // Сумма всех транзакций
  const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  // Данные для круговой диаграммы
  const pieData = Object.values(
    transactions.reduce((acc, tx) => {
      const category = tx.category_name || 'Неизвестно';
      const amount = parseFloat(tx.amount);
      if (isNaN(amount)) return acc;

      acc[category] = acc[category] || { name: category, value: 0 };
      acc[category].value += amount;
      return acc;
    }, {})
  );

  return (
    <div className="charts-container">
      <h2>📊 Графики и диаграммы</h2>

      {/* Фильтры для выбора категории и дат */}
      <div className="filters">
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* Резюме по транзакциям */}
      <div className="summary">
        <p>Транзакций: {totalTransactions}</p>
        <p>Суммарно: {totalAmount.toFixed(2)} ₽</p>
        <p>💰 Текущий баланс: {balance.toFixed(2)} ₽</p>
      </div>

      {/* Рекомендации по финансовому состоянию */}
      {adviceText && (
        <div className="summary" style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
          <strong>📌 Рекомендации:</strong>
          <p>{adviceText}</p>
        </div>
      )}

      {/* Круговая диаграмма */}
      {pieData.length > 0 && (
        <motion.div
          className="donut-chart"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={({ percent, value }) =>
                  `${(percent * 100).toFixed(2)}% (${value.toFixed(1)} ₽)`
                }
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} ₽`, name]}
                contentStyle={{ backgroundColor: '#2a2d34', borderColor: '#848994' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* График доходов и расходов */}
      <motion.div
        className="chart-wrapper"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            >
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1" spreadMethod="pad">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p>Нет транзакций для отображения</p>
        )}
      </motion.div>
    </div>
  );
};

export default Charts;

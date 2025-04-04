import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import '@lottiefiles/lottie-player';
import './css/charts.css';
import { format, parseISO } from 'date-fns';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#ff6666', '#66cccc'];

const Charts = () => {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCategories = async () => {
    const res = await fetch('https://api.devsis.ru/inex/categories');
    const data = await res.json();
    setCategories(data);
  };

  const fetchTransactions = useCallback(async () => {
    const res = await fetch('https://api.devsis.ru/inex/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    });
    const data = await res.json();
    setTransactions(data);
  }, [selectedCategory, startDate, endDate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const chartData = transactions.map(tx => ({
    date: format(parseISO(tx.date), 'dd.MM.yyyy'),
    amount: tx.amount,
    category: tx.category_name,
  }));


  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);


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

      <div className="summary">
        <p>Транзакций: {totalTransactions}</p>
        <p>Суммарно: {totalAmount.toFixed(2)} ₽</p>
      </div>

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

      {/* Пончик */}
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
                  `${(percent * 100).toFixed(0)}% (${value.toFixed(0)} ₽)`
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

      {/* Линейный график */}
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
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0.1} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  stroke="#ffffff"
                  label={{ value: 'Дата', position: 'insideBottom', offset: -20, fill: '#ffffff' }}
                />
                <YAxis
                  stroke="#ffffff"
                  label={{ value: 'Сумма (₽)', angle: -90, position: 'insideLeft', offset: 10, fill: '#ffffff' }}
                />
                <Tooltip
                  formatter={(value) => [`${value} ₽`, 'Сумма']}
                  contentStyle={{ backgroundColor: '#2a2d34', borderColor: '#848994' }}
                />
                <CartesianGrid stroke="#3a3d44" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="amount" stroke="#0078d4" fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
        ) : (
          <p className="no-data">Нет данных для отображения</p>
        )}
      </motion.div>
    </div>
  );
};

export default Charts;

import React, { useState, useEffect } from "react";
import './css/income.css';
import { Notification, notif } from "../../components/notification";

// Основной компонент для отображения доходов и расходов
const Income = () => {
  // Состояния для управления данными транзакций и фильтров
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState('income'); // Тип транзакции: доход или расход
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ type: '', startDate: '', endDate: '', categoryId: '' });

  // Загрузка категорий при монтировании компонента
  useEffect(() => {
    fetch('https://api.minote.ru/inex/categories')
      .then(response => response.json())
      .then(data => setCategories(data)) // Устанавливаем категории
      .catch(error => notif(`${error}`, "error")); // Обработка ошибок
  }, []);

  // Загружаем транзакции в зависимости от фильтров
  useEffect(() => {
    const token = localStorage.getItem("token");
    const body = { ...filter }; // Используем текущие фильтры
    fetch('https://api.minote.ru/inex/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}`,  
      },
      body: JSON.stringify(body), // Отправляем фильтры на сервер
    })
      .then(response => response.json())
      .then(data => setTransactions(Array.isArray(data) ? data : [])) // Устанавливаем транзакции
      .catch(error => {
        notif(`${error}`, "error"); // Обработка ошибок
        setTransactions([]); // Очистка транзакций при ошибке
      });
  }, [filter]); // Перезапуск при изменении фильтров

  // Функция для добавления новой транзакции
  const handleSubmit = (e) => {
    const token = localStorage.getItem("token");
    e.preventDefault();

    // Проверка валидности введенной суммы
    if (amount <= 0) {
      notif("Сумма должна быть положительной!", "error");
      return;
    }

    const data = { type, amount, description, category_id: category };
    // Отправка данных транзакции на сервер
    fetch('https://api.minote.ru/inex/add', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}`,  
      },
      body: JSON.stringify(data),
    })
      .then(response => response.json())
      .then(newTransaction => {
        // Обновление списка транзакций
        setTransactions(prev => [...prev, newTransaction]);
        // Очистка формы
        setAmount('');
        setDescription('');
        setCategory('');
        window.location.reload(); // Перезагрузка страницы после добавления
      })
      .catch(error => notif(`${error}`, "error")); // Обработка ошибок
  };

  // Обработчик изменений фильтров
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value })); // Обновляем фильтры
  };

  // Форматирование даты для отображения
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} в ${hours}:${minutes}`; // Форматируем дату
  };

  return (
    <div className="income-page">
      <Notification /> {/* Компонент уведомлений */}
      <h2 className="income-title">Доходы & Расходы</h2>
      <form className="transaction-form">
        <div className="form-row">
          <label className="form-label">Тип<br />
            <select className="form-select-1" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>
          </label>
          <label className="form-label">Сумма<br />
            <input className="form-input" type="number" placeholder="Введите сумму..." value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
        </div>
        <div className="form-row">
          <label className="form-label">Описание<br />
            <input className="form-input" placeholder="Введите описание..." type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="form-label">Категория<br />
            <select className="form-select-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Выберите категорию</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>
        </div>
      </form>
      <button onClick={handleSubmit} className="form-button">Добавить</button>

      <h2 className="income-title2">История</h2>
      <div className="filter-container">
        <label className="filter-label">Тип<br></br>  
          <select className="form-select-1" name="type" value={filter.type} onChange={handleFilterChange}>
            <option value="">Все</option>
            <option value="income">Доход</option>
            <option value="expense">Расход</option>
          </select>
        </label>
        <label className="filter-label">Дата С<br></br>
          <input className="form-input" type="date" name="startDate" value={filter.startDate} onChange={handleFilterChange} />
        </label>
        <label className="filter-label">Дата По<br></br>
          <input className="form-input" type="date" name="endDate" value={filter.endDate} onChange={handleFilterChange} />
        </label>
        <label className="filter-label">Категория
          <select className="form-select-1" name="categoryId" value={filter.categoryId} onChange={handleFilterChange}>
            <option value="">Все</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="transaction-history">
        {transactions.length > 0 ? (
          <div className="transaction-list">
            <div className="transaction-header">
              <span className="transaction-header-text">Дата</span>
              <span className="transaction-header-text">Тип</span>
              <span className="transaction-header-text">Сумма</span>
              <span className="transaction-header-text">Категория</span>
              <span className="transaction-header-text">Описание</span>
            </div>
            {transactions.map(transaction => (
              <div key={transaction.id} className="transaction-item">
                <span className="transaction-text transaction-date">{formatDate(transaction.date)}</span>
                <span className={transaction.type === 'income' ? 'transaction-income' : 'transaction-expense'}>
                  {transaction.type === 'income' ? 'Доход' : 'Расход'}
                </span>
                <span className="transaction-text transaction-amount">{transaction.amount} ₽</span>
                <span className="transaction-text transaction-category">{transaction.category_name}</span>
                {transaction.description && (
                  <span className="transaction-text transaction-description">
                    {transaction.description.length > 10
                      ? `${transaction.description.slice(0, 10)}...` 
                      : transaction.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="transaction-text">Нет транзакций</p>
        )}
      </div>
    </div>
  );
};

export default Income;

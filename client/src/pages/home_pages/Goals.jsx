import React, { useState, useEffect } from 'react';
import { Notification, notif } from '../../components/notification';
import { FiChevronDown } from 'react-icons/fi';
import './css/goals.css';

const API_URL = 'https://api.minote.ru/goals';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/getGoals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setGoals(data);
    } catch (error) {
      notif('Ошибка загрузки целей', 'error');
    }
  };

  const isValidDate = (dateStr) => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(selectedDate.getTime()) && selectedDate >= today;
  };

  const resetInputs = () => {
    setTitle('');
    setAmount('');
    setDeadline('');
  };

  const handleAddGoal = async () => {
    if (!title || !amount || !deadline) {
      notif('Пожалуйста, заполните все поля.', 'error');
      return;
    }

    if (title.length > 35) {
      notif('Название цели не должно превышать 35 символов.', 'error');
      return;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      notif('Сумма должна быть положительной и больше 0.', 'error');
      return;
    }

    if (!isValidDate(deadline)) {
      notif('Дата окончания не может быть в прошлом.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          deadline,
        }),
      });

      const data = await res.json();
      setGoals([...goals, data]);
      resetInputs();
    } catch (err) {
      notif('Ошибка при создании цели', 'error');
    }
  };

  const handleDelete = async (index) => {
    const goal = goals[index];
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/${goal.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setGoals(goals.filter((_, i) => i !== index));
      if (expandedIndex === index) setExpandedIndex(null);
    } catch (err) {
      notif('Ошибка при удалении цели', 'error');
    }
  };

  const handleToggleExpand = (index) => {
    const goal = goals[index];
    if (Number(goal.saved) >= Number(goal.amount)) return;
    setExpandedIndex(expandedIndex === index ? null : index);
    setEditIndex(null);
    setAddAmount('');
  };

  const handleAddSaved = async (index) => {
    if (!addAmount || isNaN(addAmount) || parseFloat(addAmount) <= 0) {
      notif('Введите корректную сумму.', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const goal = goals[index];
      const res = await fetch(`${API_URL}/${goal.id}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parseFloat(addAmount) }),
      });
      const data = await res.json();
      const updated = [...goals];
      updated[index] = data;
      setGoals(updated);
      setAddAmount('');
    } catch (err) {
      notif('Ошибка при добавлении накоплений', 'error');
    }
  };

  const handleEditGoal = async (index) => {
    if (!title || !amount || !deadline) {
      notif('Пожалуйста, заполните все поля.', 'error');
      return;
    }

    if (title.length > 35) {
      notif('Название цели не должно превышать 35 символов.', 'error');
      return;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      notif('Сумма должна быть положительной и больше 0.', 'error');
      return;
    }

    if (!isValidDate(deadline)) {
      notif('Дата окончания не может быть в прошлом.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const goal = goals[index];
      const res = await fetch(`${API_URL}/${goal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          deadline,
        }),
      });
      const data = await res.json();
      const updated = [...goals];
      updated[index] = data;
      setGoals(updated);
      resetInputs();
      setEditIndex(null);
      setExpandedIndex(null);
    } catch (err) {
      notif('Ошибка при редактировании цели', 'error');
    }
  };

  const startEdit = (index) => {
    const goal = goals[index];
    setTitle(goal.title);
    setAmount(goal.amount);
    setDeadline(goal.deadline);
    setEditIndex(index);
  };

  return (
    <div className="goals-container">
      <Notification />
      <h2>Финансовые цели</h2>

      <div className="goal-input-container">
        <input
          type="text"
          placeholder="Название цели (до 35 символов)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={35}
        />
        <input
          type="number"
          placeholder="Сумма"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        {editIndex !== null ? (
          <button onClick={() => handleEditGoal(editIndex)}>Сохранить</button>
        ) : (
          <button onClick={handleAddGoal}>Добавить</button>
        )}
      </div>

      <div className="goal-list">
        {[...goals]
          .map((goal, index) => ({ ...goal, originalIndex: index }))
          .sort((a, b) => {
            const aDone = Number(a.saved) >= Number(a.amount);
            const bDone = Number(b.saved) >= Number(b.amount);
            return bDone - aDone;
          })
          .map((goal) => {
            const index = goal.originalIndex;
            const isCompleted = Number(goal.saved) >= Number(goal.amount);

            return (
              <div
                className={`goal-item ${isCompleted ? 'goal-completed' : ''}`}
                key={index}
                onClick={() => handleToggleExpand(index)}
              >
                <div className="goal-main">
                  <span>{goal.title}</span>
                  <span>{goal.amount} ₽</span>
                  <span className="goal-date">
                    {isCompleted ? (
                      '✅ Накоплено'
                    ) : (
                      <>
                        До: {new Date(goal.deadline).toLocaleDateString()}
                        <FiChevronDown className="expand-icon" />
                      </>
                    )}
                  </span>
                </div>

                {isCompleted ? (
                  <div
                    className="goal-completed-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p>
                      🎉 Цель достигнута! Вы накопили {Number(goal.saved).toFixed(2)} ₽
                    </p>
                    <button onClick={() => handleDelete(index)}>Удалить</button>
                  </div>
                ) : (
                  expandedIndex === index && (
                    <div
                      className="goal-expanded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="progress-info">
                        <div className="amount-info">
                          <p>
                            <b>Накоплено:</b>{' '}
                            <span className="saved-amount">
                              {Number(goal.saved).toFixed(2)} ₽
                            </span>
                          </p>
                          <p>
                            <b>Осталось:</b>{' '}
                            <span className="left-amount">
                              {(Number(goal.amount) - Number(goal.saved)).toFixed(2)} ₽
                            </span>
                          </p>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min((Number(goal.saved) / Number(goal.amount)) * 100, 100).toFixed(1)}%`,
                            }}
                          />
                          <div className="progress-bar-text">
                            {Math.min((Number(goal.saved) / Number(goal.amount)) * 100, 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <input
                        type="number"
                        placeholder="Введите сумму..."
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                      />
                      <button onClick={() => handleAddSaved(index)}>
                        Добавить сумму накопления
                      </button>

                      <div className="goal-actions">
                        <button onClick={() => startEdit(index)}>
                          ✏️ Редактировать
                        </button>
                        <button onClick={() => handleDelete(index)}>
                          🗑️ Удалить
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Goals;

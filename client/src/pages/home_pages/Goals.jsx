import React, { useState } from 'react';
import {Notification, notif} from '../../components/notification';
import { FiChevronDown } from 'react-icons/fi';
import './css/goals.css';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [editIndex, setEditIndex] = useState(null);

  const isValidDate = (dateStr) => {
    const selectedDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  const resetInputs = () => {
    setTitle('');
    setAmount('');
    setDeadline('');
  };

  const handleAddGoal = () => {
    if (!title || !amount || !deadline) {
      notif("Пожалуйста, заполните все поля.", "error");
      return;
    }
  
    if (title.length > 35) {
      notif("Название цели не должно превышать 35 символов.", "error");
      return;
    }
  
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      notif("Сумма должно быть положительным и больше 0.", "error");
      return;
    }
  
    if (!isValidDate(deadline)) {
      notif("Дата окончания не может быть в прошлом.", "error");
      return;
    }
  
    const newGoal = {
      title,
      amount: parseFloat(amount),
      deadline,
      saved: 0
    };
  
    setGoals([...goals, newGoal]);
    resetInputs();
  };
  

  const handleDelete = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const handleToggleExpand = (index) => {
    const goal = goals[index];
    if (goal.saved >= goal.amount) return;
    setExpandedIndex(expandedIndex === index ? null : index);
    setEditIndex(null);
    setAddAmount('');
  };

  const handleAddSaved = (index) => {
    if (!addAmount) return;
    const updated = [...goals];
    updated[index].saved += parseFloat(addAmount);
    setGoals(updated);
    setAddAmount('');
  };

  const handleEditGoal = (index) => {
    if (!title || !amount || !deadline) {
      notif("Пожалуйста, заполните все поля.", "error");
      return;
    }
  
    if (title.length > 35) {
      notif("Название цели не должно превышать 35 символов.", "error");
      return;
    }
  
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      notif("Сумма должно быть положительным и больше 0.", "error");
      return;
    }
  
    if (!isValidDate(deadline)) {
      notif("Дата окончания не может быть в прошлом.", "error");
      return;
    }
  
    const updated = [...goals];
    updated[index].title = title;
    updated[index].amount = parseFloat(amount);
    updated[index].deadline = deadline;
    setGoals(updated);
    setEditIndex(null);
    setExpandedIndex(null);
    resetInputs();
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
          const aDone = a.saved >= a.amount;
          const bDone = b.saved >= b.amount;
          return bDone - aDone;
        })
        .map((goal, _, arr) => {
          const index = goal.originalIndex;
          const isCompleted = goal.saved >= goal.amount;

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
                <div className="goal-completed-content" onClick={(e) => e.stopPropagation()}>
                  <p>🎉 Цель достигнута! Вы накопили {goal.saved.toFixed(2)} ₽</p>
                  <button onClick={() => handleDelete(index)}>Удалить</button>
                </div>
              ) : (
                expandedIndex === index && (
                    <div className="goal-expanded" onClick={(e) => e.stopPropagation()}>
                        <div className="progress-info">
                          <div className="amount-info">
                            <p><b>Накоплено:</b> <span className="saved-amount">{goal.saved.toFixed(2)} ₽</span></p>
                            <p><b>Осталось:</b> <span className="left-amount">{(goal.amount - goal.saved).toFixed(2)} ₽</span></p>
                          </div>
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.min((goal.saved / goal.amount) * 100, 100)}%`,
                              }}
                            />
                            <div className="progress-bar-text">
                              {Math.min((goal.saved / goal.amount) * 100, 100).toFixed(1)}%
                            </div>
                          </div>
                    </div>

                    <input
                      type="number"
                      placeholder="Введите сумму..."
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                    />
                    <button onClick={() => handleAddSaved(index)}>Добавить сумму накопления</button>

                    <div className="goal-actions">
                      <button onClick={() => startEdit(index)}>✏️ Редактировать</button>
                      <button onClick={() => handleDelete(index)}>🗑️ Удалить</button>
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

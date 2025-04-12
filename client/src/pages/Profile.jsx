import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { Notification, notif } from "../components/notification";
import "./css/profile.css";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Получение данных пользователя при загрузке компонента
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Токен не найден");
        return;
      }

      try {
        const response = await fetch("https://api.minote.ru/user/getUser", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Ошибка при получении данных");
        }

        setUserData(data.userData);
        setFormData({
          username: data.userData.username,
          email: data.userData.email,
          password: "",
          confirmPassword: "",
        });
      } catch (err) {
        notif(`${err.message}`, "error");
        console.error("Ошибка при получении данных пользователя:", err);
      }
    };

    fetchUserData();
  }, []);

  // Получение аватарки пользователя
  useEffect(() => {
    if (userData && userData.image_path) {
      fetchAvatar();
    }
  }, [userData]);

  const fetchAvatar = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("https://api.minote.ru/user/getAvatar", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при получении аватарки");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setAvatarPreview(imageUrl);
    } catch (err) {
      notif("Ошибка при получении аватарки!", "error");
    }
  };

  // Обработка изменения аватарки
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        setAvatarPreview(reader.result);

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("avatar", file);

        try {
          const response = await fetch("https://api.minote.ru/user/setAvatar", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Ошибка при обновлении аватарки");
          }

          setUserData((prevData) => ({
            ...prevData,
            image_path: data.imagePath,
          }));

          notif("Аватарка успешно обновлена", "success");
        } catch (err) {
          console.error("Ошибка при загрузке аватарки:", err);
          notif("Ошибка при обновлении аватарки", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Открытие попапа для редактирования данных
  const handleEditClick = () => {
    setFormData({
      username: userData?.username || "",
      email: userData?.email || "",
      password: "",
      confirmPassword: "",
    });
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  // Обработка изменений в форме
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Сохранение изменений данных пользователя
  const handleSaveChanges = async () => {
    if (formData.password !== formData.confirmPassword) {
      notif("Пароли не совпадают", "error");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("https://api.minote.ru/user/updateUser", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при обновлении данных");
      }

      setUserData(data.userData);
      setIsPopupOpen(false);
      notif("Данные успешно обновлены", "success");
    } catch (err) {
      notif(err.message, "error");
    }
  };

  return (
    <div className="profile-container">
      <Header />
      <Notification />
      <h1>Личный Кабинет</h1>
      {userData ? (
        <div className="user-info">
          <div className="avatar-container">
            <img
              className="avatar"
              src={avatarPreview || `https://api.minote.ru/avatars/${userData.image_path}`}
              alt="User Avatar"
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="avatar-input"
              id="avatar-file-input"
            />
            <label htmlFor="avatar-file-input" className="avatar-input-label">
              Изменить аватарку
            </label>
          </div>

          <div className="info-item">
            <div className="label">Login:</div>
            <div className="value">{userData.login}</div>
          </div>
          <div className="info-item">
            <div className="label">Имя:</div>
            <div className="value">{userData.username}</div>
          </div>
          <div className="info-item last-info-item">
            <div className="label">Email:</div>
            <div className="value">{userData.email}</div>
          </div>

          <label className="edit-user-data" onClick={handleEditClick}>
            Редактировать
          </label>
        </div>
      ) : (
        !error && <p>Загрузка данных...</p>
      )}

      {isPopupOpen && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Редактировать данные</h2>
            <div className="popup-inputs">
              <label htmlFor="username">Имя</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
              />

              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
              />

              <label htmlFor="password">Пароль</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
              />

              <label htmlFor="confirmPassword">Подтвердите пароль</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>
            <div className="popup-actions">
              <button onClick={handleSaveChanges}>Сохранить</button>
              <button onClick={handleClosePopup}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

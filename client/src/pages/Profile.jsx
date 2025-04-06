import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import {Notification, notif} from '../components/notification';
import './css/profile.css';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState("");
  const [_, setNewAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Токен не найден");
        return;
      }

      try {
        const response = await fetch("https://api.devsis.ru/user/getUser", {
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
      } catch (err) {
        notif(`${err.message}`, "error");
        console.error("Ошибка при получении данных пользователя:", err);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (userData && userData.image_path) {
      fetchAvatar();
    }
  }, [userData]);

  const fetchAvatar = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("https://api.devsis.ru/user/getAvatar", {
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewAvatar(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        setAvatarPreview(reader.result);

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("avatar", file);

        try {
          const response = await fetch("https://api.devsis.ru/user/setAvatar", {
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
                src={avatarPreview || `https://api.devsis.ru/avatars/${userData.image_path}`}
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

            <div className="info">
              <p><strong>Login:</strong> {userData.login}</p>
              <p><strong>Email:</strong> {userData.email}</p>
              <p><strong>Имя:</strong> {userData.username}</p>
            </div>
          </div>
        ) : (
          !error && <p>Загрузка данных...</p>
        )}
      </div>
  );
};

export default Profile;

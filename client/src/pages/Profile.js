import React from "react";
import Header from "../components/Header";
import './css/profile.css';

const Profile = () => {
  return (
    <div className="profile-container">
      <Header />
      <h1>Профиль пользователя</h1>
    </div>
  );
};

export default Profile;
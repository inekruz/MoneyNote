export const sendNotification = async (title, description) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('https://api.minote.ru/ntf/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при отправке уведомления');
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ошибка при отправке уведомления:', error.message);
      throw error;
    }
  };
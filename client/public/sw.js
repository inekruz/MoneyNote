self.addEventListener('push', function(event) {
    const data = event.data.json();
  
    self.registration.showNotification(data.title, {
      body: data.description,
      icon: './money.png'
    });
  });
  
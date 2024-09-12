document.getElementById('logout').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  });
  
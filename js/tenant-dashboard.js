document.getElementById('logout').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  });
  
  document.getElementById('viewProfile').addEventListener('click', function() {
    window.location.href = '/profile-management';
  });
  
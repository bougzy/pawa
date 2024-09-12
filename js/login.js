document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      alert('Login successful!');
      if (data.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else {
        window.location.href = '/tenant-dashboard';
      }
    } else {
      alert('Invalid login');
    }
  });
  
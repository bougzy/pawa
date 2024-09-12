document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        window.location.href = '/login';  // Redirect to the login page
      } else {
        const errorText = await response.text();
        alert(`Error registering user: ${errorText}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred. Please try again.');
    }
});

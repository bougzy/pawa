document.getElementById('updateProfileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
  
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
  
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, email })
    });
    
    if (response.ok) {
      alert('Profile updated successfully!');
    } else {
      alert('Error updating profile.');
    }
  });
  
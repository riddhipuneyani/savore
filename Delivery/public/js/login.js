document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.createElement('div');
    messageDiv.id = 'message';
    document.querySelector('.login-box').appendChild(messageDiv);

    console.log('Login form:', loginForm);

    const API_BASE_URL = 'http://localhost:3000/api';

    // Function to show alert message
    function showAlert(message, type = 'info') {
        Swal.fire({
            icon: type,
            title: message,
            showConfirmButton: false,
            timer: 1500
        });
    }

    // Function to handle login
    async function handleLogin(deliveryId, password) {
        try {
            showAlert('Logging in...', 'info');

            const response = await fetch(`${API_BASE_URL}/delivery/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ deliveryId, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store the token and user data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showAlert('Login successful!', 'success');
                
                // Redirect to dashboard after 1.5 seconds
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showAlert(data.error || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Cannot connect to server. Please try again later.', 'error');
        }
    }

    // Password toggle functionality
    function togglePassword(inputId, toggleElement) {
        const passwordInput = document.getElementById(inputId);
        const icon = toggleElement.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // Form submission handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const deliveryId = document.getElementById('deliveryId').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!deliveryId || !password) {
            showAlert('Please enter both Delivery ID and Password', 'error');
            return;
        }

        await handleLogin(deliveryId, password);
    });

    // Make togglePassword function globally available
    window.togglePassword = togglePassword;

    // Check if user is already logged in
    async function checkLoginStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await fetch(`${API_BASE_URL}/delivery/verify-token`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    // Token is valid, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Token is invalid, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            } catch (error) {
                console.error('Token verification error:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }

    // Call the async function
    checkLoginStatus();
});


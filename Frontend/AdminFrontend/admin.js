// Check if user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn && !window.location.pathname.includes('admin-login.html')) {
        window.location.href = 'admin-login.html';
    }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // In a real application, this would be an API call
            if (username === 'admin' && password === 'admin123') {
                localStorage.setItem('adminLoggedIn', 'true');
                window.location.href = 'admin-dashboard.html';
            } else {
                errorMessage.textContent = 'Invalid username or password';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('adminLoggedIn');
            window.location.href = 'admin-login.html';
        });
    }
    
    // Check authentication on dashboard
    if (window.location.pathname.includes('admin-dashboard.html')) {
        checkAuth();
    }
});

// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle sidebar menu active state
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Only prevent default if it's the current page
            if (this.getAttribute('href') === window.location.pathname.split('/').pop()) {
                e.preventDefault();
            }
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Handle order actions
    const viewButtons = document.querySelectorAll('.action-btn.view');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // In a real application, this would show order details
            alert('View order details functionality would be implemented here');
        });
    });
    
    const processButtons = document.querySelectorAll('.action-btn.process');
    processButtons.forEach(button => {
        button.addEventListener('click', function() {
            // In a real application, this would process the order
            alert('Process order functionality would be implemented here');
        });
    });
});

// Add smooth transitions
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.stat-card, .recent-orders');
    elements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });
}); 
// Global variables
let cart = [];
const API_URL = 'http://localhost:3000/api';
let isInitialized = false;

// Show/hide loader
function showLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = 'flex';
        console.log('Loader shown');
    }
}

function hideLoader() {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.display = 'none';
        console.log('Loader hidden');
    }
}

// Initialize cart from localStorage
function initializeCart() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        // Load cart for specific user
        const userCart = JSON.parse(localStorage.getItem(`cart_${user.customer_id}`)) || [];
        cart = userCart;
    } else {
        // Clear cart if no user
        cart = [];
    }
    updateCartCount();
}

// Handle logout function
function handleLogout(e) {
    if (e) e.preventDefault();
    console.log('Handling logout');
    
    // Clear user data and cart
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    cart = [];
    localStorage.removeItem('cart');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Cart functions
function addToCart(itemId, name, price, image) {
    // Handle both parameter styles
    let itemData;
    if (typeof itemId === 'object') {
        // Called with object parameter
        itemData = itemId;
    } else {
        // Called with individual parameters
        itemData = {
            id: itemId,
            name: name,
            price: price,
            image: image
        };
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Please login to add items to cart');
        window.location.href = 'login.html';
        return;
    }

    // Validate input data
    if (!itemData.id || !itemData.name || !itemData.price) {
        console.error('Invalid item data:', itemData);
        alert('Invalid item data. Please try again.');
        return;
    }

    // Ensure price is a number
    const numericPrice = parseFloat(itemData.price);
    if (isNaN(numericPrice)) {
        console.error('Invalid price:', itemData.price);
        alert('Invalid price. Please try again.');
        return;
    }

    // Create item object with validated data
    const item = {
        id: itemData.id.toString(),
        name: itemData.name.toString(),
        price: numericPrice,
        image: itemData.image || 'images/default-food.jpg',
        quantity: 1
    };

    // Check if item already exists in cart
    const existingItem = cart.find(i => i.id === item.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push(item);
    }

    // Save cart for specific user
    localStorage.setItem(`cart_${user.customer_id}`, JSON.stringify(cart));
    updateCartCount();
    updateCartDisplay();
}

function updateCartCount() {
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.fa-shopping-cart + span');
    cartCountElements.forEach(element => {
        element.textContent = `(${cartCount})`;
    });
}

// Basic UI initialization
function initializeUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    const guestView = document.getElementById('guest-view');
    const userView = document.getElementById('user-view');
    const usernameSpan = document.getElementById('username');
    const logoutBtn = document.getElementById('logout-btn');
    const menuBtn = document.getElementById('menu-btn');
    const userBtn = document.getElementById('user-btn');
    const navbar = document.querySelector('.navbar');
    const profile = document.querySelector('.profile');

    // Setup menu button
    if (menuBtn) {
        menuBtn.onclick = () => {
            navbar?.classList.toggle('active');
            profile?.classList.remove('active');
        };
    }

    // Setup user button
    if (userBtn) {
        userBtn.onclick = () => {
            profile?.classList.toggle('active');
            navbar?.classList.remove('active');
        };
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profile?.contains(e.target) && !userBtn?.contains(e.target)) {
            profile?.classList.remove('active');
        }
    });

    // Update login status
    if (user && token) {
        console.log('User is logged in, showing user view');
        if (guestView) {
            guestView.style.display = 'none';
            console.log('Guest view hidden');
        }
        if (userView) {
            userView.style.display = 'block';
            console.log('User view shown');
        }
        if (usernameSpan) {
            usernameSpan.textContent = user.name;
            console.log('Username set to:', user.name);
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-block';
            logoutBtn.onclick = handleLogout;
            console.log('Logout button shown');
        }
    } else {
        console.log('No user logged in, showing guest view');
        if (guestView) {
            guestView.style.display = 'block';
            console.log('Guest view shown');
        }
        if (userView) {
            userView.style.display = 'none';
            console.log('User view hidden');
        }
        
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
            logoutBtn.onclick = null;
            console.log('Logout button hidden');
        }
    }
}

// Initialize everything when the page loads
async function initializePage() {
    if (isInitialized) {
        console.log('Page already initialized, skipping...');
        return;
    }

    console.log('Initializing page...');
    showLoader();
    
    try {
        // Initialize cart first
        initializeCart();
        
        // Initialize UI
        initializeUI();
        
        // Check if we need to redirect to login
        const currentPage = window.location.pathname.split('/').pop();
        const protectedPages = ['profile.html', 'orders.html', 'checkout.html', 'cart.html'];
        
        if (protectedPages.includes(currentPage) && !localStorage.getItem('token')) {
            console.log('Protected page accessed without auth, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        // Initialize specific page features
        if (currentPage === 'about.html') {
            await fetchAndDisplayFeedbacks();
        } else if (currentPage === 'checkout.html') {
            await initializeCheckout();
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    } finally {
        isInitialized = true;
        hideLoader();
    }
}

// Initialize only once when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializePage();
});

// Make functions available globally
window.handleLogout = handleLogout;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.updateCartDisplay = updateCartDisplay;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;

// Function to fetch and update profile data
async function fetchProfileData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, user not logged in');
            return null;
        }

        console.log('Fetching profile data...');
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Profile response status:', response.status);
        const data = await response.json();
        console.log('Profile data:', data);

        if (response.ok && data.user) {
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('Updated user data in localStorage');
            return data.user;
        } else {
            console.error('Failed to fetch profile:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}

// Update login status function
async function updateLoginStatus() {
    console.log('Updating login status');
    const token = localStorage.getItem('token');
    let user = JSON.parse(localStorage.getItem('user'));

    if (token) {
        // Try to fetch fresh profile data
        const profileData = await fetchProfileData();
        if (profileData) {
            user = profileData;
            // Initialize cart for the new user
            initializeCart();
        }
    } else {
        // Clear cart if no user
        cart = [];
        localStorage.removeItem('cart');
        updateCartCount();
        updateCartDisplay();
    }

    const profileLinks = document.querySelectorAll('a[href="profile.html"]');
    const logoutBtns = document.querySelectorAll('#logout-btn, #profile-logout-btn');
    const userViews = document.querySelectorAll('.user-view, #user-view');
    const guestViews = document.querySelectorAll('.guest-view, #guest-view');
    const usernames = document.querySelectorAll('.username, #username, .user-name');

    if (user && token) {
        // User is logged in
        userViews.forEach(view => view.style.display = 'block');
        guestViews.forEach(view => view.style.display = 'none');
        usernames.forEach(span => span.textContent = user.name);
        logoutBtns.forEach(btn => {
            btn.style.display = 'inline-block';
            btn.onclick = handleLogout;
        });
    } else {
        // User is not logged in
        userViews.forEach(view => view.style.display = 'none');
        guestViews.forEach(view => view.style.display = 'block');
        usernames.forEach(span => span.textContent = 'Guest');
        logoutBtns.forEach(btn => {
            btn.style.display = 'none';
            btn.onclick = null;
        });
    }
}

// Function to show profile dropdown
function showProfileDropdown() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const profileDropdowns = document.querySelectorAll('.profile, .profile-dropdown');
    profileDropdowns.forEach(dropdown => {
        // Create or update dropdown content
        if (!dropdown.querySelector('.profile-content')) {
            const content = document.createElement('div');
            content.className = 'profile-content';
            content.innerHTML = `
                <div class="user-info">
                    <h3>${user.name}</h3>
                    <a href="profile.html" class="profile-link">Profile</a>
                    <button id="profile-logout-btn" class="logout-btn">Logout</button>
                </div>
            `;
            dropdown.appendChild(content);
        }
        dropdown.classList.toggle('active');
    });

    // Add click handler for new logout buttons
    const newLogoutBtns = document.querySelectorAll('#profile-logout-btn');
    newLogoutBtns.forEach(btn => {
        btn.removeEventListener('click', handleLogout);
        btn.addEventListener('click', handleLogout);
    });
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartTotal = document.getElementById('cart-total');
    const deleteAllBtn = document.getElementById('delete-all-btn');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!cartContainer || !emptyCart) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '';
        emptyCart.style.display = 'block';
        if (cartTotal) cartTotal.textContent = '₹0';
        if (deleteAllBtn) deleteAllBtn.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    if (deleteAllBtn) deleteAllBtn.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'inline-block';

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = `₹${total}`;

    // Create cart items HTML
    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-times"></i>
            </button>
            <img src="${item.image || 'images/default-food.jpg'}" alt="${item.name}" onerror="this.src='images/default-food.jpg'">
            <div class="name">${item.name || 'Unnamed Item'}</div>
            <div class="price">₹${item.price || 0}</div>
            <div class="quantity">
                <label>Quantity:</label>
                <input type="number" min="1" value="${item.quantity || 1}" 
                    onchange="updateQuantity('${item.id}', this.value)">
            </div>
            <div class="sub-total">Sub Total: <span>₹${(item.price || 0) * (item.quantity || 1)}</span></div>
        </div>
    `).join('');
}

function removeFromCart(itemId) {
    if (confirm('Are you sure you want to remove this item from your cart?')) {
        cart = cart.filter(item => item.id !== itemId);
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            localStorage.setItem(`cart_${user.customer_id}`, JSON.stringify(cart));
        }
        updateCartCount();
        updateCartDisplay();
    }
}

function updateQuantity(itemId, newQuantity) {
    const quantity = parseInt(newQuantity);
    if (quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }

    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity = quantity;
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            localStorage.setItem(`cart_${user.customer_id}`, JSON.stringify(cart));
        }
        updateCartCount();
        updateCartDisplay();
    }
}

function clearCart() {
    if (confirm('Clear all items from cart?')) {
        cart = [];
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            localStorage.setItem(`cart_${user.customer_id}`, JSON.stringify(cart));
        }
        updateCartCount();
        updateCartDisplay();
    }
}

window.onscroll = () => {
    if (profile) profile.classList.remove('active');
    if (navbar) navbar.classList.remove('active');
}

// User authentication handling
document.addEventListener("DOMContentLoaded", function () {
    // Login Form Handling
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log('Login form found, adding submit handler');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Login form submitted');
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            console.log('Login attempt with email:', email);

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                console.log('Login response status:', response.status);
                const data = await response.json();
                console.log('Login response data:', data);

                if (response.ok) {
                    console.log('Login successful, storing user data');
                    // Store user data and token
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('loggedInUser', data.user.name);
                    
                    console.log('User data stored in localStorage:', {
                        user: data.user,
                        token: data.token,
                        loggedInUser: data.user.name
                    });
                    
                    // Update UI
                    updateLoginStatus();
                    
                    // Show success message
                    alert('Login successful!');
                    
                    // Redirect to home page
                    console.log('Redirecting to home page');
                    window.location.href = 'home.html';
                } else {
                    console.error('Login failed:', data.error);
                    alert(data.error || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }

    // Registration Form Handling
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        console.log('Register form found, adding submit handler');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Register form submitted');
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone_number = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value.trim();
            const cpassword = document.getElementById('cpassword').value.trim();
            const address = document.getElementById('address').value.trim();

            // Validate all fields are filled
            if (!name || !email || !phone_number || !password || !cpassword || !address) {
                alert('Please fill in all fields');
                return;
            }

            // Validate passwords match
            if (password !== cpassword) {
                alert('Passwords do not match!');
                return;
            }

            // Validate phone number
            if (!/^\d{10}$/.test(phone_number)) {
                alert('Please enter a valid 10-digit phone number');
                return;
            }

            try {
                console.log('Sending registration request with:', { name, email, phone_number, address });
                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        phone_number: phone_number, // Ensure phone_number is explicitly set
                        password,
                        address
                    })
                });

                console.log('Register response status:', response.status);
                const data = await response.json();
                console.log('Register response data:', data);

                if (response.ok) {
                    console.log('Registration successful');
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    console.error('Registration failed:', data.error);
                    alert(data.error || 'Registration failed. Please try again.');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }
});

// Checkout Process
async function initializeCheckout() {
    console.log('Initializing checkout...');
    const checkoutForm = document.getElementById('checkout-form');
    const paymentMethod = document.getElementById('payment-method');
    const cardDetails = document.getElementById('card-details');
    const upiDetails = document.getElementById('upi-details');
    const cartItemsContainer = document.getElementById('cart-items');
    const totalAmountSpan = document.getElementById('total-amount');

    if (!checkoutForm) {
        console.error('Checkout form not found');
        return;
    }

    try {
        // Fetch customer information from profile endpoint
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        console.log('Fetching customer profile...');
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        console.log('Profile data:', data);

        if (data.user) {
            // Pre-fill form with customer information
            document.getElementById('name').value = data.user.name || '';
            document.getElementById('email').value = data.user.email || '';
            document.getElementById('phone').value = data.user.phone_number || '';
            document.getElementById('address').value = data.user.address || '';
            console.log('Form populated with customer data');
        }

        // Display cart items and total
        if (cartItemsContainer && totalAmountSpan) {
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
                totalAmountSpan.textContent = '0';
            } else {
                // Clear existing items
                cartItemsContainer.innerHTML = '';
                
                // Add each cart item
                cart.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'cart-item';
                    itemElement.innerHTML = `
                        <div class="item-name">${item.name}</div>
                        <div class="item-quantity">Qty: ${item.quantity}</div>
                        <div class="item-price">₹${item.price * item.quantity}</div>
                    `;
                    cartItemsContainer.appendChild(itemElement);
                });

                // Calculate and display total
                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                totalAmountSpan.textContent = total.toFixed(2);
            }
        }

    } catch (error) {
        console.error('Error fetching customer information:', error);
    }

    // Handle payment method change
    paymentMethod?.addEventListener('change', (e) => {
        const method = e.target.value;
        cardDetails.style.display = (method === 'credit-card' || method === 'debit-card') ? 'block' : 'none';
        upiDetails.style.display = method === 'upi' ? 'block' : 'none';
    });

    // Handle form submission
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!localStorage.getItem('token')) {
            alert('Please login to place an order');
            window.location.href = 'login.html';
            return;
        }

        const orderData = {
            items: cart,
            total: calculateCartTotal(),
            deliveryInfo: {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                pincode: document.getElementById('pincode').value
            },
            payment: {
                method: paymentMethod.value,
                details: (paymentMethod.value === 'credit-card' || paymentMethod.value === 'debit-card') ? {
                    cardNumber: document.getElementById('card-number').value,
                    expiry: document.getElementById('card-expiry').value,
                    cvv: document.getElementById('card-cvv').value
                } : paymentMethod.value === 'upi' ? {
                    upiId: document.getElementById('upi-id').value
                } : null
            }
        };

        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Order placed successfully!');
                cart = [];
                localStorage.setItem('cart', JSON.stringify(cart));
                window.location.href = 'orders.html';
            } else {
                throw new Error('Failed to place order');
            }
        } catch (error) {
            alert('Error placing order. Please try again.');
            console.error('Order error:', error);
        }
    });
}

// Function to fetch and display feedbacks
async function fetchAndDisplayFeedbacks() {
    try {
        const response = await fetch(`${API_URL}/feedbacks`);
        if (!response.ok) {
            throw new Error('Failed to fetch feedbacks');
        }
        const feedbacks = await response.json();
        
        // Get the reviews slider container
        const reviewsSlider = document.querySelector('.reviews-slider .swiper-wrapper');
        if (!reviewsSlider) return;

        // Clear existing reviews
        reviewsSlider.innerHTML = '';

        // Add each feedback to the slider
        feedbacks.forEach(feedback => {
            const reviewHTML = `
                <div class="swiper-slide slide">
                    <img src="images/pic-${Math.floor(Math.random() * 6) + 1}.png" alt="${feedback.CUSTOMER_NAME}">
                    <p>${feedback.FEEDBACK_TEXT || 'No feedback text provided'}</p>
                    <div class="stars">
                        ${Array(5).fill().map((_, i) => `
                            <i class="fas fa-star${i < feedback.RATING_SCORE ? '' : '-half-alt'}"></i>
                        `).join('')}
                    </div>
                    <h3>${feedback.CUSTOMER_NAME}</h3>
                </div>
            `;
            reviewsSlider.insertAdjacentHTML('beforeend', reviewHTML);
        });

        // Initialize Swiper if not already initialized
        if (!window.reviewsSwiper) {
            window.reviewsSwiper = new Swiper('.reviews-slider', {
                slidesPerView: 1,
                spaceBetween: 20,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true
                },
                breakpoints: {
                    640: {
                        slidesPerView: 2
                    },
                    768: {
                        slidesPerView: 3
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
    }
}
let map;
let markers = [];
let currentFilter = 'all';

// Initialize the map
function initMap() {
    // Default to Manipal coordinates
    map = L.map('map').setView([13.3470, 74.7860], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Function to fetch and display deliveries
async function fetchDeliveries() {
    try {
        const response = await fetch('/api/deliveries');
        const deliveries = await response.json();
        
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Clear existing booking cards
        const bookingSection = document.querySelector('.bookings-section');
        const existingCards = bookingSection.querySelectorAll('.booking-card');
        existingCards.forEach(card => card.remove());

        // Process each delivery
        deliveries.forEach(delivery => {
            if (currentFilter === 'all' || 
                (currentFilter === 'pending' && delivery.DELIVERY_STATUS === 'Out for Delivery') ||
                (currentFilter === 'scheduled' && delivery.DELIVERY_STATUS === 'Delivered')) {
                
                // Add marker to map
                const marker = L.marker([13.3470, 74.7860]) // Replace with actual coordinates
                    .bindPopup(`
                        <b>Order #${delivery.ORDER_ID}</b><br>
                        Customer: ${delivery.CUSTOMER_NAME}<br>
                        Status: ${delivery.DELIVERY_STATUS}
                    `);
                marker.addTo(map);
                markers.push(marker);

                // Add booking card
                const card = document.createElement('div');
                card.className = 'booking-card';
                card.innerHTML = `
                    <div>Order ID: ${delivery.ORDER_ID}</div>
                    <div>Status: ${delivery.DELIVERY_STATUS}</div>
                    <div>Customer: ${delivery.CUSTOMER_NAME}</div>
                    <div>Address: ${delivery.DELIVERY_ADDRESS}</div>
                    <div>Delivery Person: ${delivery.DELIVERY_PERSON_NAME || 'Not Assigned'}</div>
                `;
                bookingSection.appendChild(card);
            }
        });
    } catch (error) {
        console.error('Error fetching deliveries:', error);
    }
}

// Filter button event listeners
document.getElementById('btn-all').addEventListener('click', () => {
    currentFilter = 'all';
    fetchDeliveries();
});

document.getElementById('btn-pending').addEventListener('click', () => {
    currentFilter = 'pending';
    fetchDeliveries();
});

document.getElementById('btn-scheduled').addEventListener('click', () => {
    currentFilter = 'scheduled';
    fetchDeliveries();
});

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const token = localStorage.getItem('delivery_token');
    const user = JSON.parse(localStorage.getItem('delivery_user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    let currentFilter = 'all';
    let orders = [];

    // Function to fetch employee details
    async function fetchEmployeeDetails() {
        try {
            const response = await fetch('http://localhost:3000/api/delivery/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch employee details');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching employee details:', error);
            return null;
        }
    }

    // Function to fetch orders
    async function fetchOrders() {
        try {
            const response = await fetch('http://localhost:3000/api/delivery/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    }

    // Function to update orders display
    function updateOrdersDisplay() {
        const bookingsSection = document.querySelector('.bookings-section');
        let bookingCardsContainer = bookingsSection.querySelector('.booking-cards-container');
        
        // Create container if it doesn't exist
        if (!bookingCardsContainer) {
            bookingCardsContainer = document.createElement('div');
            bookingCardsContainer.className = 'booking-cards-container';
            // Find the filters div and insert container after it
            const filtersDiv = bookingsSection.querySelector('.booking-filters');
            filtersDiv.after(bookingCardsContainer);
        }

        // Clear existing cards
        bookingCardsContainer.innerHTML = '';

        // Filter orders based on current filter
        const filteredOrders = orders.filter(order => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'pending') return order.deliveryStatus === 'Out for Delivery';
            if (currentFilter === 'scheduled') return order.deliveryStatus === 'Delivered';
            return true;
        });

        if (filteredOrders.length === 0) {
            const noOrdersCard = document.createElement('div');
            noOrdersCard.className = 'booking-card';
            noOrdersCard.textContent = 'No orders found';
            bookingCardsContainer.appendChild(noOrdersCard);
            return;
        }

        filteredOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                <div class="order-header">
                    <span class="order-id">Order #${order.orderId}</span>
                    <span class="order-status ${order.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}">${order.deliveryStatus}</span>
                </div>
                <div class="order-details">
                    <div><strong>Customer:</strong> ${order.customerName}</div>
                    <div><strong>Phone:</strong> ${order.customerPhone}</div>
                    <div><strong>Address:</strong> ${order.deliveryAddress}</div>
                    <div><strong>Total:</strong> ₹${order.totalPrice}</div>
                    <div><strong>Date:</strong> ${new Date(order.orderDate).toLocaleString()}</div>
                </div>
            `;
            bookingCardsContainer.appendChild(card);
        });
    }

    // Update profile name
    async function updateProfileName() {
        const profileNameElement = document.getElementById('profile-name');
        const employeeDetails = await fetchEmployeeDetails();

        if (employeeDetails && employeeDetails.name) {
            profileNameElement.textContent = employeeDetails.name;
        } else {
            profileNameElement.textContent = 'Error loading name';
        }
    }

    // Initialize map
    function initMap() {
        const map = L.map('map').setView([13.3470, 74.7860], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Initialize everything
    initMap();
    updateProfileName();

    // Fetch and display orders
    orders = await fetchOrders();
    updateOrdersDisplay();

    // Add event listeners for filter buttons with active state
    const filterButtons = {
        'btn-all': 'all',
        'btn-pending': 'pending',
        'btn-scheduled': 'scheduled'
    };

    Object.entries(filterButtons).forEach(([buttonId, filter]) => {
        const button = document.getElementById(buttonId);
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.booking-filters button').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            button.classList.add('active');
            currentFilter = filter;
            updateOrdersDisplay();
        });
    });

    // Set initial active button
    document.getElementById('btn-all').classList.add('active');

    // Refresh orders every 30 seconds
    setInterval(async () => {
        orders = await fetchOrders();
        updateOrdersDisplay();
    }, 30000);
});

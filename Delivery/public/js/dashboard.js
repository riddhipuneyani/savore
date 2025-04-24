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
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    fetchDeliveries();
    
    // Refresh deliveries every 30 seconds
    setInterval(fetchDeliveries, 30000);
});

// Global variables and functions
let token;
let user;

// Function to fetch deliveries
async function fetchDeliveries() {
    try {
        const response = await fetch('http://localhost:3000/api/delivery/orders', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch deliveries');
        }

        const deliveries = await response.json();
        return deliveries;
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch deliveries'
        });
        return [];
    }
}

// Function to display deliveries
window.displayDeliveries = async function() {
    const container = document.querySelector('.content');
    const deliveries = await fetchDeliveries();
    
    // Clear existing delivery cards
    const existingCards = container.querySelectorAll('.delivery-card');
    existingCards.forEach(card => card.remove());

    if (deliveries.length === 0) {
        const noDeliveries = document.createElement('div');
        noDeliveries.className = 'delivery-card';
        noDeliveries.textContent = 'No deliveries found';
        container.appendChild(noDeliveries);
        return;
    }

    // Create new delivery cards
    deliveries.forEach(delivery => {
        const card = document.createElement('div');
        card.className = 'delivery-card';
        
        // Only show status dropdown and update button for "Out for Delivery" orders
        const statusControls = delivery.deliveryStatus === 'Out for Delivery' 
            ? `
                <select id="status-${delivery.orderId}">
                    <option value="Out for Delivery" selected>Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
                <button onclick="updateStatus('${delivery.deliveryId}', '${delivery.orderId}', document.getElementById('status-${delivery.orderId}').value)">Update Status</button>
            `
            : `<p class="status-display">Status: ${delivery.deliveryStatus}</p>`;

        card.innerHTML = `
            <h3>Order #${delivery.orderId}</h3>
            <p>Customer: ${delivery.customerName}</p>
            <p>Address: ${delivery.deliveryAddress}</p>
            <p>Phone: ${delivery.customerPhone}</p>
            <p>Total Amount: ₹${delivery.totalPrice}</p>
            <p>Order Date: ${new Date(delivery.orderDate).toLocaleString()}</p>
            ${statusControls}
        `;
        container.appendChild(card);
    });
};

// Function to update status
window.updateStatus = async function(deliveryId, orderId, newStatus) {
    try {
        const response = await fetch(`http://localhost:3000/api/delivery/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update status');
        }

        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Delivery status updated successfully'
        });
        
        // Refresh the deliveries list
        displayDeliveries();
    } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to update delivery status'
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    token = localStorage.getItem('delivery_token');
    user = JSON.parse(localStorage.getItem('delivery_user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Initial display of deliveries
    displayDeliveries();

    // Refresh deliveries every 30 seconds
    setInterval(displayDeliveries, 30000);
});

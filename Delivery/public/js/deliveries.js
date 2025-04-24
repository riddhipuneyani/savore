// Function to fetch and display deliveries
async function fetchDeliveries() {
    try {
        const response = await fetch('/api/deliveries');
        const deliveries = await response.json();
        const container = document.querySelector('.content');
        
        // Clear existing delivery cards
        const existingCards = container.querySelectorAll('.delivery-card');
        existingCards.forEach(card => card.remove());

        // Create new delivery cards
        deliveries.forEach(delivery => {
            const card = document.createElement('div');
            card.className = 'delivery-card';
            card.innerHTML = `
                <h3>Order #${delivery.ORDER_ID}</h3>
                <p>Customer: ${delivery.CUSTOMER_NAME}</p>
                <p>Address: ${delivery.DELIVERY_ADDRESS}</p>
                <p>Delivery Time: ${new Date(delivery.DELIVERY_TIME).toLocaleString()}</p>
                <select id="status-${delivery.DELIVERY_ID}-${delivery.ORDER_ID}">
                    <option value="Out for Delivery" ${delivery.DELIVERY_STATUS === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${delivery.DELIVERY_STATUS === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${delivery.DELIVERY_STATUS === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button onclick="updateStatus('${delivery.DELIVERY_ID}', '${delivery.ORDER_ID}')">Update Status</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching deliveries:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch deliveries'
        });
    }
}

// Function to update delivery status
async function updateStatus(deliveryId, orderId) {
    const statusSelect = document.getElementById(`status-${deliveryId}-${orderId}`);
    const newStatus = statusSelect.value;

    try {
        const response = await fetch(`/api/deliveries/${deliveryId}/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Delivery status updated successfully'
            });
            fetchDeliveries(); // Refresh the deliveries list
        } else {
            throw new Error('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to update delivery status'
        });
    }
}

// Fetch deliveries when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchDeliveries();
    
    // Refresh deliveries every 30 seconds
    setInterval(fetchDeliveries, 30000);
});

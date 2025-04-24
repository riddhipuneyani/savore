// Check if user is logged in
document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

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

    // Function to update delivery status
    async function updateStatus(deliveryId, orderId, newStatus) {
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
                throw new Error('Failed to update status');
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
                text: 'Failed to update delivery status'
            });
        }
    }

    // Function to display deliveries
    async function displayDeliveries() {
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
            card.innerHTML = `
                <h3>Order #${delivery.orderId}</h3>
                <p>Customer: ${delivery.customerName}</p>
                <p>Address: ${delivery.deliveryAddress}</p>
                <p>Phone: ${delivery.customerPhone}</p>
                <p>Total Amount: ₹${delivery.totalPrice}</p>
                <p>Order Date: ${new Date(delivery.orderDate).toLocaleString()}</p>
                <select id="status-${delivery.orderId}">
                    <option value="Out for Delivery" ${delivery.deliveryStatus === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${delivery.deliveryStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${delivery.deliveryStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button onclick="updateStatus('${delivery.deliveryId}', '${delivery.orderId}', document.getElementById('status-${delivery.orderId}').value)">Update Status</button>
            `;
            container.appendChild(card);
        });
    }

    // Initial display of deliveries
    displayDeliveries();

    // Refresh deliveries every 30 seconds
    setInterval(displayDeliveries, 30000);
});

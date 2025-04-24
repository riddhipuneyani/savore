// Function to fetch and display profile details
async function fetchProfileDetails() {
    try {
        const token = localStorage.getItem('delivery_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('http://localhost:3000/api/delivery/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile details');
        }

        const profile = await response.json();
        
        // Update the profile information in the HTML
        document.getElementById('name').textContent = profile.name;
        document.getElementById('deliveryId').textContent = profile.deliveryId;
        document.getElementById('phone').textContent = profile.phoneNumber;
    } catch (error) {
        console.error('Error fetching profile:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load profile details'
        });
    }
}

// Function to handle logout
function logout() {
    // Clear delivery-specific tokens and user data
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
    window.location.href = 'login.html';
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchProfileDetails();
});

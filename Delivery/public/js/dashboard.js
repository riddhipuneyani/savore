const bookings = [
    { id: 123, status: 'Pending', pickup: 'Manipal University', drop: 'Manipal Hospital', lat: 13.3522, lng: 74.7915 },
    { id: 124, status: 'Scheduled', pickup: 'Tiger Circle', drop: 'Endpoint Park', lat: 13.3498, lng: 74.7876 },
    { id: 125, status: 'Pending', pickup: 'Manipal Lake', drop: 'Manipal University', lat: 13.3528, lng: 74.8001 }
];

let map;
let markerGroup;

function initMap() {
    const defaultLocation = [13.3522, 74.7915];
    map = L.map('map').setView(defaultLocation, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markerGroup = L.layerGroup().addTo(map);
    renderView('All');
}

function renderView(status) {
    renderMarkers(status);
    renderCards(status);
}

function renderMarkers(status) {
    markerGroup.clearLayers();
    const filtered = status === 'All' ? bookings : bookings.filter(b => b.status === status);
    filtered.forEach(booking => {
        const marker = L.marker([booking.lat, booking.lng]);
        marker.bindPopup(`
            <b>Order #${booking.id}</b><br>
            Status: ${booking.status}<br>
            Pickup: ${booking.pickup}<br>
            Drop: ${booking.drop}
        `);
        markerGroup.addLayer(marker);
    });
}

function renderCards(status) {
    const section = document.querySelector('.bookings-section');
    
    // Remove old cards
    const oldCards = section.querySelectorAll('.booking-card');
    oldCards.forEach(card => card.remove());

    const filtered = status === 'All' ? bookings : bookings.filter(b => b.status === status);
    
    filtered.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
            <div>Order ID: ${booking.id}</div>
            <div>Status: ${booking.status}</div>
            <div>Pickup: ${booking.pickup}</div>
            <div>Drop: ${booking.drop}</div>
        `;
        section.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    document.getElementById('btn-all').addEventListener('click', () => renderView('All'));
    document.getElementById('btn-pending').addEventListener('click', () => renderView('Pending'));
    document.getElementById('btn-scheduled').addEventListener('click', () => renderView('Scheduled'));
});

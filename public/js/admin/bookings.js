document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    // Load bookings
    loadBookings();

    // Setup status filter
    document.getElementById('statusFilter').addEventListener('change', loadBookings);

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });

    // Add event listener for status select changes
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-select')) {
            e.target.setAttribute('data-original-value', e.target.getAttribute('data-original-value') || e.target.value);
        }
    });
});

async function loadBookings() {
    try {
        const token = localStorage.getItem('token');
        const statusFilter = document.getElementById('statusFilter').value;
        const url = statusFilter ? `/api/bookings/admin?status=${statusFilter}` : '/api/bookings/admin';

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookingsList').innerHTML = '<p>Error loading bookings</p>';
    }
}

function displayBookings(bookings) {
    if (bookings.length === 0) {
        document.getElementById('bookingsList').innerHTML = '<p>No bookings found</p>';
        return;
    }

    const bookingsHtml = bookings.map(booking => `
        <div class="booking-item">
            <div class="movie-info">
                <h3>${booking.movie.title}</h3>
                <p><strong>User:</strong> ${booking.user.name} (${booking.user.email})</p>
                <p><strong>Theater:</strong> ${booking.theater.name} - ${booking.theater.location}</p>
                <p><strong>Show Time:</strong> ${booking.showTime}</p>
                <p><strong>Seats:</strong> ${booking.seats.map(seat => seat.seatNumber).join(', ')}</p>
                <p><strong>Total Amount:</strong> $${booking.totalAmount}</p>
                <p><strong>Status:</strong> 
                    <select class="status-select" data-booking-id="${booking._id}" onchange="updateBookingStatus(this)">
                        <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </p>
                <p><strong>Booking Date:</strong> ${new Date(booking.bookingDate).toLocaleString()}</p>
            </div>
        </div>
    `).join('');

    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = `
        <div class="bookings-container">
            ${bookingsHtml}
        </div>
    `;
}

async function updateBookingStatus(selectElement) {
    const bookingId = selectElement.dataset.bookingId;
    const newStatus = selectElement.value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Booking status updated successfully');
            loadBookings(); // Refresh the bookings list
        } else {
            // Handle validation errors
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessage = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
                alert(`Validation Error:\n${errorMessage}`);
            } else {
                alert(data.message || 'Error updating booking status');
            }
            // Revert the select value
            selectElement.value = selectElement.getAttribute('data-original-value') || 'pending';
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        alert('Error updating booking status');
        // Revert the select value
        selectElement.value = selectElement.getAttribute('data-original-value') || 'pending';
    }
} 
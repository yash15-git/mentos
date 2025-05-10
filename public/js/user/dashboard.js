document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'user') {
        window.location.href = '/index.html';
        return;
    }

    // Load movies
    loadMovies();

    // Setup filters
    setupFilters();

    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    });
});

let currentMovie = null;
let selectedSeats = [];

async function loadMovies() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/movies', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const movies = await response.json();
        displayMovies(movies);
        updateFilters(movies);
    } catch (error) {
        console.error('Error loading movies:', error);
        document.getElementById('movieList').innerHTML = '<p>Error loading movies</p>';
    }
}

function displayMovies(movies) {
    if (!movies || !Array.isArray(movies)) {
        console.error('Invalid movies data:', movies);
        document.getElementById('movieList').innerHTML = '<p>Error loading movies</p>';
        return;
    }

    const moviesHtml = movies.map(movie => `
        <div class="movie-card">
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.description}</p>
                <p><strong>Genre:</strong> ${movie.genre}</p>
                <p><strong>Duration:</strong> ${movie.duration} minutes</p>
                <p><strong>Release Date:</strong> ${new Date(movie.releaseDate).toLocaleDateString()}</p>
                <button class="btn" onclick="openBookingModal('${movie._id}')">Book Now</button>
            </div>
        </div>
    `).join('');

    document.getElementById('movieList').innerHTML = moviesHtml || '<p>No movies found</p>';
}

function updateFilters(movies) {
    if (!movies || !Array.isArray(movies)) {
        console.error('Invalid movies data:', movies);
        return;
    }

    const genres = [...new Set(movies.map(movie => movie.genre).filter(Boolean))];
    const locations = [...new Set(movies.flatMap(movie => 
        movie.theaters ? movie.theaters.map(t => t.location).filter(Boolean) : []
    ))];

    const genreFilter = document.getElementById('genreFilter');
    const locationFilter = document.getElementById('locationFilter');

    if (genreFilter) {
        genreFilter.innerHTML = '<option value="">All Genres</option>' +
            genres.map(genre => `<option value="${genre}">${genre}</option>`).join('');
    }

    if (locationFilter) {
        locationFilter.innerHTML = '<option value="">All Locations</option>' +
            locations.map(location => `<option value="${location}">${location}</option>`).join('');
    }
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const locationFilter = document.getElementById('locationFilter');

    // Add debouncing for search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    genreFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
}

async function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const locationFilter = document.getElementById('locationFilter');

    const search = searchInput.value.trim();
    const genre = genreFilter.value;
    const location = locationFilter.value;

    try {
        const token = localStorage.getItem('token');
        let url;
        let response;

        if (search) {
            // Use the search endpoint for text search
            url = `/api/movies/search?q=${encodeURIComponent(search)}`;
            response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else {
            // Use the main endpoint for genre and location filters
            url = '/api/movies';
            const params = [];
            if (genre) params.push(`genre=${encodeURIComponent(genre)}`);
            if (location) params.push(`location=${encodeURIComponent(location)}`);
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
            response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        console.log('Request URL:', url); // Debug log

        if (!response.ok) {
            throw new Error('Failed to fetch movies');
        }

        const movies = await response.json();
        console.log('Received movies:', movies.length); // Debug log
        displayMovies(movies);
    } catch (error) {
        console.error('Error applying filters:', error);
        document.getElementById('movieList').innerHTML = '<p>Error loading movies</p>';
    }
}

async function openBookingModal(movieId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/movies/${movieId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const movie = await response.json();
        currentMovie = movie;

        // Update modal content
        document.getElementById('movieDetails').innerHTML = `
            <h3>${movie.title}</h3>
            <p>${movie.description}</p>
        `;

        // Update theater select
        const theaterSelect = document.getElementById('theaterSelect');
        theaterSelect.innerHTML = movie.theaters.map(theater => 
            `<option value="${theater.name}|${theater.location}">${theater.name} - ${theater.location}</option>`
        ).join('');

        // Update show times when theater is selected
        theaterSelect.addEventListener('change', updateShowTimes);
        updateShowTimes();

        // Show modal
        document.getElementById('bookingModal').style.display = 'block';
    } catch (error) {
        console.error('Error opening booking modal:', error);
        alert('Error loading movie details');
    }
}
window.addEventListener("load", function() {
    document.getElementById("target-section").scrollIntoView({ behavior: "smooth" });
  });
function updateShowTimes() {
    const theaterSelect = document.getElementById('theaterSelect');
    const showTimeSelect = document.getElementById('showTimeSelect');
    const [theaterName, location] = theaterSelect.value.split('|');

    const theater = currentMovie.theaters.find(t => t.name === theaterName && t.location === location);
    if (theater) {
        showTimeSelect.innerHTML = theater.showTimes.map(st => 
            `<option value="${st.time}">${st.time}</option>`
        ).join('');

        // Update seat layout when show time is selected
        showTimeSelect.addEventListener('change', updateSeatLayout);
        updateSeatLayout();
    }
}

function updateSeatLayout() {
    const theaterSelect = document.getElementById('theaterSelect');
    const showTimeSelect = document.getElementById('showTimeSelect');
    const [theaterName, location] = theaterSelect.value.split('|');

    const theater = currentMovie.theaters.find(t => t.name === theaterName && t.location === location);
    const showTime = theater.showTimes.find(st => st.time === showTimeSelect.value);

    if (showTime) {
        const seatLayout = document.getElementById('seatLayout');
        seatLayout.innerHTML = showTime.seats.map(seat => `
            <div class="seat ${seat.isBooked ? 'booked' : ''}" 
                 data-seat="${seat.seatNumber}"
                 onclick="${seat.isBooked ? '' : 'toggleSeat(this)'}">
                ${seat.seatNumber}
            </div>
        `).join('');

        selectedSeats = [];
        updateBookingSummary();
    }
}

function toggleSeat(seatElement) {
    const seatNumber = seatElement.dataset.seat;
    const index = selectedSeats.indexOf(seatNumber);

    if (index === -1) {
        selectedSeats.push(seatNumber);
        seatElement.classList.add('selected');
    } else {
        selectedSeats.splice(index, 1);
        seatElement.classList.remove('selected');
    }

    updateBookingSummary();
}

function updateBookingSummary() {
    document.getElementById('selectedSeats').textContent = selectedSeats.length;
    document.getElementById('totalAmount').textContent = (selectedSeats.length * 10).toFixed(2);
}

// Close modal when clicking the X
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('bookingModal').style.display = 'none';
    selectedSeats = [];
});

// Confirm booking
document.getElementById('confirmBooking').addEventListener('click', async () => {
    if (selectedSeats.length === 0) {
        alert('Please select at least one seat');
        return;
    }

    const theaterSelect = document.getElementById('theaterSelect');
    const showTimeSelect = document.getElementById('showTimeSelect');
    const [theaterName, location] = theaterSelect.value.split('|');

    const bookingData = {
        movieId: currentMovie._id,
        theater: {
            name: theaterName,
            location: location
        },
        showTime: showTimeSelect.value,
        seats: selectedSeats.map(seatNumber => ({
            seatNumber,
            price: 10
        }))
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingData)
        });

        if (response.ok) {
            alert('Booking confirmed successfully!');
            document.getElementById('bookingModal').style.display = 'none';
            selectedSeats = [];
            loadMovies(); // Refresh movie list to update seat availability
        } else {
            const data = await response.json();
            alert(data.message || 'Error confirming booking');
        }
    } catch (error) {
        console.error('Error confirming booking:', error);
        alert('Error confirming booking');
    }
}); 
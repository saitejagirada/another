document.addEventListener('DOMContentLoaded', function() {
    let map;
    let markers = [];
    const bounds = new google.maps.LatLngBounds();
    
    // Initialize Google Map
    function initMap() {
        try {
            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 12,
                center: { lat: 0, lng: 0 },
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ]
            });
            
            // Load and display pools after map is initialized
            const pools = getAllPools();
            displayPools(pools);
        } catch (error) {
            console.error('Error initializing map:', error);
            handleMapError();
        }
    }

    // Get all pools from localStorage
    function getAllPools() {
        const pools = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('pool_')) {
                    const poolData = JSON.parse(localStorage.getItem(key));
                    if (poolData && poolData.type && poolData.title) {
                        pools.push({
                            id: key,
                            ...poolData
                        });
                    }
                }
            }
            console.log('Found pools:', pools); // Debug log
        } catch (e) {
            console.error('Error getting pools:', e);
        }
        return pools;
    }

    // Function to format pool type
    function formatPoolType(type) {
        const types = {
            'ride': 'Ride Sharing',
            'delivery': 'Package Delivery',
            'homework': 'Homework Help',
            'guide': 'Local Guide',
            'tutor': 'Tutoring',
            'handyman': 'Handyman Services',
            'cleaning': 'Cleaning Services',
            'moving': 'Moving Help',
            'tech': 'Tech Support',
            'other': 'Other'
        };
        return types[type] || 'Other';
    }

    // Function to format address
    function formatAddress(location, type) {
        if (!location) return 'Location not specified';
        
        const routeTypes = ['ride', 'delivery', 'moving'];
        if (routeTypes.includes(type)) {
            if (location.pickup && location.drop) {
                return {
                    pickup: location.pickup.address || 'Pickup location not specified',
                    drop: location.drop.address || 'Drop location not specified'
                };
            }
            return {
                pickup: 'Pickup location not specified',
                drop: 'Drop location not specified'
            };
        }
        return location.address || 'Location not specified';
    }

    // Clear all markers from the map
    function clearMarkers() {
        markers.forEach(marker => marker.setMap(null));
        markers = [];
    }

    // Add markers to the map
    function addMarkersToMap(pools) {
        clearMarkers();
        const bounds = new google.maps.LatLngBounds();
        let hasValidLocation = false;

        pools.forEach(pool => {
            if (!pool.location) return;

            const routeTypes = ['ride', 'delivery', 'moving'];
            if (routeTypes.includes(pool.type)) {
                // Add markers for both pickup and drop locations
                if (pool.location.pickup?.coordinates) {
                    const pickupMarker = new google.maps.Marker({
                        position: pool.location.pickup.coordinates,
                        map: map,
                        title: pool.title,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        }
                    });
                    markers.push(pickupMarker);
                    bounds.extend(pool.location.pickup.coordinates);
                    hasValidLocation = true;

                    // Add info window
                    const pickupInfo = new google.maps.InfoWindow({
                        content: `<div class="map-info-window">
                            <h3>${pool.title}</h3>
                            <p>Pickup: ${pool.location.pickup.address}</p>
                        </div>`
                    });

                    pickupMarker.addListener('click', () => {
                        pickupInfo.open(map, pickupMarker);
                    });
                }

                if (pool.location.drop?.coordinates) {
                    const dropMarker = new google.maps.Marker({
                        position: pool.location.drop.coordinates,
                        map: map,
                        title: pool.title,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        }
                    });
                    markers.push(dropMarker);
                    bounds.extend(pool.location.drop.coordinates);
                    hasValidLocation = true;

                    // Add info window
                    const dropInfo = new google.maps.InfoWindow({
                        content: `<div class="map-info-window">
                            <h3>${pool.title}</h3>
                            <p>Drop-off: ${pool.location.drop.address}</p>
                        </div>`
                    });

                    dropMarker.addListener('click', () => {
                        dropInfo.open(map, dropMarker);
                    });
                }
            } else if (pool.location.coordinates) {
                // Add single marker for non-route pools
                const marker = new google.maps.Marker({
                    position: pool.location.coordinates,
                    map: map,
                    title: pool.title
                });
                markers.push(marker);
                bounds.extend(pool.location.coordinates);
                hasValidLocation = true;

                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div class="map-info-window">
                        <h3>${pool.title}</h3>
                        <p>${pool.location.address}</p>
                    </div>`
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            }
        });

        // Fit map to bounds if there are valid locations
        if (hasValidLocation) {
            map.fitBounds(bounds);
        }
    }

    // Display pools in the grid
    function displayPools(pools) {
        const container = document.getElementById('poolsContainer');
        const template = document.getElementById('poolCardTemplate');
        
        if (!container) {
            console.error('Pool container not found');
            return;
        }
        
        container.innerHTML = '';

        if (!pools || pools.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-pools-message';
            message.textContent = 'No pools available at the moment.';
            container.appendChild(message);
            return;
        }

        console.log('Displaying pools:', pools); // Debug log

        pools.forEach(pool => {
            const card = template.content.cloneNode(true);
            
            // Fill in pool details
            card.querySelector('.pool-title').textContent = pool.title || 'Untitled Pool';
            card.querySelector('.pool-budget').textContent = `$${pool.budget || '0'}`;
            card.querySelector('.pool-type').textContent = formatPoolType(pool.type);
            card.querySelector('.pool-description').textContent = pool.description || 'No description provided';

            // Handle location display based on pool type
            const routeTypes = ['ride', 'delivery', 'moving'];
            const isRouteType = routeTypes.includes(pool.type);
            const locationInfo = formatAddress(pool.location, pool.type);

            if (isRouteType) {
                // Show route locations and hide single location
                const routeLocations = card.querySelector('.route-locations');
                const singleLocation = card.querySelector('.single-location');
                
                routeLocations.style.display = 'flex';
                singleLocation.style.display = 'none';
                
                // Set pickup and drop locations
                card.querySelector('.pickup-location').textContent = locationInfo.pickup;
                card.querySelector('.drop-location').textContent = locationInfo.drop;
            } else {
                // Show single location and hide route locations
                const routeLocations = card.querySelector('.route-locations');
                const singleLocation = card.querySelector('.single-location');
                
                routeLocations.style.display = 'none';
                singleLocation.style.display = 'block';
                
                // Set single location
                card.querySelector('.location').textContent = `📍 ${locationInfo}`;
            }

            // Add event listeners
            card.querySelector('.view-details-btn').addEventListener('click', () => {
                window.location.href = `view-pool.html?id=${pool.id}`;
            });

            card.querySelector('.catch-pool-btn').addEventListener('click', () => {
                handleCatchPool(pool.id);
            });

            container.appendChild(card);
        });

        // Update map markers
        if (map) {
            addMarkersToMap(pools);
        }
    }

    // Handle search and filtering
    function handleSearch() {
        const searchTerm = document.getElementById('searchPools').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const locationFilter = document.getElementById('locationFilter').value;
        const budgetFilter = document.getElementById('budgetFilter').value;

        let pools = getAllPools();
        console.log('Initial pools:', pools); // Debug log

        // Apply search filter
        if (searchTerm) {
            pools = pools.filter(pool => 
                (pool.title || '').toLowerCase().includes(searchTerm) ||
                (pool.description || '').toLowerCase().includes(searchTerm)
            );
        }

        // Apply type filter
        if (typeFilter) {
            pools = pools.filter(pool => pool.type === typeFilter);
        }

        // Apply location filter
        if (locationFilter) {
            pools = pools.filter(pool => {
                if (!pool.location) return false;
                
                const routeTypes = ['ride', 'delivery', 'moving'];
                if (routeTypes.includes(pool.type)) {
                    return (pool.location.pickup?.address || '').includes(locationFilter) ||
                           (pool.location.drop?.address || '').includes(locationFilter);
                }
                return (pool.location.address || '').includes(locationFilter);
            });
        }

        // Apply budget filter
        if (budgetFilter) {
            const [min, max] = budgetFilter.split('-').map(Number);
            pools = pools.filter(pool => {
                const budget = Number(pool.budget) || 0;
                if (max) {
                    return budget >= min && budget <= max;
                }
                return budget >= min;
            });
        }

        console.log('Filtered pools:', pools); // Debug log
        displayPools(pools);
    }

    // Handle catching a pool
    function handleCatchPool(poolId) {
        // In a real app, this would send a request to the backend
        alert('Request to join pool sent! Waiting for approval.');
    }

    // Initialize map
    window.initMap = initMap;

    // Add event listeners for search and filters
    document.getElementById('searchPools')?.addEventListener('input', handleSearch);
    document.getElementById('typeFilter')?.addEventListener('change', handleSearch);
    document.getElementById('locationFilter')?.addEventListener('change', handleSearch);
    document.getElementById('budgetFilter')?.addEventListener('change', handleSearch);

    // Handle map error
    function handleMapError() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div class="map-error">Unable to load map. Please check your internet connection and try again.</div>';
        }
    }
});
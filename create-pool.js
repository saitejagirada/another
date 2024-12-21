document.addEventListener('DOMContentLoaded', function() {
    let map, routeMap;
    let marker, pickupMarker, dropMarker;
    let directionsService, directionsRenderer;
    let pickupAutocomplete, dropAutocomplete, locationAutocomplete;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Get DOM elements
    const poolsList = document.getElementById('poolsList');
    const noPoolsMessage = document.getElementById('noPoolsMessage');
    const poolForm = document.getElementById('poolForm');
    const newPoolBtn = document.getElementById('newPoolBtn');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const poolTypeSelect = document.getElementById('poolType');
    const handymanOptions = document.getElementById('handymanOptions');
    const routeLocationSection = document.getElementById('routeLocationSection');
    const singleLocationSection = document.getElementById('singleLocationSection');

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

    // Function to handle pool type change
    function handlePoolTypeChange() {
        const selectedType = poolTypeSelect.value;
        const routeTypes = ['ride', 'delivery', 'moving'];
        const showRouteSection = routeTypes.includes(selectedType);
        const isHandyman = selectedType === 'handyman';
        
        // Show/hide route section
        routeLocationSection.style.display = showRouteSection ? 'block' : 'none';
        singleLocationSection.style.display = showRouteSection ? 'none' : 'block';

        // Show/hide handyman options
        handymanOptions.style.display = isHandyman ? 'block' : 'none';

        // Update required attributes
        const routeInputs = document.querySelectorAll('#routeLocationSection input[type="text"]:not([readonly])');
        const singleInputs = document.querySelectorAll('#singleLocationSection input[type="text"]:not([readonly])');
        const handymanInputs = document.querySelectorAll('#handymanOptions select');
        
        routeInputs.forEach(input => input.required = showRouteSection);
        singleInputs.forEach(input => input.required = !showRouteSection);
        handymanInputs.forEach(input => input.required = isHandyman);

        // Reset markers and map
        if (showRouteSection) {
            if (marker) {
                marker.setMap(null);
                marker = null;
            }
            if (routeMap) {
                setTimeout(() => {
                    google.maps.event.trigger(routeMap, 'resize');
                    routeMap.setZoom(13);
                }, 0);
            }
        } else {
            if (pickupMarker) {
                pickupMarker.setMap(null);
                pickupMarker = null;
            }
            if (dropMarker) {
                dropMarker.setMap(null);
                dropMarker = null;
            }
            if (directionsRenderer) {
                directionsRenderer.setDirections({routes: []});
            }
            if (map) {
                setTimeout(() => {
                    google.maps.event.trigger(map, 'resize');
                    map.setZoom(13);
                }, 0);
            }
        }

        // Clear input fields
        document.querySelectorAll('#routeLocationSection input[type="text"], #singleLocationSection input[type="text"]').forEach(input => {
            input.value = '';
        });

        // Clear handyman fields if not handyman type
        if (!isHandyman) {
            document.querySelectorAll('#handymanOptions select').forEach(select => {
                select.value = '';
            });
        }

        // Initialize maps if needed
        if (!map || !routeMap) {
            initMap();
        }
    }

    // Event listeners for form toggling
    newPoolBtn.addEventListener('click', function() {
        poolForm.style.display = 'block';
        newPoolBtn.style.display = 'none';
        // Initialize maps when showing the form
        setTimeout(() => {
            initMap();
            if (map) google.maps.event.trigger(map, 'resize');
            if (routeMap) google.maps.event.trigger(routeMap, 'resize');
        }, 0);
    });

    closeFormBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent form submission
        poolForm.style.display = 'none';
        newPoolBtn.style.display = 'block';
    });

    // Add event listener for pool type change
    poolTypeSelect.addEventListener('change', handlePoolTypeChange);

    // Function to load and display user's pools
    function loadUserPools() {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        const allPools = Object.entries(localStorage)
            .filter(([key, value]) => key.startsWith('pool_'))
            .map(([key, value]) => ({
                id: key,
                ...JSON.parse(value)
            }))
            .filter(pool => pool.creatorId === currentUser.id);

        if (allPools.length === 0) {
            noPoolsMessage.style.display = 'block';
            return;
        }

        poolsList.innerHTML = '';
        allPools.forEach(pool => {
            const card = document.createElement('div');
            card.className = 'pool-card';
            
            const joinedCount = pool.joinedUsers ? pool.joinedUsers.length : 0;
            const location = pool.location.address || 
                           (pool.location.pickup ? `${pool.location.pickup.address} to ${pool.location.drop.address}` : 'No location specified');

            card.innerHTML = `
                <div class="pool-card-header">
                    <h3 class="pool-card-title">${pool.title}</h3>
                    <span class="pool-card-type">${formatPoolType(pool.type)}</span>
                </div>
                <div class="pool-card-details">
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Budget</span>
                        <span class="pool-card-detail-value">$${pool.budget}</span>
                    </div>
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Location</span>
                        <span class="pool-card-detail-value">${location}</span>
                    </div>
                    <div class="pool-card-detail">
                        <span class="pool-card-detail-label">Joined Users</span>
                        <span class="pool-card-detail-value">${joinedCount} user${joinedCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div class="pool-card-actions">
                    <button class="secondary-button" onclick="window.location.href='view-pool.html?id=${pool.id}'">View Details</button>
                    ${joinedCount > 0 ? `<button class="primary-button" onclick="window.location.href='chat.html'">View Chats</button>` : ''}
                </div>
            `;
            
            poolsList.appendChild(card);
        });
    }

    // Initialize maps and services
    function initMap() {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            preserveViewport: true
        });

        // Default coordinates (can be anywhere)
        const defaultLocation = { lat: 40.7128, lng: -74.0060 };
        
        // Initialize single location map
        map = new google.maps.Map(document.getElementById('map'), {
            center: defaultLocation,
            zoom: 13
        });

        // Initialize route map
        routeMap = new google.maps.Map(document.getElementById('routeMap'), {
            center: defaultLocation,
            zoom: 13
        });

        directionsRenderer.setMap(routeMap);

        // Initialize autocomplete for single location
        locationAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('locationSearch'),
            { types: ['geocode'] }
        );
        locationAutocomplete.bindTo('bounds', map);
        locationAutocomplete.addListener('place_changed', () => handlePlaceSelect(locationAutocomplete, map, marker, 'single'));

        // Initialize autocomplete for pickup location
        pickupAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('pickupLocationSearch'),
            { types: ['geocode'] }
        );
        pickupAutocomplete.bindTo('bounds', routeMap);
        pickupAutocomplete.addListener('place_changed', () => handlePlaceSelect(pickupAutocomplete, routeMap, pickupMarker, 'pickup'));

        // Initialize autocomplete for drop location
        dropAutocomplete = new google.maps.places.Autocomplete(
            document.getElementById('dropLocationSearch'),
            { types: ['geocode'] }
        );
        dropAutocomplete.bindTo('bounds', routeMap);
        dropAutocomplete.addListener('place_changed', () => handlePlaceSelect(dropAutocomplete, routeMap, dropMarker, 'drop'));

        // Add click listeners to maps
        map.addListener('click', (e) => handleMapClick(e.latLng, map, marker, 'single'));
        routeMap.addListener('click', (e) => handleMapClick(e.latLng, routeMap, null, 'route'));
    }

    function handlePlaceSelect(autocomplete, targetMap, targetMarker, type) {
        const place = autocomplete.getPlace();

        if (!place.geometry) {
            alert("No details available for this place");
            return;
        }

        // Update map view
        if (place.geometry.viewport) {
            targetMap.fitBounds(place.geometry.viewport);
        } else {
            targetMap.setCenter(place.geometry.location);
            targetMap.setZoom(17);
        }

        // Update markers and location details
        if (type === 'single') {
            placeMarkerAndPanTo(place.geometry.location, targetMap, targetMarker, type);
            updateLocationDetails(place, type);
        } else {
            placeMarkerAndPanTo(place.geometry.location, targetMap, targetMarker, type);
            updateLocationDetails(place, type);
            if (document.getElementById('selectedPickupLocation').value && 
                document.getElementById('selectedDropLocation').value) {
                calculateAndDisplayRoute();
            }
        }
    }

    function handleMapClick(latLng, targetMap, targetMarker, type) {
        if (type === 'single') {
            placeMarkerAndPanTo(latLng, targetMap, targetMarker, type);
        } else {
            // For route map, determine if we're setting pickup or drop based on which is empty
            if (!document.getElementById('selectedPickupLocation').value) {
                placeMarkerAndPanTo(latLng, targetMap, pickupMarker, 'pickup');
            } else if (!document.getElementById('selectedDropLocation').value) {
                placeMarkerAndPanTo(latLng, targetMap, dropMarker, 'drop');
            }
        }
    }

    function placeMarkerAndPanTo(latLng, targetMap, targetMarker, type) {
        const markerOptions = {
            position: latLng,
            map: targetMap,
            draggable: true
        };

        if (type === 'pickup') {
            if (pickupMarker) {
                pickupMarker.setPosition(latLng);
            } else {
                markerOptions.icon = 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
                pickupMarker = new google.maps.Marker(markerOptions);
                
                // Add drag end listener for pickup marker
                pickupMarker.addListener('dragend', function() {
                    const position = pickupMarker.getPosition();
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: position }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            updateLocationDetails(results[0], 'pickup');
                            if (document.getElementById('selectedDropLocation').value) {
                                calculateAndDisplayRoute();
                            }
                        }
                    });
                });
            }
            targetMarker = pickupMarker;
        } else if (type === 'drop') {
            if (dropMarker) {
                dropMarker.setPosition(latLng);
            } else {
                markerOptions.icon = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
                dropMarker = new google.maps.Marker(markerOptions);
                
                // Add drag end listener for drop marker
                dropMarker.addListener('dragend', function() {
                    const position = dropMarker.getPosition();
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: position }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            updateLocationDetails(results[0], 'drop');
                            if (document.getElementById('selectedPickupLocation').value) {
                                calculateAndDisplayRoute();
                            }
                        }
                    });
                });
            }
            targetMarker = dropMarker;
        } else {
            if (marker) {
                marker.setPosition(latLng);
            } else {
                marker = new google.maps.Marker(markerOptions);
                
                // Add drag end listener for single marker
                marker.addListener('dragend', function() {
                    const position = marker.getPosition();
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: position }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            updateLocationDetails(results[0], 'single');
                        }
                    });
                });
            }
            targetMarker = marker;
        }
        
        targetMap.panTo(latLng);
        
        // Get address from coordinates (reverse geocoding)
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                updateLocationDetails(results[0], type);
                if (type !== 'single' && 
                    document.getElementById('selectedPickupLocation').value && 
                    document.getElementById('selectedDropLocation').value) {
                    calculateAndDisplayRoute();
                }
            }
        });
    }

    function calculateAndDisplayRoute() {
        if (!pickupMarker || !dropMarker) return;

        const pickupLocation = pickupMarker.getPosition();
        const dropLocation = dropMarker.getPosition();

        directionsService.route({
            origin: pickupLocation,
            destination: dropLocation,
            travelMode: google.maps.TravelMode.DRIVING
        }, (response, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(response);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }

    function updateLocationDetails(place, type) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        if (type === 'single') {
            document.getElementById('selectedLocation').value = place.formatted_address;
            document.getElementById('latitude').value = lat;
            document.getElementById('longitude').value = lng;
        } else if (type === 'pickup') {
            document.getElementById('selectedPickupLocation').value = place.formatted_address;
            document.getElementById('pickupLatitude').value = lat;
            document.getElementById('pickupLongitude').value = lng;
        } else if (type === 'drop') {
            document.getElementById('selectedDropLocation').value = place.formatted_address;
            document.getElementById('dropLatitude').value = lat;
            document.getElementById('dropLongitude').value = lng;
        }
    }

    // Handle form submission
    document.getElementById('createPoolForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentUser) {
            alert('Please log in to create a pool');
            window.location.href = 'login.html';
            return;
        }

        const poolType = document.getElementById('poolType').value;
        const routeTypes = ['ride', 'delivery', 'moving'];
        const isRouteType = routeTypes.includes(poolType);
        const isHandyman = poolType === 'handyman';

        // Validate locations based on pool type
        if (isRouteType) {
            if (!document.getElementById('selectedPickupLocation').value || 
                !document.getElementById('selectedDropLocation').value) {
                alert('Please select both pickup and drop locations');
                return;
            }
        } else {
            if (!document.getElementById('selectedLocation').value) {
                alert('Please select a location');
                return;
            }
        }

        // Build the form data
        const formData = {
            type: poolType,
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            budget: document.getElementById('projectBudget').value,
            creatorId: currentUser.id,
            creatorName: currentUser.name,
            createdAt: new Date().toISOString(),
            location: isRouteType ? {
                pickup: {
                    address: document.getElementById('selectedPickupLocation').value,
                    latitude: document.getElementById('pickupLatitude').value,
                    longitude: document.getElementById('pickupLongitude').value
                },
                drop: {
                    address: document.getElementById('selectedDropLocation').value,
                    latitude: document.getElementById('dropLatitude').value,
                    longitude: document.getElementById('dropLongitude').value
                }
            } : {
                address: document.getElementById('selectedLocation').value,
                latitude: document.getElementById('latitude').value,
                longitude: document.getElementById('longitude').value
            }
        };

        // Add handyman specific details if applicable
        if (isHandyman) {
            formData.handymanDetails = {
                serviceType: document.getElementById('handymanServiceType').value,
                urgencyLevel: document.getElementById('urgencyLevel').value
            };
        }

        // Save to localStorage
        const poolId = 'pool_' + Date.now();
        localStorage.setItem(poolId, JSON.stringify(formData));

        // Reset form and update pools list
        this.reset();
        poolForm.style.display = 'none';
        newPoolBtn.style.display = 'block';
        loadUserPools();

        // Redirect to the pool status page
        window.location.href = `pool-status.html?id=${poolId}`;
    });

    // Load user's pools on page load
    loadUserPools();
});
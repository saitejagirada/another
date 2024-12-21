document.addEventListener('DOMContentLoaded', function() {
    let map, routeMap;
    let directionsService, directionsRenderer;

    // Get pool ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('id');

    // Get pool data from localStorage
    const poolData = JSON.parse(localStorage.getItem(poolId));
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!poolData) {
        alert('Pool not found!');
        window.location.href = 'dashboard.html';
        return;
    }

    // Initialize maps
    function initMaps() {
        const mapOptions = {
            zoom: 14,
            center: { lat: 0, lng: 0 },
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false
        };

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: { strokeColor: "#4A90E2", strokeWeight: 4 }
        });

        const routeTypes = ['ride', 'delivery', 'moving'];
        if (routeTypes.includes(poolData.type)) {
            // Route map (for ride sharing, delivery, moving)
            document.getElementById('routeSection').style.display = 'block';
            document.getElementById('locationSection').style.display = 'none';
            
            routeMap = new google.maps.Map(document.getElementById('routeMap'), mapOptions);
            directionsRenderer.setMap(routeMap);

            if (poolData.location?.pickup?.coordinates && poolData.location?.drop?.coordinates) {
                // Add markers
                new google.maps.Marker({
                    position: poolData.location.pickup.coordinates,
                    map: routeMap,
                    icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }
                });

                new google.maps.Marker({
                    position: poolData.location.drop.coordinates,
                    map: routeMap,
                    icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
                });

                // Show route
                directionsService.route({
                    origin: poolData.location.pickup.coordinates,
                    destination: poolData.location.drop.coordinates,
                    travelMode: 'DRIVING'
                }, function(result, status) {
                    if (status === 'OK') {
                        directionsRenderer.setDirections(result);
                    }
                });

                // Update text
                document.getElementById('pickupLocation').textContent = poolData.location.pickup.address;
                document.getElementById('dropLocation').textContent = poolData.location.drop.address;
            }
        } else {
            // Single location map
            document.getElementById('routeSection').style.display = 'none';
            document.getElementById('locationSection').style.display = 'block';
            
            map = new google.maps.Map(document.getElementById('map'), mapOptions);

            if (poolData.location?.coordinates) {
                new google.maps.Marker({
                    position: poolData.location.coordinates,
                    map: map
                });
                map.setCenter(poolData.location.coordinates);
                document.getElementById('projectLocation').textContent = poolData.location.address;
            }
        }
    }

    // Initialize maps
    initMaps();

    // Function to handle map errors
    function handleMapError() {
        const mapContainers = document.querySelectorAll('.map-container');
        mapContainers.forEach(container => {
            container.innerHTML = '<div class="map-error">Unable to load map. Please check your internet connection and try again.</div>';
        });
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

    // Function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Function to get or create chat
    function getOrCreateChat() {
        const chatId = `chat_${poolId}_${currentUser.id}`;
        let chat = JSON.parse(localStorage.getItem(chatId));

        if (!chat) {
            chat = {
                id: chatId,
                poolId: poolId,
                participants: [
                    {
                        id: currentUser.id,
                        name: currentUser.name
                    },
                    {
                        id: poolData.creatorId,
                        name: poolData.creatorName
                    }
                ],
                messages: [
                    {
                        id: 'msg_' + Date.now(),
                        senderId: 'system',
                        text: 'Chat started for pool: ' + poolData.title,
                        timestamp: new Date().toISOString()
                    }
                ],
                createdAt: new Date().toISOString()
            };
            localStorage.setItem(chatId, JSON.stringify(chat));
        }

        return chatId;
    }

    // Function to request to join pool
    function requestToJoinPool() {
        if (!currentUser) {
            alert('Please log in to join this pool');
            window.location.href = 'login.html';
            return;
        }

        // Check if user is the creator
        if (poolData.creatorId === currentUser.id) {
            alert('You cannot join your own pool');
            return;
        }

        // Check if user has already requested or joined
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        console.log('Current pool requests:', poolRequests);

        if (poolRequests[poolId]?.some(req => req.userId === currentUser.id && req.status === 'pending')) {
            alert('You have already requested to join this pool');
            return;
        }

        const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
        if (joinedPools[poolId]?.includes(currentUser.id)) {
            alert('You have already joined this pool');
            return;
        }

        // Create request
        if (!poolRequests[poolId]) {
            poolRequests[poolId] = [];
        }

        const request = {
            id: 'req_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };

        poolRequests[poolId].push(request);
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));
        console.log('Updated pool requests:', poolRequests);

        // Update UI
        const joinButton = document.getElementById('joinPool');
        joinButton.textContent = 'Request Sent';
        joinButton.disabled = true;

        alert('Request sent! Waiting for approval from pool creator.');
    }

    // Function to handle request response
    function handleRequestResponse(requestId, accept) {
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const request = poolRequests[poolId]?.find(req => req.id === requestId);

        if (!request) {
            alert('Request not found');
            return;
        }

        request.status = accept ? 'accepted' : 'rejected';
        request.respondedAt = new Date().toISOString();
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        if (accept) {
            // Add user to joined pools
            const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
            if (!joinedPools[poolId]) {
                joinedPools[poolId] = [];
            }
            joinedPools[poolId].push(request.userId);
            localStorage.setItem('joinedPools', JSON.stringify(joinedPools));

            // Update pool data
            poolData.joinedUsers = poolData.joinedUsers || [];
            poolData.joinedUsers.push({
                id: request.userId,
                name: request.userName,
                joinedAt: new Date().toISOString()
            });
            localStorage.setItem(poolId, JSON.stringify(poolData));

            // Create chat
            const chatId = getOrCreateChat();
        }

        // Update UI
        displayPendingRequests();
        displayAcceptedSeeders();
        updatePoolStatus();
    }

    // Function to display pending requests
    function displayPendingRequests() {
        const pendingRequestsSection = document.getElementById('pendingRequestsSection');
        const pendingRequestsList = document.getElementById('pendingRequestsList');
        const noRequestsMessage = pendingRequestsList.querySelector('.no-requests-message');

        // Only show for pool creator
        if (currentUser?.id !== poolData.creatorId) {
            pendingRequestsSection.style.display = 'none';
            return;
        }

        pendingRequestsSection.style.display = 'block';
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const pendingRequests = poolRequests[poolId]?.filter(req => req.status === 'pending') || [];

        if (pendingRequests.length === 0) {
            noRequestsMessage.style.display = 'block';
            pendingRequestsList.innerHTML = '<div class="no-requests-message">No pending requests at the moment.</div>';
            return;
        }

        noRequestsMessage.style.display = 'none';
        pendingRequestsList.innerHTML = pendingRequests.map(request => `
            <div class="request-item">
                <div class="request-info">
                    <span class="requester-name">${request.userName}</span>
                    <span class="request-date">Requested on ${formatDate(request.requestedAt)}</span>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="acceptRequest('${request.id}')">Accept</button>
                    <button class="reject-btn" onclick="rejectRequest('${request.id}')">Reject</button>
                </div>
            </div>
        `).join('');
    }

    // Function to accept a request
    function acceptRequest(requestId) {
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const request = poolRequests[poolId]?.find(req => req.id === requestId);

        if (!request) {
            alert('Request not found');
            return;
        }

        // Update request status
        request.status = 'accepted';
        request.respondedAt = new Date().toISOString();
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        // Add user to joined pools
        const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
        if (!joinedPools[poolId]) {
            joinedPools[poolId] = [];
        }
        joinedPools[poolId].push(request.userId);
        localStorage.setItem('joinedPools', JSON.stringify(joinedPools));

        // Update pool data
        poolData.joinedUsers = poolData.joinedUsers || [];
        poolData.joinedUsers.push({
            id: request.userId,
            name: request.userName,
            joinedAt: new Date().toISOString()
        });
        localStorage.setItem(poolId, JSON.stringify(poolData));

        // Create chat
        const chatId = `chat_${poolId}_${request.userId}`;
        const chat = {
            id: chatId,
            poolId: poolId,
            participants: [
                {
                    id: currentUser.id,
                    name: currentUser.name
                },
                {
                    id: request.userId,
                    name: request.userName
                }
            ],
            messages: [
                {
                    id: 'msg_' + Date.now(),
                    senderId: 'system',
                    text: 'Chat started for pool: ' + poolData.title,
                    timestamp: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(chatId, JSON.stringify(chat));

        // Update UI
        displayPendingRequests();
        displayAcceptedSeeders();
        updatePoolStatus();
        alert('Request accepted successfully!');
    }

    // Function to reject a request
    function rejectRequest(requestId) {
        const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
        const request = poolRequests[poolId]?.find(req => req.id === requestId);

        if (!request) {
            alert('Request not found');
            return;
        }

        // Update request status
        request.status = 'rejected';
        request.respondedAt = new Date().toISOString();
        localStorage.setItem('poolRequests', JSON.stringify(poolRequests));

        // Update UI
        displayPendingRequests();
        alert('Request rejected successfully!');
    }

    // Function to display accepted seeders
    function displayAcceptedSeeders() {
        const acceptedSeedersContainer = document.getElementById('acceptedSeeders');
        const noSeedersMessage = acceptedSeedersContainer.querySelector('.no-seeders-message');

        if (!poolData.joinedUsers || poolData.joinedUsers.length === 0) {
            noSeedersMessage.style.display = 'block';
            acceptedSeedersContainer.innerHTML = '';
            return;
        }

        noSeedersMessage.style.display = 'none';
        acceptedSeedersContainer.innerHTML = poolData.joinedUsers.map(user => `
            <div class="seeder-item">
                <span class="seeder-name">${user.name}</span>
                <span class="joined-date">Joined ${formatDate(user.joinedAt)}</span>
            </div>
        `).join('');
    }

    // Function to update pool status
    function updatePoolStatus() {
        const seedersNeeded = document.querySelector('.seeder-count');
        const acceptedCount = document.querySelector('.accepted-count');
        const progressBar = document.querySelector('.progress');

        const joinedCount = poolData.joinedUsers?.length || 0;
        const maxSeeders = poolData.maxSeeders || 5; // Default to 5 if not specified

        seedersNeeded.textContent = maxSeeders - joinedCount;
        acceptedCount.textContent = joinedCount;

        const progressPercentage = (joinedCount / maxSeeders) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    }

    // Update pool details
    document.getElementById('projectTitle').textContent = poolData.title;
    document.getElementById('poolType').textContent = formatPoolType(poolData.type);
    document.getElementById('projectBudget').textContent = poolData.budget || '0';
    document.getElementById('projectDescription').textContent = poolData.description || 'No description provided';

    // Update location information based on pool type
    const routeTypes = ['ride', 'delivery', 'moving'];
    if (routeTypes.includes(poolData.type)) {
        document.getElementById('pickupLocation').textContent = poolData.location.pickup.address;
        document.getElementById('dropLocation').textContent = poolData.location.drop.address;
    } else {
        document.getElementById('projectLocation').textContent = poolData.location.address;
    }

    // Initialize maps
    initMaps();

    // Update join button state and text
    const joinButton = document.getElementById('joinPool');
    if (currentUser) {
        if (poolData.creatorId === currentUser.id) {
            joinButton.textContent = 'Your Pool';
            joinButton.disabled = true;
        } else {
            const poolRequests = JSON.parse(localStorage.getItem('poolRequests') || '{}');
            const hasRequestedToJoin = poolRequests[poolId]?.some(req => req.userId === currentUser.id && req.status === 'pending');
            
            const joinedPools = JSON.parse(localStorage.getItem('joinedPools') || '{}');
            const hasJoined = joinedPools[poolId]?.includes(currentUser.id);

            if (hasRequestedToJoin) {
                joinButton.textContent = 'Request Sent';
                joinButton.disabled = true;
            } else if (hasJoined) {
                joinButton.textContent = 'Already Joined';
                joinButton.disabled = true;
            }
        }
    }

    // Handle join pool button
    joinButton.addEventListener('click', requestToJoinPool);

    // Handle share pool button
    document.getElementById('sharePool').addEventListener('click', function() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: poolData.title,
                text: poolData.description,
                url: url
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(url).then(() => {
                alert('Pool link copied to clipboard!');
            }).catch(console.error);
        }
    });

    // Initialize the UI
    displayPendingRequests();
    displayAcceptedSeeders();
    updatePoolStatus();

    // Make handleRequestResponse available globally
    window.handleRequestResponse = handleRequestResponse;
    window.acceptRequest = acceptRequest;
    window.rejectRequest = rejectRequest;
}); 
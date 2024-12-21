document.addEventListener('DOMContentLoaded', function() {
    // Get pool ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('id');

    // Get pool data (in a real app, this would be from your backend)
    const poolData = JSON.parse(localStorage.getItem(poolId));

    if (!poolData) {
        alert('Pool not found!');
        window.location.href = 'dashboard.html';
        return;
    }

    // Update pool details
    document.getElementById('poolTitle').textContent = poolData.title;
    document.getElementById('poolBudget').textContent = poolData.budget;
    document.getElementById('poolLocation').textContent = poolData.location.address;
    document.getElementById('seedersNeeded').textContent = poolData.seedersNeeded;
    
    // Initialize joined seeders to 0
    const joinedSeeders = 0;
    document.getElementById('seedersJoined').textContent = joinedSeeders;

    // Update progress bar
    const progressPercentage = (joinedSeeders / poolData.seedersNeeded) * 100;
    const progressBar = document.getElementById('joinProgress');
    progressBar.style.width = `${progressPercentage}%`;
    document.querySelector('.progress-text').textContent = `${Math.round(progressPercentage)}% Complete`;
}); 
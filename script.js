document.addEventListener('DOMContentLoaded', () => {
    // Get references to elements
    const uploadScreen = document.getElementById('uploadScreen');
    const recommendationScreen = document.getElementById('recommendationScreen');
    const analyzeVibeBtn = document.getElementById('analyzeVibeBtn');
    const backToUploadBtn = document.getElementById('backToUploadBtn');
    const photoUpload = document.getElementById('photoUpload');
    const musicRecommendationsDiv = document.getElementById('musicRecommendations');

    // --- Mock Data for Music Recommendations ---
    // In a real app, this would come from an API based on AI analysis.
    const mockMusicData = [
        {
            title: "Sunny Day",
            artist: "The Chill Vibes",
            artwork: "https://via.placeholder.com/70/FFD700/FFFFFF?text=Album1", // Placeholder image
            previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Example MP3
        },
        {
            title: "Mellow Evening",
            artist: "Acoustic Dreams",
            artwork: "https://via.placeholder.com/70/87CEEB/FFFFFF?text=Album2",
            previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        },
        {
            title: "Energetic Morning",
            artist: "Beat Drops",
            artwork: "https://via.placeholder.com/70/FF6347/FFFFFF?text=Album3",
            previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
        },
        {
            title: "Rainy Day Blues",
            artist: "Smooth Jazz Collective",
            artwork: "https://via.placeholder.com/70/6A5ACD/FFFFFF?text=Album4",
            previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
        },
        {
            title: "Upbeat Anthem",
            artist: "Pop Sensations",
            artwork: "https://via.placeholder.com/70/32CD32/FFFFFF?text=Album5",
            previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
        }
    ];

    // Function to show a specific screen
    const showScreen = (screenToShow) => {
        uploadScreen.classList.remove('active');
        recommendationScreen.classList.remove('active');
        screenToShow.classList.add('active');
    };

    // Function to render music recommendations
    const renderMusicRecommendations = (musicData) => {
        musicRecommendationsDiv.innerHTML = ''; // Clear previous recommendations
        if (musicData.length === 0) {
            musicRecommendationsDiv.innerHTML = '<p>No music found for this vibe.</p>';
            return;
        }

        musicData.forEach(song => {
            const songCard = document.createElement('div');
            songCard.classList.add('song-card');

            songCard.innerHTML = `
                <img src="${song.artwork}" alt="Album Artwork for ${song.title}">
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <audio controls src="${song.previewUrl}">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            `;
            musicRecommendationsDiv.appendChild(songCard);
        });
    };

    // --- Event Listeners ---

    // When "Analyze Vibe" button is clicked
    analyzeVibeBtn.addEventListener('click', () => {
        // In a real app, you'd send photoUpload.files[0] to an AI service here.
        // For now, we'll just simulate loading and display mock data.

        // Clear existing recommendations and show a loading message
        musicRecommendationsDiv.innerHTML = '<p>Analyzing vibe and finding music...</p>';

        // Simulate a delay for AI analysis
        setTimeout(() => {
            renderMusicRecommendations(mockMusicData);
            showScreen(recommendationScreen);
        }, 1500); // Simulate 1.5 seconds of "analysis"
    });

    // When "Upload Another Photo" button is clicked
    backToUploadBtn.addEventListener('click', () => {
        showScreen(uploadScreen);
        photoUpload.value = ''; // Clear the selected file in the input
        musicRecommendationsDiv.innerHTML = '<p>Loading music...</p>'; // Reset placeholder text
    });

    // Initial screen setup
    showScreen(uploadScreen);
});
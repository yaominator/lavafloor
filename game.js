const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

if (!canvas) {
    console.error('Canvas not found!');
    throw new Error('Canvas not found!');
}

const player = {
    x: canvas.width * 0.3,
    y: 230,  // Lower starting position (was 180)
    width: 40,
    height: 40,
    velocity: 0,
    jumping: false,
    rotation: 0,
    trail: []
};

const obstacles = [];
const gravity = 0.2;
const jumpForce = -6;
const INITIAL_GAME_SPEED = 2.5;
const MAX_GAME_SPEED = 8;
const SPEED_INCREMENT = 0.05;
const INITIAL_PLATFORM_DISTANCE = 250;
const MIN_PLATFORM_DISTANCE = 180;
const MAX_PLATFORM_DISTANCE = 300;
let score = 0;
let gameOver = false;
let backgroundOffset = 0;
let isGameStarted = false;
let isPaused = false;
let countdown = 0;
let countdownTimer = null;
let hasWon = false;
let animationFrameId = null;
let winTimer = null;

// Add particle system
const particles = [];
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 2;
        this.speedX = -INITIAL_GAME_SPEED;
        this.speedY = Math.random() * 2 - 1;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Add platform type to track different obstacles
const OBSTACLE_TYPES = {
    GROUND_SPIKE: 'groundSpike',
    PLATFORM: 'platform',
    PLATFORM_SPIKE: 'platformSpike'
};

// Add these variables with other state variables
let currentGameSpeed = INITIAL_GAME_SPEED;
let currentPlatformDistance = INITIAL_PLATFORM_DISTANCE;

// Add these constants near the top with other constants
const MAX_VELOCITY = 7;
const MIN_PLATFORMS = 5; // Minimum number of platforms to maintain

// Add at the top with other state variables
let coins = parseInt(localStorage.getItem('coins')) || 0; // Persist coins between sessions

// Add these variables at the top with other state variables
const buttonPos = {
    x: canvas.width / 2 - 100,
    y: 50,
    width: 200,
    height: 40
};

// Add at the top with other state variables
let hasInfiniteJump = false;
const INFINITE_JUMP_COST = 300;

// Add mouseDown state variable at the top with other state variables
let isMouseDown = false;

// Add button to HTML
function createInfiniteJumpButton() {
    const button = document.createElement('button');
    button.id = 'infiniteJumpBtn';
    button.style.position = 'fixed';  // Changed to fixed
    button.style.top = '50px';        // Move down more
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '15px 30px';  // Even more padding
    button.style.fontSize = '24px';       // Bigger text
    button.style.fontWeight = 'bold';
    button.style.border = '3px solid white';  // Add border
    button.style.borderRadius = '10px';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    button.style.zIndex = '9999';        // Make sure it's on very top
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';  // Text shadow
    button.style.fontFamily = 'Arial, sans-serif';
    button.innerHTML = `<span style="font-size: 24px">🚀 INFINITE JUMP (${INFINITE_JUMP_COST} COINS)</span>`;
    button.onclick = purchaseInfiniteJump;
    document.body.appendChild(button);
}

// Add purchase function
function purchaseInfiniteJump() {
    if (coins >= INFINITE_JUMP_COST && !hasInfiniteJump) {
        coins -= INFINITE_JUMP_COST;
        hasInfiniteJump = true;
        localStorage.setItem('coins', coins.toString());
        updateInfiniteJumpButton();
    }
}

// Update button appearance
function updateInfiniteJumpButton() {
    const button = document.getElementById('infiniteJumpBtn');
    if (button) {
        button.innerHTML = hasInfiniteJump ? 
            '<span style="font-size: 24px">🚀 INFINITE JUMP ACTIVE!</span>' : 
            `<span style="font-size: 24px">🚀 INFINITE JUMP (${INFINITE_JUMP_COST} COINS)</span>`;
        button.style.cursor = (coins >= INFINITE_JUMP_COST && !hasInfiniteJump) ? 'pointer' : 'not-allowed';
    }
}

// Modify createObstacle function to create bigger spikes
function createObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    
    // Increase jump distances for more challenge
    const maxJumpDistance = 280;  // Increased from 250
    const minJumpDistance = 220;  // Increased from 180
    
    // Make platforms with more space between them
    const minX = lastObstacle ? lastObstacle.x + minJumpDistance : 100;
    const maxX = lastObstacle ? lastObstacle.x + maxJumpDistance : canvas.width - 300;
    
    // Keep current height range
    const minHeight = lastObstacle ? Math.max(250, lastObstacle.y - 40) : 330;
    const maxHeight = lastObstacle ? Math.min(370, lastObstacle.y + 40) : 330;
    
    const obstacle = {
        type: OBSTACLE_TYPES.PLATFORM,
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (maxHeight - minHeight) + minHeight,
        width: 150,
        height: 15,
        spikes: [],
        scored: false
    };

    // Keep spike frequency the same
    if (Math.random() < 0.3) {
        const spikePos = Math.random() * (obstacle.width - 60) + 10;  // Adjusted for bigger spike width
        obstacle.spikes.push({
            relativeX: spikePos,
            width: 30,    // Increased from 20
            height: 25    // Increased from 15
        });
    }

    obstacles.push(obstacle);
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    
    player.rotation += 0.1; // Always spin
    ctx.rotate(player.rotation);

    // Draw black block base
    ctx.fillStyle = '#000000';
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    
    // Draw flame effect
    const flameColors = ['#4B0082', '#0000FF', '#4169E1', '#9400D3'];
    
    // Draw triangular flames around the block
    for(let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (Date.now() / 200);
        const flameLength = player.width/2 + Math.sin(Date.now() / 100) * 5; // Flickering effect
        
        ctx.beginPath();
        ctx.moveTo(0, 0); // Center of block
        
        // Create flame triangle
        const x1 = Math.cos(angle) * flameLength;
        const y1 = Math.sin(angle) * flameLength;
        const x2 = Math.cos(angle + 0.2) * (flameLength * 0.7);
        const y2 = Math.sin(angle + 0.2) * (flameLength * 0.7);
        
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();

        // Create gradient for each flame
        const gradient = ctx.createLinearGradient(0, 0, x1, y1);
        gradient.addColorStop(0, flameColors[i % flameColors.length]);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    ctx.restore();

    // Modified trail effect
    player.trail.unshift({ x: player.x, y: player.y, rotation: player.rotation });
    if (player.trail.length > 8) player.trail.pop();
    
    player.trail.forEach((pos, index) => {
        const alpha = (1 - index/8) * 0.3;
        ctx.save();
        ctx.translate(pos.x + player.width/2, pos.y + player.height/2);
        ctx.rotate(pos.rotation);
        
        // Draw black block trail
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
        
        // Draw flame trail
        const flameColor = flameColors[index % flameColors.length];
        for(let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + (Date.now() / 300);
            const flameLength = player.width/2 * (1 - index/8);
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const x1 = Math.cos(angle) * flameLength;
            const y1 = Math.sin(angle) * flameLength;
            const x2 = Math.cos(angle + 0.2) * (flameLength * 0.7);
            const y2 = Math.sin(angle + 0.2) * (flameLength * 0.7);
            
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            
            const gradient = ctx.createLinearGradient(0, 0, x1, y1);
            gradient.addColorStop(0, `rgba(75, 0, 130, ${alpha})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        ctx.restore();
    });

    // Create magical flame particles when jumping
    if (player.jumping) {
        for (let i = 0; i < 2; i++) {
            particles.push(new MagicParticle(
                player.x + Math.random() * player.width,
                player.y + Math.random() * player.height
            ));
        }
    }
}

// Add MagicParticle class
class MagicParticle extends Particle {
    constructor(x, y) {
        super(x, y);
        this.colors = ['#4B0082', '#0000FF', '#4169E1', '#9400D3'];
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 3;
        this.speedY = (Math.random() - 0.5) * 3;
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${this.getRGBA()})`;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    getRGBA() {
        const hex = this.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `${r}, ${g}, ${b}, ${this.life}`;
    }
}

// Modify drawObstacles function
function drawObstacles() {
    obstacles.forEach(obstacle => {
        // Draw platform
        const platformGradient = ctx.createLinearGradient(
            obstacle.x,
            obstacle.y,
            obstacle.x,
            obstacle.y + obstacle.height
        );
        platformGradient.addColorStop(0, '#4CAF50');
        platformGradient.addColorStop(1, '#45a049');
        ctx.fillStyle = platformGradient;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

        // Draw spikes with platform position
        obstacle.spikes.forEach(spike => {
            drawSpike(spike, obstacle.x, obstacle.y);
        });
    });
}

// Modify drawSpike function to handle bigger spikes
function drawSpike(spike, platformX, platformY) {
    const spikeX = platformX + spike.relativeX;
    
    ctx.beginPath();
    ctx.moveTo(spikeX, platformY); // Bottom left
    ctx.lineTo(spikeX + spike.width/2, platformY - spike.height); // Top middle
    ctx.lineTo(spikeX + spike.width, platformY); // Bottom right
    ctx.closePath();

    const gradient = ctx.createLinearGradient(
        spikeX,
        platformY - spike.height,
        spikeX + spike.width/2,
        platformY
    );
    gradient.addColorStop(0, '#4B0082');  // Indigo (dark purple)
    gradient.addColorStop(0.5, '#2E0854'); // Darker purple
    gradient.addColorStop(1, '#000000');  // Black
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add stronger glow effect
    ctx.shadowColor = '#4B0082';
    ctx.shadowBlur = 8;  // Increased from 5
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBackground() {
    // Fill background with dark gray
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid of gray pixels with lighter borders
    const pixelSize = 40;  // Increased from 20 to 40
    ctx.strokeStyle = '#333333';  // Lighter gray for borders
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += pixelSize) {
        for (let y = 0; y < canvas.height; y += pixelSize) {
            // Fill each pixel with dark gray
            ctx.fillStyle = '#222222';
            ctx.fillRect(x, y, pixelSize, pixelSize);
            
            // Draw lighter border
            ctx.strokeRect(x, y, pixelSize, pixelSize);
        }
    }
}

function drawScore() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.fillText(`Score: ${score}`, 10, 25);
}

// Modify collision detection to be more forgiving
function checkCollision(player, obstacle) {
    // Check spike collisions with platform position
    const spikeCollision = obstacle.spikes.some(spike => 
        checkSpikeCollision(player, spike, obstacle.x, obstacle.y)
    );

    // More forgiving platform landing (small margin of error)
    if (player.velocity > 0 && 
        player.y < obstacle.y && 
        player.y + player.height >= obstacle.y - 1 && 
        player.x + player.width > obstacle.x && 
        player.x < obstacle.x + obstacle.width) {
        
        player.y = obstacle.y - player.height;
        player.velocity = 0;
    }

    return spikeCollision;
}

// Modify checkSpikeCollision to use relative positions
function checkSpikeCollision(player, spike, platformX, platformY) {
    const spikeX = platformX + spike.relativeX;
    
    if (player.x + player.width < spikeX || player.x > spikeX + spike.width) {
        return false;
    }
    
    const relativeX = (player.x + player.width/2) - spikeX;
    const slopeLeft = spike.height / (spike.width/2);
    const slopeRight = -spike.height / (spike.width/2);
    
    let spikeY;
    if (relativeX <= spike.width/2) {
        spikeY = platformY - (relativeX * slopeLeft);
    } else {
        spikeY = platformY - (spike.height + ((relativeX - spike.width/2) * slopeRight));
    }
    
    return player.y + player.height > spikeY;
}

// Add at the top with other state variables
const lavaParticles = [];

// Add new function to create lava particles
function createLavaParticle() {
    lavaParticles.push({
        x: Math.random() * canvas.width,
        y: 330,
        size: Math.random() * 8 + 4,
        speedY: -(Math.random() * 2 + 1),
        opacity: 1
    });
}

function drawMenu() {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';  // Center align text
    ctx.fillText('The Floor Is Lava', canvas.width/2, 150);
    ctx.font = '16px Arial';
    ctx.fillText('Click Start or Press Space to Play', canvas.width/2, 190);
    ctx.textAlign = 'left';  // Reset text alignment
}

// Modify handleJump function to use correct ground height
function handleJump() {
    if (!isGameStarted) {
        startGame();
        return;
    }
    
    if (isPaused || countdown > 0) {
        return;
    }

    if (hasWon && !winTimer) {  // Only allow restart after timer
        hasWon = false;
        resetGame();
        return;
    }

    // Check if on platform or ground (update ground check to match lava height)
    const onPlatform = obstacles.some(obstacle => 
        player.y + player.height >= obstacle.y - 5 && 
        player.y + player.height <= obstacle.y + 5 && 
        player.x + player.width > obstacle.x && 
        player.x < obstacle.x + obstacle.width
    ) || player.y + player.height >= 530;  // Changed from 329 to 530

    // Only allow jump if on platform/ground or have infinite jump
    if (hasInfiniteJump || onPlatform) {
        player.velocity = jumpForce;
        player.jumping = true;
    }
}

// Modify update function to add precise lava collision
function update() {
    if (!isGameStarted || isPaused || countdown > 0) {
        return;
    }

    if (hasWon) {
        return;
    }

    // Continuous jump check without cooldown
    if (isMouseDown) {
        handleJump();
    }

    // Update game speed based on score
    currentGameSpeed = Math.min(
        MAX_GAME_SPEED,
        INITIAL_GAME_SPEED + (score * SPEED_INCREMENT)
    );

    // Apply gravity
    player.velocity += gravity;
    player.velocity = Math.min(player.velocity, MAX_VELOCITY);
    player.y += player.velocity;

    // Check for lava collision at new height
    if (player.y + player.height >= 530) {
        player.y = 530 - player.height;
        startCountdown();
        return;
    }

    // Update obstacles with auto-scrolling
    let isOnPlatform = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= currentGameSpeed;
        
        if (player.y + player.height >= obstacle.y - 5 && 
            player.y + player.height <= obstacle.y + 5 && 
            player.x + player.width > obstacle.x && 
            player.x < obstacle.x + obstacle.width) {
            isOnPlatform = true;
            player.y = obstacle.y - player.height;
            player.velocity = 0;
            // Remove player.jumping = false here
        }
        
        // Remove obstacles that go off screen and add to score
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            score++;
            
            // Award coins for every multiple of 10
            if (score % 10 === 0) {
                coins += 10;
                localStorage.setItem('coins', coins.toString());
            }
        }
        
        if (checkCollision(player, obstacle)) {
            startCountdown();
            return;
        }
    }

    // Generate new obstacles
    if (obstacles.length === 0 || 
        obstacles[obstacles.length - 1].x < canvas.width - currentPlatformDistance) {
        createObstacle();
    }

    // Check if score hits 50 to disable infinite jump
    if (score >= 50 && hasInfiniteJump) {
        hasInfiniteJump = false;
        updateInfiniteJumpButton();
    }

    // Check for win at 100 and award 50 coins
    if (score >= 100) {
        coins += 50;  // Award 50 coins for winning
        localStorage.setItem('coins', coins.toString());
        hasWon = true;
        if (!winTimer) {
            winTimer = setTimeout(() => {
                winTimer = null;
            }, 3000);
        }
        return;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    if (!isGameStarted) {
        drawMenu();
        return;
    }
    
    // Draw lava floor at new height
    const lavaGradient = ctx.createLinearGradient(0, 530, 0, canvas.height);
    lavaGradient.addColorStop(0, '#ff4500');
    lavaGradient.addColorStop(0.5, '#ff0000');
    lavaGradient.addColorStop(1, '#cc0000');
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, 530, canvas.width, canvas.height - 530);

    // Update and draw lava particles
    if (Math.random() < 0.3) createLavaParticle();
    
    lavaParticles.forEach((particle, index) => {
        particle.y += particle.speedY;
        particle.opacity -= 0.02;
        
        if (particle.opacity <= 0) {
            lavaParticles.splice(index, 1);
            return;
        }

        ctx.fillStyle = `rgba(255, 69, 0, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Update and draw particles
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    drawPlayer();
    drawObstacles();
    drawScore();
    drawCoins();

    // Draw pause or countdown text
    if (isPaused) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';  // Center align text
        ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);  // Center of canvas
        ctx.textAlign = 'left';  // Reset alignment
    } else if (countdown > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';  // Center align text
        ctx.fillText(`Restarting in ${countdown}...`, canvas.width/2, canvas.height/2);  // Center of canvas
        ctx.textAlign = 'left';  // Reset alignment
    }

    if (hasWon) {
        // Draw victory screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('You Won!', canvas.width/2, canvas.height/2 - 25);
        ctx.font = '24px Arial';
        ctx.fillText('Press Space to Play Again', canvas.width/2, canvas.height/2 + 25);
        ctx.textAlign = 'left';
        return;
    }
}

// Simplify game loop
function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Modify window.onload
window.onload = function() {
    // Set up controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Set up buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    startBtn.onclick = startGame;
    pauseBtn.onclick = togglePause;

    // Add mouse and touch controls
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('touchstart', handleTouchStart);

    // Update mouse controls
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', () => isMouseDown = false);

    // Draw initial menu and start game loop
    draw();
    gameLoop();
    createInfiniteJumpButton();

    // Add page visibility handler
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isGameStarted && !isPaused) {
            togglePause();  // Auto-pause when page is hidden
        }
    });
};

// Add keyboard control function
function handleKeyDown(event) {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        handleJump();
    }
}

function handleKeyUp(event) {
    // This function is now empty as per the new implementation
}

// Simplify startGame function
function startGame() {
    if (!isGameStarted) {
        isGameStarted = true;
        resetGame();
    }
}

// Modify resetGame function to reset jump count
function resetGame() {
    hasWon = false;
    countdown = 0;
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    score = 0;
    currentGameSpeed = INITIAL_GAME_SPEED;  // Reset speed
    currentPlatformDistance = INITIAL_PLATFORM_DISTANCE;  // Reset platform distance
    obstacles.length = 0;
    player.y = 230;  // Update reset position (was 180)
    player.velocity = 0;
    player.rotation = 0;
    particles.length = 0;
    player.trail = [];
    player.jumping = false;
    createInitialPlatform();
    createObstacle();
    updateButtons();
    if (winTimer) {
        clearTimeout(winTimer);
        winTimer = null;
    }
}

// Add new function to toggle pause
function togglePause() {
    if (!isGameStarted || countdown > 0) return;
    isPaused = !isPaused;
    updateButtons();
}

// Add at the bottom of the file, before gameLoop()
function updateButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    startBtn.disabled = isGameStarted;
    pauseBtn.disabled = !isGameStarted || countdown > 0;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

// Add new countdown functions
function startCountdown() {
    countdown = 3;
    if (countdownTimer) clearInterval(countdownTimer);
    
    countdownTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(countdownTimer);
            resetGame();
        }
    }, 1000);
}

// Make initial platform more forgiving
function createInitialPlatform() {
    obstacles.push({
        type: OBSTACLE_TYPES.PLATFORM,
        x: canvas.width * 0.25,
        y: 330,  // Lower starting platform (was 280)
        width: 400,
        height: 15,
        spikes: [],
        scored: false
    });
}

// Add cleanup function
function cleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    gameMusic.pause();  // Stop music when cleaning up
    gameMusic.currentTime = 0;
}

// Add mouse click control back
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        handleJump();
    }
});

// Add touch support for mobile back
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent scrolling
    handleJump();
});

// Add these helper functions
function handleMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        isMouseDown = true;
    }
}

function handleMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        isMouseDown = false;
    }
}

function handleTouchStart(event) {
    event.preventDefault(); // Prevent scrolling
    handleJump();
}

// Keep coin functions
function drawCoins() {
    ctx.fillStyle = '#FFD700';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Coins: ${coins}`, canvas.width - 10, 25);
    ctx.textAlign = 'left';
}

function awardCoins() {
    if (score >= 10) {
        coins += 10;
        localStorage.setItem('coins', coins.toString());
    }
} 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 100,
    y: 230,
    width: 30,
    height: 30,
    velocity: 0,
    jumping: false,
    rotation: 0,
    trail: []
};

const obstacles = [];
const gravity = 0.4;
const jumpForce = -8;
const INITIAL_GAME_SPEED = 3;
const MAX_GAME_SPEED = 12;
const SPEED_INCREMENT = 0.1;
const INITIAL_PLATFORM_DISTANCE = 200;
const MIN_PLATFORM_DISTANCE = 150;
const MAX_PLATFORM_DISTANCE = 350;
let score = 0;
let gameOver = false;
let backgroundOffset = 0;
let isGameStarted = false;
let isPaused = false;
let countdown = 0;
let countdownTimer = null;
let hasWon = false;

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

// Modify createObstacle function
function createObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    
    // Calculate platform distance based on current game speed
    currentPlatformDistance = Math.min(
        MAX_PLATFORM_DISTANCE,
        INITIAL_PLATFORM_DISTANCE + (currentGameSpeed * 15)
    );
    
    // Ensure minimum distance
    currentPlatformDistance = Math.max(MIN_PLATFORM_DISTANCE, currentPlatformDistance);
    
    const minX = lastObstacle ? lastObstacle.x + currentPlatformDistance : canvas.width;
    
    const platformHeight = Math.random() * 30 + 50;
    
    const spikePattern = Math.floor(Math.random() * 3);
    
    const obstacle = {
        type: OBSTACLE_TYPES.PLATFORM,
        x: minX,
        y: 330 - platformHeight,
        width: 200,  // Increased from 120 to 200
        height: 15,
        spikes: []
    };

    // Adjust spike positions for longer platform
    switch(spikePattern) {
        case 1: // Middle spike
            obstacle.spikes.push({
                relativeX: 85,  // Adjusted for center of longer platform
                width: 30,
                height: 20
            });
            break;
        case 2: // Edge spikes
            obstacle.spikes.push({
                relativeX: 20,  // Left edge
                width: 20,
                height: 15
            }, {
                relativeX: 160,  // Right edge
                width: 20,
                height: 15
            });
            break;
    }

    obstacles.push(obstacle);
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    
    // Rotate player when jumping
    if (player.jumping) {
        player.rotation += 0.1;
    } else {
        player.rotation = 0;
    }
    ctx.rotate(player.rotation);

    // Change player gradient from red to blue
    const gradient = ctx.createLinearGradient(-player.width/2, -player.height/2, 
                                            player.width/2, player.height/2);
    gradient.addColorStop(0, '#0066ff');  // Bright blue
    gradient.addColorStop(1, '#66a3ff');  // Light blue
    ctx.fillStyle = gradient;
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    
    ctx.restore();

    // Add trail effect
    player.trail.unshift({ x: player.x, y: player.y, rotation: player.rotation });
    if (player.trail.length > 10) player.trail.pop();
    
    // Change trail color from red to blue
    player.trail.forEach((pos, index) => {
        const alpha = (1 - index/10) * 0.3;
        ctx.save();
        ctx.translate(pos.x + player.width/2, pos.y + player.height/2);
        ctx.rotate(pos.rotation);
        ctx.fillStyle = `rgba(0, 102, 255, ${alpha})`; // Blue with alpha
        ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
        ctx.restore();
    });

    // Create particles
    if (player.jumping) {
        particles.push(new Particle(player.x, player.y + player.height));
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

// Modify drawSpike function to use relative positions
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
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1, '#ff6666');
    
    ctx.fillStyle = gradient;
    ctx.fill();
}

function drawBackground() {
    // Scrolling grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    backgroundOffset = (backgroundOffset + currentGameSpeed) % 50;
    
    for (let x = -backgroundOffset; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
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
        player.jumping = false;
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
    ctx.fillText('The Floor Is Lava', 270, 150);
    ctx.font = '16px Arial';
    ctx.fillText('Click Start or Press Space to Play', 290, 190);
}

// Modify update function to make player always falling unless on platform
function update() {
    if (!isGameStarted || isPaused || countdown > 0) {
        return;
    }

    if (hasWon) {
        return;
    }

    // Update game speed based on score
    currentGameSpeed = Math.min(
        MAX_GAME_SPEED,
        INITIAL_GAME_SPEED + (score * SPEED_INCREMENT)
    );

    // Always apply gravity
    player.velocity += gravity;
    player.y += player.velocity;

    // Check for win condition
    if (score >= 100) {
        hasWon = true;
        return;
    }

    // Lava collision (die immediately)
    if (player.y + player.height > 330) {
        startCountdown();
        return;
    }

    // Update obstacles
    let isOnPlatform = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= currentGameSpeed;
        
        // Check if player is on this platform
        if (player.y + player.height === obstacle.y &&
            player.x + player.width > obstacle.x && 
            player.x < obstacle.x + obstacle.width) {
            isOnPlatform = true;
        }
        
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
            score++;
        }
        if (checkCollision(player, obstacle)) {
            startCountdown();
            return;
        }
    }

    // If not on any platform, player should be falling
    if (!isOnPlatform) {
        player.jumping = true;
    }

    // Generate new obstacles
    if (obstacles.length === 0 || 
        obstacles[obstacles.length - 1].x < canvas.width - currentPlatformDistance) {
        createObstacle();
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
    
    // Draw lava floor
    const lavaGradient = ctx.createLinearGradient(0, 330, 0, canvas.height);
    lavaGradient.addColorStop(0, '#ff4500');  // Orange-red
    lavaGradient.addColorStop(0.5, '#ff0000'); // Bright red
    lavaGradient.addColorStop(1, '#cc0000');  // Dark red
    ctx.fillStyle = lavaGradient;
    ctx.fillRect(0, 330, canvas.width, canvas.height - 330);

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
    
    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, 328, 0, 332);
    groundGradient.addColorStop(0, '#4CAF50');
    groundGradient.addColorStop(1, '#45a049');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, 330, canvas.width, 2);
    
    drawPlayer();
    drawObstacles();
    drawScore();

    // Draw pause or countdown text
    if (isPaused) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '28px Arial';
        ctx.fillText('PAUSED', 350, 200);
    } else if (countdown > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '28px Arial';
        ctx.fillText(`Restarting in ${countdown}...`, 300, 200);
    }

    if (hasWon) {
        // Draw victory screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.font = '48px Arial';
        ctx.fillText('You Won!', 300, 180);
        ctx.font = '24px Arial';
        ctx.fillText('Press Space to Play Again', 280, 230);
        return;
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Replace the event listener section with these new controls
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
        handleJump();
    }
});

// Add mouse click control
canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left mouse button
        handleJump();
    }
});

// Add touch support for mobile
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent scrolling
    handleJump();
});

// Modify handleJump function
function handleJump() {
    if (!isGameStarted) {
        startGame();
        return;
    }
    
    if (isPaused || countdown > 0) {
        return;
    }

    if (hasWon) {
        hasWon = false;
        resetGame();
        return;
    }

    // Allow jumping if on a platform or not too far from one
    const canJump = obstacles.some(obstacle => 
        player.y + player.height >= obstacle.y - 1 && 
        player.y + player.height <= obstacle.y + 1 && 
        player.x + player.width > obstacle.x && 
        player.x < obstacle.x + obstacle.width
    );

    if (canJump) {
        player.jumping = true;
        player.velocity = jumpForce;
    }
}

// Add new function to start game
function startGame() {
    isGameStarted = true;
    resetGame();
    updateButtons();
}

// Add new function to reset game
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
    player.y = 230;
    player.velocity = 0;
    player.rotation = 0;
    particles.length = 0;
    player.trail = [];
    createInitialPlatform();
    createObstacle();
    updateButtons();
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

// Modify createInitialPlatform for better first jump
function createInitialPlatform() {
    obstacles.push({
        type: OBSTACLE_TYPES.PLATFORM,
        x: 50,
        y: 280,
        width: 300,  // Wider starting platform
        height: 15,
        spikes: []
    });
}

// 开始游戏
gameLoop(); 
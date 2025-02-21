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
let wins = parseInt(localStorage.getItem('wins')) || 0;  // Persist wins between sessions

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

// Add at the top with other state variables
const COLORS = {
    purple: ['#4B0082', '#0000FF', '#4169E1', '#9400D3'],  // Back to original purple set
    red: ['#FF0000', '#FF4500', '#FF6347', '#DC143C'],
    green: ['#00FF00', '#32CD32', '#00FA9A', '#98FB98'],
    blue: ['#00FFFF', '#00BFFF', '#87CEEB', '#1E90FF'],
    gold: ['#FFD700', '#FFA500', '#DAA520', '#B8860B']
};
let currentColorSet = 'purple';  // Default color

// Add function to create color picker button
function createColorPickerButton() {
    const button = document.createElement('button');
    button.id = 'colorPickerBtn';
    button.style.position = 'fixed';
    button.style.top = '120px';
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '15px 30px';
    button.style.fontSize = '24px';
    button.style.fontWeight = 'bold';
    button.style.border = '3px solid white';
    button.style.borderRadius = '10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.zIndex = '9999';
    button.innerHTML = '🎨 Change Color';
    button.onclick = showColorGrid;
    document.body.appendChild(button);
}

// Add function to create and show color grid
function showColorGrid() {
    // Remove existing grid if any
    const existingGrid = document.getElementById('colorGrid');
    if (existingGrid) {
        existingGrid.remove();
        return;
    }

    const grid = document.createElement('div');
    grid.id = 'colorGrid';
    grid.style.position = 'fixed';
    grid.style.top = '180px';
    grid.style.left = '50%';
    grid.style.transform = 'translateX(-50%)';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = '10px';
    grid.style.padding = '15px';
    grid.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    grid.style.borderRadius = '10px';
    grid.style.zIndex = '10000';

    Object.entries(COLORS).forEach(([name, colors]) => {
        const colorBox = document.createElement('div');
        colorBox.style.width = '50px';
        colorBox.style.height = '50px';
        colorBox.style.background = `linear-gradient(45deg, ${colors.join(', ')})`;
        colorBox.style.borderRadius = '5px';
        colorBox.style.cursor = 'pointer';
        colorBox.style.border = name === currentColorSet ? '3px solid white' : '3px solid transparent';
        colorBox.onclick = () => {
            currentColorSet = name;
            grid.remove();
            // Show confirmation message
            const msg = document.createElement('div');
            msg.style.position = 'fixed';
            msg.style.top = '180px';
            msg.style.left = '50%';
            msg.style.transform = 'translateX(-50%)';
            msg.style.color = 'white';
            msg.style.fontSize = '20px';
            msg.style.fontWeight = 'bold';
            msg.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
            msg.innerHTML = `Color Set: ${name.charAt(0).toUpperCase() + name.slice(1)}`;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 1500);
        };
        grid.appendChild(colorBox);
    });

    document.body.appendChild(grid);
}

// Modify drawPlayer function to restore original flame effect
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    
    player.rotation += 0.05;
    ctx.rotate(player.rotation);

    // Create gradient for the block base that matches the color grid
    const blockGradient = ctx.createLinearGradient(
        -player.width/2, -player.height/2,
        player.width/2, player.height/2
    );
    const colors = COLORS[currentColorSet];
    colors.forEach((color, index) => {
        blockGradient.addColorStop(index / (colors.length - 1), color);
    });
    
    // Draw block with gradient
    ctx.fillStyle = blockGradient;
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    
    // Draw flames using same gradient pattern
    for(let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (Date.now() / 200);
        const flameLength = player.width/2 + Math.sin(Date.now() / 100) * 5;
        
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
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    ctx.restore();
    
    // Update trail with matching gradient
    player.trail.unshift({ x: player.x, y: player.y, rotation: player.rotation });
    if (player.trail.length > 8) player.trail.pop();
    
    player.trail.forEach((pos, index) => {
        const alpha = (1 - index/8) * 0.3;
        ctx.save();
        ctx.translate(pos.x + player.width/2, pos.y + player.height/2);
        ctx.rotate(pos.rotation);
        
        // Create gradient for trail block
        const trailGradient = ctx.createLinearGradient(
            -player.width/2, -player.height/2,
            player.width/2, player.height/2
        );
        colors.forEach((color, i) => {
            trailGradient.addColorStop(i / (colors.length - 1), `rgba(${hexToRgb(color)}, ${alpha})`);
        });
        
        ctx.fillStyle = trailGradient;
        ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
        
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
            gradient.addColorStop(0, `rgba(${hexToRgb(colors[i % colors.length])}, ${alpha})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        ctx.restore();
    });
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

// Modify drawSpike function to make spikes more visible
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
    gradient.addColorStop(0, '#FF0000');  // Bright red
    gradient.addColorStop(0.5, '#FF4500'); // Orange-red
    gradient.addColorStop(1, '#FF6347');  // Tomato red
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Add stronger red glow effect
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 15;  // Increased glow
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
    ctx.fillText(`Wins: ${wins}`, 10, 50);  // Add wins display below score
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

    if (hasWon && !winTimer) {
        hasWon = false;
        resetGame();
        return;
    }

    // Check if on platform or ground
    const onPlatform = obstacles.some(obstacle => 
        player.y + player.height >= obstacle.y - 5 && 
        player.y + player.height <= obstacle.y + 5 && 
        player.x + player.width > obstacle.x && 
        player.x < obstacle.x + obstacle.width
    ) || player.y + player.height >= 530;

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
        wins += 1;    // Increment win counter
        localStorage.setItem('coins', coins.toString());
        localStorage.setItem('wins', wins.toString());  // Save wins
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
    createColorPickerButton();

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

// Add helper function to convert hex to rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
        '75, 0, 130';
}

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

// Add createObstacle function
function createObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    
    const maxJumpDistance = 280;
    const minJumpDistance = 220;
    
    const minX = lastObstacle ? lastObstacle.x + minJumpDistance : 100;
    const maxX = lastObstacle ? lastObstacle.x + maxJumpDistance : canvas.width - 300;
    
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

    if (Math.random() < 0.3) {
        const spikePos = Math.random() * (obstacle.width - 60) + 10;
        obstacle.spikes.push({
            relativeX: spikePos,
            width: 30,
            height: 25
        });
    }

    obstacles.push(obstacle);
} 

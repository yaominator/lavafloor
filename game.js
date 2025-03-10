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
    PLATFORM_SPIKE: 'platformSpike',
    PILLAR: 'pillar'  // Add new type
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
    red: ['#FF0000', '#FF4500', '#FF6347', '#DC143C'],
    yellow: ['#FFD700', '#FFA500', '#DAA520', '#B8860B'],  // Renamed from gold to yellow
    green: ['#00FF00', '#32CD32', '#00FA9A', '#98FB98'],
    blue: ['#00FFFF', '#00BFFF', '#87CEEB', '#1E90FF'],
    purple: ['#4B0082', '#0000FF', '#4169E1', '#9400D3'],
    black: ['#000000', '#1A1A1A', '#333333', '#4A4A4A']  // Add black gradient
};
let currentColorSet = 'red';  // Changed from 'purple' to 'red'

// Add at the top with other state variables
const DIFFICULTY_LEVELS = {
    EASY: {
        name: 'Easy',
        platformWidth: 180,    // Still generous but not too wide
        pillarWidth: 60,      // Good width for landing
        spikeChance: 0.1,     // Some spikes for challenge
        pillarChance: 0.15,   // More pillars than before
        speed: 2.2            // Slightly faster
    },
    NORMAL: {
        name: 'Normal',
        platformWidth: 150,    // Standard width
        pillarWidth: 45,      // Requires more precision
        spikeChance: 0.25,    // More spikes
        pillarChance: 0.2,    // Regular pillar frequency
        speed: 2.5            // Standard speed
    },
    HARD: {
        name: 'Hard',
        platformWidth: 140,    // Slightly challenging
        pillarWidth: 40,      // Requires precision
        spikeChance: 0.3,     // Frequent spikes
        pillarChance: 0.25,   // More pillars
        speed: 2.7            // Faster pace
    },
    INSANE: {
        name: '💀 INSANE 💀',
        platformWidth: 120,     // Increased from 100 to 120
        pillarWidth: 38,       // Increased from 35 to 38
        spikeChance: 0.35,     // Decreased from 0.4 to 0.35
        pillarChance: 0.3,     // Decreased from 0.35 to 0.3
        speed: 2.8             // Decreased from 3.0 to 2.8
    }
};
let currentDifficulty = 'NORMAL';

// Add function to create color picker button
function createColorPickerButton() {
    const button = document.createElement('button');
    button.id = 'colorPickerBtn';
    button.style.position = 'fixed';
    button.style.top = '50px';
    button.style.left = '75%';  // Changed from 80% to 75%
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '15px 30px';
    button.style.fontSize = '24px';
    button.style.fontWeight = 'bold';
    button.style.border = '3px solid white';
    button.style.borderRadius = '10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.zIndex = '9999';
    button.innerHTML = '<span style="font-size: 24px; white-space: nowrap">🎨 Change Color</span>';  // Force single line
    button.style.whiteSpace = 'nowrap';  // Ensure text stays on one line
    button.onclick = showColorGrid;
    document.body.appendChild(button);
}

// Modify showColorGrid function to show colors in one row
function showColorGrid() {
    // Remove existing grid if any
    const existingGrid = document.getElementById('colorGrid');
    if (existingGrid) {
        existingGrid.remove();
        if (isPaused) {
            togglePause(); // Resume game if closing grid
        }
        return;
    }

    if (!isPaused && isGameStarted) {
        togglePause(); // Pause game when opening grid
    }

    const grid = document.createElement('div');
    grid.id = 'colorGrid';
    grid.style.position = 'fixed';
    grid.style.top = '110px';
    grid.style.left = '75%';  // Changed from 80% to 75%
    grid.style.transform = 'translateX(-50%)';
    grid.style.display = 'flex';  // Changed from grid to flex
    grid.style.flexDirection = 'row';  // Ensure horizontal layout
    grid.style.gap = '10px';
    grid.style.padding = '15px';
    grid.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    grid.style.borderRadius = '10px';
    grid.style.zIndex = '10000';
    grid.style.width = 'fit-content';  // Make container fit content

    Object.entries(COLORS).forEach(([name, colors]) => {
        const colorBox = document.createElement('div');
        colorBox.style.width = '40px';
        colorBox.style.height = '40px';
        colorBox.style.background = `linear-gradient(45deg, ${colors.join(', ')})`;
        colorBox.style.borderRadius = '5px';
        colorBox.style.cursor = 'pointer';
        colorBox.style.border = name === currentColorSet ? '3px solid white' : '3px solid transparent';
        colorBox.style.flexShrink = '0';  // Prevent boxes from shrinking
        colorBox.onclick = () => {
            currentColorSet = name;
            grid.remove();
            if (isPaused) {
                togglePause(); // Resume game after selecting color
            }
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
        const alpha = (1 - index/8) * 0.3 ;
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

// Modify drawObstacles function to properly draw normal pillars
function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === OBSTACLE_TYPES.PILLAR) {
            // Draw normal pillar
            const pillarGradient = ctx.createLinearGradient(
                obstacle.x,
                obstacle.y - obstacle.height,
                obstacle.x,
                obstacle.y
            );
            pillarGradient.addColorStop(0, '#4a4a4a');  // Darker base
            pillarGradient.addColorStop(0.5, '#666666'); // Mid-tone
            pillarGradient.addColorStop(1, '#808080');   // Lighter edge
            
            ctx.fillStyle = pillarGradient;
            ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);

            // Draw rock texture
            if (obstacle.rockPattern) {
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;

                // Draw cracks
                obstacle.rockPattern.cracks.forEach(crack => {
                    const startX = obstacle.x + crack.startX * obstacle.width;
                    const startY = obstacle.y - obstacle.height + crack.startY * obstacle.height;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    
                    let currentX = startX;
                    let currentY = startY;
                    
                    crack.offsets.forEach(offset => {
                        currentX += offset.x;
                        currentY += offset.y;
                        
                        if (currentX >= obstacle.x && 
                            currentX <= obstacle.x + obstacle.width &&
                            currentY >= obstacle.y - obstacle.height &&
                            currentY <= obstacle.y) {
                            ctx.lineTo(currentX, currentY);
                        }
                    });
                    
                    ctx.stroke();
                });

                // Draw spots
                obstacle.rockPattern.spots.forEach(spot => {
                    const x = obstacle.x + spot.x * obstacle.width;
                    const y = obstacle.y - obstacle.height + spot.y * obstacle.height;
                    
                    ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
                    ctx.beginPath();
                    ctx.arc(x, y, spot.size, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        } else if (obstacle.type === 'flappyPillar') {
            // Draw flappy pillar
            const pillarGradient = ctx.createLinearGradient(
                obstacle.x,
                obstacle.y,
                obstacle.x,
                obstacle.y + obstacle.height
            );
            pillarGradient.addColorStop(0, '#4a4a4a');  // Darker base
            pillarGradient.addColorStop(0.5, '#666666'); // Mid-tone
            pillarGradient.addColorStop(1, '#808080');   // Lighter edge
            
            ctx.fillStyle = pillarGradient;
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

            // Draw rock texture
            if (obstacle.rockPattern) {
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;

                // Draw cracks
                obstacle.rockPattern.cracks.forEach(crack => {
                    const startX = obstacle.x + crack.startX * obstacle.width;
                    const startY = obstacle.y + crack.startY * obstacle.height;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    
                    let currentX = startX;
                    let currentY = startY;
                    
                    crack.offsets.forEach(offset => {
                        currentX += offset.x;
                        currentY += offset.y;
                        
                        if (currentX >= obstacle.x && 
                            currentX <= obstacle.x + obstacle.width &&
                            currentY >= obstacle.y &&
                            currentY <= obstacle.y + obstacle.height) {
                            ctx.lineTo(currentX, currentY);
                        }
                    });
                    
                    ctx.stroke();
                });

                // Draw spots
                obstacle.rockPattern.spots.forEach(spot => {
                    const x = obstacle.x + spot.x * obstacle.width;
                    const y = obstacle.y + spot.y * obstacle.height;
                    
                    ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
                    ctx.beginPath();
                    ctx.arc(x, y, spot.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
                    ctx.beginPath();
                    ctx.arc(x - 1, y - 1, spot.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        } else {
            // Normal platform drawing code...
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
        }

        // Draw spikes
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
    ctx.fillText(`Wins: ${wins}`, 10, 50);
    ctx.fillText(`Level: ${DIFFICULTY_LEVELS[currentDifficulty].name}`, 10, 75);  // Add level display
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
    ctx.textAlign = 'left';  // Reset text alignment
}

// Modify handleJump function
function handleJump() {
    if (!isGameStarted || isPaused || countdown > 0) {
        return;
    }

    if (hasWon && !winTimer) {
        hasWon = false;
        resetGame();
        return;
    }

    if (isFlappyMode) {
        // Use regular jump force and don't check for platform
        player.velocity = jumpForce;
        return;
    }

    // Normal mode jump check
    const onPlatform = obstacles.some(obstacle => {
        if (obstacle.type === OBSTACLE_TYPES.PILLAR) {
            return player.y + player.height >= obstacle.y - obstacle.height - 5 && 
                   player.y + player.height <= obstacle.y - obstacle.height + 5 && 
                   player.x + player.width > obstacle.x && 
                   player.x < obstacle.x + obstacle.width;
        } else {
            return player.y + player.height >= obstacle.y - 5 && 
                   player.y + player.height <= obstacle.y + 5 && 
                   player.x + player.width > obstacle.x && 
                   player.x < obstacle.x + obstacle.width;
        }
    }) || player.y + player.height >= 530;

    if (hasInfiniteJump || onPlatform) {
        player.velocity = jumpForce;
    }
}

// Add to state variables at the top
let platform25 = null;  // Store the platform that appears at score 25

// Modify FLAPPY_PILLAR_CONFIG to be difficulty-based
const FLAPPY_PILLAR_CONFIG = {
    EASY: {
        width: 60,
        gap: 200,    // Lots of vertical space
        spacing: 400  // Lots of horizontal space
    },
    NORMAL: {
        width: 60,
        gap: 170,    // Moderate vertical space
        spacing: 350  // Moderate horizontal space
    },
    HARD: {
        width: 60,
        gap: 140,    // Less vertical space
        spacing: 300  // Less horizontal space
    },
    INSANE: {
        width: 60,
        gap: 110,    // Barely enough space
        spacing: 250  // Very close together
    }
};

// Modify createObstacle function to use difficulty-based config
function createObstacle() {
    if (isFlappyMode) {
        const lastObstacle = obstacles[obstacles.length - 1];
        const config = FLAPPY_PILLAR_CONFIG[currentDifficulty];
        const minX = lastObstacle ? lastObstacle.x + config.spacing : canvas.width;
        
        const gapStart = Math.random() * (canvas.height - config.gap - 200) + 100;
        
        // Add rock texture to both pillars
        const createRockPattern = () => ({
            cracks: Array.from({ length: 30 }, () => ({
                startX: Math.random(),
                startY: Math.random(),
                segments: Math.floor(Math.random() * 3) + 2,
                offsets: Array.from({ length: 5 }, () => ({
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 5
                }))
            })),
            spots: Array.from({ length: 10 }, () => ({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 4 + 2
            }))
        });

        // Create top pillar with rock texture
        obstacles.push({
            type: 'flappyPillar',
            x: minX,
            y: 0,
            width: config.width,
            height: gapStart,
            spikes: [],
            scored: false,
            rockPattern: createRockPattern()
        });

        // Create bottom pillar with rock texture
        obstacles.push({
            type: 'flappyPillar',
            x: minX,
            y: gapStart + config.gap,
            width: config.width,
            height: canvas.height - (gapStart + config.gap),
            spikes: [],
            scored: false,
            rockPattern: createRockPattern()
        });
    } else {
        const lastObstacle = obstacles[obstacles.length - 1];
        const difficulty = DIFFICULTY_LEVELS[currentDifficulty];
        
        // Special adjustments for INSANE mode
        const isInsane = currentDifficulty === 'INSANE';
        const maxJumpDistance = isInsane ? 200 : 210;
        const minJumpDistance = isInsane ? 165 : 170;
        
        // Ensure minimum distance from spawn pillar
        const spawnPillarEnd = canvas.width * 0.25 + 300; // End of spawn pillar
        const minX = lastObstacle ? 
            Math.max(lastObstacle.x + minJumpDistance, spawnPillarEnd + 100) : 
            spawnPillarEnd + 100;
        const maxX = lastObstacle ? 
            lastObstacle.x + maxJumpDistance : 
            canvas.width - 300;

        // Calculate height based on last obstacle for smooth transitions
        const lastHeight = lastObstacle ? lastObstacle.height : 200;
        const minHeight = Math.max(150, lastHeight - 50);
        const maxHeight = Math.min(300, lastHeight + 50);
        const newHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        // Always create pillar with varying height
        obstacles.push({
            type: OBSTACLE_TYPES.PILLAR,
            x: Math.random() * (maxX - minX) + minX,
            y: 530,
            width: difficulty.pillarWidth,
            height: newHeight,
            spikes: [],
            scored: false,
            rockPattern: {
                cracks: Array.from({ length: 30 }, () => ({
                    startX: Math.random(),
                    startY: Math.random(),
                    segments: Math.floor(Math.random() * 3) + 2,
                    offsets: Array.from({ length: 5 }, () => ({
                        x: (Math.random() - 0.5) * 10,
                        y: (Math.random() - 0.5) * 5
                    }))
                })),
                spots: Array.from({ length: 10 }, () => ({
                    x: Math.random(),
                    y: Math.random(),
                    size: Math.random() * 4 + 2
                }))
            }
        });
    }
}

// Add to state variables at the top
let transitionX = null;
let hasPassedTransition = false;

// Modify update function to change transition point
function update() {
    if (!isGameStarted || isPaused || countdown > 0) {
        return;
    }

    if (hasWon) {
        return;
    }

    // If we hit score 50, set transition point (changed from 25)
    if (score === 50 && !isFlappyMode && transitionX === null) {
        transitionX = canvas.width + 100; // Start off screen
    }

    // Move transition line with game speed
    if (transitionX !== null) {
        transitionX -= currentGameSpeed;

        // Check if player passes through the line
        if (!hasPassedTransition && player.x > transitionX) {
            isFlappyMode = true;
            hasPassedTransition = true;
            createTransitionEffect();
            
            // Clear all existing platforms
            obstacles.length = 0;
            
            // Create initial flappy pillars
            for (let i = 0; i < 3; i++) {
                createObstacle();
            }
        }
    }

    // Check for continuous jumping only before flappy mode
    if (!isFlappyMode && isMouseDown) {
        handleJump();
    }

    // Apply physics based on mode
    if (isFlappyMode) {
        // Use same gravity and physics as normal mode
        player.velocity += gravity;
        player.velocity = Math.min(player.velocity, MAX_VELOCITY);
        player.y += player.velocity;
        
        // Keep player in bounds
        if (player.y < 0) {
            player.y = 0;
            player.velocity = 0;
        }
        
        // Death on ground touch in flappy mode
        if (player.y + player.height >= 530) {
            startCountdown();
            return;
        }
    } else {
        // Normal mode physics
        player.velocity += gravity;
        player.velocity = Math.min(player.velocity, MAX_VELOCITY);
        player.y += player.velocity;

        // Normal ground collision
        if (player.y + player.height >= 530) {
            player.y = 530 - player.height;
            startCountdown();
            return;
        }
    }

    // Update obstacles with auto-scrolling
    let isOnPlatform = false;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= currentGameSpeed;
        
        // Skip collision checks if infinite jump is active
        if (!hasInfiniteJump) {
            // Handle collisions for both pillar types
            if (obstacle.type === OBSTACLE_TYPES.PILLAR) {
                // Original pillar collision
                const onPillarTop = 
                    player.y + player.height >= obstacle.y - obstacle.height - 5 && 
                    player.y + player.height <= obstacle.y - obstacle.height + 5 && 
                    player.x + player.width > obstacle.x && 
                    player.x < obstacle.x + obstacle.width;

                const hitPillarSide = 
                    player.x + player.width > obstacle.x &&
                    player.x < obstacle.x + obstacle.width &&
                    player.y + player.height > obstacle.y - obstacle.height + 15 &&
                    player.y < obstacle.y;

                if (onPillarTop) {
                    isOnPlatform = true;
                    player.y = obstacle.y - obstacle.height - player.height;
                    player.velocity = 0;
                } else if (hitPillarSide) {
                    startCountdown();
                    return;
                }
            } else if (obstacle.type === 'flappyPillar') {
                // Flappy pillar collision
                const hitPillar = 
                    player.x + player.width > obstacle.x &&
                    player.x < obstacle.x + obstacle.width &&
                    player.y + player.height > obstacle.y &&
                    player.y < obstacle.y + obstacle.height;

                if (hitPillar) {
                    startCountdown();
                    return;
                }
            }
        }
        
        // Remove obstacles that go off screen and add to score
        if (obstacle.x + obstacle.width < 0) {
            if (!obstacle.scored) {
                score++;
                obstacle.scored = true;
                
                // Award coins based on difficulty for every multiple of 10
                if (score % 10 === 0) {
                    let coinReward;
                    switch(currentDifficulty) {
                        case 'INSANE':
                            coinReward = 40;  // Increased from 30 to 40 for INSANE
                            break;
                        case 'HARD':
                            coinReward = 30;
                            break;
                        case 'NORMAL':
                            coinReward = 20;
                            break;
                        case 'EASY':
                        default:
                            coinReward = 10;
                            break;
                    }
                    coins += coinReward;
                    localStorage.setItem('coins', coins.toString());
                }
            }
            obstacles.splice(i, 1);
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

    // Check for win at 100 and award coins and wins based on difficulty
    if (score >= 100) {
        coins += 50;  // Base reward
        
        // Award wins and coins based on difficulty
        switch(currentDifficulty) {
            case 'INSANE':
                wins += 5;  // 5 wins for insane
                coins += 400; // Increased from 50 to 400 extra coins for insane
                break;
            case 'HARD':
                wins += 3;  // 3 wins for hard
                break;
            case 'NORMAL':
                wins += 2;  // 2 wins for normal
                break;
            case 'EASY':
            default:
                wins += 1;  // 1 win for easy
                break;
        }
        
        localStorage.setItem('coins', coins.toString());
        localStorage.setItem('wins', wins.toString());
        hasWon = true;
        if (!winTimer) {
            winTimer = setTimeout(() => {
                winTimer = null;
            }, 3000);
        }
        return;
    }

    // Only check ground collision if infinite jump is not active
    if (!hasInfiniteJump && player.y + player.height >= 530) {
        if (isFlappyMode) {
            startCountdown();
            return;
        } else {
            player.y = 530 - player.height;
            startCountdown();
            return;
        }
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

    if (portalSpawned) {
        drawPortal();
    }

    // Draw transition line
    if (transitionX !== null) {
        const lineGradient = ctx.createLinearGradient(
            transitionX, 0,
            transitionX, canvas.height
        );
        lineGradient.addColorStop(0, 'rgba(147, 0, 211, 0)');  // Transparent purple at top
        lineGradient.addColorStop(0.5, 'rgba(147, 0, 211, 0.8)');  // Solid purple in middle
        lineGradient.addColorStop(1, 'rgba(147, 0, 211, 0)');  // Transparent purple at bottom
        
        ctx.fillStyle = lineGradient;
        ctx.fillRect(transitionX - 2, 0, 4, canvas.height);

        // Add sparkle effects
        const time = Date.now() / 1000;
        for (let i = 0; i < 5; i++) {
            const y = (Math.sin(time * 2 + i) + 1) * canvas.height / 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(transitionX, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Simplify game loop
function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Modify window.onload to only use Start button
window.onload = function() {
    // Set up keyboard controls
document.addEventListener('keydown', (event) => {
        if (isGameStarted && (event.code === 'Space' || event.code === 'ArrowUp')) {
        handleJump();
    }
});

    // Set up buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    startBtn.onclick = startGame;
    pauseBtn.onclick = togglePause;

    // Single set of mouse controls
    canvas.addEventListener('mousedown', (event) => {
        if (isGameStarted && event.button === 0) { // Left mouse button
            isMouseDown = true;
            handleJump();  // Immediate first jump
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            isMouseDown = false;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });

    // Draw initial menu and start game loop
    draw();
    gameLoop();
    createInfiniteJumpButton();
    createColorPickerButton();
    createLevelSelectorButton();

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isGameStarted && !isPaused) {
            togglePause();
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
    isFlappyMode = false;
    portalSpawned = false;
    portalObstacle = null;
    platform25 = null;
    transitionX = null;
    hasPassedTransition = false;
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

// Modify createInitialPlatform to create a wider initial pillar
function createInitialPlatform() {
    obstacles.push({
        type: OBSTACLE_TYPES.PILLAR,
        x: canvas.width * 0.25,
        y: 530,
        width: 300,  // Increased from 100 to 300
        height: 200,
        spikes: [],
        scored: false,
        rockPattern: {
            cracks: Array.from({ length: 30 }, () => ({
                startX: Math.random(),
                startY: Math.random(),
                segments: Math.floor(Math.random() * 3) + 2,
                offsets: Array.from({ length: 5 }, () => ({
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 5
                }))
            })),
            spots: Array.from({ length: 10 }, () => ({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 4 + 2
            }))
        }
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
    button.style.position = 'fixed';
    button.style.top = '50px';
    button.style.left = '18%';  // Changed from 20% to 18%
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '15px 30px';
    button.style.fontSize = '24px';
    button.style.fontWeight = 'bold';
    button.style.border = '3px solid white';
    button.style.borderRadius = '10px';
    button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    button.style.zIndex = '9999';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
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

// Modify createLevelSelectorButton function
function createLevelSelectorButton() {
    const button = document.createElement('button');
    button.id = 'levelSelectorBtn';
    button.style.position = 'fixed';
    button.style.top = '50px';
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
    button.innerHTML = '🎮 Select Difficulty';
    button.onclick = showLevelSelector;
    document.body.appendChild(button);
}

// Modify showLevelSelector function to handle pausing
function showLevelSelector() {
    // Remove existing selector if any
    const existingSelector = document.getElementById('levelSelector');
    if (existingSelector) {
        existingSelector.remove();
        if (isPaused) {
            togglePause(); // Resume game if closing selector
        }
        return;
    }

    if (!isPaused && isGameStarted) {
        togglePause(); // Pause game when opening selector
    }

    const selector = document.createElement('div');
    selector.id = 'levelSelector';
    selector.style.position = 'fixed';
    selector.style.top = '110px';  // Move popup below buttons
    selector.style.left = '50%';   // Center align
    selector.style.transform = 'translateX(-50%)';
    selector.style.padding = '20px';
    selector.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    selector.style.borderRadius = '10px';
    selector.style.zIndex = '10000';
    selector.style.display = 'flex';
    selector.style.flexDirection = 'column';
    selector.style.gap = '10px';

    Object.entries(DIFFICULTY_LEVELS).forEach(([level, config]) => {
        const levelButton = document.createElement('button');
        levelButton.style.padding = '10px 20px';
        levelButton.style.fontSize = '20px';
        levelButton.style.fontWeight = 'bold';
        levelButton.style.border = '2px solid white';
        levelButton.style.borderRadius = '5px';
        levelButton.style.backgroundColor = level === currentDifficulty ? '#45a049' : '#4CAF50';
        levelButton.style.color = 'white';
        levelButton.style.cursor = 'pointer';
        levelButton.innerHTML = config.name;
        levelButton.onclick = () => {
            currentDifficulty = level;
            selector.remove();
            if (isPaused) {
                togglePause(); // Resume game after selecting difficulty
            }
            // Show confirmation message
            const msg = document.createElement('div');
            msg.style.position = 'fixed';
            msg.style.top = '250px';  // Changed from 310px to 250px
            msg.style.left = '50%';
            msg.style.transform = 'translateX(-50%)';
            msg.style.color = 'white';
            msg.style.fontSize = '20px';
            msg.style.fontWeight = 'bold';
            msg.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
            msg.innerHTML = `Difficulty: ${config.name}`;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 1500);
        };
        selector.appendChild(levelButton);
    });

    document.body.appendChild(selector);
}

// Add to state variables at the top
let isFlappyMode = false;
let portalSpawned = false;
let portalObstacle = null;  // Will store the portal as a moving obstacle

// Add to state variables at the top
const PORTAL_SIZE = 100;

// Add to state variables at the top
const PORTAL_POSITION = {
    x: canvas.width - 300,  // Fixed position from right side
    y: 300                  // Fixed height
};

// Modify drawPortal function to use portal obstacle position
function drawPortal() {
    if (!portalObstacle) return;

    // Portal effect
    const gradient = ctx.createRadialGradient(
        portalObstacle.x + PORTAL_SIZE/2, portalObstacle.y + PORTAL_SIZE/2, 0,
        portalObstacle.x + PORTAL_SIZE/2, portalObstacle.y + PORTAL_SIZE/2, PORTAL_SIZE/2
    );
    gradient.addColorStop(0, '#8A2BE2');
    gradient.addColorStop(0.5, '#4B0082');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(portalObstacle.x + PORTAL_SIZE/2, portalObstacle.y + PORTAL_SIZE/2, PORTAL_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Swirling effect
    const time = Date.now() / 1000;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time;
        const radius = PORTAL_SIZE/4 + Math.sin(time * 2) * 10;
        ctx.beginPath();
        ctx.arc(
            portalObstacle.x + PORTAL_SIZE/2 + Math.cos(angle) * radius,
            portalObstacle.y + PORTAL_SIZE/2 + Math.sin(angle) * radius,
            5,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = '#9400D3';
        ctx.fill();
    }
}

// Add transition effect function
function createTransitionEffect() {
    // Create some particles or visual effect to show mode change
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(
            player.x + player.width/2,
            player.y + player.height/2
        ));
    }
} 

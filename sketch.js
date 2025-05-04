// --- Game Configuration ---
const MAX_LEVELS = 3;
const BASE_WALL_COUNT = 5;
const WALL_INCREMENT_PER_LEVEL = 2;
const BASE_STAR_SPEED = 0.03;
const STAR_SPEED_INCREMENT = 0.008;
const RAY_ANGLE_INCREMENT = 1;
const BASE_STAR_REVEAL_DISTANCE = 160;
const STAR_REVEAL_DECREMENT = 15;
const WALL_MOVE_THRESHOLD_START = 0.2;
const WALL_MOVE_THRESHOLD_MAX = 0.4;
const MUSIC_VOLUME = 0.3; // Adjust 0.0 to 1.0
const SFX_VOLUME = 0.7;    // Adjust 0.0 to 1.0

// --- Game State ---
let gameState = 'intro';
let currentLevel = 1;
let walls = [];
let particle;
let targetStar;
let starMoving = true;
let stars = [];
let currentStarRevealDistance;
let musicPlaying = false; // Flag to track music state

// --- Sound Effects and Music ---
let levelUpSound;
let collectStarSound;
let winGameSound;
let backgroundMusic;

// --- DOM Elements ---
let introScreen;
let winMessageScreen;
let finalWinScreen;
let startButton;
let nextLevelButton;
let restartButtonWin;
let playAgainButton;
let winLevelTitle;
let gameCanvas;

// --- p5.js Preload (Load Sound Files) ---
function preload() {
    soundFormats('mp3'); // Define sound format
    
    // Error handling for sound loading
    try {
        levelUpSound = loadSound('level_up.mp3');
        collectStarSound = loadSound('collect_star.mp3');
        winGameSound = loadSound('win_game.mp3');
        backgroundMusic = loadSound('background_music.mp3');
        console.log("Sound files loaded successfully.");
    } catch (error) {
        console.error("Error loading sound files:", error);
        // Optionally alert the user or handle gracefully
        alert("Failed to load sound files. Please ensure they are uploaded correctly and named: level_up.mp3, collect_star.mp3, win_game.mp3, background_music.mp3");
    }
}

// --- p5.js Setup ---
function setup() {
    gameCanvas = createCanvas(windowWidth, windowHeight);
    gameCanvas.style('display', 'none');
    noCursor();
    angleMode(DEGREES);
    createBackgroundStars();

    // Set sound volumes (check if sounds loaded)
    if (levelUpSound) levelUpSound.setVolume(SFX_VOLUME);
    if (collectStarSound) collectStarSound.setVolume(SFX_VOLUME);
    if (winGameSound) winGameSound.setVolume(SFX_VOLUME);
    if (backgroundMusic) {
        backgroundMusic.setVolume(MUSIC_VOLUME);
        backgroundMusic.loop(); // Set it to loop
        backgroundMusic.stop(); // Stop it initially, will start on game start
    }

    console.log("p5 Setup Complete. Game State: " + gameState);

    // This might be needed if sounds don't play on first click due to browser restrictions
    userStartAudio(); 
}

// --- Function to Create Background Stars ---
function createBackgroundStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: random(width),
            y: random(height),
            size: random(1, 3.5),
            alpha: random(60, 180),
            canvasWidth: width
        });
    }
}

// --- Function to Start/Restart the Entire Game ---
function startGame(level = 1) {
    console.log(`Starting game at Level ${level}`);
    currentLevel = level;
    gameState = 'playing';

    // Start background music safely
    if (backgroundMusic && !musicPlaying) {
         // Check if audio context is running, might need user interaction first
         if (getAudioContext().state === 'running') {
            backgroundMusic.loop(); // Ensure loop is set again if stopped
            musicPlaying = true;
        } else {
            console.warn("Audio context not running. Music might not start until user interacts.");
            // It should start automatically once interaction happens if loop() was called
        }
    } else if (backgroundMusic && !backgroundMusic.isPlaying()) {
         // If music was paused/stopped, restart loop
         backgroundMusic.loop();
         musicPlaying = true;
    }

    initializeLevel();
}

// --- Function to Initialize/Reset a Level ---
function initializeLevel() {
    console.log(`Initializing Level ${currentLevel}`);

    // Ensure canvas is visible and ALL overlays are hidden
    if (gameCanvas) gameCanvas.style('display', 'block');
    if (introScreen) introScreen.style.display = 'none';
    if (winMessageScreen) winMessageScreen.style.display = 'none';
    if (finalWinScreen) finalWinScreen.style.display = 'none';

    noCursor();

    if (stars.length === 0 || (stars[0] && width !== stars[0].canvasWidth)) {
        createBackgroundStars();
    }

    // --- Difficulty Scaling ---
    const wallCount = BASE_WALL_COUNT + (currentLevel - 1) * WALL_INCREMENT_PER_LEVEL;
    const starSpeed = BASE_STAR_SPEED + (currentLevel - 1) * STAR_SPEED_INCREMENT;
    currentStarRevealDistance = BASE_STAR_REVEAL_DISTANCE - (currentLevel - 1) * STAR_REVEAL_DECREMENT;
    currentStarRevealDistance = max(currentStarRevealDistance, 50);
    console.log(`Level ${currentLevel} - Walls: ${wallCount}, Speed: ${starSpeed.toFixed(3)}, RevealDist: ${currentStarRevealDistance}`);

    // Create walls
    walls = [];
    for (let i = 0; i < wallCount; i++) {
        walls.push(new Boundary(random(width), random(height), random(width), random(height)));
    }
    walls.push(new Boundary(1, 1, width - 1, 1));
    walls.push(new Boundary(width - 1, 1, width - 1, height - 1));
    walls.push(new Boundary(width - 1, height - 1, 1, height - 1));
    walls.push(new Boundary(1, height - 1, 1, 1));

    // Create particle & target star
    particle = new Particle();
    targetStar = new Star(random(100, width - 100), random(100, height - 100), starSpeed);

    starMoving = true;
}

// --- Initialize DOM Elements and Attach Handlers After Page Load ---
window.onload = () => {
    console.log("Window loaded. Getting DOM elements.");
    introScreen = document.getElementById('introScreen');
    winMessageScreen = document.getElementById('winMessage');
    finalWinScreen = document.getElementById('finalWinScreen');
    startButton = document.getElementById('startButton');
    nextLevelButton = document.getElementById('nextLevelButton');
    restartButtonWin = document.getElementById('restartButtonWin');
    playAgainButton = document.getElementById('playAgainButton');
    winLevelTitle = document.getElementById('winLevelTitle');

    if (!introScreen || !winMessageScreen || !finalWinScreen || !startButton || !nextLevelButton || !restartButtonWin || !playAgainButton || !winLevelTitle) {
        console.error("CRITICAL ERROR: Could not find one or more essential HTML elements! Check IDs.");
        document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Error loading game resources. Please check console (F12).</h1>';
        return;
    }

    // Show the intro screen initially
    introScreen.style.display = 'block';

    // --- Button Click Handlers ---
    startButton.onclick = () => {
        console.log("Start Button Clicked!");
        // Attempt to resume audio context on first interaction
         if (getAudioContext().state !== 'running') {
             getAudioContext().resume().then(() => {
                 console.log("Audio Context resumed!");
                 startGame(1);
             });
         } else {
            startGame(1);
         }
    };

    nextLevelButton.onclick = () => {
        console.log("Next Level Button Clicked!");
        if (levelUpSound) levelUpSound.play(); // Play level up sound
        gameState = 'playing';
        initializeLevel();
    };

    const restartHandler = () => {
        console.log("Restart/Play Again Button Clicked!");
        startGame(1);
    };
    restartButtonWin.onclick = restartHandler;
    playAgainButton.onclick = restartHandler;
};

// --- p5.js Draw (Main Game Loop) ---
function draw() {
    if (gameState === 'playing') {
        background(0, 0, 10);
        for (const star of stars) {
            fill(255, star.alpha); noStroke(); ellipse(star.x, star.y, star.size);
        }

        const mouseDistFromCenter = dist(mouseX, mouseY, width / 2, height / 2);
        const maxDist = dist(0, 0, width / 2, height / 2);
        const mouseDistPercent = mouseDistFromCenter / maxDist;
        let wallActivation = map(mouseDistPercent, WALL_MOVE_THRESHOLD_START, WALL_MOVE_THRESHOLD_MAX, 0, 1, true);

        if (walls.length > 0) {
            for (let wall of walls) {
                wall.update(wallActivation);
                wall.show(); // FIXED: Added ()
            }
        }
        if (particle) {
            particle.update(mouseX, mouseY); particle.look(walls);
        }
        if (targetStar) {
            targetStar.show(particle.pos, currentStarRevealDistance);
            if (starMoving) { targetStar.move(); }
        }

        // Level Indicator
        fill(255, 220); textSize(22); textAlign(RIGHT, TOP); textFont('Segoe UI');
        text(`Level: ${currentLevel} / ${MAX_LEVELS}`, width - 20, 20);

    } else if (gameState === 'intro' || gameState === 'won' || gameState === 'finished') {
        // Static background for non-playing states
        background(0, 0, 10);
        if (stars.length > 0) {
            for (const star of stars) { fill(255, star.alpha); noStroke(); ellipse(star.x, star.y, star.size); }
        }
        // Optionally stop music on final win screen?
        // if (gameState === 'finished' && musicPlaying) {
        //    if(backgroundMusic) backgroundMusic.stop();
        //    musicPlaying = false;
        // }
    }
}

// --- p5.js Interaction ---
function mousePressed() {
    // Start audio context on first click if needed (alternative place)
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume();
    }
    
    if (gameState !== 'playing' || !targetStar || !particle) return;

    // Check win condition
    if (dist(mouseX, mouseY, targetStar.pos.x, targetStar.pos.y) < targetStar.radius) {
        
        if (collectStarSound) collectStarSound.play(); // Play star collect sound FIRST
        
        console.log(`Star Clicked! Level ${currentLevel} complete.`);
        starMoving = false;
        const levelJustCompleted = currentLevel;

        // Hide canvas immediately
        if (gameCanvas) gameCanvas.style('display', 'none');
        cursor(); // Show cursor

        // Check if it was the final level
        if (levelJustCompleted >= MAX_LEVELS) {
            gameState = 'finished'; 
            if (finalWinScreen) finalWinScreen.style.display = 'block'; 
            if (winGameSound) winGameSound.play(); // Play final win sound
            // Optionally stop background music here:
            // if (backgroundMusic) backgroundMusic.stop(); 
            // musicPlaying = false; 
            console.log("All levels completed!");
        } else {
            gameState = 'won'; 
            currentLevel++; 
            if (winMessageScreen) {
                if (winLevelTitle) {
                    winLevelTitle.textContent = `Level ${levelJustCompleted} Complete!`;
                } else {
                    console.warn("Could not find winLevelTitle element to update text.");
                }
                winMessageScreen.style.display = 'block'; 
            }
             // Don't play level up sound here, play it when "Next Level" is clicked
             console.log(`Proceeding to Level ${currentLevel}`);
        }
    }
}

// --- p5.js Window Resize ---
function windowResized() {
    console.log("Window Resized");
    resizeCanvas(windowWidth, windowHeight);
    createBackgroundStars(); 

    if (gameState === 'playing') {
        console.log("Resizing during play - re-initializing current level");
        initializeLevel(); 
    }
}

// ===============================================
// --- Classes (Boundary, Particle, Ray, Star) ---
// ===============================================
// (No changes needed in the class definitions themselves)

class Boundary {
     constructor(x1, y1, x2, y2) { this.a = createVector(x1, y1); this.b = createVector(x2, y2); this.noiseOffsetXA = random(1000); this.noiseOffsetYA = random(1000); this.noiseOffsetXB = random(1000); this.noiseOffsetYB = random(1000); this.speed = random(0.5, 1.5); }
     update(activationLevel) { if (activationLevel > 0) { let moveAmount = this.speed * activationLevel; this.a.x += (noise(this.noiseOffsetXA) - 0.5) * 2 * moveAmount; this.a.y += (noise(this.noiseOffsetYA) - 0.5) * 2 * moveAmount; this.b.x += (noise(this.noiseOffsetXB) - 0.5) * 2 * moveAmount; this.b.y += (noise(this.noiseOffsetYB) - 0.5) * 2 * moveAmount; this.noiseOffsetXA += 0.01; this.noiseOffsetYA += 0.01; this.noiseOffsetXB += 0.01; this.noiseOffsetYB += 0.01; const margin = 5; this.a.x = constrain(this.a.x, margin, width - margin); this.a.y = constrain(this.a.y, margin, height - margin); this.b.x = constrain(this.b.x, margin, width - margin); this.b.y = constrain(this.b.y, margin, height - margin); } }
     show() { push(); strokeWeight(3); stroke(150, 0, 255, 50); line(this.a.x, this.a.y, this.b.x, this.b.y); strokeWeight(2); stroke(200, 50, 255, 150); line(this.a.x, this.a.y, this.b.x, this.b.y); strokeWeight(1); stroke(255, 200, 255, 200); line(this.a.x, this.a.y, this.b.x, this.b.y); pop(); }
 }
class Particle {
     constructor() { this.pos = createVector(width / 2, height / 2); this.rays = []; for (let a = 0; a < 360; a += RAY_ANGLE_INCREMENT) { this.rays.push(new Ray(this.pos, radians(a))); } }
     update(x, y) { this.pos.set(x, y); }
     look(walls) { if (!Array.isArray(walls)) return; for (let ray of this.rays) { let closestPt = null; let recordDist = Infinity; for (let wall of walls) { const pt = ray.cast(wall); if (pt) { const d = p5.Vector.dist(this.pos, pt); if (d < recordDist) { recordDist = d; closestPt = pt; } } } if (closestPt) { push(); strokeWeight(1.5); let alpha = map(recordDist, 0, width / 2, 200, 10, true); stroke(255, 255, 150, alpha); line(this.pos.x, this.pos.y, closestPt.x, closestPt.y); pop(); } } }
     show() { /* Optional */ }
}
class Ray {
     constructor(pos, angle) { this.pos = pos; this.dir = p5.Vector.fromAngle(angle); }
     cast(wall) { const x1 = wall.a.x, y1 = wall.a.y, x2 = wall.b.x, y2 = wall.b.y; const x3 = this.pos.x, y3 = this.pos.y; const x4 = this.pos.x + this.dir.x, y4 = this.pos.y + this.dir.y; const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (den == 0) { return null; } const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den; const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den; if (t > 0 && t < 1 && u > 0) { return createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1)); } else { return null; } }
}
class Star {
    constructor(x, y, speed) { this.pos = createVector(x, y); this.targetPos = this.pos.copy(); this.radius = 25; this.visualRadius = 15; this.speed = speed; this.pulseAngle = random(360); this.isVisible = false; }
    move() { if (p5.Vector.dist(this.pos, this.targetPos) < 5) { this.targetPos.x = random(this.radius, width - this.radius); this.targetPos.y = random(this.radius, height - this.radius); } else { this.pos.lerp(this.targetPos, this.speed); } }
    show(particlePos, revealDistance) {
        if (!particlePos) return;
        const d = p5.Vector.dist(this.pos, particlePos);
        this.isVisible = (d < revealDistance); 
        if (this.isVisible) {
            push();
            translate(this.pos.x, this.pos.y);
            this.pulseAngle = (this.pulseAngle + 4) % 360; 
            let pulseSize = map(sin(this.pulseAngle), -1, 1, 0, 12); 
            let pulseAlpha = map(sin(this.pulseAngle), -1, 1, 60, 180);
            noFill(); strokeWeight(2.5); stroke(255, 223, 0, pulseAlpha);
            ellipse(0, 0, this.visualRadius * 2 + pulseSize);
            fill(255, 223, 0); stroke(255, 180, 0); strokeWeight(1.5); 
            const numPoints = 5; rotate(-90); beginShape();
            for (let i = 0; i < numPoints * 2; i++) { let r = (i % 2 === 0) ? this.visualRadius : this.visualRadius / 2.5; let angle = map(i, 0, numPoints * 2, 0, 360); vertex(r * cos(angle), r * sin(angle)); }
            endShape(CLOSE);
            pop();
        }
    }
}
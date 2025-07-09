// app.js - Core Tetris Game Logic

// Get canvas and its context
const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextBlockCanvas = document.getElementById('nextBlockCanvas');
const nextBlockCtx = nextBlockCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButton = document.getElementById('startButton');

// Control buttons for mobile
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const downButton = document.getElementById('downButton');
const rotateButton = document.getElementById('rotateButton');

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 24; // Each block is 24x24 pixels

// Scale canvas based on BLOCK_SIZE
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Clear next block canvas
nextBlockCanvas.width = BLOCK_SIZE * 5; // Enough space for a 4x4 block
nextBlockCanvas.height = BLOCK_SIZE * 5;

// Game state variables
let board = [];
let currentPiece;
let nextPiece;
let score = 0;
let gameOver = false;
let gameInterval;
let dropInterval = 1000; // Initial drop speed (1 second)

// Tetromino shapes and colors
const TETROMINOES = {
    'I': {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00FFFF' // Cyan
    },
    'J': {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000FF' // Blue
    },
    'L': {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#FFA500' // Orange
    },
    'O': {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#FFFF00' // Yellow
    },
    'S': {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#008000' // Green
    },
    'T': {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#800080' // Purple
    },
    'Z': {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#FF0000' // Red
    }
};

// Piece class to manage tetromino properties
class Piece {
    constructor(tetromino) {
        this.shape = tetromino.shape;
        this.color = tetromino.color;
        this.x = Math.floor(COLS / 2) - Math.floor(this.shape[0].length / 2); // Start in the middle top
        this.y = 0;
    }

    // Draw the piece on the main canvas
    draw() {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = this.color;
                    ctx.fillRect((this.x + x) * BLOCK_SIZE, (this.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#333'; // Darker border for blocks
                    ctx.strokeRect((this.x + x) * BLOCK_SIZE, (this.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    // Draw the next piece on the next block canvas
    drawNext() {
        nextBlockCtx.clearRect(0, 0, nextBlockCanvas.width, nextBlockCanvas.height);
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    nextBlockCtx.fillStyle = this.color;
                    // Center the next block in its canvas
                    const offsetX = (nextBlockCanvas.width / 2) - (this.shape[0].length * BLOCK_SIZE / 2);
                    const offsetY = (nextBlockCanvas.height / 2) - (this.shape.length * BLOCK_SIZE / 2);
                    nextBlockCtx.fillRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    nextBlockCtx.strokeStyle = '#333';
                    nextBlockCtx.strokeRect(offsetX + x * BLOCK_SIZE, offsetY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    // Move the piece down
    moveDown() {
        if (!this.collision(0, 1, this.shape)) {
            this.y++;
            return true;
        }
        return false;
    }

    // Move the piece left
    moveLeft() {
        if (!this.collision(-1, 0, this.shape)) {
            this.x--;
        }
    }

    // Move the piece right
    moveRight() {
        if (!this.collision(1, 0, this.shape)) {
            this.x++;
        }
    }

    // Rotate the piece
    rotate() {
        const originalShape = this.shape;
        const rotatedShape = this.getRotatedMatrix(this.shape);

        // Wall kick logic (simple)
        // Try to move left/right if rotation causes collision
        let offset = 0;
        while (this.collision(offset, 0, rotatedShape)) {
            offset = (offset > 0) ? -offset : (-offset + 1); // Try +1, -1, +2, -2...
            if (offset > 2) { // Give up after a few tries
                this.shape = originalShape; // Revert to original if no valid rotation
                return;
            }
        }

        this.x += offset;
        this.shape = rotatedShape;
    }

    // Helper to get rotated matrix
    getRotatedMatrix(matrix) {
        const N = matrix.length;
        const rotated = Array.from({ length: N }, () => Array(N).fill(0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                rotated[j][N - 1 - i] = matrix[i][j];
            }
        }
        return rotated;
    }

    // Check for collision with board boundaries or other settled blocks
    collision(offsetX, offsetY, newShape) {
        for (let y = 0; y < newShape.length; y++) {
            for (let x = 0; x < newShape[y].length; x++) {
                if (newShape[y][x] !== 0) {
                    let newX = this.x + x + offsetX;
                    let newY = this.y + y + offsetY;

                    // Check boundaries
                    if (newX < 0 || newX >= COLS || newY >= ROWS) {
                        return true;
                    }
                    // Check collision with existing blocks on the board (if not out of bounds top)
                    if (newY >= 0 && board[newY] && board[newY][newX] !== 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Lock the piece in place on the board
    lock() {
        this.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    if (this.y + y < 0) { // Game over condition
                        gameOver = true;
                    } else {
                        board[this.y + y][this.x + x] = this.color;
                    }
                }
            });
        });
        // Check for full lines
        this.clearLines();
        // Generate new piece
        this.generateNewPiece();
    }

    // Clear full lines
    clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                // Line is full, remove it
                board.splice(y, 1);
                // Add a new empty row at the top
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++; // Re-check the same row index as rows shifted down
            }
        }
        if (linesCleared > 0) {
            score += linesCleared * 100; // Simple scoring
            scoreDisplay.textContent = score;
            // Increase speed for every 1000 points (example)
            if (score % 1000 === 0 && dropInterval > 100) {
                dropInterval -= 50; // Make it faster
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, dropInterval);
            }
        }
    }

    // Generate a new random piece
    generateNewPiece() {
        currentPiece = nextPiece;
        const keys = Object.keys(TETROMINOES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        nextPiece = new Piece(TETROMINOES[randomKey]);
        nextPiece.drawNext(); // Draw the next piece immediately
    }
}

// Initialize the board with empty cells
function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Draw the entire board
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous frame
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = value;
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                ctx.strokeStyle = '#333';
                ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Game loop
function gameLoop() {
    if (gameOver) {
        clearInterval(gameInterval);
        showGameOverMessage();
        return;
    }

    // Clear canvas, draw board, draw current piece
    drawBoard();
    currentPiece.draw();

    // Move piece down
    if (!currentPiece.moveDown()) {
        currentPiece.lock();
        if (gameOver) { // Check game over again after locking
            clearInterval(gameInterval);
            showGameOverMessage();
            return;
        }
    }
}

// Show game over message
function showGameOverMessage() {
    const messageBox = document.createElement('div');
    messageBox.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    messageBox.innerHTML = `
        <div class="bg-gray-700 p-8 rounded-lg shadow-xl text-center border border-gray-600">
            <h2 class="text-4xl font-bold text-red-400 mb-4">ゲームオーバー！</h2>
            <p class="text-2xl text-white mb-6">スコア: <span class="font-bold text-yellow-300">${score}</span></p>
            <button id="restartButton" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform transition duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50">
                もう一度プレイ
            </button>
        </div>
    `;
    document.body.appendChild(messageBox);

    document.getElementById('restartButton').addEventListener('click', () => {
        document.body.removeChild(messageBox);
        startGame();
    });
}


// Start the game
function startGame() {
    initBoard();
    score = 0;
    scoreDisplay.textContent = score;
    gameOver = false;
    dropInterval = 1000;

    // Generate initial pieces
    const keys = Object.keys(TETROMINOES);
    const randomKey1 = keys[Math.floor(Math.random() * keys.length)];
    const randomKey2 = keys[Math.floor(Math.random() * keys.length)];
    currentPiece = new Piece(TETROMINOES[randomKey1]);
    nextPiece = new Piece(TETROMINOES[randomKey2]);
    nextPiece.drawNext();

    // Clear any existing interval before starting a new one
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, dropInterval);
    startButton.textContent = 'ゲーム中...';
    startButton.disabled = true;
    startButton.classList.add('opacity-50', 'cursor-not-allowed');
}

// Event listeners for keyboard input
document.addEventListener('keydown', e => {
    if (gameOver) return;

    switch (e.key) {
        case 'ArrowLeft':
            currentPiece.moveLeft();
            break;
        case 'ArrowRight':
            currentPiece.moveRight();
            break;
        case 'ArrowDown':
            // Speed up drop when down arrow is pressed
            if (currentPiece.moveDown()) {
                score += 1; // Reward for soft drop
                scoreDisplay.textContent = score;
            }
            break;
        case 'ArrowUp':
            currentPiece.rotate();
            break;
        case ' ': // Spacebar for hard drop
            while (currentPiece.moveDown()) {
                score += 2; // Reward for hard drop
            }
            currentPiece.lock();
            scoreDisplay.textContent = score;
            if (gameOver) {
                clearInterval(gameInterval);
                showGameOverMessage();
            }
            break;
    }
    drawBoard(); // Redraw after each move
    currentPiece.draw();
});

// Event listeners for mobile control buttons
leftButton.addEventListener('click', () => {
    if (!gameOver) {
        currentPiece.moveLeft();
        drawBoard();
        currentPiece.draw();
    }
});

rightButton.addEventListener('click', () => {
    if (!gameOver) {
        currentPiece.moveRight();
        drawBoard();
        currentPiece.draw();
    }
});

downButton.addEventListener('click', () => {
    if (!gameOver) {
        if (currentPiece.moveDown()) {
            score += 1;
            scoreDisplay.textContent = score;
        }
        drawBoard();
        currentPiece.draw();
    }
});

rotateButton.addEventListener('click', () => {
    if (!gameOver) {
        currentPiece.rotate();
        drawBoard();
        currentPiece.draw();
    }
});

// Start button event listener
startButton.addEventListener('click', startGame);

// Initial draw of the empty board
initBoard();
drawBoard();


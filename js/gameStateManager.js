/**
 * Game State Manager for Retro UFO Game
 * Handles game states, transitions, and high score management
 */

class GameStateManager {
    constructor() {
        // Game states
        this.states = {
            START: 'start',
            PLAYING: 'playing',
            PAUSED: 'paused',
            GAME_OVER: 'gameOver',
            HELP: 'help'
        };
        
        // Current state
        this.currentState = this.states.START;
        
        // DOM elements
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.pauseScreen = this.createPauseScreen();
        this.helpScreen = this.createHelpScreen();
        this.scoreDisplay = document.getElementById('score');
        this.healthDisplay = document.getElementById('health');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = this.createHighScoreDisplay();
        
        // Game data
        this.score = 0;
        this.health = 3;
        this.highScores = this.loadHighScores();
        
        // Event listeners
        this.setupEventListeners();
        
        // Callbacks
        this.onStartGame = null;
        this.onRestartGame = null;
        this.onPauseGame = null;
        this.onResumeGame = null;
    }
    
    /**
     * Initialize the game state manager
     * @param {Object} callbacks - Callback functions for state changes
     */
    init(callbacks = {}) {
        this.onStartGame = callbacks.onStartGame || null;
        this.onRestartGame = callbacks.onRestartGame || null;
        this.onPauseGame = callbacks.onPauseGame || null;
        this.onResumeGame = callbacks.onResumeGame || null;
        
        // Update high score display
        this.updateHighScoreDisplay();
        
        // Set initial state
        this.changeState(this.states.START);
    }
    
    /**
     * Create the pause screen element
     * @returns {HTMLElement} The pause screen element
     */
    createPauseScreen() {
        const pauseScreen = document.createElement('div');
        pauseScreen.id = 'pause-screen';
        pauseScreen.className = 'overlay hidden';
        
        pauseScreen.innerHTML = `
            <h1>Game Paused</h1>
            <p>Press P to resume</p>
            <button id="resume-button">Resume Game</button>
        `;
        
        document.getElementById('ui-overlay').appendChild(pauseScreen);
        
        return pauseScreen;
    }
    
    /**
     * Create the help screen element
     * @returns {HTMLElement} The help screen element
     */
    createHelpScreen() {
        const helpScreen = document.createElement('div');
        helpScreen.id = 'help-screen';
        helpScreen.className = 'overlay hidden';
        
        helpScreen.innerHTML = `
            <h1>How to Play</h1>
            <div class="help-content">
                <p><strong>Controls:</strong></p>
                <ul>
                    <li>Arrow Keys: Move UFO</li>
                    <li>Space: Ascend</li>
                    <li>Shift: Descend</li>
                    <li>E: Activate Tractor Beam</li>
                    <li>P: Pause Game</li>
                    <li>M: Toggle Sound</li>
                </ul>
                <p><strong>Objective:</strong></p>
                <p>Abduct cows using your tractor beam while avoiding enemy jets and missiles.</p>
                <p>Each cow abducted increases your score and the difficulty.</p>
            </div>
            <button id="help-back-button">Back to Menu</button>
        `;
        
        document.getElementById('ui-overlay').appendChild(helpScreen);
        
        return helpScreen;
    }
    
    /**
     * Create the high score display element
     * @returns {HTMLElement} The high score display element
     */
    createHighScoreDisplay() {
        // Create high score display for start screen
        const highScoreDisplay = document.createElement('div');
        highScoreDisplay.id = 'high-score-display';
        highScoreDisplay.className = 'high-score';
        
        this.startScreen.appendChild(highScoreDisplay);
        
        // Create high score display for game over screen
        const gameOverHighScoreDisplay = document.createElement('div');
        gameOverHighScoreDisplay.id = 'game-over-high-score';
        gameOverHighScoreDisplay.className = 'high-score';
        
        this.gameOverScreen.insertBefore(gameOverHighScoreDisplay, this.gameOverScreen.querySelector('button'));
        
        return {
            start: highScoreDisplay,
            gameOver: gameOverHighScoreDisplay
        };
    }
    
    /**
     * Set up event listeners for buttons and keyboard
     */
    setupEventListeners() {
        // Button event listeners
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
        document.getElementById('resume-button').addEventListener('click', () => this.resumeGame());
        document.getElementById('help-back-button').addEventListener('click', () => this.changeState(this.states.START));
        
        // Add help button to start screen
        const helpButton = document.createElement('button');
        helpButton.id = 'help-button';
        helpButton.textContent = 'How to Play';
        helpButton.addEventListener('click', () => this.changeState(this.states.HELP));
        this.startScreen.appendChild(helpButton);
        
        // Keyboard event listeners
        document.addEventListener('keydown', (event) => {
            // Pause/resume with P key
            if (event.code === 'KeyP') {
                if (this.currentState === this.states.PLAYING) {
                    this.pauseGame();
                } else if (this.currentState === this.states.PAUSED) {
                    this.resumeGame();
                }
            }
        });
    }
    
    /**
     * Change the game state
     * @param {string} newState - The new state to change to
     */
    changeState(newState) {
        // Exit current state
        switch (this.currentState) {
            case this.states.START:
                this.startScreen.classList.add('hidden');
                break;
            case this.states.PLAYING:
                // Nothing to do when exiting playing state
                break;
            case this.states.PAUSED:
                this.pauseScreen.classList.add('hidden');
                break;
            case this.states.GAME_OVER:
                this.gameOverScreen.classList.add('hidden');
                break;
            case this.states.HELP:
                this.helpScreen.classList.add('hidden');
                break;
        }
        
        // Enter new state
        this.currentState = newState;
        
        switch (newState) {
            case this.states.START:
                this.startScreen.classList.remove('hidden');
                break;
            case this.states.PLAYING:
                // Nothing to show when entering playing state
                break;
            case this.states.PAUSED:
                this.pauseScreen.classList.remove('hidden');
                break;
            case this.states.GAME_OVER:
                this.finalScoreDisplay.textContent = this.score;
                this.gameOverScreen.classList.remove('hidden');
                break;
            case this.states.HELP:
                this.helpScreen.classList.remove('hidden');
                break;
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        this.score = 0;
        this.health = 3;
        this.updateScore(0);
        this.updateHealth(3);
        
        this.changeState(this.states.PLAYING);
        
        if (this.onStartGame) {
            this.onStartGame();
        }
    }
    
    /**
     * Restart the game
     */
    restartGame() {
        this.score = 0;
        this.health = 3;
        this.updateScore(0);
        this.updateHealth(3);
        
        this.changeState(this.states.PLAYING);
        
        if (this.onRestartGame) {
            this.onRestartGame();
        }
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        this.changeState(this.states.PAUSED);
        
        if (this.onPauseGame) {
            this.onPauseGame();
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        this.changeState(this.states.PLAYING);
        
        if (this.onResumeGame) {
            this.onResumeGame();
        }
    }
    
    /**
     * End the game
     */
    endGame() {
        this.saveHighScore(this.score);
        this.updateHighScoreDisplay();
        this.changeState(this.states.GAME_OVER);
    }
    
    /**
     * Update the score
     * @param {number} newScore - The new score
     */
    updateScore(newScore) {
        this.score = newScore;
        this.scoreDisplay.textContent = this.score;
    }
    
    /**
     * Update the health
     * @param {number} newHealth - The new health value
     */
    updateHealth(newHealth) {
        this.health = newHealth;
        this.healthDisplay.textContent = this.health;
        
        // End game if health reaches zero
        if (this.health <= 0) {
            this.endGame();
        }
    }
    
    /**
     * Load high scores from localStorage
     * @returns {Array} Array of high scores
     */
    loadHighScores() {
        const highScores = localStorage.getItem('ufoGameHighScores');
        return highScores ? JSON.parse(highScores) : [];
    }
    
    /**
     * Save a new high score
     * @param {number} score - The score to save
     */
    saveHighScore(score) {
        // Add new score
        this.highScores.push({
            score: score,
            date: new Date().toISOString()
        });
        
        // Sort high scores (highest first)
        this.highScores.sort((a, b) => b.score - a.score);
        
        // Keep only top 5 scores
        this.highScores = this.highScores.slice(0, 5);
        
        // Save to localStorage
        localStorage.setItem('ufoGameHighScores', JSON.stringify(this.highScores));
    }
    
    /**
     * Update the high score display
     */
    updateHighScoreDisplay() {
        // Format high scores
        let highScoreHtml = '<h2>High Scores</h2>';
        
        if (this.highScores.length === 0) {
            highScoreHtml += '<p>No high scores yet!</p>';
        } else {
            highScoreHtml += '<ul>';
            this.highScores.forEach((entry, index) => {
                const date = new Date(entry.date);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                highScoreHtml += `<li>${entry.score} pts (${dateStr})</li>`;
            });
            highScoreHtml += '</ul>';
        }
        
        // Update displays
        this.highScoreDisplay.start.innerHTML = highScoreHtml;
        this.highScoreDisplay.gameOver.innerHTML = highScoreHtml;
    }
    
    /**
     * Check if the game is currently active
     * @returns {boolean} True if the game is in the PLAYING state
     */
    isGameActive() {
        return this.currentState === this.states.PLAYING;
    }
    
    /**
     * Get the current game state
     * @returns {string} The current game state
     */
    getState() {
        return this.currentState;
    }
}
/**
 * Sound Manager for Retro UFO Game
 * Handles loading, playing, and managing all game audio
 */

class SoundManager {
    constructor() {
        // Create audio listener
        this.listener = new THREE.AudioListener();
        
        // Sound collections
        this.sounds = {
            ufo: {},
            cow: {},
            jet: {},
            ui: {},
            music: {}
        };
        
        // Audio loader
        this.audioLoader = new THREE.AudioLoader();
        
        // Global volume settings
        this.masterVolume = 0.7;
        this.musicVolume = 0.5;
        this.sfxVolume = 1.0;
        
        // Track loading progress
        this.totalSounds = 0;
        this.loadedSounds = 0;
        
        // Mute state
        this.muted = false;
    }
    
    /**
     * Initialize the sound manager and load all sounds
     * @param {THREE.Camera} camera - The game camera to attach the listener to
     * @param {Function} onComplete - Callback when all sounds are loaded
     */
    init(camera, onComplete) {
        // Attach listener to camera
        camera.add(this.listener);
        
        // Load all sounds
        this.loadAllSounds(onComplete);
    }
    
    /**
     * Load all game sounds
     * @param {Function} onComplete - Callback when all sounds are loaded
     */
    loadAllSounds(onComplete) {
        this.onComplete = onComplete;
        this.totalSounds = 0;
        this.loadedSounds = 0;

        // UFO sounds
        this.loadSound('ufo', 'engine_loop', 'assets/sounds/ufo/engine_loop.mp3', true);
        this.loadSound('ufo', 'tractor_beam', 'assets/sounds/ufo/tractor_beam.mp3', false);
        this.loadSound('ufo', 'explosion', 'assets/sounds/ufo/explosion.mp3', false);
        
        // Cow sounds
        this.loadSound('cow', 'moo', 'assets/sounds/cow/moo.mp3', false);
        this.loadSound('cow', 'abduction_complete', 'assets/sounds/cow/abduction_complete.mp3', false);
        
        // Jet sounds
        this.loadSound('jet', 'engine', 'assets/sounds/jet/engine.mp3', true);
        this.loadSound('jet', 'missile', 'assets/sounds/jet/missile.mp3', false);
        
        // UI sounds
        this.loadSound('ui', 'game_start', 'assets/sounds/ui/game_start.mp3', false);
        this.loadSound('ui', 'game_over', 'assets/sounds/ui/game_over.mp3', false);
        
        // Background music
        this.loadSound('music', 'background', 'assets/sounds/music/background.mp3', true);
        
        // Check if we have sounds to load
        if (this.totalSounds === 0) {
            if (this.onComplete) this.onComplete();
        }
    }
    
    /**
     * Load a single sound file
     * @param {string} category - Sound category (ufo, cow, jet, ui, music)
     * @param {string} name - Sound name
     * @param {string} path - Path to sound file
     * @param {boolean} loop - Whether the sound should loop
     */
    loadSound(category, name, path, loop) {
        this.totalSounds++;
        
        // Create audio object
        const sound = new THREE.Audio(this.listener);
        
        // Set volume based on category
        if (category === 'music') {
            sound.setVolume(this.masterVolume * this.musicVolume);
        } else {
            sound.setVolume(this.masterVolume * this.sfxVolume);
        }
        
        // Load audio file
        this.audioLoader.load(
            path,
            (buffer) => {
                sound.setBuffer(buffer);
                sound.setLoop(loop);
                
                // Store the sound
                this.sounds[category][name] = sound;
                
                // Update loading progress
                this.loadedSounds++;
                
                // Check if all sounds are loaded
                if (this.loadedSounds === this.totalSounds) {
                    console.log('All sounds loaded successfully');
                    if (this.onComplete) this.onComplete();
                }
            },
            (xhr) => {
                // Loading progress
                console.log(`Loading sound: ${path} - ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            (error) => {
                console.error(`Error loading sound: ${path}`, error);
                
                // Update loading progress even if there's an error
                this.loadedSounds++;
                
                // Check if all sounds are loaded
                if (this.loadedSounds === this.totalSounds) {
                    console.log('All sounds loaded with some errors');
                    if (this.onComplete) this.onComplete();
                }
            }
        );
    }
    
    /**
     * Play a sound
     * @param {string} category - Sound category (ufo, cow, jet, ui, music)
     * @param {string} name - Sound name
     * @param {boolean} restart - Whether to restart the sound if it's already playing
     */
    play(category, name, restart = true) {
        if (this.muted) return;
        
        const sound = this.sounds[category][name];
        if (sound) {
            if (restart || !sound.isPlaying) {
                sound.play();
            }
        } else {
            console.warn(`Sound not found: ${category}.${name}`);
        }
    }
    
    /**
     * Stop a sound
     * @param {string} category - Sound category (ufo, cow, jet, ui, music)
     * @param {string} name - Sound name
     */
    stop(category, name) {
        const sound = this.sounds[category][name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    }
    
    /**
     * Stop all sounds in a category
     * @param {string} category - Sound category (ufo, cow, jet, ui, music)
     */
    stopCategory(category) {
        const categoryObj = this.sounds[category];
        if (categoryObj) {
            Object.values(categoryObj).forEach(sound => {
                if (sound.isPlaying) {
                    sound.stop();
                }
            });
        }
    }
    
    /**
     * Stop all sounds
     */
    stopAll() {
        Object.keys(this.sounds).forEach(category => {
            this.stopCategory(category);
        });
    }
    
    /**
     * Pause all currently playing sounds
     */
    pauseAll() {
        Object.keys(this.sounds).forEach(category => {
            Object.values(this.sounds[category]).forEach(sound => {
                if (sound.isPlaying) {
                    sound.pause();
                }
            });
        });
    }
    
    /**
     * Resume all paused sounds
     */
    resumeAll() {
        if (this.muted) return;
        
        Object.keys(this.sounds).forEach(category => {
            Object.values(this.sounds[category]).forEach(sound => {
                if (sound.source && sound.source.buffer && !sound.isPlaying) {
                    sound.play();
                }
            });
        });
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        // Update all sound volumes
        Object.keys(this.sounds).forEach(category => {
            Object.values(this.sounds[category]).forEach(sound => {
                if (category === 'music') {
                    sound.setVolume(this.masterVolume * this.musicVolume);
                } else {
                    sound.setVolume(this.masterVolume * this.sfxVolume);
                }
            });
        });
    }
    
    /**
     * Set music volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        // Update music volumes
        Object.values(this.sounds.music).forEach(sound => {
            sound.setVolume(this.masterVolume * this.musicVolume);
        });
    }
    
    /**
     * Set sound effects volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        
        // Update all non-music sound volumes
        Object.keys(this.sounds).forEach(category => {
            if (category !== 'music') {
                Object.values(this.sounds[category]).forEach(sound => {
                    sound.setVolume(this.masterVolume * this.sfxVolume);
                });
            }
        });
    }
    
    /**
     * Toggle mute state
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            this.stopAll();
        }
        
        return this.muted;
    }
    
    /**
     * Create a positional audio source
     * @param {THREE.Object3D} object - Object to attach the sound to
     * @param {string} category - Sound category (ufo, cow, jet, ui, music)
     * @param {string} name - Sound name
     * @param {number} distance - Maximum distance at which the sound can be heard
     * @returns {THREE.PositionalAudio} The created positional audio object
     */
    createPositionalSound(object, category, name, distance = 50) {
        // Create positional audio
        const sound = new THREE.PositionalAudio(this.listener);
        
        // Set volume based on category
        if (category === 'music') {
            sound.setVolume(this.masterVolume * this.musicVolume);
        } else {
            sound.setVolume(this.masterVolume * this.sfxVolume);
        }
        
        // Set distance model
        sound.setRefDistance(5);
        sound.setMaxDistance(distance);
        sound.setRolloffFactor(1);
        
        // Load audio file
        const path = `assets/sounds/${category}/${name}.mp3`;
        this.audioLoader.load(
            path,
            (buffer) => {
                sound.setBuffer(buffer);
                
                // Store reference to the original sound
                sound.userData = {
                    category: category,
                    name: name
                };
                
                // Add to object
                object.add(sound);
            },
            null,
            (error) => {
                console.error(`Error loading positional sound: ${path}`, error);
            }
        );
        
        return sound;
    }
}

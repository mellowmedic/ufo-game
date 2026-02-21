/**
 * Retro UFO Game - Main JavaScript File
 * Contains Three.js setup, game initialization, and UFO controls
 */

// Global variables
let scene, camera, renderer;
let lights = {};
let gameActive = false;
let score = 0;
let health = 3;

// Game objects
let ufo;
let terrain;
let skybox;
let cows = [];
let jets = [];
let missiles = [];
let tractorBeam;
let explosions = [];

// Physics and movement
let velocity = new THREE.Vector3(0, 0, 0);
let acceleration = new THREE.Vector3(0, 0, 0);
const MAX_SPEED = 0.5;
const ACCELERATION = 0.01;
const DECELERATION = 0.98;
const HOVER_SPEED = 0.005;
const HOVER_HEIGHT = 0.1;
let hoverDirection = 1;
let hoverOffset = 0;

// Game settings
const GAME_BOUNDS = 200;
const COW_COUNT = 15;
const BEAM_RANGE = 10;
const BEAM_STRENGTH = 0.05;
const JET_SPEED = 0.3;
const MISSILE_SPEED = 0.5;
const SPAWN_INTERVAL_BASE = 5000; // milliseconds
const SPAWN_INTERVAL_MIN = 1000; // minimum spawn interval
const SPAWN_RATE_INCREASE = 0.1; // percentage increase per cow abducted

// Timers
let lastJetSpawn = 0;
let currentSpawnInterval = SPAWN_INTERVAL_BASE;
let lastFrameTime = 0;

// Controls
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false,
    Shift: false,
    KeyE: false, // Tractor beam
    KeyM: false  // Mute
};

// Camera settings
let cameraOffset = new THREE.Vector3(0, 5, 10);
const CAMERA_LAG = 0.1;

// Game managers
let soundManager;
let visualEffects;
let gameStateManager;
let particleSystem;
let miniMap;

// Engine exhaust emitters
let engineExhaust;

// Initialize the game
function init() {
    // Create the scene
    scene = new THREE.Scene();
    
    // Create the camera
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.copy(cameraOffset);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Create the renderer
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize game managers
    initManagers();
    
    // Set up lights
    setupLights();
    
    // Create skybox
    createSkybox();
    
    // Create terrain
    createTerrain();
    
    // Create UFO
    createUFO();
    
    // Create tractor beam (initially invisible)
    createTractorBeam();
    
    // Create cows
    createCows();

    // Set up controls
    setupControls();

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Start the animation loop
    animate(0);
}

// Initialize game managers
function initManagers() {
    // Initialize sound manager
    soundManager = new SoundManager();
    soundManager.init(camera, () => {
        console.log('Sound manager initialized');
    });
    
    // Initialize visual effects
    visualEffects = new VisualEffects(renderer, scene, camera);
    
    // Initialize game state manager
    gameStateManager = new GameStateManager();
    gameStateManager.init({
        onStartGame: startGame,
        onRestartGame: restartGame,
        onPauseGame: pauseGame,
        onResumeGame: resumeGame
    });
    
    // Initialize particle system
    particleSystem = new ParticleSystem(scene);
    
    // Set up volume controls
    setupVolumeControls();
}

// Set up volume controls
function setupVolumeControls() {
    const masterVolumeSlider = document.getElementById('master-volume');
    const musicVolumeSlider = document.getElementById('music-volume');
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    const muteButton = document.getElementById('mute-button');
    
    masterVolumeSlider.addEventListener('input', () => {
        soundManager.setMasterVolume(masterVolumeSlider.value / 100);
    });
    
    musicVolumeSlider.addEventListener('input', () => {
        soundManager.setMusicVolume(musicVolumeSlider.value / 100);
    });
    
    sfxVolumeSlider.addEventListener('input', () => {
        soundManager.setSfxVolume(sfxVolumeSlider.value / 100);
    });
    
    muteButton.addEventListener('click', () => {
        const muted = soundManager.toggleMute();
        muteButton.textContent = muted ? 'Unmute' : 'Mute';
    });
}

// Set up the lighting for the scene
function setupLights() {
    // Ambient light for general illumination
    lights.ambient = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(lights.ambient);

    // Directional light to simulate sunlight
    lights.directional = new THREE.DirectionalLight(0xffffff, 1);
    lights.directional.position.set(100, 100, 50);
    lights.directional.castShadow = true;
    
    // Configure shadow properties
    lights.directional.shadow.mapSize.width = 2048;
    lights.directional.shadow.mapSize.height = 2048;
    lights.directional.shadow.camera.near = 0.5;
    lights.directional.shadow.camera.far = 500;
    lights.directional.shadow.camera.left = -100;
    lights.directional.shadow.camera.right = 100;
    lights.directional.shadow.camera.top = 100;
    lights.directional.shadow.camera.bottom = -100;
    
    scene.add(lights.directional);

    // Point light for the player's UFO
    lights.ufoLight = new THREE.PointLight(0x00ff00, 2, 10);
    lights.ufoLight.position.set(0, 0, 0);
    scene.add(lights.ufoLight);
}

// Create a retro-style skybox
function createSkybox() {
    // Create a large sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    // Create gradient texture for sky
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Create gradient
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#001133'); // Dark blue at top
    gradient.addColorStop(0.5, '#0066aa'); // Medium blue in middle
    gradient.addColorStop(1, '#99ddff'); // Light blue at horizon
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    
    // Create material with the gradient texture
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide, // Render on the inside of the sphere
    });
    
    // Create the skybox mesh
    skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skybox);
}

// Create a procedural terrain
function createTerrain() {
    // Create a large plane for the ground
    const terrainSize = 1000;
    const terrainSegments = 100;
    const terrainGeometry = new THREE.PlaneGeometry(
        terrainSize, 
        terrainSize, 
        terrainSegments, 
        terrainSegments
    );
    
    // Apply height variations to create hills
    const vertices = terrainGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        // Skip the y-coordinate (which is the height in this case)
        if ((i + 1) % 3 === 0) {
            // Apply Perlin-like noise for natural-looking terrain
            const x = vertices[i - 1];
            const z = vertices[i + 1];
            
            // Simple noise function (can be replaced with actual Perlin noise)
            const frequency = 0.01;
            const height = 10;
            vertices[i] = Math.sin(x * frequency) * Math.cos(z * frequency) * height;
        }
    }
    
    // Update the geometry after modifying vertices
    terrainGeometry.computeVertexNormals();
    
    // Rotate the plane to be horizontal
    terrainGeometry.rotateX(-Math.PI / 2);
    
    // Create a green material for the terrain
    const terrainMaterial = new THREE.MeshStandardMaterial({
        color: 0x33aa33,
        flatShading: true,
        side: THREE.DoubleSide
    });
    
    // Create the terrain mesh
    terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrain.receiveShadow = true;
    scene.add(terrain);
    
    // Add some random trees and rocks for visual interest
    addTerrainDetails();
}

// Add details to the terrain (trees, rocks)
function addTerrainDetails() {
    // Add trees
    for (let i = 0; i < 100; i++) {
        // Tree trunk (cylinder)
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Tree top (cone)
        const topGeometry = new THREE.ConeGeometry(2, 4, 8);
        const topMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = 3;
        
        // Combine trunk and top
        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(top);
        
        // Position the tree randomly on the terrain
        const x = Math.random() * 200 - 100;
        const z = Math.random() * 200 - 100;
        
        // Find y position based on terrain height (simplified)
        const y = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10;
        
        tree.position.set(x, y, z);
        tree.castShadow = true;
        scene.add(tree);
    }
    
    // Add rocks
    for (let i = 0; i < 50; i++) {
        const rockGeometry = new THREE.DodecahedronGeometry(
            Math.random() * 1.5 + 0.5, 
            0
        );
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.8
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        
        // Position the rock randomly
        const x = Math.random() * 200 - 100;
        const z = Math.random() * 200 - 100;
        const y = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10;
        
        rock.position.set(x, y, z);
        rock.rotation.set(
            Math.random() * Math.PI, 
            Math.random() * Math.PI, 
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        scene.add(rock);
    }
}

// Create the UFO player object
function createUFO() {
    // Create a group to hold all UFO parts
    ufo = new THREE.Group();
    
    // Create the main body (saucer shape)
    const bodyGeometry = new THREE.SphereGeometry(2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.8,
        roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    ufo.add(body);
    
    // Create the bottom part (inverted saucer)
    const bottomGeometry = new THREE.SphereGeometry(1.5, 32, 8, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.3);
    const bottomMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.7,
        roughness: 0.3
    });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.position.y = -0.3;
    bottom.castShadow = true;
    ufo.add(bottom);
    
    // Create the dome on top
    const domeGeometry = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMaterial = new THREE.MeshStandardMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.7
    });
    const dome = new THREE.Mesh(domeGeometry, domeMaterial);
    dome.position.y = 0.5;
    dome.castShadow = true;
    ufo.add(dome);
    
    // Add lights around the rim
    const lightCount = 8;
    for (let i = 0; i < lightCount; i++) {
        const angle = (i / lightCount) * Math.PI * 2;
        const lightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        
        light.position.x = Math.cos(angle) * 1.8;
        light.position.z = Math.sin(angle) * 1.8;
        light.position.y = 0;
        
        ufo.add(light);
    }
    
    // Position the UFO above the terrain
    ufo.position.set(0, 20, 0);
    scene.add(ufo);
    
    // Attach the UFO light to the UFO
    lights.ufoLight.position.copy(ufo.position);
    ufo.add(lights.ufoLight);
    
    // Add collision properties
    ufo.userData = {
        type: 'ufo',
        radius: 2, // Collision radius
        isColliding: false
    };
    
    // Create engine exhaust particle effect
    engineExhaust = particleSystem.createEngineExhaust(ufo, new THREE.Vector3(0, -1.5, 0));
}

// Create the tractor beam
function createTractorBeam() {
    // Create a cone geometry for the beam
    const beamGeometry = new THREE.CylinderGeometry(0, 2, 10, 16, 1, true);
    
    // Create a material with transparency and glow effect
    const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    
    // Create the beam mesh
    tractorBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position the beam below the UFO
    tractorBeam.position.y = -5;
    tractorBeam.rotation.x = Math.PI; // Flip the cone to point downward
    
    // Add the beam to the UFO (but don't make it visible yet)
    ufo.add(tractorBeam);
    tractorBeam.visible = false;
}

// Create cows and place them randomly on the terrain
function createCows() {
    for (let i = 0; i < COW_COUNT; i++) {
        // Create a cow using procedural geometry
        const cow = createCowModel();
        
        // Position the cow randomly on the terrain
        const x = Math.random() * GAME_BOUNDS * 2 - GAME_BOUNDS;
        const z = Math.random() * GAME_BOUNDS * 2 - GAME_BOUNDS;
        
        // Find y position based on terrain height (simplified)
        const y = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 10;
        
        cow.position.set(x, y + 1, z); // +1 to place it on top of the terrain
        
        // Random rotation (only around y-axis)
        cow.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to scene and cows array
        scene.add(cow);
        cows.push(cow);
        
        // Add animation properties
        cow.userData = {
            type: 'cow',
            radius: 1.5, // Collision radius
            isBeingAbducted: false,
            abductionProgress: 0,
            idleAnimation: {
                timer: Math.random() * Math.PI * 2, // Random start time
                speed: 0.01 + Math.random() * 0.01 // Random speed
            }
        };
    }
}

// Create a procedural cow model
function createCowModel() {
    // Create a group to hold all cow parts
    const cow = new THREE.Group();
    
    // Create the cow body
    const bodyGeometry = new THREE.BoxGeometry(3, 1.5, 1.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    cow.add(body);
    
    // Create the cow head
    const headGeometry = new THREE.BoxGeometry(1, 1, 1);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(1.5, 0.5, 0);
    head.castShadow = true;
    cow.add(head);
    
    // Create the cow legs (4 legs)
    const legGeometry = new THREE.BoxGeometry(0.4, 1, 0.4);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    // Front legs
    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontLeftLeg.position.set(1, -1.25, 0.5);
    frontLeftLeg.castShadow = true;
    cow.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    frontRightLeg.position.set(1, -1.25, -0.5);
    frontRightLeg.castShadow = true;
    cow.add(frontRightLeg);
    
    // Back legs
    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
    backLeftLeg.position.set(-1, -1.25, 0.5);
    backLeftLeg.castShadow = true;
    cow.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
    backRightLeg.position.set(-1, -1.25, -0.5);
    backRightLeg.castShadow = true;
    cow.add(backRightLeg);
    
    // Create spots (random black spots)
    const spotCount = Math.floor(Math.random() * 5) + 3; // 3-7 spots
    for (let i = 0; i < spotCount; i++) {
        const spotGeometry = new THREE.CircleGeometry(0.3, 8);
        const spotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
        const spot = new THREE.Mesh(spotGeometry, spotMaterial);
        
        // Position the spot randomly on the body
        const spotX = Math.random() * 2.5 - 1.25;
        const spotY = Math.random() * 0.5 + 0.5;
        const spotZ = Math.random() > 0.5 ? 0.76 : -0.76; // Either on left or right side
        
        spot.position.set(spotX, spotY, spotZ);
        spot.rotation.y = spotZ > 0 ? Math.PI / 2 : -Math.PI / 2; // Rotate to face outward
        cow.add(spot);
    }
    
    return cow;
}

// Create a fighter jet model
function createJetModel() {
    // Create a group to hold all jet parts
    const jet = new THREE.Group();
    
    // Create the jet body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2; // Rotate to horizontal position
    body.castShadow = true;
    jet.add(body);
    
    // Create the jet wings
    const wingGeometry = new THREE.BoxGeometry(0.2, 5, 1);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.castShadow = true;
    jet.add(wings);
    
    // Create the jet tail
    const tailGeometry = new THREE.BoxGeometry(1, 0.2, 1);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(-1.5, 0.5, 0);
    tail.castShadow = true;
    jet.add(tail);
    
    // Create the jet cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x88aaff,
        transparent: true,
        opacity: 0.7
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(1.5, 0.3, 0);
    cockpit.rotation.x = -Math.PI / 2;
    cockpit.castShadow = true;
    jet.add(cockpit);
    
    // Add collision properties
    jet.userData = {
        type: 'jet',
        radius: 2.5, // Collision radius
        speed: JET_SPEED * (0.8 + Math.random() * 0.4), // Random speed variation
        lastFired: 0,
        fireRate: 3000 + Math.random() * 2000, // Random fire rate between 3-5 seconds
        target: new THREE.Vector3(), // Will be set to UFO position
        engineSound: null
    };
    
    // Create jet engine exhaust
    jet.userData.exhaustEmitter = particleSystem.createEngineExhaust(
        jet, 
        new THREE.Vector3(-2, 0, 0)
    );
    
    // Add engine sound
    jet.userData.engineSound = soundManager.createPositionalSound(jet, 'jet', 'engine', 50);
    jet.userData.engineSound.setLoop(true);
    jet.userData.engineSound.play();
    
    return jet;
}

// Create a missile model
function createMissileModel(position, direction) {
    // Create a group for the missile
    const missile = new THREE.Group();
    
    // Create the missile body
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2; // Align with direction of travel
    body.castShadow = true;
    missile.add(body);
    
    // Create the missile nose cone
    const noseGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0, -1);
    nose.rotation.x = Math.PI / 2; // Align with direction of travel
    nose.castShadow = true;
    missile.add(nose);
    
    // Create the missile fins
    const finGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.5);
    const finMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    // Add 4 fins around the missile
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial);
        const angle = (i / 4) * Math.PI * 2;
        fin.position.set(Math.sin(angle) * 0.2, Math.cos(angle) * 0.2, 0.5);
        fin.rotation.z = angle;
        fin.castShadow = true;
        missile.add(fin);
    }
    
    // Position the missile
    missile.position.copy(position);
    
    // Add a light at the back of the missile
    const exhaustLight = new THREE.PointLight(0xff6600, 1, 3);
    exhaustLight.position.set(0, 0, 1);
    missile.add(exhaustLight);
    
    // Create exhaust particle effect
    const exhaustEmitter = particleSystem.createEmitter(
        'exhaust',
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, 1),
        {
            size: 0.1,
            count: 20,
            emissionRate: 1
        }
    );
    missile.add(exhaustEmitter.system);
    
    // Set missile data
    missile.userData = {
        type: 'missile',
        radius: 0.5, // Collision radius
        direction: direction.clone().normalize(),
        speed: MISSILE_SPEED,
        lifeTime: 0, // Track how long the missile has been alive
        exhaustEmitter: exhaustEmitter
    };
    
    // Play missile sound
    soundManager.play('jet', 'missile');
    
    // Add to scene and missiles array
    scene.add(missile);
    missiles.push(missile);
    
    return missile;
}

// Create an explosion effect
function createExplosion(position, size = 1) {
    // Create particle explosion
    particleSystem.createExplosion(position, size, size * 50);
    
    // Play explosion sound
    soundManager.play('ufo', 'explosion');
    
    // Shake screen
    visualEffects.shakeScreen(size * 0.2);
    
    // Create a light flash
    const explosionLight = new THREE.PointLight(0xff5500, 5, size * 20);
    explosionLight.position.copy(position);
    scene.add(explosionLight);
    
    // Remove light after a short time
    setTimeout(() => {
        scene.remove(explosionLight);
    }, 200);
}

// Set up keyboard controls
function setupControls() {
    // Add keyboard event listeners
    document.addEventListener('keydown', (event) => {
        if (keys.hasOwnProperty(event.code)) {
            keys[event.code] = true;
        }
        
        // Map Space and Shift keys
        if (event.code === 'Space') {
            keys.Space = true;
        }
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            keys.Shift = true;
        }
        if (event.code === 'KeyE') {
            keys.KeyE = true;
        }
        if (event.code === 'KeyM') {
            keys.KeyM = true;
            // Toggle mute
            const muted = soundManager.toggleMute();
            document.getElementById('mute-button').textContent = muted ? 'Unmute' : 'Mute';
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (keys.hasOwnProperty(event.code)) {
            keys[event.code] = false;
        }
        
        // Map Space and Shift keys
        if (event.code === 'Space') {
            keys.Space = false;
        }
        if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            keys.Shift = false;
        }
        if (event.code === 'KeyE') {
            keys.KeyE = false;
        }
        if (event.code === 'KeyM') {
            keys.KeyM = false;
        }
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update visual effects
    visualEffects.resize();
}

// Update UFO position based on controls
function updateUFO() {
    // Reset acceleration
    acceleration.set(0, 0, 0);
    
    // Apply controls to acceleration
    if (keys.ArrowUp) {
        acceleration.z -= ACCELERATION;
    }
    if (keys.ArrowDown) {
        acceleration.z += ACCELERATION;
    }
    if (keys.ArrowLeft) {
        acceleration.x -= ACCELERATION;
    }
    if (keys.ArrowRight) {
        acceleration.x += ACCELERATION;
    }
    if (keys.Space) {
        acceleration.y += ACCELERATION;
    }
    if (keys.Shift) {
        acceleration.y -= ACCELERATION;
    }
    
    // Apply acceleration to velocity
    velocity.add(acceleration);
    
    // Apply deceleration (drag)
    velocity.multiplyScalar(DECELERATION);
    
    // Limit maximum speed
    if (velocity.length() > MAX_SPEED) {
        velocity.normalize().multiplyScalar(MAX_SPEED);
    }
    
    // Apply velocity to position
    ufo.position.add(velocity);
    
    // Keep UFO above the terrain (minimum height)
    if (ufo.position.y < 5) {
        ufo.position.y = 5;
        velocity.y = 0;
    }
    
    // Keep UFO within game bounds
    if (Math.abs(ufo.position.x) > GAME_BOUNDS) {
        ufo.position.x = Math.sign(ufo.position.x) * GAME_BOUNDS;
        velocity.x *= -0.5; // Bounce off the boundary
    }
    if (Math.abs(ufo.position.z) > GAME_BOUNDS) {
        ufo.position.z = Math.sign(ufo.position.z) * GAME_BOUNDS;
        velocity.z *= -0.5; // Bounce off the boundary
    }
    
    // Apply hovering effect
    hoverOffset += HOVER_SPEED * hoverDirection;
    if (Math.abs(hoverOffset) > HOVER_HEIGHT) {
        hoverDirection *= -1;
    }
    ufo.position.y += HOVER_SPEED * hoverDirection;
    
    // Rotate UFO based on movement
    if (velocity.x !== 0 || velocity.z !== 0) {
        // Bank the UFO in the direction of movement
        const bankAngle = velocity.x * 0.5;
        const targetRotationZ = -bankAngle;
        
        // Smoothly interpolate current rotation to target rotation
        ufo.rotation.z += (targetRotationZ - ufo.rotation.z) * 0.1;
        
        // Rotate UFO to face movement direction
        const targetRotationY = Math.atan2(velocity.x, velocity.z);
        
        // Smoothly interpolate current rotation to target rotation
        const rotDiff = targetRotationY - ufo.rotation.y;
        
        // Handle the shortest rotation path
        if (rotDiff > Math.PI) {
            ufo.rotation.y += (rotDiff - 2 * Math.PI) * 0.1;
        } else if (rotDiff < -Math.PI) {
            ufo.rotation.y += (rotDiff + 2 * Math.PI) * 0.1;
        } else {
            ufo.rotation.y += rotDiff * 0.1;
        }
    }
    
    // Update UFO light position
    lights.ufoLight.position.copy(ufo.position);
    
    // Handle tractor beam
    updateTractorBeam();
    
    // Update engine exhaust position
    if (engineExhaust) {
        const exhaustPos = new THREE.Vector3(0, -1.5, 0);
        ufo.localToWorld(exhaustPos);
        particleSystem.updateEmitterPosition(engineExhaust, exhaustPos);
    }
    
    // Play or stop engine sound based on movement
    if (velocity.length() > 0.05) {
        soundManager.play('ufo', 'engine_loop', false);
    } else if (velocity.length() < 0.02) {
        soundManager.stop('ufo', 'engine_loop');
    }
}

// Update tractor beam state and effect
function updateTractorBeam() {
    // Toggle tractor beam visibility based on E key
    const wasActive = tractorBeam.visible;
    tractorBeam.visible = keys.KeyE;
    
    // Play tractor beam sound when activated
    if (!wasActive && tractorBeam.visible) {
        soundManager.play('ufo', 'tractor_beam');
    } else if (wasActive && !tractorBeam.visible) {
        soundManager.stop('ufo', 'tractor_beam');
    }
    
    // If beam is active, check for cows to abduct
    if (tractorBeam.visible) {
        // Get the beam's world position (bottom of the beam)
        const beamPosition = new THREE.Vector3(0, -10, 0);
        beamPosition.applyMatrix4(tractorBeam.matrixWorld);
        
        // Create sparkle particles in the beam
        if (Math.random() < 0.2) {
            const sparklePos = new THREE.Vector3(
                beamPosition.x + (Math.random() - 0.5) * 3,
                beamPosition.y + Math.random() * 8,
                beamPosition.z + (Math.random() - 0.5) * 3
            );
            
            particleSystem.createEmitter('sparkle', sparklePos, new THREE.Vector3(0, 1, 0), {
                oneShot: true,
                count: 5
            });
        }
        
        // Check each cow for abduction
        cows.forEach((cow, index) => {
            if (!cow.userData.isBeingAbducted) {
                // Calculate horizontal distance between beam and cow
                const horizontalDist = new THREE.Vector2(
                    cow.position.x - ufo.position.x,
                    cow.position.z - ufo.position.z
                ).length();
                
                // If cow is within beam range, start abduction
                if (horizontalDist < BEAM_RANGE / 2 && cow.position.y < ufo.position.y) {
                    cow.userData.isBeingAbducted = true;
                    cow.userData.abductionProgress = 0;
                    
                    // Play cow moo sound
                    soundManager.play('cow', 'moo');
                }
            } else {
                // Continue abduction process
                cow.userData.abductionProgress += BEAM_STRENGTH;
                
                // Calculate new position (move toward UFO)
                const targetY = ufo.position.y - 1;
                const lerpFactor = cow.userData.abductionProgress;
                
                // Move cow toward UFO
                cow.position.y = THREE.MathUtils.lerp(
                    cow.position.y,
                    targetY,
                    lerpFactor * 0.05
                );
                
                // Also move cow horizontally toward beam center
                cow.position.x = THREE.MathUtils.lerp(
                    cow.position.x,
                    ufo.position.x,
                    lerpFactor * 0.05
                );
                cow.position.z = THREE.MathUtils.lerp(
                    cow.position.z,
                    ufo.position.z,
                    lerpFactor * 0.05
                );
                
                // Rotate cow as it's being abducted
                cow.rotation.y += 0.05;
                
                // If cow reaches UFO, complete abduction
                if (cow.position.distanceTo(ufo.position) < 3) {
                    // Play abduction complete sound
                    soundManager.play('cow', 'abduction_complete');
                    
                    // Create sparkle effect
                    particleSystem.createEmitter('sparkle', cow.position, new THREE.Vector3(0, 1, 0), {
                        oneShot: true,
                        count: 30
                    });
                    
                    // Remove cow from scene and array
                    scene.remove(cow);
                    cows.splice(index, 1);
                    
                    // Increase score
                    gameStateManager.updateScore(gameStateManager.score + 100);
                    
                    // Increase spawn rate of jets
                    currentSpawnInterval = Math.max(
                        SPAWN_INTERVAL_MIN,
                        currentSpawnInterval * (1 - SPAWN_RATE_INCREASE)
                    );
                }
            }
        });
    }
}

// Update camera position to follow the UFO
function updateCamera() {
    // Calculate target camera position
    const targetPosition = ufo.position.clone().add(cameraOffset);
    
    // Smoothly move camera towards target position (camera lag)
    camera.position.lerp(targetPosition, CAMERA_LAG);
    
    // Make camera look at the UFO
    camera.lookAt(ufo.position);
}

// Update cow animations
function updateCows() {
    cows.forEach(cow => {
        if (!cow.userData.isBeingAbducted) {
            // Update idle animation timer
            cow.userData.idleAnimation.timer += cow.userData.idleAnimation.speed;
            
            // Apply subtle movement
            const headBob = Math.sin(cow.userData.idleAnimation.timer) * 0.05;
            cow.position.y += headBob;
            
            // Occasionally make the cow turn slightly
            if (Math.random() < 0.005) {
                cow.rotation.y += (Math.random() - 0.5) * 0.5;
            }
        }
    });
}

// Spawn and update jets
function updateJets() {
    const currentTime = Date.now();
    
    // Spawn new jets based on interval
    if (currentTime - lastJetSpawn > currentSpawnInterval) {
        spawnJet();
        lastJetSpawn = currentTime;
    }
    
    // Update existing jets
    jets.forEach((jet, index) => {
        // Update jet position to move toward UFO
        const direction = new THREE.Vector3().subVectors(ufo.position, jet.position).normalize();
        jet.userData.target.copy(ufo.position);
        
        // Move jet toward UFO
        jet.position.add(direction.multiplyScalar(jet.userData.speed));
        
        // Rotate jet to face direction of travel
        const targetRotation = Math.atan2(direction.x, direction.z);
        jet.rotation.y = targetRotation;
        
        // Tilt jet based on vertical movement
        jet.rotation.x = direction.y * 0.5;
        
        // Update exhaust position
        if (jet.userData.exhaustEmitter) {
            const exhaustPos = new THREE.Vector3(-2, 0, 0);
            jet.localToWorld(exhaustPos);
            particleSystem.updateEmitterPosition(jet.userData.exhaustEmitter, exhaustPos);
        }
        
        // Check if jet should fire a missile
        const timeSinceLastFire = currentTime - jet.userData.lastFired;
        if (timeSinceLastFire > jet.userData.fireRate) {
            // Fire a missile at the UFO
            const missilePosition = jet.position.clone();
            const missileDirection = new THREE.Vector3().subVectors(ufo.position, missilePosition);
            createMissileModel(missilePosition, missileDirection);
            
            // Update last fired time
            jet.userData.lastFired = currentTime;
        }
        
        // Remove jets that are too far away
        if (jet.position.distanceTo(ufo.position) > GAME_BOUNDS * 1.5) {
            // Stop engine sound
            if (jet.userData.engineSound && jet.userData.engineSound.isPlaying) {
                jet.userData.engineSound.stop();
            }
            
            // Remove exhaust emitter
            if (jet.userData.exhaustEmitter) {
                particleSystem.removeEmitter(jet.userData.exhaustEmitter);
            }
            
            scene.remove(jet);
            jets.splice(index, 1);
        }
    });
}

// Spawn a new jet at the edge of the game area
function spawnJet() {
    // Create a new jet
    const jet = createJetModel();
    
    // Position the jet at the edge of the game area
    const angle = Math.random() * Math.PI * 2;
    const distance = GAME_BOUNDS * 1.2;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    // Set y position (altitude)
    const y = ufo.position.y + (Math.random() * 10 - 5);
    
    jet.position.set(x, y, z);
    
    // Add to scene and jets array
    scene.add(jet);
    jets.push(jet);
    
    return jet;
}

// Update missiles
function updateMissiles() {
    missiles.forEach((missile, index) => {
        // Move missile in its direction
        missile.position.add(
            missile.userData.direction.clone().multiplyScalar(missile.userData.speed)
        );
        
        // Increment lifetime
        missile.userData.lifeTime++;
        
        // Remove missiles that have traveled too far or lived too long
        if (missile.position.distanceTo(ufo.position) > GAME_BOUNDS * 1.5 || 
            missile.userData.lifeTime > 500) {
            
            // Remove exhaust emitter
            if (missile.userData.exhaustEmitter) {
                particleSystem.removeEmitter(missile.userData.exhaustEmitter);
            }
            
            scene.remove(missile);
            missiles.splice(index, 1);
        }
    });
}

// Check for collisions between objects
function checkCollisions() {
    // Check UFO collision with jets
    jets.forEach((jet, jetIndex) => {
        const distance = jet.position.distanceTo(ufo.position);
        if (distance < (ufo.userData.radius + jet.userData.radius)) {
            // Collision detected
            createExplosion(jet.position.clone(), 3);
            
            // Stop engine sound
            if (jet.userData.engineSound && jet.userData.engineSound.isPlaying) {
                jet.userData.engineSound.stop();
            }
            
            // Remove exhaust emitter
            if (jet.userData.exhaustEmitter) {
                particleSystem.removeEmitter(jet.userData.exhaustEmitter);
            }
            
            // Remove jet
            scene.remove(jet);
            jets.splice(jetIndex, 1);
            
            // Damage player
            damagePlayer();
        }
    });
    
    // Check UFO collision with missiles
    missiles.forEach((missile, missileIndex) => {
        const distance = missile.position.distanceTo(ufo.position);
        if (distance < (ufo.userData.radius + missile.userData.radius)) {
            // Collision detected
            createExplosion(missile.position.clone(), 2);
            
            // Remove exhaust emitter
            if (missile.userData.exhaustEmitter) {
                particleSystem.removeEmitter(missile.userData.exhaustEmitter);
            }
            
            // Remove missile
            scene.remove(missile);
            missiles.splice(missileIndex, 1);
            
            // Damage player
            damagePlayer();
        }
    });
}

// Apply damage to the player
function damagePlayer() {
    // Update health
    gameStateManager.updateHealth(gameStateManager.health - 1);
    
    // Visual feedback for damage
    ufo.visible = false;
    setTimeout(() => { ufo.visible = true; }, 100);
    setTimeout(() => { ufo.visible = false; }, 200);
    setTimeout(() => { ufo.visible = true; }, 300);
    
    // Screen shake effect
    visualEffects.shakeScreen(0.5);
    
    // Play explosion sound
    soundManager.play('ufo', 'explosion');
    
    // Check if player is out of health
    if (gameStateManager.health <= 0) {
        // Create large explosion at UFO position
        createExplosion(ufo.position.clone(), 5);
        
        // End the game
        gameStateManager.endGame();
    }
}

// Animation loop
function animate(timestamp) {
    requestAnimationFrame(animate);
    
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Only update game logic if game is active
    if (gameStateManager.isGameActive()) {
        // Update UFO position and rotation
        updateUFO();
        
        // Update camera to follow UFO
        updateCamera();
        
        // Update cows
        updateCows();
        
        // Update jets and missiles
        updateJets();
        updateMissiles();
        
        // Update particle systems
        particleSystem.update();
        
        // Check for collisions
        checkCollisions();
        
        // Update mini-map
        if (miniMap) {
            miniMap.update();
        }
    }

    // Render the scene with visual effects
    visualEffects.render();
}

// Start the game
function startGame() {
    gameActive = true;
    
    // Reset UFO position
    ufo.position.set(0, 20, 0);
    velocity.set(0, 0, 0);
    
    // Reset camera
    camera.position.copy(ufo.position).add(cameraOffset);
    camera.lookAt(ufo.position);
    
    // Clear any existing jets and missiles
    jets.forEach(jet => {
        // Stop engine sound
        if (jet.userData.engineSound && jet.userData.engineSound.isPlaying) {
            jet.userData.engineSound.stop();
        }
        
        // Remove exhaust emitter
        if (jet.userData.exhaustEmitter) {
            particleSystem.removeEmitter(jet.userData.exhaustEmitter);
        }
        
        scene.remove(jet);
    });
    jets = [];
    
    missiles.forEach(missile => {
        // Remove exhaust emitter
        if (missile.userData.exhaustEmitter) {
            particleSystem.removeEmitter(missile.userData.exhaustEmitter);
        }
        
        scene.remove(missile);
    });
    missiles = [];
    
    // Reset spawn timer
    lastJetSpawn = Date.now();
    currentSpawnInterval = SPAWN_INTERVAL_BASE;
    
    // Create new cows if needed
    if (cows.length === 0) {
        createCows();
    }
    
    // Initialize visual effects
    visualEffects.init();
    
    // Create mini-map
    if (!miniMap) {
        miniMap = new MiniMap({
            ufo: ufo,
            cows: cows,
            jets: jets,
            missiles: missiles
        });
    }
    
    // Play game start sound
    soundManager.play('ui', 'game_start');
    
    // Start background music
    soundManager.play('music', 'background');
    
    console.log('Game started');
}

// Pause the game
function pauseGame() {
    gameActive = false;
    
    // Pause all sounds
    soundManager.pauseAll();
}

// Resume the game
function resumeGame() {
    gameActive = true;
    
    // Resume sounds
    soundManager.resumeAll();
}

// Restart the game
function restartGame() {
    // Remove all existing cows
    cows.forEach(cow => scene.remove(cow));
    cows = [];
    
    // Create new cows
    createCows();
    
    // Update mini-map references
    if (miniMap) {
        miniMap.gameObjects.cows = cows;
    }
    
    startGame();
}

// Initialize the game when the page loads
window.addEventListener('load', init);

/**
 * Particle System for Retro UFO Game
 * Handles particle effects like engine exhaust, explosions, etc.
 */

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = [];
        
        // Particle types and their settings
        this.particleTypes = {
            exhaust: {
                color: 0x33aaff,
                size: 0.2,
                count: 50,
                lifetime: 30,
                speed: 0.05,
                spread: 0.1,
                gravity: 0.001,
                opacity: 0.7,
                fadeRate: 0.03
            },
            explosion: {
                color: 0xff5500,
                size: 0.3,
                count: 100,
                lifetime: 60,
                speed: 0.2,
                spread: 0.8,
                gravity: 0.001,
                opacity: 1.0,
                fadeRate: 0.02
            },
            sparkle: {
                color: 0xffff00,
                size: 0.15,
                count: 20,
                lifetime: 20,
                speed: 0.03,
                spread: 0.3,
                gravity: -0.001,
                opacity: 0.9,
                fadeRate: 0.05
            },
            smoke: {
                color: 0x555555,
                size: 0.4,
                count: 30,
                lifetime: 90,
                speed: 0.02,
                spread: 0.2,
                gravity: -0.0005,
                opacity: 0.5,
                fadeRate: 0.01
            }
        };
    }
    
    /**
     * Create a particle emitter
     * @param {string} type - Particle type (exhaust, explosion, sparkle, smoke)
     * @param {THREE.Vector3} position - Position of the emitter
     * @param {THREE.Vector3} direction - Direction of the emission
     * @param {Object} options - Optional settings to override defaults
     * @returns {Object} The created particle system
     */
    createEmitter(type, position, direction, options = {}) {
        // Get settings for this particle type
        const settings = { ...this.particleTypes[type], ...options };
        
        // Create particle geometry
        const particles = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const colors = [];
        const sizes = [];
        const lifetimes = [];
        const opacities = [];
        
        // Create particles
        for (let i = 0; i < settings.count; i++) {
            // Initial position (at emitter)
            positions.push(0, 0, 0);
            
            // Random velocity based on direction and spread
            const velocity = direction.clone().normalize();
            velocity.x += (Math.random() - 0.5) * settings.spread;
            velocity.y += (Math.random() - 0.5) * settings.spread;
            velocity.z += (Math.random() - 0.5) * settings.spread;
            velocity.normalize().multiplyScalar(settings.speed * (0.5 + Math.random()));
            
            velocities.push(velocity.x, velocity.y, velocity.z);
            
            // Color (with slight variation)
            const color = new THREE.Color(settings.color);
            color.r += (Math.random() - 0.5) * 0.1;
            color.g += (Math.random() - 0.5) * 0.1;
            color.b += (Math.random() - 0.5) * 0.1;
            colors.push(color.r, color.g, color.b);
            
            // Size (with variation)
            sizes.push(settings.size * (0.7 + Math.random() * 0.6));
            
            // Lifetime and opacity
            lifetimes.push(0); // Current lifetime
            opacities.push(settings.opacity);
        }
        
        // Add attributes to geometry
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particles.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
        particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        particles.setAttribute('lifetime', new THREE.Float32BufferAttribute(lifetimes, 1));
        particles.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: 1.0,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create the particle system
        const system = new THREE.Points(particles, material);
        system.position.copy(position);
        
        // Add to scene
        this.scene.add(system);
        
        // Store particle system with its settings
        const particleSystem = {
            system: system,
            settings: settings,
            active: true,
            oneShot: options.oneShot || false,
            emissionRate: options.emissionRate || 1,
            emissionCounter: 0
        };
        
        this.particleSystems.push(particleSystem);
        
        return particleSystem;
    }
    
    /**
     * Create an explosion effect
     * @param {THREE.Vector3} position - Position of the explosion
     * @param {number} size - Size multiplier for the explosion
     * @param {number} count - Number of particles to create
     * @returns {Object} The created particle system
     */
    createExplosion(position, size = 1.0, count = 100) {
        // Create an explosion particle system
        return this.createEmitter('explosion', position, new THREE.Vector3(0, 1, 0), {
            size: 0.3 * size,
            count: count,
            oneShot: true // Explosion is a one-time effect
        });
    }
    
    /**
     * Create engine exhaust effect
     * @param {THREE.Object3D} object - Object to attach the exhaust to
     * @param {THREE.Vector3} offset - Offset from object position
     * @returns {Object} The created particle system
     */
    createEngineExhaust(object, offset) {
        // Create a local direction vector pointing backward
        const direction = new THREE.Vector3(0, 0, 1); // Backward direction
        
        // Get world position for the exhaust
        const position = new THREE.Vector3();
        position.copy(offset);
        object.localToWorld(position);
        
        // Create continuous exhaust emitter
        return this.createEmitter('exhaust', position, direction, {
            emissionRate: 2 // Emit particles every other frame
        });
    }
    
    /**
     * Update all particle systems
     */
    update() {
        // Update each particle system
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const ps = this.particleSystems[i];
            
            if (ps.active) {
                this.updateParticles(ps);
                
                // Remove one-shot systems when all particles are dead
                if (ps.oneShot) {
                    let allDead = true;
                    const lifetimes = ps.system.geometry.attributes.lifetime.array;
                    
                    for (let j = 0; j < lifetimes.length; j++) {
                        if (lifetimes[j] < ps.settings.lifetime) {
                            allDead = false;
                            break;
                        }
                    }
                    
                    if (allDead) {
                        this.scene.remove(ps.system);
                        this.particleSystems.splice(i, 1);
                    }
                }
            }
        }
    }
    
    /**
     * Update particles in a particle system
     * @param {Object} ps - Particle system to update
     */
    updateParticles(ps) {
        const positions = ps.system.geometry.attributes.position.array;
        const velocities = ps.system.geometry.attributes.velocity.array;
        const lifetimes = ps.system.geometry.attributes.lifetime.array;
        const opacities = ps.system.geometry.attributes.opacity.array;
        const sizes = ps.system.geometry.attributes.size.array;
        
        // Emission counter for continuous effects
        ps.emissionCounter = (ps.emissionCounter + 1) % ps.emissionRate;
        
        // Update each particle
        for (let i = 0; i < positions.length; i += 3) {
            const index = i / 3;
            
            // Only update active particles or create new ones
            if (lifetimes[index] < ps.settings.lifetime || 
                (!ps.oneShot && ps.emissionCounter === 0)) {
                
                // Reset dead particles for continuous effects
                if (!ps.oneShot && lifetimes[index] >= ps.settings.lifetime) {
                    // Reset position
                    positions[i] = 0;
                    positions[i + 1] = 0;
                    positions[i + 2] = 0;
                    
                    // Reset lifetime and opacity
                    lifetimes[index] = 0;
                    opacities[index] = ps.settings.opacity;
                    
                    // Randomize velocity slightly
                    velocities[i] += (Math.random() - 0.5) * 0.02;
                    velocities[i + 1] += (Math.random() - 0.5) * 0.02;
                    velocities[i + 2] += (Math.random() - 0.5) * 0.02;
                }
                
                // Update position based on velocity
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
                
                // Apply gravity
                velocities[i + 1] -= ps.settings.gravity;
                
                // Update lifetime
                lifetimes[index]++;
                
                // Fade out based on lifetime
                if (lifetimes[index] > ps.settings.lifetime * 0.7) {
                    opacities[index] -= ps.settings.fadeRate;
                    if (opacities[index] < 0) opacities[index] = 0;
                }
            }
        }
        
        // Update geometry attributes
        ps.system.geometry.attributes.position.needsUpdate = true;
        ps.system.geometry.attributes.velocity.needsUpdate = true;
        ps.system.geometry.attributes.lifetime.needsUpdate = true;
        ps.system.geometry.attributes.opacity.needsUpdate = true;
        
        // Update material opacity for all particles
        ps.system.material.opacity = 1.0;
    }
    
    /**
     * Update the position of a particle emitter (for attached emitters)
     * @param {Object} emitter - The particle emitter
     * @param {THREE.Vector3} position - New position
     * @param {THREE.Vector3} direction - New direction
     */
    updateEmitterPosition(emitter, position, direction) {
        if (emitter && emitter.system) {
            emitter.system.position.copy(position);
        }
    }
    
    /**
     * Stop a particle emitter
     * @param {Object} emitter - The particle emitter to stop
     */
    stopEmitter(emitter) {
        if (emitter) {
            emitter.active = false;
        }
    }
    
    /**
     * Start a particle emitter
     * @param {Object} emitter - The particle emitter to start
     */
    startEmitter(emitter) {
        if (emitter) {
            emitter.active = true;
        }
    }
    
    /**
     * Remove a particle emitter
     * @param {Object} emitter - The particle emitter to remove
     */
    removeEmitter(emitter) {
        if (emitter) {
            const index = this.particleSystems.indexOf(emitter);
            if (index !== -1) {
                this.scene.remove(emitter.system);
                this.particleSystems.splice(index, 1);
            }
        }
    }
    
    /**
     * Clear all particle systems
     */
    clear() {
        // Remove all particle systems from the scene
        this.particleSystems.forEach(ps => {
            this.scene.remove(ps.system);
        });
        
        // Clear the array
        this.particleSystems = [];
    }
}
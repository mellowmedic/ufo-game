/**
 * Visual Effects Manager for Retro UFO Game
 * Implements post-processing effects using Three.js EffectComposer
 */

class VisualEffects {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Effect composer and passes
        this.composer = null;
        this.renderPass = null;
        this.scanlinePass = null;
        this.pixelPass = null;
        this.vignettePass = null;
        this.colorShiftPass = null;
        this.initialized = false;
        
        // Effect settings
        this.settings = {
            scanlines: {
                enabled: true,
                density: 4.0,
                opacity: 0.3
            },
            pixelation: {
                enabled: true,
                pixelSize: 4.0
            },
            vignette: {
                enabled: true,
                offset: 1.0,
                darkness: 1.0
            },
            colorShift: {
                enabled: true,
                amount: 0.15
            },
            screenShake: {
                enabled: true,
                intensity: 0.0,
                decay: 0.9,
                maxOffset: 0.3
            }
        };
        
        // Screen shake properties
        this.shakeOffset = new THREE.Vector2(0, 0);
    }
    
    /**
     * Initialize the visual effects
     */
    init() {
        if (this.initialized) {
            return;
        }

        // Create effect composer
        this.composer = new THREE.EffectComposer(this.renderer);
        
        // Add render pass
        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);
        
        // Add scanline pass
        this.addScanlinePass();
        
        // Add pixel shader pass
        this.addPixelPass();
        
        // Add vignette pass
        this.addVignettePass();
        
        // Add color shift pass
        this.addColorShiftPass();
        
        // Resize composer to match renderer
        this.resize();

        this.initialized = true;
    }
    
    /**
     * Add scanline effect pass
     */
    addScanlinePass() {
        // Scanline shader
        const scanlineShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                "density": { value: this.settings.scanlines.density },
                "opacity": { value: this.settings.scanlines.opacity }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float density;
                uniform float opacity;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float scanline = sin(vUv.y * resolution.y * density) * opacity;
                    color.rgb -= scanline;
                    gl_FragColor = color;
                }
            `
        };
        
        this.scanlinePass = new THREE.ShaderPass(scanlineShader);
        this.scanlinePass.enabled = this.settings.scanlines.enabled;
        this.composer.addPass(this.scanlinePass);
    }
    
    /**
     * Add pixel shader pass
     */
    addPixelPass() {
        // Pixel shader
        const pixelShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "resolution": { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                "pixelSize": { value: this.settings.pixelation.pixelSize }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 resolution;
                uniform float pixelSize;
                varying vec2 vUv;
                
                void main() {
                    vec2 dxy = pixelSize / resolution;
                    vec2 coord = dxy * floor(vUv / dxy);
                    gl_FragColor = texture2D(tDiffuse, coord);
                }
            `
        };
        
        this.pixelPass = new THREE.ShaderPass(pixelShader);
        this.pixelPass.enabled = this.settings.pixelation.enabled;
        this.composer.addPass(this.pixelPass);
    }
    
    /**
     * Add vignette effect pass
     */
    addVignettePass() {
        // Vignette shader
        const vignetteShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "offset": { value: this.settings.vignette.offset },
                "darkness": { value: this.settings.vignette.darkness }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec2 uv = (vUv - 0.5) * 2.0;
                    float vignetteAmount = 1.0 - dot(uv, uv) * offset;
                    vignetteAmount = pow(vignetteAmount, darkness);
                    color.rgb *= vignetteAmount;
                    gl_FragColor = color;
                }
            `
        };
        
        this.vignettePass = new THREE.ShaderPass(vignetteShader);
        this.vignettePass.enabled = this.settings.vignette.enabled;
        this.composer.addPass(this.vignettePass);
    }
    
    /**
     * Add color shift pass
     */
    addColorShiftPass() {
        // Color shift shader
        const colorShiftShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "amount": { value: this.settings.colorShift.amount }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    
                    // Reduce color depth
                    float r = floor(color.r * 5.0) / 5.0;
                    float g = floor(color.g * 5.0) / 5.0;
                    float b = floor(color.b * 5.0) / 5.0;
                    
                    // Shift colors slightly
                    vec3 washout = vec3(0.6, 0.7, 0.8);
                    vec3 shifted = mix(vec3(r, g, b), washout, amount);
                    
                    gl_FragColor = vec4(shifted, color.a);
                }
            `
        };
        
        this.colorShiftPass = new THREE.ShaderPass(colorShiftShader);
        this.colorShiftPass.enabled = this.settings.colorShift.enabled;
        this.composer.addPass(this.colorShiftPass);
    }
    
    /**
     * Handle window resize
     */
    resize() {
        if (this.composer) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            this.composer.setSize(width, height);
            
            // Update shader uniforms
            if (this.scanlinePass) {
                this.scanlinePass.uniforms.resolution.value.set(width, height);
            }
            
            if (this.pixelPass) {
                this.pixelPass.uniforms.resolution.value.set(width, height);
            }
        }
    }
    
    /**
     * Render the scene with effects
     */
    render() {
        if (!this.initialized || !this.composer) {
            return;
        }

        // Apply screen shake if active
        if (this.settings.screenShake.enabled && this.settings.screenShake.intensity > 0) {
            this.applyScreenShake();
        }
        
        // Render using composer
        this.composer.render();
    }
    
    /**
     * Apply screen shake effect
     */
    applyScreenShake() {
        // Calculate shake offset
        const intensity = this.settings.screenShake.intensity;
        
        // Add random offset based on intensity
        this.shakeOffset.x = (Math.random() * 2 - 1) * intensity;
        this.shakeOffset.y = (Math.random() * 2 - 1) * intensity;
        
        // Limit maximum offset
        const maxOffset = this.settings.screenShake.maxOffset;
        this.shakeOffset.x = Math.max(-maxOffset, Math.min(maxOffset, this.shakeOffset.x));
        this.shakeOffset.y = Math.max(-maxOffset, Math.min(maxOffset, this.shakeOffset.y));
        
        // Apply offset to camera
        this.camera.position.x += this.shakeOffset.x;
        this.camera.position.y += this.shakeOffset.y;
        
        // Decay intensity
        this.settings.screenShake.intensity *= this.settings.screenShake.decay;
        
        // Reset when intensity is very small
        if (this.settings.screenShake.intensity < 0.001) {
            this.settings.screenShake.intensity = 0;
        }
    }
    
    /**
     * Trigger screen shake effect
     * @param {number} intensity - Intensity of the shake (0.0 to 1.0)
     */
    shakeScreen(intensity = 0.3) {
        if (this.settings.screenShake.enabled) {
            this.settings.screenShake.intensity = intensity;
        }
    }
    
    /**
     * Toggle an effect on/off
     * @param {string} effect - Effect name (scanlines, pixelation, vignette, colorShift, screenShake)
     * @returns {boolean} New state of the effect
     */
    toggleEffect(effect) {
        if (this.settings[effect]) {
            this.settings[effect].enabled = !this.settings[effect].enabled;
            
            // Update pass enabled state
            switch (effect) {
                case 'scanlines':
                    if (this.scanlinePass) this.scanlinePass.enabled = this.settings.scanlines.enabled;
                    break;
                case 'pixelation':
                    if (this.pixelPass) this.pixelPass.enabled = this.settings.pixelation.enabled;
                    break;
                case 'vignette':
                    if (this.vignettePass) this.vignettePass.enabled = this.settings.vignette.enabled;
                    break;
                case 'colorShift':
                    if (this.colorShiftPass) this.colorShiftPass.enabled = this.settings.colorShift.enabled;
                    break;
            }
            
            return this.settings[effect].enabled;
        }
        
        return false;
    }
    
    /**
     * Update effect settings
     * @param {string} effect - Effect name
     * @param {string} property - Property name
     * @param {number} value - New value
     */
    updateEffectSetting(effect, property, value) {
        if (this.settings[effect] && this.settings[effect][property] !== undefined) {
            this.settings[effect][property] = value;
            
            // Update shader uniforms
            switch (effect) {
                case 'scanlines':
                    if (this.scanlinePass) {
                        if (property === 'density') this.scanlinePass.uniforms.density.value = value;
                        if (property === 'opacity') this.scanlinePass.uniforms.opacity.value = value;
                    }
                    break;
                case 'pixelation':
                    if (this.pixelPass && property === 'pixelSize') {
                        this.pixelPass.uniforms.pixelSize.value = value;
                    }
                    break;
                case 'vignette':
                    if (this.vignettePass) {
                        if (property === 'offset') this.vignettePass.uniforms.offset.value = value;
                        if (property === 'darkness') this.vignettePass.uniforms.darkness.value = value;
                    }
                    break;
                case 'colorShift':
                    if (this.colorShiftPass && property === 'amount') {
                        this.colorShiftPass.uniforms.amount.value = value;
                    }
                    break;
            }
        }
    }
}

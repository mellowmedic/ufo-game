/**
 * Mini-Map / Radar System for Retro UFO Game
 * Shows positions of cows, jets, and the player
 */

class MiniMap {
    constructor(gameObjects) {
        // Game objects reference
        this.gameObjects = gameObjects;
        
        // Mini-map properties
        this.size = 150; // Size in pixels
        this.range = 200; // Range in game units
        this.scale = this.size / (this.range * 2);
        
        // Create mini-map DOM element
        this.element = document.createElement('div');
        this.element.id = 'mini-map';
        this.element.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: ${this.size}px;
            height: ${this.size}px;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid #33ff33;
            border-radius: 50%;
            overflow: hidden;
            pointer-events: none;
        `;
        
        // Create canvas for drawing
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
        `;
        this.element.appendChild(this.canvas);
        
        // Get canvas context
        this.ctx = this.canvas.getContext('2d');
        
        // Add to UI overlay
        document.getElementById('ui-overlay').appendChild(this.element);
        
        // Blip colors
        this.colors = {
            player: '#33ff33', // Green
            cow: '#ffffff',    // White
            jet: '#ff3333',    // Red
            missile: '#ff9900' // Orange
        };
        
        // Blip sizes
        this.blipSizes = {
            player: 6,
            cow: 3,
            jet: 4,
            missile: 2
        };
        
        // Radar sweep effect
        this.sweepAngle = 0;
        this.sweepSpeed = 0.03;
        
        // Blip ping effect
        this.pingEffects = [];
    }
    
    /**
     * Update the mini-map
     */
    update() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.size, this.size);
        
        // Draw background
        this.drawBackground();
        
        // Draw radar sweep
        this.drawSweep();
        
        // Draw blips for game objects
        this.drawBlips();
        
        // Draw ping effects
        this.drawPingEffects();
        
        // Update sweep angle
        this.sweepAngle = (this.sweepAngle + this.sweepSpeed) % (Math.PI * 2);
    }
    
    /**
     * Draw the mini-map background
     */
    drawBackground() {
        // Draw circular background
        this.ctx.beginPath();
        this.ctx.arc(this.size / 2, this.size / 2, this.size / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 20, 0, 0.7)';
        this.ctx.fill();
        
        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(51, 255, 51, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Draw concentric circles
        for (let r = this.range / 4; r <= this.range; r += this.range / 4) {
            this.ctx.beginPath();
            this.ctx.arc(
                this.size / 2, 
                this.size / 2, 
                r * this.scale, 
                0, 
                Math.PI * 2
            );
            this.ctx.stroke();
        }
        
        // Draw crosshairs
        this.ctx.beginPath();
        this.ctx.moveTo(this.size / 2, 0);
        this.ctx.lineTo(this.size / 2, this.size);
        this.ctx.moveTo(0, this.size / 2);
        this.ctx.lineTo(this.size, this.size / 2);
        this.ctx.stroke();
    }
    
    /**
     * Draw the radar sweep effect
     */
    drawSweep() {
        // Create gradient for sweep
        const gradient = this.ctx.createConicalGradient(
            this.size / 2, 
            this.size / 2, 
            this.sweepAngle, 
            this.sweepAngle + Math.PI / 4
        );
        
        gradient.addColorStop(0, 'rgba(51, 255, 51, 0.5)');
        gradient.addColorStop(1, 'rgba(51, 255, 51, 0)');
        
        // Draw sweep
        this.ctx.beginPath();
        this.ctx.moveTo(this.size / 2, this.size / 2);
        this.ctx.arc(
            this.size / 2, 
            this.size / 2, 
            this.size / 2, 
            this.sweepAngle, 
            this.sweepAngle + Math.PI / 4
        );
        this.ctx.closePath();
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
    }
    
    /**
     * Draw blips for game objects
     */
    drawBlips() {
        // Get player position
        const playerPos = this.gameObjects.ufo.position;
        
        // Draw player blip (always in center)
        this.drawBlip(
            this.size / 2, 
            this.size / 2, 
            this.colors.player, 
            this.blipSizes.player
        );
        
        // Draw cow blips
        this.gameObjects.cows.forEach(cow => {
            this.drawObjectBlip(cow.position, playerPos, this.colors.cow, this.blipSizes.cow);
        });
        
        // Draw jet blips
        this.gameObjects.jets.forEach(jet => {
            this.drawObjectBlip(jet.position, playerPos, this.colors.jet, this.blipSizes.jet);
            
            // Add ping effect when jet is within sweep angle
            const angle = Math.atan2(
                jet.position.z - playerPos.z,
                jet.position.x - playerPos.x
            );
            
            const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
            const normalizedSweepAngle = (this.sweepAngle + Math.PI * 2) % (Math.PI * 2);
            
            if (Math.abs(normalizedAngle - normalizedSweepAngle) < 0.1) {
                const mapX = this.size / 2 + (jet.position.x - playerPos.x) * this.scale;
                const mapY = this.size / 2 + (jet.position.z - playerPos.z) * this.scale;
                
                if (this.isInMapBounds(mapX, mapY)) {
                    this.addPingEffect(mapX, mapY, this.colors.jet);
                }
            }
        });
        
        // Draw missile blips
        this.gameObjects.missiles.forEach(missile => {
            this.drawObjectBlip(missile.position, playerPos, this.colors.missile, this.blipSizes.missile);
        });
    }
    
    /**
     * Draw a blip for a game object
     * @param {THREE.Vector3} objectPos - Object position
     * @param {THREE.Vector3} playerPos - Player position
     * @param {string} color - Blip color
     * @param {number} size - Blip size
     */
    drawObjectBlip(objectPos, playerPos, color, size) {
        // Calculate position on mini-map
        const mapX = this.size / 2 + (objectPos.x - playerPos.x) * this.scale;
        const mapY = this.size / 2 + (objectPos.z - playerPos.z) * this.scale;
        
        // Only draw if within map bounds
        if (this.isInMapBounds(mapX, mapY)) {
            this.drawBlip(mapX, mapY, color, size);
        }
    }
    
    /**
     * Draw a blip at the specified position
     * @param {number} x - X position on canvas
     * @param {number} y - Y position on canvas
     * @param {string} color - Blip color
     * @param {number} size - Blip size
     */
    drawBlip(x, y, color, size) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }
    
    /**
     * Check if a point is within the circular mini-map bounds
     * @param {number} x - X position on canvas
     * @param {number} y - Y position on canvas
     * @returns {boolean} True if the point is within bounds
     */
    isInMapBounds(x, y) {
        const dx = x - this.size / 2;
        const dy = y - this.size / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.size / 2;
    }
    
    /**
     * Add a ping effect at the specified position
     * @param {number} x - X position on canvas
     * @param {number} y - Y position on canvas
     * @param {string} color - Ping color
     */
    addPingEffect(x, y, color) {
        this.pingEffects.push({
            x: x,
            y: y,
            color: color,
            radius: 2,
            maxRadius: 15,
            alpha: 1.0
        });
    }
    
    /**
     * Draw and update ping effects
     */
    drawPingEffects() {
        for (let i = this.pingEffects.length - 1; i >= 0; i--) {
            const ping = this.pingEffects[i];
            
            // Draw ping
            this.ctx.beginPath();
            this.ctx.arc(ping.x, ping.y, ping.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${ping.color}${Math.floor(ping.alpha * 255).toString(16).padStart(2, '0')}`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Update ping
            ping.radius += 0.5;
            ping.alpha -= 0.05;
            
            // Remove ping if it's faded out
            if (ping.alpha <= 0 || ping.radius >= ping.maxRadius) {
                this.pingEffects.splice(i, 1);
            }
        }
    }
    
    /**
     * Show the mini-map
     */
    show() {
        this.element.style.display = 'block';
    }
    
    /**
     * Hide the mini-map
     */
    hide() {
        this.element.style.display = 'none';
    }
    
    /**
     * Set the mini-map size
     * @param {number} size - Size in pixels
     */
    setSize(size) {
        this.size = size;
        this.scale = this.size / (this.range * 2);
        
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;
        
        this.canvas.width = this.size;
        this.canvas.height = this.size;
    }
    
    /**
     * Set the mini-map range
     * @param {number} range - Range in game units
     */
    setRange(range) {
        this.range = range;
        this.scale = this.size / (this.range * 2);
    }
}

// Polyfill for conical gradient if not supported
if (!CanvasRenderingContext2D.prototype.createConicalGradient) {
    CanvasRenderingContext2D.prototype.createConicalGradient = function(x, y, startAngle, endAngle) {
        const gradient = {
            x: x,
            y: y,
            startAngle: startAngle,
            endAngle: endAngle,
            colorStops: [],
            
            addColorStop: function(offset, color) {
                this.colorStops.push({
                    offset: offset,
                    color: color
                });
                return this;
            }
        };
        
        return gradient;
    };
    
    // Save original fill method
    const originalFill = CanvasRenderingContext2D.prototype.fill;
    
    // Override fill method to handle conical gradients
    CanvasRenderingContext2D.prototype.fill = function(...args) {
        if (this.fillStyle && typeof this.fillStyle === 'object' && 
            this.fillStyle.startAngle !== undefined) {
            
            const gradient = this.fillStyle;
            const centerX = gradient.x;
            const centerY = gradient.y;
            const startAngle = gradient.startAngle;
            const endAngle = gradient.endAngle;
            
            // Save current state
            this.save();
            
            // Create clipping region
            this.clip();
            
            // Draw gradient
            const angleRange = endAngle - startAngle;
            const steps = 60; // Number of segments to draw
            
            for (let i = 0; i < steps; i++) {
                const angle1 = startAngle + (i / steps) * angleRange;
                const angle2 = startAngle + ((i + 1) / steps) * angleRange;
                
                const x1 = centerX + Math.cos(angle1) * 1000;
                const y1 = centerY + Math.sin(angle1) * 1000;
                const x2 = centerX + Math.cos(angle2) * 1000;
                const y2 = centerY + Math.sin(angle2) * 1000;
                
                // Calculate color for this segment
                const offset = i / steps;
                let color = gradient.colorStops[0].color;
                
                for (let j = 0; j < gradient.colorStops.length - 1; j++) {
                    const stop1 = gradient.colorStops[j];
                    const stop2 = gradient.colorStops[j + 1];
                    
                    if (offset >= stop1.offset && offset <= stop2.offset) {
                        const t = (offset - stop1.offset) / (stop2.offset - stop1.offset);
                        color = this.interpolateColor(stop1.color, stop2.color, t);
                        break;
                    }
                }
                
                // Draw segment
                this.beginPath();
                this.moveTo(centerX, centerY);
                this.lineTo(x1, y1);
                this.lineTo(x2, y2);
                this.closePath();
                this.fillStyle = color;
                originalFill.apply(this, args);
            }
            
            // Restore state
            this.restore();
        } else {
            // Use original fill for non-conical gradients
            originalFill.apply(this, args);
        }
    };
    
    // Helper method to interpolate between colors
    CanvasRenderingContext2D.prototype.interpolateColor = function(color1, color2, t) {
        // Parse colors
        const parseColor = (color) => {
            if (color.startsWith('rgba')) {
                const parts = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                return {
                    r: parseInt(parts[1]),
                    g: parseInt(parts[2]),
                    b: parseInt(parts[3]),
                    a: parseFloat(parts[4])
                };
            } else if (color.startsWith('rgb')) {
                const parts = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                return {
                    r: parseInt(parts[1]),
                    g: parseInt(parts[2]),
                    b: parseInt(parts[3]),
                    a: 1
                };
            } else {
                // Handle hex colors
                let hex = color.replace('#', '');
                if (hex.length === 3) {
                    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                }
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16),
                    a: 1
                };
            }
        };
        
        const c1 = parseColor(color1);
        const c2 = parseColor(color2);
        
        // Interpolate
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        const a = c1.a + (c2.a - c1.a) * t;
        
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    };
}
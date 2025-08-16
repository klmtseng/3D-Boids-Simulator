

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- VECTOR CLASS (3D) ---
class Vector {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static random3D() {
        const angle = Math.random() * Math.PI * 2;
        const vz = Math.random() * 2 - 1;
        const vz_p = Math.sqrt(1 - vz*vz);
        const vx = vz_p * Math.cos(angle);
        const vy = vz_p * Math.sin(angle);
        return new Vector(vx, vy, vz);
    }

    add(v: Vector) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }
    
    sub(v: Vector) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
    }

    mult(n: number) {
        this.x *= n;
        this.y *= n;
        this.z *= n;
    }

    div(n: number) {
        this.x /= n;
        this.y /= n;
        this.z /= n;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    magSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    
    normalize() {
        const m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
    }

    limit(max: number) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
    }

    static sub(v1: Vector, v2: Vector): Vector {
        return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }
}

// --- CAMERA CLASS ---
class Camera {
    target: Vector = new Vector(0, 0, 0);
    distance: number = 700;
    azimuth: number = -Math.PI / 4; // Horizontal angle
    elevation: number = Math.PI / 6;  // Vertical angle
    focalLength: number = 300;

    isChaseMode: boolean = false;
    showGrid: boolean = true;
    showWind: boolean = false;

    update(flock: Boid[]) {
        if (this.isChaseMode && flock.length > 0) {
            const centerOfMass = new Vector();
            for (const boid of flock) {
                centerOfMass.add(boid.position);
            }
            centerOfMass.div(flock.length);
            // Smoothly move target towards center of mass (LERP)
            const delta = Vector.sub(centerOfMass, this.target);
            delta.mult(0.05);
            this.target.add(delta);
        }
    }

    project(point: Vector, canvasWidth: number, canvasHeight: number) {
        // 1. Translate world point relative to camera target
        const p = Vector.sub(point, this.target);

        // 2. Rotate around Y axis (azimuth) and X axis (elevation)
        const cosAz = Math.cos(-this.azimuth);
        const sinAz = Math.sin(-this.azimuth);
        const cosEl = Math.cos(-this.elevation);
        const sinEl = Math.sin(-this.elevation);

        const x1 = p.x * cosAz - p.z * sinAz;
        const z1 = p.x * sinAz + p.z * cosAz;

        const y2 = p.y * cosEl - z1 * sinEl;
        const z2 = p.y * sinEl + z1 * cosEl;
        
        // 3. Apply distance (zoom)
        const z3 = z2 - this.distance;

        // 4. Perspective Projection
        if (z3 >= -this.focalLength) {
            return null; // Point is behind or at the camera plane, clip it
        }
        const scale = this.focalLength / -z3;
        const sx = x1 * scale + canvasWidth / 2;
        const sy = y2 * scale + canvasHeight / 2;

        return { sx, sy, scale, depth: z3 };
    }

    getPosition(): Vector {
        const x = this.target.x - this.distance * Math.sin(this.azimuth) * Math.cos(this.elevation);
        const y = this.target.y - this.distance * Math.sin(this.elevation);
        const z = this.target.z - this.distance * Math.cos(this.azimuth) * Math.cos(this.elevation);
        return new Vector(x,y,z);
    }
}


// --- BOID CLASS (3D) ---
class Boid {
    position: Vector;
    velocity: Vector;
    acceleration: Vector;
    maxForce: number;
    maxSpeed: number;
    perceptionRadius: number;

    constructor(width: number, height: number, depth: number) {
        this.position = new Vector(
            Math.random() * width - width / 2, 
            Math.random() * height - height / 2, 
            Math.random() * depth - depth / 2
        );
        this.velocity = Vector.random3D();
        this.velocity.mult(Math.random() * 2 + 2);
        this.acceleration = new Vector();
        this.maxForce = 0.2;
        this.maxSpeed = 4;
        this.perceptionRadius = 50;
    }

    private applyForce(force: Vector) {
        this.acceleration.add(force);
    }

    private seek(target: Vector): Vector {
        const desired = Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxSpeed);
        const steer = Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }
    
    private separation(boids: Boid[], separationFactor: number): Vector {
        const steering = new Vector();
        let total = 0;
        for (const other of boids) {
            const d = Vector.sub(this.position, other.position).mag();
            if (other !== this && d < this.perceptionRadius) {
                const diff = Vector.sub(this.position, other.position);
                diff.div(d * d); // Weight by distance
                steering.add(diff);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.normalize();
            steering.mult(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        steering.mult(separationFactor);
        return steering;
    }
    
    private alignment(boids: Boid[], alignmentFactor: number): Vector {
        const steering = new Vector();
        let total = 0;
        for (const other of boids) {
            const d = Vector.sub(this.position, other.position).mag();
            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.velocity);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            steering.normalize();
            steering.mult(this.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(this.maxForce);
        }
        steering.mult(alignmentFactor);
        return steering;
    }

    private cohesion(boids: Boid[], cohesionFactor: number): Vector {
        const steering = new Vector();
        let total = 0;
        for (const other of boids) {
            const d = Vector.sub(this.position, other.position).mag();
            if (other !== this && d < this.perceptionRadius) {
                steering.add(other.position);
                total++;
            }
        }
        if (total > 0) {
            steering.div(total);
            const force = this.seek(steering);
            force.mult(cohesionFactor);
            return force;
        }
        return new Vector();
    }

    private follow(wind: Vector, strength: number): Vector {
        const desired = new Vector(wind.x, wind.y, wind.z);
        desired.mult(this.maxSpeed);
        const steer = Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        steer.mult(strength);
        return steer;
    }
    
    flock(boids: Boid[], factors: { perceptionRadius: number; separation: number; alignment: number; cohesion: number; windStrength: number; }, repelPoint: Vector | null, wind: Vector) {
        this.perceptionRadius = factors.perceptionRadius;
        const separationForce = this.separation(boids, factors.separation);
        const alignmentForce = this.alignment(boids, factors.alignment);
        const cohesionForce = this.cohesion(boids, factors.cohesion);
        const followForce = this.follow(wind, factors.windStrength);

        this.applyForce(separationForce);
        this.applyForce(alignmentForce);
        this.applyForce(cohesionForce);
        this.applyForce(followForce);

        if (repelPoint) {
            const d = Vector.sub(this.position, repelPoint).mag();
            if (d < 150) { // Only repel if close
                const repelForce = this.seek(repelPoint);
                repelForce.mult(-2.5); // Negative seek is flee
                this.applyForce(repelForce);
            }
        }
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.acceleration.mult(0);
    }
    
    boundaries(width: number, height: number, depth: number) {
        const d = 80; // Distance from edge to start turning
        const steer = new Vector();
        const halfW = width / 2;
        const halfH = height / 2;
        const halfD = depth / 2;

        if (this.position.x < -halfW + d) {
            steer.x = this.maxSpeed;
        } else if (this.position.x > halfW - d) {
            steer.x = -this.maxSpeed;
        }

        if (this.position.y < -halfH + d) {
            steer.y = this.maxSpeed;
        } else if (this.position.y > halfH - d) {
            steer.y = -this.maxSpeed;
        }

        if (this.position.z < -halfD + d) {
            steer.z = this.maxSpeed;
        } else if (this.position.z > halfD - d) {
            steer.z = -this.maxSpeed;
        }

        if (steer.mag() > 0) {
            steer.normalize();
            steer.mult(this.maxSpeed);
            steer.sub(this.velocity);
            steer.limit(this.maxForce * 1.5); // This force is strong
            this.applyForce(steer);
        }
    }

    draw(ctx: CanvasRenderingContext2D, camera: Camera) {
        const proj = camera.project(this.position, ctx.canvas.width, ctx.canvas.height);
        if (!proj) return;

        const { sx, sy, scale } = proj;

        const size = Math.max(0.5, 4 * scale);
        const opacity = Math.max(0.1, Math.min(1, scale * 1.2));

        // Project a point ahead for rotation
        const lookAhead = new Vector(this.velocity.x, this.velocity.y, this.velocity.z);
        lookAhead.normalize();
        lookAhead.mult(10);
        lookAhead.add(this.position);
        const projAhead = camera.project(lookAhead, ctx.canvas.width, ctx.canvas.height);
        
        let angle = 0;
        if(projAhead) {
            angle = Math.atan2(projAhead.sy - sy, projAhead.sx - sx);
        }
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.beginPath();
        const triSize = size * 2;
        ctx.moveTo(triSize * 0.5, 0);
        ctx.lineTo(-triSize * 0.5, -triSize * 0.3);
        ctx.lineTo(-triSize * 0.5, triSize * 0.3);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 229, 255, ${opacity})`;
        ctx.fill();
        ctx.restore();
    }
}

// --- SIMULATION SETUP ---
const canvas = document.getElementById('simulationCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const camera = new Camera();
let flock: Boid[] = [];
const simulationParams = {
    boidCount: 200,
    perceptionRadius: 50,
    alignment: 1.0,
    cohesion: 1.0,
    separation: 1.5,
    windStrength: 0.5,
    automaticWind: true,
    windAzimuth: 0,
    windElevation: 0,
};

let simWidth: number, simHeight: number, simDepth: number;
let wind = new Vector(1, 0, 0);
let time = 0;

let repelPoint: Vector | null = null;
let repelTimeout: number | null = null;

function setup() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    simWidth = canvas.width;
    simHeight = canvas.height;
    simDepth = 500;
    
    flock = [];
    for (let i = 0; i < simulationParams.boidCount; i++) {
        flock.push(new Boid(simWidth, simHeight, simDepth));
    }
}

function updateFlockSize() {
    const diff = simulationParams.boidCount - flock.length;
    if (diff > 0) {
        for (let i = 0; i < diff; i++) {
            flock.push(new Boid(simWidth, simHeight, simDepth));
        }
    } else {
        flock.splice(0, -diff);
    }
}

function drawLine3D(ctx: CanvasRenderingContext2D, camera: Camera, v1: Vector, v2: Vector) {
    const p1 = camera.project(v1, canvas.width, canvas.height);
    const p2 = camera.project(v2, canvas.width, canvas.height);
    if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
    }
}

function drawArrow3D(ctx: CanvasRenderingContext2D, camera: Camera, v1: Vector, v2: Vector) {
    const p1 = camera.project(v1, canvas.width, canvas.height);
    const p2 = camera.project(v2, canvas.width, canvas.height);

    if (!p1 || !p2 || Math.hypot(p2.sx-p1.sx, p2.sy-p1.sy) < 1) {
        return;
    }

    ctx.beginPath();
    
    // Main line
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);

    // Arrowhead
    const headlen = Math.min(8, 8 * p2.scale); // Make arrowhead scale, but not too big
    const angle = Math.atan2(p2.sy - p1.sy, p2.sx - p1.sx);
    
    ctx.lineTo(p2.sx - headlen * Math.cos(angle - Math.PI / 6), p2.sy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(p2.sx, p2.sy);
    ctx.lineTo(p2.sx - headlen * Math.cos(angle + Math.PI / 6), p2.sy - headlen * Math.sin(angle + Math.PI / 6));

    ctx.stroke();
}

function drawAllGrids(ctx: CanvasRenderingContext2D, camera: Camera) {
    const divisions = 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    const halfW = simWidth / 2, halfH = simHeight / 2, halfD = simDepth / 2;
    const stepW = simWidth / divisions, stepH = simHeight / divisions, stepD = simDepth / divisions;

    // Grid 1: Bottom Plane (XZ at y = halfH)
    for (let i = 0; i <= divisions; i++) {
        const wPos = -halfW + i * stepW;
        const dPos = -halfD + i * stepD;
        drawLine3D(ctx, camera, new Vector(wPos, halfH, -halfD), new Vector(wPos, halfH, halfD));
        drawLine3D(ctx, camera, new Vector(-halfW, halfH, dPos), new Vector(halfW, halfH, dPos));
    }

    // Grid 2: Back Plane (XY at z = -halfD)
    for (let i = 0; i <= divisions; i++) {
        const wPos = -halfW + i * stepW;
        const hPos = -halfH + i * stepH;
        drawLine3D(ctx, camera, new Vector(wPos, -halfH, -halfD), new Vector(wPos, halfH, -halfD));
        drawLine3D(ctx, camera, new Vector(-halfW, hPos, -halfD), new Vector(halfW, hPos, -halfD));
    }

     // Grid 3: Left Plane (YZ at x = -halfW)
     for (let i = 0; i <= divisions; i++) {
        const hPos = -halfH + i * stepH;
        const dPos = -halfD + i * stepD;
        drawLine3D(ctx, camera, new Vector(-halfW, -halfH, dPos), new Vector(-halfW, halfH, dPos));
        drawLine3D(ctx, camera, new Vector(-halfW, hPos, -halfD), new Vector(-halfW, hPos, halfD));
    }
}

function drawWindField(ctx: CanvasRenderingContext2D, camera: Camera, wind: Vector) {
    const spacing = 120;
    const lineLength = 20;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    for (let x = -simWidth / 2; x <= simWidth / 2; x += spacing) {
        for (let y = -simHeight / 2; y <= simHeight / 2; y += spacing) {
            for (let z = -simDepth / 2; z <= simDepth / 2; z += spacing) {
                const start = new Vector(x, y, z);
                const end = new Vector(
                    x + wind.x * lineLength,
                    y + wind.y * lineLength,
                    z + wind.z * lineLength
                );
                drawArrow3D(ctx, camera, start, end);
            }
        }
    }
}


function animate() {
    camera.update(flock);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (simulationParams.automaticWind) {
        // Update wind direction over time for a dynamic flow
        time += 0.005;
        wind.x = Math.cos(time);
        wind.y = Math.sin(time * 0.7);
        wind.z = Math.sin(time * 0.3);
    } else {
        // Calculate wind from manual controls (degrees to radians)
        const az = simulationParams.windAzimuth * Math.PI / 180;
        const el = simulationParams.windElevation * Math.PI / 180;
        wind.x = Math.cos(el) * Math.cos(az);
        wind.y = Math.sin(el);
        wind.z = Math.cos(el) * Math.sin(az);
    }
    wind.normalize();
    
    if (camera.showGrid) {
        drawAllGrids(ctx, camera);
    }
    
    if (camera.showWind) {
        drawWindField(ctx, camera, wind);
    }

    const camPos = camera.getPosition();
    flock.sort((a, b) => 
        Vector.sub(b.position, camPos).magSq() - Vector.sub(a.position, camPos).magSq()
    );

    for(const boid of flock) {
        boid.boundaries(simWidth, simHeight, simDepth);
        boid.flock(flock, simulationParams, repelPoint, wind);
        boid.update();
        boid.draw(ctx, camera);
    }

    requestAnimationFrame(animate);
}

// --- UI & EVENT LISTENERS ---
function setupControls() {
    const controls: Record<string, string> = {
        'boidCount': 'boidCountValue',
        'perceptionRadius': 'perceptionRadiusValue',
        'alignment': 'alignmentValue',
        'cohesion': 'cohesionValue',
        'separation': 'separationValue',
        'windStrength': 'windStrengthValue',
    };

    for (const param in controls) {
        const slider = document.getElementById(param) as HTMLInputElement;
        const valueSpan = document.getElementById(controls[param]) as HTMLSpanElement;

        slider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            (simulationParams as any)[param] = value;
            valueSpan.textContent = value.toFixed(param === 'boidCount' ? 0 : 1);
            if (param === 'boidCount') {
                updateFlockSize();
            }
        });
    }

    const chaseModeCheckbox = document.getElementById('chaseMode') as HTMLInputElement;
    chaseModeCheckbox.addEventListener('change', (e) => {
        camera.isChaseMode = (e.target as HTMLInputElement).checked;
    });

    const showGridCheckbox = document.getElementById('showGrid') as HTMLInputElement;
    showGridCheckbox.addEventListener('change', (e) => {
        camera.showGrid = (e.target as HTMLInputElement).checked;
    });

    const showWindCheckbox = document.getElementById('showWind') as HTMLInputElement;
    showWindCheckbox.addEventListener('change', (e) => {
        camera.showWind = (e.target as HTMLInputElement).checked;
    });

    // Wind Controls
    const automaticWindCheckbox = document.getElementById('automaticWind') as HTMLInputElement;
    const manualWindControls = document.getElementById('manualWindControls') as HTMLDivElement;
    const windAzimuthSlider = document.getElementById('windAzimuth') as HTMLInputElement;
    const windAzimuthValue = document.getElementById('windAzimuthValue') as HTMLSpanElement;
    const windElevationSlider = document.getElementById('windElevation') as HTMLInputElement;
    const windElevationValue = document.getElementById('windElevationValue') as HTMLSpanElement;

    const toggleManualWindControls = () => {
        if (simulationParams.automaticWind) {
            manualWindControls.classList.add('disabled');
        } else {
            manualWindControls.classList.remove('disabled');
        }
    };

    automaticWindCheckbox.addEventListener('change', (e) => {
        simulationParams.automaticWind = (e.target as HTMLInputElement).checked;
        toggleManualWindControls();
    });

    windAzimuthSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        simulationParams.windAzimuth = value;
        windAzimuthValue.textContent = value.toString();
    });
    
    windElevationSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        simulationParams.windElevation = value;
        windElevationValue.textContent = value.toString();
    });

    toggleManualWindControls(); // Set initial state
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    simWidth = canvas.width;
    simHeight = canvas.height;
});

let isDragging = false;
let didDrag = false;
let lastMousePos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    didDrag = false;
    lastMousePos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        didDrag = true;
        if (!camera.isChaseMode) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            
            camera.azimuth -= dx * 0.005;
            camera.elevation += dy * 0.005;
            camera.elevation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.elevation));
            
            lastMousePos = { x: e.clientX, y: e.clientY };
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!didDrag) {
        const rect = canvas.getBoundingClientRect();
        // This projection is a simplification. A true 3D click requires un-projecting.
        // For now, we project onto the z=0 plane relative to the camera's target.
        const projectedTarget = camera.project(camera.target, canvas.width, canvas.height) || {sx: canvas.width/2, sy: canvas.height/2};
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const worldX = camera.target.x + (clickX - projectedTarget.sx);
        const worldY = camera.target.y + (clickY - projectedTarget.sy);
        
        repelPoint = new Vector(worldX, worldY, camera.target.z);
        
        if (repelTimeout) clearTimeout(repelTimeout);
        repelTimeout = window.setTimeout(() => {
            repelPoint = null;
        }, 2000);
    }
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.distance += e.deltaY * 0.5;
    camera.distance = Math.max(200, Math.min(2000, camera.distance));
}, { passive: false });


// --- INITIALIZATION ---
setup();
setupControls();
animate();
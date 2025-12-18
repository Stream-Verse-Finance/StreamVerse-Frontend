import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Internal game types
interface Entity {
  x: number;
  y: number;
  radius: number;
  color: string;
  active: boolean;
}

interface Player extends Entity {
  angle: number;
  cooldown: number;
  maxHp: number;
}

interface Enemy extends Entity {
  speed: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  type: 'crawler' | 'spitter' | 'tank';
  frame: number;
  damage: number;
}

interface Projectile extends Entity {
  vx: number;
  vy: number;
  isSpecial?: boolean; // For market items
}

interface Turret extends Entity {
    range: number;
    fireCooldown: number;
    maxCooldown: number;
}

interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  type: 'blood' | 'spark' | 'smoke' | 'shell';
}

interface Splatter {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  type: 'stain' | 'puddle';
}

export interface GameRef {
  spawnEnemy: (isBoss?: boolean, count?: number, x?: number, y?: number) => void;
  healPlayer: (amount: number) => void;
  upgradeWeapon: () => void;
  triggerEffect: (effectId: string, x?: number, y?: number) => void;
}

interface GameCanvasProps {
  role: 'STREAMER' | 'VIEWER';
  onHealthChange: (hp: number) => void;
  onScoreChange: (score: number) => void;
  onGameOver: () => void;
  isTargeting?: boolean; // New prop to indicate viewer is selecting location
  onLocationSelect?: (x: number, y: number) => void; // Callback for location selection
}

const GameCanvas = forwardRef<GameRef, GameCanvasProps>(({ role, onHealthChange, onScoreChange, onGameOver, isTargeting, onLocationSelect }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Input State
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef({ x: 0, y: 0, down: false });

  // Game State Refs
  const gameState = useRef({
    player: { x: 400, y: 300, radius: 14, color: '#10b981', angle: 0, active: true, cooldown: 0, maxHp: 100 } as Player,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    turrets: [] as Turret[],
    particles: [] as Particle[],
    splatters: [] as Splatter[], // Permanent blood stains
    score: 0,
    health: 100,
    weaponLevel: 1,
    lastTime: 0,
    cameraShake: 0,
    flash: 0, // White screen flash
    freezeTimer: 0, // Enemies frozen
    playerStatus: {
        slowTimer: 0,
        freezeTimer: 0,
        shieldTimer: 0, // Invincible
        speedTimer: 0, // Fast
        invertTimer: 0, // Confused controls
        darknessTimer: 0 // Blind
    }
  });

  useImperativeHandle(ref, () => ({
    spawnEnemy: (isBoss = false, count = 1, targetX, targetY) => {
       for(let i=0; i<count; i++) spawnEnemyImpl(isBoss, targetX, targetY);
    },
    healPlayer: (amount) => {
      gameState.current.health = Math.min(gameState.current.player.maxHp, gameState.current.health + amount);
      onHealthChange(gameState.current.health);
      const { x, y } = gameState.current.player;
      createParticles(x, y, '#3b82f6', 20, 'spark');
    },
    upgradeWeapon: () => {
      gameState.current.weaponLevel = Math.min(5, gameState.current.weaponLevel + 1);
      const { x, y } = gameState.current.player;
      createParticles(x, y, '#f59e0b', 30, 'spark');
    },
    triggerEffect: (effectId, x, y) => {
      const state = gameState.current;
      const targetX = x || state.player.x;
      const targetY = y || state.player.y;

      if (effectId === 'EXPLOSION') {
        createParticles(targetX, targetY, '#f59e0b', 50, 'spark');
        state.cameraShake = 20;

        // Kill enemies near explosion
        state.enemies.forEach(e => {
            const dist = Math.hypot(e.x - targetX, e.y - targetY);
            if (dist < 200) {
                if (!e.isBoss) e.hp = 0;
                else e.hp -= 50;
            }
        });
      } else if (effectId === 'NUKE') {
          state.flash = 20;
          state.cameraShake = 40;
          state.enemies.forEach(e => {
              e.hp = 0;
              createParticles(e.x, e.y, '#f97316', 10, 'smoke');
          });
      } else if (effectId === 'FREEZE') {
        state.freezeTimer = 300; // 5 seconds at 60fps
      } else if (effectId === 'BOSS_ACID') {
        spawnEnemyImpl(true, targetX, targetY);
      } else if (effectId === 'SWARM') {
        for(let i=0; i<20; i++) {
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;
            spawnEnemyImpl(false, targetX + offsetX, targetY + offsetY);
        }
      } else if (effectId === 'SLOW_PLAYER') {
          state.playerStatus.slowTimer = 300; // 5 seconds slow
          createParticles(state.player.x, state.player.y, '#9333ea', 20, 'smoke');
      } else if (effectId === 'FREEZE_PLAYER') {
          state.playerStatus.freezeTimer = 120; // 2 seconds freeze (dangerous)
          createParticles(state.player.x, state.player.y, '#06b6d4', 20, 'spark');
      } else if (effectId === 'SPAWN_TURRET') {
          state.turrets.push({
              x: targetX,
              y: targetY,
              radius: 12,
              color: '#14b8a6',
              active: true,
              range: 200,
              fireCooldown: 0,
              maxCooldown: 30 // Fire every 0.5s
          });
          createParticles(targetX, targetY, '#14b8a6', 15, 'spark');
      } else if (effectId === 'SHIELD') {
          state.playerStatus.shieldTimer = 480; // 8 seconds
          createParticles(state.player.x, state.player.y, '#3b82f6', 20, 'spark');
      } else if (effectId === 'SPEED_BOOST') {
          state.playerStatus.speedTimer = 600; // 10 seconds
          createParticles(state.player.x, state.player.y, '#eab308', 20, 'spark');
      } else if (effectId === 'INVERT_CONTROLS') {
          state.playerStatus.invertTimer = 300; // 5 seconds
      } else if (effectId === 'DARKNESS') {
          state.playerStatus.darknessTimer = 300; // 5 seconds
      }
    }
  }));

  const spawnEnemyImpl = (isBoss: boolean, targetX?: number, targetY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let x, y;
    
    if (targetX !== undefined && targetY !== undefined) {
        // Use targeted location but ensure some randomness/offset so they don't stack perfectly
        x = targetX + (Math.random() - 0.5) * 20;
        y = targetY + (Math.random() - 0.5) * 20;
        
        // Visual cue for spawn portal
        createParticles(x, y, '#8b5cf6', 10, 'spark');
    } else {
        // Spawn away from player
        const player = gameState.current.player;
        const padding = 50; 
        let dist;
        do {
          x = padding + Math.random() * (canvas.width - padding * 2);
          y = padding + Math.random() * (canvas.height - padding * 2);
          dist = Math.hypot(x - player.x, y - player.y);
        } while (dist < 300); 
    }

    // Determine type
    const rand = Math.random();
    let type: 'crawler' | 'spitter' | 'tank' = 'crawler';
    let color = '#39ff14'; // Acid Green
    let hp = 3;
    let speed = 2.0;

    if (isBoss) {
       type = 'tank';
       color = '#ef4444'; // Red Boss
       hp = 200;
       speed = 1.2;
    } else {
      if (rand > 0.8) {
         type = 'tank'; // Yellow big bug
         color = '#eab308';
         hp = 10;
         speed = 1.5;
      } else if (rand > 0.6) {
        type = 'spitter'; // Fast green
        color = '#22c55e';
        hp = 2;
        speed = 3.5;
      }
    }

    gameState.current.enemies.push({
      x,
      y,
      radius: isBoss ? 35 : (type === 'tank' ? 20 : 12),
      color,
      active: true,
      speed: speed + (Math.random() * 0.5),
      hp,
      maxHp: hp,
      isBoss,
      type,
      frame: Math.random() * 10,
      damage: isBoss ? 20 : (type === 'tank' ? 10 : 5)
    });
  };

  const createParticles = (x: number, y: number, color: string, count: number, type: 'blood' | 'spark' | 'smoke' | 'shell') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (type === 'blood' ? 4 : 8);
      gameState.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * (type === 'blood' ? 3 : 2),
        color: color,
        life: 1.0,
        active: true,
        type
      });
    }
  };

  const createSplatter = (x: number, y: number, color: string) => {
    // Add multiple irregular circles to form a splatter
    const count = 3 + Math.floor(Math.random() * 5);
    for(let i=0; i<count; i++) {
        gameState.current.splatters.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          radius: 5 + Math.random() * 15,
          color: color,
          alpha: 0.7 + Math.random() * 0.3,
          type: Math.random() > 0.8 ? 'puddle' : 'stain'
        });
    }
    // Limit splatters for performance
    if (gameState.current.splatters.length > 300) {
        gameState.current.splatters = gameState.current.splatters.slice(50);
    }
  };

  const update = (dt: number) => {
    const state = gameState.current;
    const canvas = canvasRef.current;
    if (!canvas || !state.player.active) return;
    
    // Decrement Timers
    if (state.freezeTimer > 0) state.freezeTimer--;
    if (state.flash > 0) state.flash--;
    
    // Status Timers
    if (state.playerStatus.slowTimer > 0) state.playerStatus.slowTimer--;
    if (state.playerStatus.freezeTimer > 0) state.playerStatus.freezeTimer--;
    if (state.playerStatus.shieldTimer > 0) state.playerStatus.shieldTimer--;
    if (state.playerStatus.speedTimer > 0) state.playerStatus.speedTimer--;
    if (state.playerStatus.invertTimer > 0) state.playerStatus.invertTimer--;
    if (state.playerStatus.darknessTimer > 0) state.playerStatus.darknessTimer--;

    // Wall boundaries (Visual margin)
    const margin = 30;

    // Player Movement logic
    let speed = 4;
    
    // Apply Effects to Speed
    if (state.playerStatus.slowTimer > 0) speed *= 0.5;
    if (state.playerStatus.speedTimer > 0) speed *= 2.0;

    let dx = 0; 
    let dy = 0;

    // Only allow movement if not frozen
    if (state.playerStatus.freezeTimer <= 0) {
        if (role === 'STREAMER') {
          // Invert Controls Logic
          const invert = state.playerStatus.invertTimer > 0 ? -1 : 1;

          if (keysRef.current['w']) dy -= speed * invert;
          if (keysRef.current['s']) dy += speed * invert;
          if (keysRef.current['a']) dx -= speed * invert;
          if (keysRef.current['d']) dx += speed * invert;
          
          const mouseDx = mouseRef.current.x - state.player.x;
          const mouseDy = mouseRef.current.y - state.player.y;
          state.player.angle = Math.atan2(mouseDy, mouseDx);
        } else {
           // Viewer BOT logic (Ignore Invert for Bot? Or make bot dumb? Let's keep bot simple)
           let nearestDist = Infinity;
           let target: Enemy | null = null;
           state.enemies.forEach(e => {
             const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
             if (d < nearestDist) { nearestDist = d; target = e; }
           });
           
           if (target) {
              state.player.angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
              const desiredDist = 180;
              if (nearestDist < desiredDist) {
                 dx -= Math.cos(state.player.angle) * speed;
                 dy -= Math.sin(state.player.angle) * speed;
              } else {
                 dx += Math.cos(state.player.angle + Math.PI/2) * speed * 0.5; // Circle strafe
                 dy += Math.sin(state.player.angle + Math.PI/2) * speed * 0.5;
              }
              mouseRef.current.down = true;
           } else {
              mouseRef.current.down = false;
           }
        }
        
        state.player.x = Math.max(margin, Math.min(canvas.width - margin, state.player.x + dx));
        state.player.y = Math.max(margin, Math.min(canvas.height - margin, state.player.y + dy));
    }

    // Shooting
    if (state.player.cooldown > 0) state.player.cooldown -= dt;
    
    // Disable shooting if frozen
    const isFrozen = state.playerStatus.freezeTimer > 0;
    const isShooting = (role === 'STREAMER' ? mouseRef.current.down : mouseRef.current.down) && !isFrozen;

    if (isShooting && state.player.cooldown <= 0) {
      const level = state.weaponLevel;
      const count = level === 1 ? 1 : (level < 4 ? 2 : 3);
      const spread = level > 2 ? 0.2 : 0.05;
      
      for(let i=0; i<count; i++) {
        const shotAngle = state.player.angle + (Math.random() - 0.5) * spread;
        state.projectiles.push({
          x: state.player.x + Math.cos(shotAngle) * 20,
          y: state.player.y + Math.sin(shotAngle) * 20,
          vx: Math.cos(shotAngle) * 15,
          vy: Math.sin(shotAngle) * 15,
          radius: 3,
          color: '#e0f2fe',
          active: true
        });
      }
      state.cameraShake = 2;
      state.player.cooldown = level >= 5 ? 5 : (15 - level * 2); 
    }

    if (state.cameraShake > 0) state.cameraShake *= 0.9;

    // Update Turrets
    state.turrets.forEach(t => {
        if (!t.active) return;
        if (t.fireCooldown > 0) t.fireCooldown -= dt;

        if (t.fireCooldown <= 0) {
            // Find closest enemy
            let closest: Enemy | null = null;
            let closestDist = t.range;

            state.enemies.forEach(e => {
                const dist = Math.hypot(e.x - t.x, e.y - t.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = e;
                }
            });

            if (closest) {
                const angle = Math.atan2((closest as Enemy).y - t.y, (closest as Enemy).x - t.x);
                state.projectiles.push({
                    x: t.x,
                    y: t.y,
                    vx: Math.cos(angle) * 12,
                    vy: Math.sin(angle) * 12,
                    radius: 3,
                    color: '#2dd4bf', // Teal shots
                    active: true,
                    isSpecial: true // Mark as turret shot maybe?
                });
                t.fireCooldown = t.maxCooldown;
            }
        }
    });

    // Update Entities
    state.projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) p.active = false;
    });

    state.enemies.forEach(e => {
      e.frame += 0.2;
      
      if (state.freezeTimer <= 0) {
        const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
      }

      // Player Collision
      const dist = Math.hypot(e.x - state.player.x, e.y - state.player.y);
      if (dist < e.radius + state.player.radius) {
        if (state.playerStatus.shieldTimer <= 0) {
            state.health -= e.damage * 0.1; // Continuous damage
            onHealthChange(state.health);
             
            // Slight pushback
            state.player.x += (state.player.x - e.x) * 0.1;
            state.player.y += (state.player.y - e.y) * 0.1;

            if (Math.random() > 0.8) createParticles(state.player.x, state.player.y, '#dc2626', 2, 'blood');
            
            if (state.health <= 0) {
              state.player.active = false;
              onGameOver();
            }
        }
      }

      // Projectile Collision
      state.projectiles.forEach(p => {
        if (!p.active) return;
        const pDist = Math.hypot(e.x - p.x, e.y - p.y);
        if (pDist < e.radius + p.radius + 5) {
          p.active = false;
          e.hp--;
          
          // Green/Yellow blood for aliens
          const bloodColor = e.color === '#ef4444' ? '#9f1239' : (e.color === '#eab308' ? '#d97706' : '#39ff14');
          createParticles(p.x, p.y, bloodColor, 3, 'blood');
          
          if (e.hp <= 0) {
            e.active = false;
            state.score += e.isBoss ? 500 : 50;
            onScoreChange(state.score);
            createParticles(e.x, e.y, bloodColor, 15, 'blood');
            createSplatter(e.x, e.y, e.isBoss ? '#4c0519' : (e.color === '#eab308' ? '#713f12' : '#14532d')); // Darker blood on floor
          }
        }
      });
    });

    state.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.85;
      p.vy *= 0.85;
      p.life -= 0.05;
      if (p.life <= 0) p.active = false;
    });

    state.enemies = state.enemies.filter(e => e.active);
    state.projectiles = state.projectiles.filter(p => p.active);
    state.particles = state.particles.filter(p => p.active);
  };

  const drawWalls = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const wallThickness = 30;
      
      // Top wall (pseudo 3D)
      ctx.fillStyle = '#1e293b'; // Side face
      ctx.fillRect(0, 0, width, wallThickness);
      ctx.fillStyle = '#334155'; // Top face
      ctx.fillRect(0, 0, width, wallThickness - 10);
      
      // Bottom wall
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, height - wallThickness, width, wallThickness);
      
      // Left Wall
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, wallThickness, height);
      
      // Right Wall
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width - wallThickness, 0, wallThickness, height);
      
      // Details on walls
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Draw lines to simulate panels
      for(let i=0; i<width; i+=100) {
          ctx.moveTo(i, 0); ctx.lineTo(i, wallThickness - 10);
      }
      ctx.stroke();
  };

  const drawFloor = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Tile Floor pattern
      const tileSize = 60;
      
      ctx.strokeStyle = '#2d3035';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for(let x=0; x<=width; x+=tileSize) {
          ctx.moveTo(x, 0); ctx.lineTo(x, height);
      }
      for(let y=0; y<=height; y+=tileSize) {
          ctx.moveTo(0, y); ctx.lineTo(width, y);
      }
      ctx.stroke();
  };

  const drawEntity = (ctx: CanvasRenderingContext2D, e: Entity & any) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 10, e.radius, e.radius * 0.4, 0, 0, Math.PI*2);
      ctx.fill();

      // Rotate body
      const angle = Math.atan2(gameState.current.player.y - e.y, gameState.current.player.x - e.x);
      ctx.rotate(angle);

      // Alien Body Drawing
      if (e.isBoss) {
        // Boss Shape
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 35, 0, 0, Math.PI*2); // Big body
        ctx.fill();
        // Head
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, -20, 15, 0, Math.PI*2);
        ctx.fill();
        // Spikes
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(40, 20);
        ctx.moveTo(-20, 0); ctx.lineTo(-40, 20);
        ctx.stroke();
      } else if (e.type === 'tank') {
        // Beetle shape
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(0,0); ctx.lineTo(-10, -20); ctx.lineTo(10, -20);
        ctx.fill();
      } else {
        // Fast bug shape (Spider-like)
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 12, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Legs
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        const legOffset = Math.sin(e.frame * 2) * 5;
        
        ctx.beginPath();
        // Left legs
        ctx.moveTo(0,0); ctx.lineTo(-15, -10 + legOffset);
        ctx.moveTo(0,5); ctx.lineTo(-15, 10 - legOffset);
        // Right legs
        ctx.moveTo(0,0); ctx.lineTo(15, -10 - legOffset);
        ctx.moveTo(0,5); ctx.lineTo(15, 10 + legOffset);
        ctx.stroke();
      }

      // Freeze effect overlay
      if (gameState.current.freezeTimer > 0) {
          ctx.fillStyle = 'rgba(103, 232, 249, 0.4)';
          ctx.fill();
      }
      
      ctx.restore();
  };

  const drawTurret = (ctx: CanvasRenderingContext2D, t: Turret) => {
      ctx.save();
      ctx.translate(t.x, t.y);

      // Base
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rotating head
      // Mock rotation based on time or just constant spin
      ctx.rotate(Date.now() / 500); 
      ctx.fillStyle = t.color;
      ctx.fillRect(-4, -8, 8, 16);
      
      // Range indicator (faint)
      ctx.beginPath();
      ctx.arc(0, 0, t.range, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const state = gameState.current;
    
    if (!canvas || !ctx) return;

    // 1. Background (Floor)
    ctx.fillStyle = '#111316'; // Very dark grey
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFloor(ctx, canvas.width, canvas.height);

    ctx.save();
    
    // Camera Shake
    if (state.cameraShake > 0.5) {
      const dx = (Math.random() - 0.5) * state.cameraShake;
      const dy = (Math.random() - 0.5) * state.cameraShake;
      ctx.translate(dx, dy);
    }

    // 2. Persistent Blood (Splatters) - Drawn on floor
    state.splatters.forEach(s => {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      // Irregular shape logic simple
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 2.5 Turrets
    state.turrets.forEach(t => drawTurret(ctx, t));

    // 3. Enemies
    state.enemies.forEach(e => drawEntity(ctx, e));

    // 4. Player
    if (state.player.active) {
      ctx.save();
      ctx.translate(state.player.x, state.player.y);
      
      // Draw status effects under player
      if (state.playerStatus.slowTimer > 0) {
          ctx.fillStyle = 'rgba(147, 51, 234, 0.3)'; // Purple sludge
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI*2);
          ctx.fill();
          ctx.strokeStyle = '#9333ea';
          ctx.stroke();
      }
      if (state.playerStatus.speedTimer > 0) {
           // Speed trail effect could go here in update but visual cue is yellow aura
           ctx.shadowBlur = 15;
           ctx.shadowColor = '#facc15';
      }

      ctx.rotate(state.player.angle);

      // Legs
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI*2);
      ctx.fill();

      // Armor
      ctx.fillStyle = '#10b981'; // Green Armor
      ctx.beginPath();
      ctx.rect(-10, -8, 20, 16);
      ctx.fill();
      
      // Helmet
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI*2);
      ctx.fill();

      // Gun (Dual machine guns or Rifle)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(5, -4, 25, 8);
      
      // Muzzle flash
      if (state.player.cooldown > 0 && state.player.cooldown > 2 && state.playerStatus.freezeTimer <= 0) {
         ctx.fillStyle = '#fef08a';
         ctx.globalAlpha = 0.8;
         ctx.beginPath();
         // Star shape flash
         const spikeLen = 30 + Math.random()*10;
         ctx.moveTo(30, 0); 
         ctx.lineTo(30 + spikeLen, 5); 
         ctx.lineTo(30 + spikeLen, -5);
         ctx.fill();
         ctx.globalAlpha = 1;
      }
      ctx.restore();
      ctx.shadowBlur = 0; // Reset shadow

      // Draw Shield Overlay
      if (state.playerStatus.shieldTimer > 0) {
          ctx.beginPath();
          ctx.arc(state.player.x, state.player.y, 30, 0, Math.PI*2);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
          ctx.fill();
      }

      // Draw freeze effect OVER player
      if (state.playerStatus.freezeTimer > 0) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan block
          ctx.fillRect(state.player.x - 15, state.player.y - 20, 30, 40);
          ctx.strokeStyle = '#22d3ee';
          ctx.strokeRect(state.player.x - 15, state.player.y - 20, 30, 40);
      }
      
      // Draw Confusion (Invert) indicator
      if (state.playerStatus.invertTimer > 0) {
          ctx.fillStyle = '#ec4899';
          ctx.font = '20px Orbitron';
          ctx.fillText('?', state.player.x - 5, state.player.y - 40);
      }
    }

    // 5. Particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 6. Projectiles
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#38bdf8';
    state.projectiles.forEach(p => {
      ctx.fillStyle = p.color || '#e0f2fe';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 7. Walls
    ctx.restore();
    drawWalls(ctx, canvas.width, canvas.height);

    // 8. Targeting Reticle (Viewer Mode)
    if (role === 'VIEWER' && isTargeting) {
        const { x, y } = mouseRef.current;
        ctx.strokeStyle = '#ef4444'; // Red targeting
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Crosshair
        ctx.moveTo(x - 20, y); ctx.lineTo(x + 20, y);
        ctx.moveTo(x, y - 20); ctx.lineTo(x, y + 20);
        // Circle
        ctx.arc(x, y, 15, 0, Math.PI*2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '12px Orbitron';
        ctx.fillText('TARGET LOCKED', x + 25, y);
    }
    
    // Darkness Effect
    if (state.playerStatus.darknessTimer > 0) {
        const grad = ctx.createRadialGradient(state.player.x, state.player.y, 50, state.player.x, state.player.y, 300);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,canvas.width, canvas.height);
    } else {
        // Vignette
        const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/3, canvas.width/2, canvas.height/2, canvas.width);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0,0,canvas.width, canvas.height);
    }
    
    // White Flash (Nuke)
    if (state.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${state.flash / 20})`;
        ctx.fillRect(0,0,canvas.width, canvas.height);
    }
  };

  const loop = (time: number) => {
    const dt = time - gameState.current.lastTime;
    const safeDt = Math.min(dt, 50); 
    gameState.current.lastTime = time;
    update(safeDt / 16.67);
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        // Keep player in bounds on resize
        gameState.current.player.x = Math.min(canvas.width-50, gameState.current.player.x);
        gameState.current.player.y = Math.min(canvas.height-50, gameState.current.player.y);
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // Input
    const handleKeyDown = (e: KeyboardEvent) => { 
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        keysRef.current[e.key.toLowerCase()] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
        keysRef.current[e.key.toLowerCase()] = false; 
    };
    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouseRef.current.x = e.clientX - rect.left;
       mouseRef.current.y = e.clientY - rect.top;
    };
    const handleMouseDown = (e: MouseEvent) => { 
        mouseRef.current.down = true;
        if (role === 'VIEWER' && isTargeting && onLocationSelect) {
            const rect = canvas.getBoundingClientRect();
            onLocationSelect(e.clientX - rect.left, e.clientY - rect.top);
        }
    };
    const handleMouseUp = () => { mouseRef.current.down = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [role, isTargeting, onLocationSelect]); // Re-bind listeners if these change

  return (
    <canvas 
        ref={canvasRef} 
        className={`block w-full h-full bg-[#111] ${role === 'STREAMER' ? 'cursor-crosshair' : (isTargeting ? 'cursor-none' : 'cursor-default')}`} 
    />
  );
});

export default GameCanvas;
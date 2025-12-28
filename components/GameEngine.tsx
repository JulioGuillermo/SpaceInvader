
import React, { useRef, useEffect } from 'react';
import { HandState, Invader, Projectile, PowerUp, PowerUpType, Particle } from '../types';
import { soundManager } from '../services/audioService';

interface Props {
    handState: HandState;
    sensitivity: number;
    isPaused: boolean;
    onScoreChange: (score: number) => void;
    onLevelUp: () => void;
    onGameOver: (score: number) => void;
    onLifeLost: () => void;
    onLifeGained: () => void;
}

const GameEngine: React.FC<Props> = ({ 
    handState, 
    sensitivity,
    isPaused, 
    onScoreChange, 
    onLevelUp, 
    onGameOver, 
    onLifeLost,
    onLifeGained
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handRef = useRef(handState);
    const sensitivityRef = useRef(sensitivity);
    const isPausedRef = useRef(isPaused);
    
    const callbacks = useRef({ onScoreChange, onLevelUp, onGameOver, onLifeLost, onLifeGained });
    useEffect(() => {
        callbacks.current = { onScoreChange, onLevelUp, onGameOver, onLifeLost, onLifeGained };
    }, [onScoreChange, onLevelUp, onGameOver, onLifeLost, onLifeGained]);

    useEffect(() => { handRef.current = handState; }, [handState]);
    useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    const state = useRef({
        playerX: 425,
        prevHandX: 0.5,
        projectiles: [] as Projectile[],
        invaders: [] as Invader[],
        particles: [] as Particle[],
        powerups: [] as PowerUp[],
        lastShotTime: 0,
        invaderDir: 1,
        frameCount: 0,
        level: 1,
        score: 0,
        weaponType: 'standard' as PowerUpType | 'standard',
        powerUpShots: 0,
        maxPowerUpShots: 1,
        shieldActive: false,
        shieldTimer: 0,
        maxShieldTimer: 600,
        stars: Array.from({ length: 100 }, () => ({
            x: Math.random() * 850,
            y: Math.random() * 1000,
            s: Math.random() * 2 + 0.5,
            sp: Math.random() * 2 + 0.5
        }))
    });

    const getWeaponBaseAmmo = (type: PowerUpType): number => {
        switch(type) {
            case 'rapid': return 150;
            case 'beam': return 100;
            case 'spread': return 40;
            case 'plasma': return 20;
            case 'nuke': return 1;
            default: return 20;
        }
    };

    const initLevel = (lvl: number) => {
        const rows = Math.min(3 + lvl, 5);
        const cols = 7; // Slightly reduced cols to fit larger ships better
        const spacingX = 105; 
        const spacingY = 85;
        const newInvaders: Invader[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let type: 'basic' | 'scout' | 'heavy' | 'commander' = 'basic';
                let color = '#0f0';
                let health = 1;
                let points = 25;
                let width = 60;
                let height = 50;

                if (r === 0) { 
                    type = 'commander'; color = '#f05'; health = 4; points = 250; 
                    width = 90; height = 65;
                }
                else if (r === 1) { 
                    type = 'heavy'; color = '#ff0'; health = 2; points = 75; 
                    width = 80; height = 55;
                }
                else if (r < 3) { 
                    type = 'scout'; color = '#0cf'; health = 1; points = 40; 
                    width = 65; height = 50;
                }
                
                newInvaders.push({
                    id: `${lvl}-${r}-${c}`,
                    x: 60 + c * spacingX,
                    y: 90 + r * spacingY,
                    width, height,
                    color, type, health, points, animFrame: Math.random() * 100
                });
            }
        }
        return newInvaders;
    };

    const drawShip = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean, type: string = 'basic') => {
        ctx.save();
        ctx.translate(x, y);
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        if (isPlayer) {
            ctx.beginPath();
            ctx.moveTo(0, -40); 
            ctx.lineTo(-10, -10);
            ctx.lineTo(-45, 25); 
            ctx.lineTo(-12, 15);
            ctx.lineTo(-10, 35); 
            ctx.lineTo(10, 35);  
            ctx.lineTo(12, 15);
            ctx.lineTo(45, 25); 
            ctx.lineTo(10, -10);
            ctx.closePath();
            ctx.stroke();
            
            ctx.globalAlpha = 0.4;
            ctx.fill();
            ctx.globalAlpha = 1;

            const flicker = 12 + Math.sin(state.current.frameCount * 0.4) * 8;
            const grad = ctx.createLinearGradient(0, 35, 0, 35 + flicker);
            grad.addColorStop(0, '#0ff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(-15, 35, 10, flicker);
            ctx.fillRect(5, 35, 10, flicker);

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(0, -2, 6, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const anim = Math.sin((state.current.frameCount * 0.12) + x) * 6;
            if (type === 'commander') {
                ctx.beginPath();
                ctx.moveTo(-35, -25); ctx.lineTo(35, -25);
                ctx.lineTo(45, 10 + anim); ctx.lineTo(0, 35); ctx.lineTo(-45, 10 - anim);
                ctx.closePath();
                ctx.stroke(); ctx.fill();
                ctx.fillStyle = '#000'; ctx.fillRect(-18, -12, 6, 6); ctx.fillRect(12, -12, 6, 6);
            } else if (type === 'heavy') {
                ctx.beginPath();
                ctx.moveTo(-40, 0); ctx.lineTo(-25, -20); ctx.lineTo(25, -20); ctx.lineTo(40, 0);
                ctx.lineTo(35, 30 + anim); ctx.lineTo(-35, 30 - anim);
                ctx.closePath();
                ctx.stroke(); ctx.globalAlpha = 0.3; ctx.fill();
            } else if (type === 'scout') {
                ctx.beginPath();
                ctx.moveTo(0, -30); ctx.lineTo(-30, 20 + anim); ctx.lineTo(0, 10); ctx.lineTo(30, 20 - anim);
                ctx.closePath();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, 25, Math.PI, 0);
                ctx.lineTo(30, 20 + anim); ctx.lineTo(15, 15); ctx.lineTo(-15, 15); ctx.lineTo(-30, 20 - anim);
                ctx.closePath();
                ctx.stroke();
            }
        }
        ctx.restore();
    };

    const drawPowerUp = (ctx: CanvasRenderingContext2D, pu: PowerUp) => {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.rotate(state.current.frameCount * 0.04);
        ctx.shadowBlur = 20;
        ctx.shadowColor = pu.color;
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = pu.color;
        
        if (pu.type === 'health') {
            ctx.beginPath();
            ctx.moveTo(-15, -5); ctx.lineTo(-5, -5); ctx.lineTo(-5, -15);
            ctx.lineTo(5, -15); ctx.lineTo(5, -5); ctx.lineTo(15, -5);
            ctx.lineTo(15, 5); ctx.lineTo(5, 5); ctx.lineTo(5, 15);
            ctx.lineTo(-5, 15); ctx.lineTo(-5, 5); ctx.lineTo(-15, 5);
            ctx.closePath();
            ctx.stroke();
        } else if (pu.type === 'shield') {
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
        } else if (pu.type === 'nuke') {
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(20, 20); ctx.lineTo(-20, 20); ctx.closePath();
            ctx.stroke();
        } else {
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const angle = (i/6)*Math.PI*2;
                ctx.lineTo(Math.cos(angle)*22, Math.sin(angle)*22);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.rotate(-state.current.frameCount * 0.04);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.label, 0, 0);
        ctx.restore();
    };

    const drawHUD = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
        const s = state.current;
        let hudY = canvasHeight - 40;
        const barWidth = 200;
        const barHeight = 10;
        const spacing = 28;

        ctx.save();
        ctx.font = 'bold 11px Orbitron';
        ctx.textBaseline = 'middle';

        // Helper for drawing bars
        const drawHBar = (label: string, ammo: number, maxAmmo: number, color: string, weaponLabel?: string) => {
            const isOvercharged = ammo > maxAmmo;
            const displayRatio = Math.min(1, ammo / maxAmmo);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.textAlign = 'left';
            ctx.fillText(label, 20, hudY);
            
            ctx.textAlign = 'right';
            const ammoDisplay = weaponLabel === 'NUKE' ? `${ammo}x` : ammo.toString();
            ctx.fillText(ammoDisplay, 20 + barWidth, hudY);

            // Container
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(20, hudY + 12, barWidth, barHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(20, hudY + 12, barWidth, barHeight);
            
            // Overcharge Glow
            if (isOvercharged) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#fff';
                ctx.fillStyle = '#fff';
                if (s.frameCount % 10 < 5) ctx.globalAlpha = 0.7;
            } else {
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.fillStyle = color;
            }

            ctx.fillRect(20, hudY + 12, barWidth * displayRatio, barHeight);
            ctx.globalAlpha = 1.0;

            if (displayRatio > 0) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(20 + barWidth * displayRatio - 2, hudY + 12, 2, barHeight);
            }

            if (isOvercharged) {
                ctx.font = 'bold 8px Orbitron';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('OVERDRIVE', 20 + barWidth/2, hudY + 17);
                ctx.font = 'bold 11px Orbitron';
            }
            
            hudY -= (barHeight + spacing + 12);
        };

        if (s.shieldTimer > 0) {
            const ratio = s.shieldTimer / s.maxShieldTimer;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0';
            ctx.fillStyle = '#ff0';
            ctx.textAlign = 'left';
            ctx.fillText('SHIELD STATUS', 20, hudY);
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(ratio * 100)}%`, 20 + barWidth, hudY);
            ctx.fillStyle = 'rgba(255,255,0,0.1)';
            ctx.fillRect(20, hudY + 12, barWidth, barHeight);
            ctx.fillStyle = '#ff0';
            ctx.fillRect(20, hudY + 12, barWidth * ratio, barHeight);
            hudY -= (barHeight + spacing + 12);
        }

        if (s.weaponType !== 'standard') {
            let color = '#0ff';
            if (s.weaponType === 'beam') color = '#f0f';
            if (s.weaponType === 'plasma') color = '#ff0';
            if (s.weaponType === 'nuke') color = '#fff';
            
            drawHBar(`WEAPON: ${s.weaponType.toUpperCase()}`, s.powerUpShots, s.maxPowerUpShots, color, s.weaponType.toUpperCase());
        }

        ctx.restore();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        let animId: number;

        const loop = () => {
            if (isPausedRef.current) {
                animId = requestAnimationFrame(loop);
                return;
            }

            const s = state.current;
            s.frameCount++;

            if (handRef.current.isActive) {
                const curH = handRef.current.x;
                const delta = curH - s.prevHandX;
                const speedMult = sensitivityRef.current * 3000;
                s.playerX += delta * speedMult;
                s.prevHandX = curH;
            }
            s.playerX = Math.max(50, Math.min(canvas.width - 50, s.playerX));

            s.stars.forEach(st => { st.y += st.sp; if (st.y > canvas.height) st.y = 0; });

            const now = Date.now();
            if (handRef.current.isFist) {
                let delay = 350;
                if (s.weaponType === 'rapid') delay = 90;
                if (s.weaponType === 'beam') delay = 60;
                if (s.weaponType === 'plasma') delay = 700;

                if (now - s.lastShotTime > delay) {
                    const color = s.weaponType === 'beam' ? '#f0f' : (s.weaponType === 'plasma' ? '#ff0' : '#0ff');
                    const shoot = (ox: number, vx: number, type: any = 'standard') => {
                        s.projectiles.push({
                            x: s.playerX + ox, y: canvas.height - 110,
                            width: type === 'plasma' ? 35 : 6, height: type === 'plasma' ? 35 : 30,
                            velocity: type === 'beam' ? -32 : -18, color,
                            owner: 'player', type, spread: vx
                        });
                    };

                    if (s.weaponType === 'spread') { shoot(-25, -2.5); shoot(0, 0); shoot(25, 2.5); }
                    else if (s.weaponType === 'plasma') { shoot(0, 0, 'plasma'); }
                    else if (s.weaponType === 'nuke') { 
                        for(let i=-4; i<=4; i++) shoot(i*8, i*1.2); 
                    }
                    else { shoot(0, 0, s.weaponType === 'beam' ? 'beam' : 'standard'); }
                    
                    soundManager.playShoot();
                    s.lastShotTime = now;

                    if (s.weaponType !== 'standard') {
                        s.powerUpShots--;
                        if (s.powerUpShots <= 0) {
                            s.weaponType = 'standard';
                        }
                    }
                }
            }

            s.projectiles.forEach(p => {
                p.y += p.velocity;
                if (p.spread) p.x += p.spread;
            });
            s.projectiles = s.projectiles.filter(p => p.y > -100 && p.y < canvas.height + 100);

            const baseMove = 0.4 + (s.level * 0.1);
            let dropRequired = false;
            s.invaders.forEach(inv => {
                inv.x += s.invaderDir * baseMove;
                // Wall check adjusted for ship width
                if (inv.x > canvas.width - inv.width - 15 || inv.x < 15) dropRequired = true;
            });
            if (dropRequired) {
                s.invaderDir *= -1;
                s.invaders.forEach(inv => inv.y += 18);
            }

            s.powerups.forEach(pu => pu.y += pu.velocity);
            s.powerups = s.powerups.filter(pu => {
                const coll = Math.abs(pu.x - s.playerX) < 50 && pu.y > canvas.height - 140;
                if (coll) {
                    soundManager.playPowerUp();
                    if (pu.type === 'health') { 
                        callbacks.current.onLifeGained(); 
                    }
                    else if (pu.type === 'shield') { s.shieldActive = true; s.shieldTimer = s.maxShieldTimer; }
                    else { 
                        const baseAmmo = getWeaponBaseAmmo(pu.type);
                        if (s.weaponType === pu.type) {
                            s.powerUpShots += baseAmmo;
                        } else {
                            s.weaponType = pu.type as any;
                            s.maxPowerUpShots = baseAmmo;
                            s.powerUpShots = baseAmmo;
                        }
                    }
                }
                return !coll && pu.y < canvas.height;
            });

            if (s.shieldTimer > 0) { s.shieldTimer--; if (s.shieldTimer === 0) s.shieldActive = false; }

            for (let i = s.projectiles.length - 1; i >= 0; i--) {
                const p = s.projectiles[i];
                if (p.owner === 'player') {
                    for (let j = s.invaders.length - 1; j >= 0; j--) {
                        const inv = s.invaders[j];
                        // Collision check using accurate width/height
                        if (p.x > inv.x && p.x < inv.x + inv.width && p.y > inv.y && p.y < inv.y + inv.height) {
                            inv.health--;
                            if (inv.health <= 0) {
                                s.score += inv.points;
                                callbacks.current.onScoreChange(inv.points);
                                soundManager.playExplosion();
                                for(let k=0; k<18; k++) s.particles.push({
                                    x: inv.x + inv.width/2, y: inv.y + inv.height/2,
                                    vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
                                    life: 1, color: inv.color, size: Math.random()*5+2
                                });
                                if (Math.random() > 0.85) {
                                    const pool: {t: PowerUpType, l: string, c: string}[] = [
                                        {t:'health', l:'HP', c:'#0f0'}, {t:'spread', l:'SPRD', c:'#0ff'}, 
                                        {t:'beam', l:'BEAM', c:'#f0f'}, {t:'plasma', l:'PLSM', c:'#ff0'}, 
                                        {t:'rapid', l:'RAPD', c:'#0ff'}, {t:'shield', l:'SHLD', c:'#ff0'}, {t:'nuke', l:'NUKE', c:'#fff'}
                                    ];
                                    const choice = pool[Math.floor(Math.random()*pool.length)];
                                    s.powerups.push({
                                        x: inv.x + inv.width/2, y: inv.y, width: 45, height: 45,
                                        color: choice.c, 
                                        type: choice.t, label: choice.l, velocity: 2.5
                                    });
                                }
                                s.invaders.splice(j, 1);
                            }
                            if (p.type !== 'plasma') s.projectiles.splice(i, 1);
                            break;
                        }
                    }
                } else {
                    if (Math.abs(p.x - s.playerX) < 40 && p.y > canvas.height - 120 && p.y < canvas.height - 50) {
                        s.projectiles.splice(i, 1);
                        if (s.shieldActive) { s.shieldActive = false; s.shieldTimer = 0; }
                        else {
                            callbacks.current.onLifeLost();
                            soundManager.playExplosion();
                        }
                    }
                }
            }

            if (s.frameCount % Math.max(15, 110 - (s.level * 9)) === 0 && s.invaders.length > 0) {
                const shooter = s.invaders[Math.floor(Math.random()*s.invaders.length)];
                s.projectiles.push({
                    x: shooter.x + shooter.width/2, y: shooter.y + shooter.height,
                    width: 5, height: 20, velocity: 5.5 + (s.level * 0.5),
                    color: '#f05', owner: 'enemy', type: 'shard'
                });
            }

            s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.015; });
            s.particles = s.particles.filter(p => p.life > 0);

            if (s.invaders.length === 0) {
                s.level++; callbacks.current.onLevelUp(); s.invaders = initLevel(s.level);
            }
            s.invaders.forEach(inv => {
                if (inv.y > canvas.height - 180) callbacks.current.onGameOver(s.score);
            });

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff'; s.stars.forEach(st => ctx.fillRect(st.x, st.y, st.s, st.s));
            s.particles.forEach(p => {
                ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.globalAlpha = 1;

            s.invaders.forEach(inv => drawShip(ctx, inv.x + inv.width/2, inv.y + inv.height/2, inv.color, false, inv.type));
            
            s.projectiles.forEach(p => {
                ctx.fillStyle = p.color; ctx.shadowBlur = 12; ctx.shadowColor = p.color;
                if (p.type === 'plasma') {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2); ctx.fill();
                } else {
                    ctx.fillRect(p.x - p.width/2, p.y, p.width, p.height);
                }
                ctx.shadowBlur = 0;
            });
            
            s.powerups.forEach(pu => drawPowerUp(ctx, pu));

            drawShip(ctx, s.playerX, canvas.height - 100, '#0ff', true);
            if (s.shieldActive) {
                ctx.strokeStyle = '#ff0'; ctx.lineWidth = 4; ctx.setLineDash([10, 5]);
                ctx.beginPath(); ctx.arc(s.playerX, canvas.height - 95, 80, 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
            }

            drawHUD(ctx, canvas.width, canvas.height);

            animId = requestAnimationFrame(loop);
        };

        if (state.current.invaders.length === 0) state.current.invaders = initLevel(1);
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            width={850} 
            height={1000} 
            className="w-full h-full max-h-[96vh] object-contain border border-white/10 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-black/30" 
        />
    );
};

export default GameEngine;

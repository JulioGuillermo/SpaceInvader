
export interface Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}

export type PowerUpType = 'health' | 'spread' | 'rapid' | 'beam' | 'plasma' | 'shield' | 'nuke';

export interface PowerUp extends Entity {
    type: PowerUpType;
    velocity: number;
    label: string;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

export interface Invader extends Entity {
    id: string;
    type: 'basic' | 'scout' | 'heavy' | 'commander';
    health: number;
    points: number;
    animFrame: number;
}

export interface Projectile extends Entity {
    velocity: number;
    owner: 'player' | 'enemy';
    type: 'standard' | 'beam' | 'plasma' | 'shard';
    spread?: number;
}

export interface HandState {
    x: number;
    isFist: boolean;
    isActive: boolean;
}

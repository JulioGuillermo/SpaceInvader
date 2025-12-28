
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameEngine from './components/GameEngine';
import HandTracker from './components/HandTracker';
import SensitivitySlider from './components/SensitivitySlider';
import { HandState } from './types';
import { getMissionBriefing, getGameOverMessage } from './services/geminiService';

const App: React.FC = () => {
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [level, setLevel] = useState(1);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [isAutoPaused, setIsAutoPaused] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [sensitivity, setSensitivity] = useState(0.35); 
    const [gameId, setGameId] = useState(0);
    const [briefing, setBriefing] = useState("Establishing Neural Link...");
    const [gameOverMsg, setGameOverMsg] = useState("");
    const [handState, setHandState] = useState<HandState>({ x: 0.5, isFist: false, isActive: false });

    const handLostTimeoutRef = useRef<number | null>(null);

    const fetchBriefing = useCallback(async (lvl: number) => {
        const msg = await getMissionBriefing(lvl);
        setBriefing(msg);
    }, []);

    useEffect(() => {
        if (level > 0) fetchBriefing(level);
    }, [level, fetchBriefing]);

    const handleGameOver = useCallback(async (finalScore: number) => {
        if (isGameOver) return;
        setIsGameOver(true);
        setIsPaused(true);
        const msg = await getGameOverMessage(finalScore);
        setGameOverMsg(msg);
    }, [isGameOver]);

    useEffect(() => {
        if (lives <= 0 && !isGameOver && !isPaused && hasStarted) {
            handleGameOver(score);
        }
    }, [lives, isGameOver, isPaused, score, handleGameOver, hasStarted]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (hasStarted && !isGameOver) {
                    setIsPaused(prev => !prev);
                }
            } else if (e.key === 'ArrowUp') {
                setSensitivity(s => Math.min(2.4, s + 0.1));
            } else if (e.key === 'ArrowDown') {
                setSensitivity(s => Math.max(0.05, s - 0.1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasStarted, isGameOver]);

    // Auto-pause logic: Pause if hand is lost for > 1 sec
    useEffect(() => {
        if (handState.isActive) {
            // Hand detected: cancel timeout and clear auto-pause
            if (handLostTimeoutRef.current) {
                clearTimeout(handLostTimeoutRef.current);
                handLostTimeoutRef.current = null;
            }
            setIsAutoPaused(false);
        } else {
            // Hand lost: start timeout if not already running
            if (!handLostTimeoutRef.current && hasStarted && !isGameOver) {
                handLostTimeoutRef.current = window.setTimeout(() => {
                    setIsAutoPaused(true);
                    handLostTimeoutRef.current = null;
                }, 1000);
            }
        }
    }, [handState.isActive, hasStarted, isGameOver]);

    const startGame = () => {
        setGameId(p => p + 1);
        setScore(0);
        setLives(3);
        setLevel(1);
        setIsGameOver(false);
        setIsPaused(false);
        setIsAutoPaused(false);
        setHasStarted(true);
        setGameOverMsg("");
    };

    const togglePause = () => {
        if (isGameOver) return;
        setIsPaused(prev => !prev);
    };

    const onScoreChange = useCallback((s: number) => setScore(p => p + s), []);
    const onLevelUp = useCallback(() => setLevel(p => p + 1), []);
    const onLifeLost = useCallback(() => setLives(p => Math.max(0, p - 1)), []);
    const onLifeGained = useCallback(() => setLives(p => Math.min(5, p + 1)), []);

    return (
        <div className="flex h-screen w-screen bg-[#020205] text-white overflow-hidden font-['Orbitron']">
            {/* LEFT: MAIN GAME STAGE */}
            <div className="relative flex-grow h-full bg-black/60 border-r border-white/10 overflow-hidden flex items-center justify-center">
                <div className={`w-full h-full transition-all duration-500 flex items-center justify-center ${isAutoPaused && !isPaused ? 'grayscale brightness-50 contrast-125' : ''}`}>
                    <GameEngine 
                        key={gameId}
                        handState={handState} 
                        sensitivity={sensitivity}
                        isPaused={isPaused || isAutoPaused}
                        onScoreChange={onScoreChange}
                        onLevelUp={onLevelUp}
                        onLifeLost={onLifeLost}
                        onLifeGained={onLifeGained}
                        onGameOver={handleGameOver}
                    />
                </div>

                {/* AUTO-PAUSE INDICATOR (Subtle) */}
                {isAutoPaused && !isPaused && !isGameOver && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                        <div className="bg-red-500/20 border border-red-500 px-8 py-4 rounded-xl backdrop-blur-sm animate-pulse">
                            <h4 className="text-red-500 font-bold tracking-[0.3em] uppercase text-xl">Signal Lost</h4>
                            <p className="text-red-500/70 text-xs mt-1">RE-ESTABLISH HAND PROTOCOL</p>
                        </div>
                    </div>
                )}

                {/* GAME OVERLAYS */}
                {(isPaused && !isGameOver) && (
                    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center">
                        <h1 className="text-8xl font-black text-[#0ff] neon-text italic tracking-tighter mb-10 animate-pulse">
                            {hasStarted ? "SYSTEM PAUSED" : "NEON VADER"}
                        </h1>
                        <div className="max-w-xl p-8 border border-[#0ff]/40 bg-[#0ff]/5 mb-12 text-xl font-light italic text-white/90 rounded-xl">
                            "{briefing}"
                        </div>
                        <button 
                            onClick={hasStarted ? togglePause : startGame} 
                            className="px-24 py-6 border-2 border-[#0ff] text-[#0ff] text-2xl font-bold hover:bg-[#0ff] hover:text-black transition-all uppercase tracking-[0.6em] shadow-[0_0_50px_rgba(0,255,255,0.4)] active:scale-95"
                        >
                            {hasStarted ? "Re-Engage" : "Ignite Core"}
                        </button>
                    </div>
                )}

                {isGameOver && (
                    <div className="absolute inset-0 z-50 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
                        <h2 className="text-7xl font-black text-white italic mb-6 uppercase tracking-tighter">CONNECTION LOST</h2>
                        <p className="text-[#0ff] text-2xl mb-12 tracking-widest max-w-2xl leading-relaxed italic">{gameOverMsg}</p>
                        <div className="text-5xl font-black text-white mb-14 drop-shadow-[0_0_10px_#fff]">SCORE: {score.toLocaleString()}</div>
                        <button 
                            onClick={startGame} 
                            className="px-28 py-8 bg-white text-black text-3xl font-black hover:bg-[#0ff] transition-all uppercase tracking-[0.4em] shadow-[12px_12px_0_#f05] active:translate-x-1 active:translate-y-1"
                        >
                            Reconnect
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: TACTICAL SIDEBAR */}
            <div className="w-[420px] h-full bg-[#050510] flex flex-col p-8 border-l border-white/10 z-40 relative shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-[#0ff]/5 via-transparent to-[#f0f]/5 pointer-events-none"></div>
                
                {/* HUD HEADER */}
                <div className="flex items-start justify-between mb-10 relative">
                    <div className="flex flex-col gap-1">
                        <span className="text-[#0ff] text-[10px] tracking-[0.5em] uppercase opacity-50">Link ID: NV-9900</span>
                        <h3 className="text-4xl font-black italic tracking-tighter text-white neon-text">COMMAND GRID</h3>
                    </div>
                    
                    {hasStarted && (
                        <button 
                            onClick={togglePause}
                            className={`p-3 border-2 transition-all duration-300 rounded-lg group ${isPaused ? 'border-[#f05] shadow-[0_0_15px_#f05]' : 'border-[#0ff]/40 hover:border-[#0ff] hover:shadow-[0_0_15px_#0ff]'}`}
                            title={isPaused ? "Resume (Esc)" : "Pause (Esc)"}
                        >
                            {isPaused ? (
                                <svg className="w-6 h-6 fill-[#f05]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            ) : (
                                <svg className="w-6 h-6 fill-[#0ff] group-hover:animate-pulse" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            )}
                        </button>
                    )}
                </div>

                {/* STATUS CARDS */}
                <div className="flex flex-col gap-6 bg-white/5 p-8 border border-white/10 rounded-3xl relative mb-10">
                    <div className="flex justify-between items-baseline">
                        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">Total Efficiency</span>
                        <span className="text-4xl font-black text-[#0ff] tabular-nums">{score.toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[11px] uppercase tracking-[0.3em] text-white/40">
                            <span>Sector progression</span>
                            <span className="text-white font-bold">{level}</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-[2px]">
                            <div className="h-full bg-gradient-to-r from-[#f0f] to-[#0ff] shadow-[0_0_15px_#f0f] rounded-full transition-all duration-700" style={{ width: `${(level/15)*100}%` }}></div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-4 justify-center">
                        {[...Array(5)].map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-10 h-10 border-2 transform rotate-45 transition-all duration-500 flex items-center justify-center ${i < lives ? 'bg-[#0ff]/30 border-[#0ff] shadow-[0_0_20px_#0ff]' : 'border-white/5 bg-transparent opacity-20'}`}
                            >
                                <div className={`w-4 h-4 bg-white/20 rounded-sm ${i < lives ? 'animate-pulse' : ''}`}></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OPTICAL FEED */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">Neural Interface</span>
                        <div className={`flex items-center gap-2 text-[9px] uppercase tracking-widest ${handState.isActive ? 'text-[#0ff]' : 'text-red-500'}`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${handState.isActive ? 'bg-[#0ff] animate-ping' : 'bg-red-500'}`}></div>
                           {handState.isActive ? 'Synced' : 'Link Lost'}
                        </div>
                    </div>
                    <div className="w-full aspect-video bg-black border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl relative group">
                        <HandTracker onHandUpdate={setHandState} />
                        <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
                        <div className="absolute top-4 left-4 flex gap-1">
                            <div className="w-2 h-2 bg-[#0ff] rounded-full"></div>
                            <div className="w-2 h-2 bg-[#0ff]/30 rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* SENSITIVITY - HORIZONTAL AT BOTTOM */}
                <div className="mt-auto space-y-6">
                    <SensitivitySlider value={sensitivity} onChange={setSensitivity} />
                    
                    <div className="p-4 border border-[#0ff]/20 bg-[#0ff]/5 rounded-2xl">
                        <p className="text-[10px] text-[#0ff] uppercase tracking-[0.3em] leading-relaxed opacity-70 text-center font-bold">
                            CALIBRATION: RELATIVE DELTA MODE<br/>
                            <span className="text-[9px] opacity-40 font-normal mt-1 block tracking-[0.1em]">Move hand to translate • Close fist to fire • Keys: Esc, ↑, ↓</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="scanline" />
        </div>
    );
};

export default App;


import React, { useRef, useEffect } from 'react';
import { HandState } from '../types';

interface Props {
    onHandUpdate: (state: HandState) => void;
}

const HandTracker: React.FC<Props> = ({ onHandUpdate }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trailRef = useRef<{x: number, y: number}[]>([]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // @ts-ignore
        const hands = new window.Hands({
            locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];
                
                const wrist = landmarks[0];
                const middleTip = landmarks[12];
                const middleBase = landmarks[9];
                const indexTip = landmarks[8];
                const pinkyTip = landmarks[20];
                
                // Simple fist heuristic: middle fingertip lower than middle finger base
                const isFist = middleTip.y > middleBase.y;
                const x = 1 - middleBase.x;

                onHandUpdate({ x, isFist, isActive: true });

                // Enhanced Visual Feedback
                if (ctx && canvasRef.current) {
                    const cw = canvasRef.current.width;
                    const ch = canvasRef.current.height;

                    // Update trail for movement visualization
                    trailRef.current.push({ x: middleBase.x * cw, y: middleBase.y * ch });
                    if (trailRef.current.length > 15) trailRef.current.shift();

                    // Draw trail
                    ctx.beginPath();
                    ctx.strokeStyle = isFist ? 'rgba(255, 0, 255, 0.4)' : 'rgba(0, 255, 255, 0.4)';
                    ctx.lineWidth = 4;
                    ctx.lineJoin = 'round';
                    trailRef.current.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();

                    // Draw tracking point (Neural Node)
                    const pulse = 8 + Math.sin(Date.now() / 100) * 4;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = isFist ? '#f0f' : '#0ff';
                    ctx.fillStyle = isFist ? '#f0f' : '#0ff';
                    ctx.beginPath();
                    ctx.arc(middleBase.x * cw, middleBase.y * ch, pulse, 0, Math.PI * 2);
                    ctx.fill();

                    // Highlight fingertips to show detection "nodes"
                    const nodes = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
                    nodes.forEach(node => {
                        ctx.fillStyle = 'rgba(255,255,255,0.7)';
                        ctx.beginPath();
                        ctx.arc(node.x * cw, node.y * ch, 3, 0, Math.PI * 2);
                        ctx.fill();
                    });

                    // Status Text Overlay
                    ctx.shadowBlur = 5;
                    ctx.fillStyle = isFist ? '#f0f' : '#0ff';
                    ctx.font = 'bold 24px Orbitron';
                    ctx.textAlign = 'right';
                    ctx.fillText(isFist ? 'FIST - FIRING' : 'OPEN - GUIDING', cw - 20, 40);
                    
                    // Box highlight around hand area
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(middleBase.x * cw - 50, middleBase.y * ch - 50, 100, 100);
                }
            } else {
                onHandUpdate({ x: 0.5, isFist: false, isActive: false });
                trailRef.current = [];
            }
        });

        // @ts-ignore
        const camera = new window.Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });
        camera.start();

        return () => {
            camera.stop();
            hands.close();
        };
    }, [onHandUpdate]);

    return (
        <div className="relative w-full h-full">
            <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-40 grayscale contrast-125" 
                playsInline 
            />
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 w-full h-full scale-x-[-1]"
                width={640}
                height={480}
            />
        </div>
    );
};

export default HandTracker;

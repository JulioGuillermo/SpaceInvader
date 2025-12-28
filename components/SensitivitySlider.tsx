
import React from 'react';

interface Props {
    value: number;
    onChange: (val: number) => void;
}

const SensitivitySlider: React.FC<Props> = ({ value, onChange }) => {
    // New maximum is 2.4 (triple the previous 0.8)
    const MAX_SENSITIVITY = 2.4;
    const displayValue = Math.round((value / MAX_SENSITIVITY) * 100);

    return (
        <div className="flex flex-col gap-3 bg-white/5 p-4 border border-white/10 rounded-2xl backdrop-blur-md w-full">
            <div className="flex justify-between items-center px-1">
                <span className="text-[#0ff] text-[10px] font-bold tracking-[0.2em] uppercase">Neural Gain</span>
                <span className="text-[11px] font-mono text-[#0ff] font-bold">{displayValue}%</span>
            </div>
            <div className="relative w-full h-8 bg-black/80 rounded-full border border-white/10 overflow-hidden flex items-center p-1.5 shadow-inner">
                <input
                    type="range"
                    min="0.05"
                    max={MAX_SENSITIVITY}
                    step="0.01"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div 
                    className="h-full bg-gradient-to-r from-[#0ff] via-[#0ff] to-[#f0f] shadow-[0_0_15px_rgba(0,255,255,0.6)] rounded-full transition-all duration-150 ease-out relative"
                    style={{ width: `${(value / MAX_SENSITIVITY) * 100}%` }}
                >
                    <div className="h-full w-[2px] bg-white absolute right-0 top-0 animate-pulse shadow-[0_0_10px_#fff]"></div>
                </div>
            </div>
        </div>
    );
};

export default SensitivitySlider;

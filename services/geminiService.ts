
// import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API with the API key from environment variables
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMissionBriefing = async (level: number) => {
    return "The Grid is under attack. Pilot your craft with precision.";

    // try {
    //     const response = await ai.models.generateContent({
    //         model: 'gemini-3-flash-preview',
    //         contents: `Generate a short, 2-sentence mission briefing for an 80s retro space shooter. 
    //         Level: ${level}. Theme: Cyberpunk, Neon, Alien Invasion. Style: Hyper-dramatic, technobabble.`,
    //     });
    //     return response.text || "Engage the intruders. Protect the grid.";
    // } catch (error) {
    //     console.error("Gemini briefing failed:", error);
    //     return "The Grid is under attack. Pilot your craft with precision.";
    // }
};

export const getGameOverMessage = async (score: number) => {
    return "MISSION FAILED. SYSTEM REBOOTING...";

    // try {
    //     const response = await ai.models.generateContent({
    //         model: 'gemini-3-flash-preview',
    //         contents: `The player just lost a retro space game with a score of ${score}. 
    //         Generate a short, cool, snarky 80s arcade game over message.`,
    //     });
    //     return response.text || "INSERT COIN TO CONTINUE. THE VOID CONSUMES ALL.";
    // } catch (error) {
    //     return "MISSION FAILED. SYSTEM REBOOTING...";
    // }
};

import { GoogleGenAI } from "@google/genai";
import { GameEvent, EventType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

export const generateStreamerReaction = async (
  event: GameEvent,
  currentHealth: number,
  currentScore: number
): Promise<string> => {
  if (!apiKey) return "Thanks for the support! (AI Key missing)";

  try {
    let promptAction = "";
    switch (event.type) {
      case EventType.SPAWN_ENEMY:
        promptAction = `WARNING: Viewer ${event.user} just opened a portal spawning more Alien mobs!`;
        break;
      case EventType.SPAWN_BOSS:
        promptAction = `RED ALERT: Viewer ${event.user} HAS RELEASED A GIANT ALIEN BOSS!`;
        break;
      case EventType.GIVE_HEALTH:
        promptAction = `Viewer ${event.user} just sent a health supply drop (Medkit).`;
        break;
      case EventType.GIVE_WEAPON:
        promptAction = `Viewer ${event.user} just sent a heavy plasma weapon upgrade.`;
        break;
      default:
        promptAction = `Viewer ${event.user} transmission: "${event.message}"`;
    }

    const context = `
      You are a Space Marine livestreaming a campaign to exterminate Aliens on a dead planet.
      Style: Aggressive, intense, like an American action movie, occasionally mild swearing (damn, sh*t) but still engaging with viewers.
      
      Armor Status: ${currentHealth}%. Kills: ${currentScore}.
      
      Event: ${promptAction}
      
      Shout a very short reaction (under 20 words) in English. 
      If spawning monsters: Show surprise or challenge.
      If support: Thank them like a squadmate on the battlefield.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: context,
    });

    return response.text || "Enemy down! Keep moving!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Roger that, ${event.user}! Delivery received!`;
  }
};

import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private isAvailable: boolean = false;

  constructor() {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (apiKey && apiKey.trim() !== '') {
      try {
        this.ai = new GoogleGenAI({ apiKey });
        this.isAvailable = true;
      } catch (error) {
        console.warn("Gemini API initialization failed:", error);
        this.isAvailable = false;
      }
    } else {
      console.log("Gemini API key not set - AI features disabled");
      this.isAvailable = false;
    }
  }

  async breakdownTask(taskTitle: string): Promise<string[]> {
    if (!this.isAvailable || !this.ai) {
      console.log("AI not available, skipping task breakdown");
      return [];
    }
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Break down the following task into a concise list of 3-5 sub-tasks: "${taskTitle}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of logical subtasks for the parent task."
              }
            },
            required: ["subtasks"]
          }
        }
      });

      const data = JSON.parse(response.text);
      return data.subtasks || [];
    } catch (error) {
      console.error("Gemini breakdown error:", error);
      return []; // Return empty array - don't auto-create subtasks on error
    }
  }
}

export const geminiService = new GeminiService();

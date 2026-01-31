
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async breakdownTask(taskTitle: string): Promise<string[]> {
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

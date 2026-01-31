
// Gemini API Service - Only loads when API key is available

export class GeminiService {
  private ai: any = null;
  private isAvailable: boolean = false;
  private initialized: boolean = false;

  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey || apiKey.trim() === '') {
      this.isAvailable = false;
      return;
    }
    
    try {
      const { GoogleGenAI } = await import("@google/genai");
      this.ai = new GoogleGenAI({ apiKey });
      this.isAvailable = true;
    } catch (error) {
      this.isAvailable = false;
    }
  }

  async breakdownTask(taskTitle: string): Promise<string[]> {
    await this.initialize();
    
    if (!this.isAvailable || !this.ai) {
      return [];
    }
    
    try {
      const { Type } = await import("@google/genai");
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
      return [];
    }
  }
}

export const geminiService = new GeminiService();

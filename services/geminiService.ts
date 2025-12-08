import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMSTONE_DATABASE } from '@/constants/gemstoneData';

// Initialize Gemini AI
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Gemini API key not found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

export interface IdentificationQuestion {
  id: string;
  question: string;
  type: 'multiple' | 'binary' | 'text';
  options?: string[];
  property: string;
}

export interface IdentificationResult {
  gemstone: string;
  confidence: number;
  reasoning: string;
  matches: Array<{
    gemstone: any;
    score: number;
    reasons: string[];
  }>;
}

export class GeminiIdentificationService {
  private textModel: any;
  private visionModel: any;
  private lastRequestTime = 0;
  private minRequestInterval = 4000; // 4 seconds between requests (15 per minute max)

  constructor() {
    // Use gemini-1.5-flash for better free tier limits (60 requests/day vs 20 for 2.5-flash)
    this.textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Generate identification questions based on current observations
   */
  async generateIdentificationQuestions(
    observations: Record<string, any>
  ): Promise<IdentificationQuestion[]> {
    await this.waitForRateLimit();
    
    // Limit observations size
    const limitedObs = {
      colors: observations.visualProperties?.colors || [],
      transparency: observations.manual?.transparency || '',
      hardness: observations.visualProperties?.estimatedHardness || null
    };

    const prompt = `
    Generate 4 questions for gemstone ID based on: ${JSON.stringify(limitedObs)}

    Cover: pleochroism, optic character (SR/DR), hardness test, UV reaction

    JSON:
    [{"id":"1","question":"Question text","type":"binary","property":"pleochroism"}]
    `;

    try {
      const result = await this.textModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.getDefaultQuestions();
    } catch (error: any) {
      console.error('Error generating questions:', error);
      
      // Check if it's a quota error
      if (error.message && error.message.includes('quota')) {
        // Return a simple message about quota
        return [{
          id: 'quota',
          question: 'AI quota exceeded. Please try again tomorrow or upgrade your API plan.',
          type: 'text' as const,
          property: 'quota'
        }];
      }
      
      return this.getDefaultQuestions();
    }
  }

  /**
   * Analyze gemstone image and provide initial identification
   */
  async analyzeGemstoneImage(imageBase64: string): Promise<{
    initialAnalysis: string;
    suggestedProperties: Record<string, any>;
    confidence: number;
  }> {
    await this.waitForRateLimit();
    
    const prompt = `
    Analyze gemstone image. Return JSON:
    {"initialAnalysis":"Brief description","suggestedProperties":{"colors":["color"],"transparency":"Transparent","luster":"Vitreous","estimatedHardness":7},"confidence":0.7}
    `;

    try {
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      };

      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        initialAnalysis: "Gemstone visible - please describe color, transparency, luster",
        suggestedProperties: {
          colors: ["Unknown"],
          transparency: "Unknown",
          luster: "Vitreous",
          estimatedHardness: 7
        },
        confidence: 0.3
      };
    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        initialAnalysis: "Unable to analyze image",
        suggestedProperties: {},
        confidence: 0
      };
    }
  }

  /**
   * Identify gemstone based on all collected data
   */
  async identifyGemstone(
    imageData?: string,
    observations: Record<string, any> = {},
    answers: Record<string, any> = {}
  ): Promise<IdentificationResult> {
    await this.waitForRateLimit();
    
    // Limit data size
    const summary = {
      color: observations.visualProperties?.colors?.[0] || 'unknown',
      hardness: observations.visualProperties?.estimatedHardness || null,
      pleochroism: answers.pleochroism || null,
      opticChar: answers.optic_character || null
    };

    const prompt = `
    Identify gemstone: ${JSON.stringify(summary)}
    Ruby(9,red), Sapphire(9,blue), Emerald(7.5,green), Diamond(10,clear), Topaz(8,yellow), Garnet(7,red), Quartz(7,clear)
    
    JSON: {"gemstone":"Name","confidence":0.8,"reasoning":"Brief","matches":[{"gemstone":{},"score":0.8,"reasons":["match"]}]}
    `;

    try {
      const parts = [prompt];
      
      if (imageData) {
        parts.push({
          inlineData: {
            data: imageData,
            mimeType: 'image/jpeg'
          }
        });
      }

      const result = await this.visionModel.generateContent(parts);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        const matches = this.findMatchingGemstones(summary, result.gemstone);
        
        return {
          ...result,
          matches
        };
      }
      
      return this.getFallbackResult(summary);
    } catch (error: any) {
      console.error('Error identifying gemstone:', error);
      
      // Check if it's a quota error
      if (error.message && error.message.includes('quota')) {
        return {
          gemstone: "Quota Exceeded",
          confidence: 0,
          reasoning: "AI quota exceeded. Please try again tomorrow or upgrade your API plan. Your answers have been saved.",
          matches: []
        };
      }
      
      return this.getFallbackResult(summary);
    }
  }

  /**
   * Find matching gemstones from database
   */
  private findMatchingGemstones(data: any, primaryMatch: string) {
    const matches = [];
    
    // Find primary match
    const primaryGem = GEMSTONE_DATABASE.find(g => g && g.variety && g.variety.toLowerCase() === primaryMatch.toLowerCase());
    
    if (primaryGem) {
      matches.push({
        gemstone: primaryGem,
        score: 0.9,
        reasons: ['Primary AI match']
      });
    }
    
    // Find other potential matches based on data
    GEMSTONE_DATABASE.forEach(gem => {
      if (!gem || !gem.variety || gem.variety === primaryMatch) return;
      
      let score = 0;
      const reasons = [];
      
      // Color matching
      if (data.color && gem.colors) {
        const colorMatch = gem.colors.some(c => 
          c.toLowerCase().includes(data.color.toLowerCase()) || 
          data.color.toLowerCase().includes(c.toLowerCase())
        );
        if (colorMatch) {
          score += 0.3;
          reasons.push('Color match');
        }
      }
      
      // Hardness matching
      if (data.hardness && gem.hardness) {
        const hardnessDiff = Math.abs(data.hardness - gem.hardness);
        if (hardnessDiff <= 1) {
          score += 0.2;
          reasons.push('Hardness range match');
        }
      }
      
      if (score > 0.3 && matches.length < 3) {
        matches.push({
          gemstone: gem,
          score: Math.min(score, 0.7),
          reasons
        });
      }
    });
    
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Get fallback identification result
   */
  private getFallbackResult(data: any): IdentificationResult {
    return {
      gemstone: "Unknown",
      confidence: 0,
      reasoning: "Unable to identify with current data. Please provide more observations.",
      matches: []
    };
  }

  /**
   * Get default questions if AI fails
   */
  private getDefaultQuestions(): IdentificationQuestion[] {
    return [
      {
        id: 'color',
        question: 'What is the primary color of the gemstone?',
        type: 'multiple',
        options: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Brown', 'Black', 'White', 'Colorless'],
        property: 'color'
      },
      {
        id: 'transparency',
        question: 'How transparent is the gemstone?',
        type: 'multiple',
        options: ['Transparent', 'Translucent', 'Opaque'],
        property: 'transparency'
      },
      {
        id: 'pleochroism',
        question: 'Does the gemstone show different colors when viewed from different angles?',
        type: 'binary',
        property: 'pleochroism'
      },
      {
        id: 'optic_character',
        question: 'What is the optic character?',
        type: 'multiple',
        options: ['SR (Single Refraction)', 'DR (Double Refraction)', 'AGG (Aggregate)'],
        property: 'optic_character'
      },
      {
        id: 'hardness_test',
        question: 'Can you scratch it with a fingernail (2.5), copper coin (3.5), steel file (5.5), or quartz (7)?',
        type: 'text',
        property: 'hardness'
      }
    ];
  }
}

export const geminiService = new GeminiIdentificationService();

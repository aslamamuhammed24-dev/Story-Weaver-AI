import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

app.post('/api/generate-story', async (req, res) => {
  try {
    const ai = getAI();
    const { prompt, numPanels, numPages, image } = req.body;
    const panelsPerPage = parseInt(numPanels, 10) || 4;
    const pagesCount = parseInt(numPages, 10) || 1;
    
    let parts: any[] = [];
    
    if (image && image.data && image.mimeType) {
      parts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType
        }
      });
    }
    
    if (prompt) {
      parts.push({ text: `Story prompt: ${prompt}` });
    }
    
    if (parts.length === 0) {
      return res.status(400).json({ error: "Please provide either a prompt or an image." });
    }
    
    parts.push({
      text: `Create a highly engaging story broken down into exactly ${pagesCount} pages. Each page MUST contain exactly ${panelsPerPage} panels. For each panel, provide a detailed 'imageDescription' that perfectly describes the scene visually, and 'narrative' text which is the text that accompanies the panel in the story.`
    });

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: "An array of pages",
        items: {
          type: Type.OBJECT,
          properties: {
            panels: {
              type: Type.ARRAY,
              description: "The panels for this page",
              items: {
                type: Type.OBJECT,
                properties: {
                  imageDescription: {
                    type: Type.STRING,
                    description: "Detailed visual description of the panel, used for generating an image."
                  },
                  narrative: {
                    type: Type.STRING,
                    description: "The story text accompanying this panel."
                  }
                },
                required: ["imageDescription", "narrative"]
              }
            }
          },
          required: ["panels"]
        }
      }
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: config
      });
    } catch (err: any) {
      console.log('gemini-3.8-flash failed, falling back to gemini-flash-latest:', err.message);
      try {
        response = await ai.models.generateContent({
          model: "gemini-flash-latest",
          contents: { parts },
          config: config
        });
      } catch (fallbackErr: any) {
        throw fallbackErr;
      }
    }

    const text = response.text || "[]";
    const parsedPages = JSON.parse(text);
    res.json({ pages: parsedPages });
  } catch (error: any) {
    console.error('Error generating story:', error);
    res.status(500).json({ error: error.message || 'Failed to generate story' });
  }
});

app.post('/api/autocomplete', async (req, res) => {
  try {
    const ai = getAI();
    const { prompt = '' } = req.body;
    const cleanPrompt = String(prompt).trim();

    const systemInstruction = `You are an expert story and manga script autocomplete assistant.
Your task is to provide seamless, exciting continuations for story prompts.
- If the user's prompt is empty, generate an original, intriguing story premise for a comic or narrative.
- If the user's prompt is a sentence fragment or thought, provide:
  1) 'completion': The immediate natural continuation that finishes their thought or sentence smoothly (do NOT repeat the user's words, just provide the missing continuation to append, or a smoothly connected complete thought).
  2) 'suggestions': 3 diverse, compelling plot hooks or twists continuing from their prompt. Keep each under 25 words.`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          completion: {
            type: Type.STRING,
            description: "Direct continuation to complete the prompt."
          },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 creative directions or completions based on the prompt."
          }
        },
        required: ["completion", "suggestions"]
      }
    };

    let userContent = cleanPrompt 
      ? `User's current prompt: "${cleanPrompt}". Continue and complete this story idea.`
      : `Provide an exciting, fresh story premise and 3 alternative concepts.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          { text: systemInstruction },
          { text: userContent }
        ],
        config: config
      });
    } catch (err: any) {
      console.log('gemini-3.8-flash failed for autocomplete, falling back to gemini-flash-latest:', err.message);
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          { text: systemInstruction },
          { text: userContent }
        ],
        config: config
      });
    }

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    res.json({
      completion: parsed.completion || "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    });
  } catch (error: any) {
    console.error('Error in /api/autocomplete:', error);
    res.status(500).json({ error: error.message || 'Failed to generate autocomplete' });
  }
});

app.post('/api/convert-to-image-prompt', async (req, res) => {
  try {
    const ai = getAI();
    const { pageNumber = 1, panels = [], style = 'manga', storyPrompt = '' } = req.body;

    const panelsText = panels.map((p: any, idx: number) => 
      `Panel ${idx + 1}: Scene: ${p.imageDescription || ''} | Story Narrative: ${p.narrative || ''}`
    ).join('\n');

    const styleInstructions: Record<string, string> = {
      'manga': 'Authentic Japanese manga page layout, high-contrast black and white ink, screentones, dramatic perspective, dynamic motion lines, expressive character emotions, cel-shaded details, 4k manga comic spread.',
      'cinematic': 'Cinematic film still, photorealistic composition, volumetric atmospheric lighting, anamorphic lens flare, rich depth of field, 8k resolution, IMAX masterpiece, unreal engine 5 render.',
      'comic': 'Classic American graphic novel page, bold ink lineart, halftone dots, vibrant color grading, dynamic multi-panel grid framing, dramatic comic book cover art style.',
      'fantasy-art': 'Digital fantasy concept art, painterly digital oil rendering, ethereal magical glow, rich atmospheric depth, detailed character costumes and environment, ArtStation trending.'
    };

    const chosenStyle = styleInstructions[style] || styleInstructions['manga'];

    const systemInstruction = `You are an expert visual prompt engineer for AI image generators (Midjourney v6, Imagen 3, Stable Diffusion XL, DALL-E 3).
Your mission is to take the narrative text and visual scene descriptions of a story page and convert it into a single, cohesive, vivid, highly detailed image generation prompt.
Describe the page's visual layout, characters' physical appearances, camera angles, emotional intensity, color palette, lighting, background details, and artistic aesthetic so an image generator can render this page perfectly.`;

    const userContent = `Convert this story page into a master image generation prompt:
Story Context: ${storyPrompt || 'Comic story'}
Page Number: ${pageNumber}
Target Art Style: ${style} (${chosenStyle})

Page Panels Breakdown:
${panelsText}

Please generate:
1. 'imagePrompt': The complete master prompt to generate the entire page visual (under 250 words, optimized with visual tags, camera cues, atmosphere, and layout).
2. 'negativePrompt': Negative prompt keywords to avoid ugly artifacts.
3. 'compositionNotes': A 1-2 sentence summary of lighting, camera, and layout direction.
4. 'panelPrompts': An array of distinct image prompts for each individual panel on this page.`;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          imagePrompt: {
            type: Type.STRING,
            description: "Master prompt to generate an image representing this story page."
          },
          negativePrompt: {
            type: Type.STRING,
            description: "Suggested negative prompt keywords."
          },
          compositionNotes: {
            type: Type.STRING,
            description: "Visual composition, camera angle, and lighting notes."
          },
          panelPrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Individual prompt for each panel."
          }
        },
        required: ["imagePrompt"]
      }
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          { text: systemInstruction },
          { text: userContent }
        ],
        config: config
      });
    } catch (err: any) {
      console.log('gemini-3.8-flash failed for convert-to-image-prompt, falling back to gemini-flash-latest:', err.message);
      response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          { text: systemInstruction },
          { text: userContent }
        ],
        config: config
      });
    }

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    res.json({
      imagePrompt: parsed.imagePrompt || "",
      negativePrompt: parsed.negativePrompt || "blurry, low resolution, bad anatomy, deformed, disfigured, text watermark, signature, extra limbs",
      compositionNotes: parsed.compositionNotes || "",
      panelPrompts: Array.isArray(parsed.panelPrompts) ? parsed.panelPrompts : []
    });
  } catch (error: any) {
    console.error('Error in /api/convert-to-image-prompt:', error);
    res.status(500).json({ error: error.message || 'Failed to convert to image prompt' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

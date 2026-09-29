import { StoryPanel, ImagePromptResult } from './types';

export interface StyleOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  promptSuffix: string;
}

export const IMAGE_STYLES: StyleOption[] = [
  {
    id: 'manga',
    name: 'Manga Spread',
    icon: '🇯🇵',
    description: 'Black & white ink, screentones, dramatic angles',
    promptSuffix: 'Authentic Japanese manga page layout, high-contrast dynamic black and white ink, screentone shading, action lines, expressive character expressions, sharp cel shading, 4k resolution comic book page'
  },
  {
    id: 'cinematic',
    name: 'Cinematic Film',
    icon: '🎬',
    description: 'Ultra-realistic lighting, 35mm film still, depth of field',
    promptSuffix: 'Cinematic movie still, photorealistic composition, volumetric atmospheric lighting, anamorphic lens flare, rich depth of field, 8k resolution, IMAX masterpiece, unreal engine 5 render'
  },
  {
    id: 'comic',
    name: 'Comic Book',
    icon: '💥',
    description: 'Bold lineart, vibrant color grading, graphic novel',
    promptSuffix: 'Classic American graphic novel page, bold ink lineart, halftone dots, vibrant color grading, dynamic multi-panel grid framing, dramatic comic book cover art style'
  },
  {
    id: 'fantasy-art',
    name: 'Fantasy Concept',
    icon: '🎨',
    description: 'Painterly digital oil, magical glow, ArtStation style',
    promptSuffix: 'Digital fantasy concept art, painterly digital oil rendering, ethereal magical glow, rich atmospheric depth, detailed character costumes and environment, ArtStation trending'
  }
];

export function generateFallbackImagePrompt(
  pageNumber: number,
  panels: StoryPanel[],
  styleId: string,
  storyPrompt: string
): ImagePromptResult {
  const chosenStyle = IMAGE_STYLES.find(s => s.id === styleId) || IMAGE_STYLES[0];
  
  const panelDescriptions = panels.map((p, idx) => 
    `[Panel ${idx + 1}]: Visual scene: "${p.imageDescription}". Atmosphere: "${p.narrative.slice(0, 100)}..."`
  ).join(' | ');

  const imagePrompt = `Multi-panel comic illustration, Page ${pageNumber}, ${chosenStyle.promptSuffix}. Layout breakdown: ${panelDescriptions}. Narrative context: "${storyPrompt || 'Epic narrative'}". Dynamic perspective, cohesive character designs, rich lighting, masterwork composition, 8k resolution.`;

  const panelPrompts = panels.map((p, idx) => 
    `${chosenStyle.promptSuffix}. Panel ${idx + 1} illustration: ${p.imageDescription}. Narrative mood: "${p.narrative.slice(0, 80)}". Highly detailed character expressions and environment.`
  );

  return {
    imagePrompt,
    negativePrompt: "blurry, low resolution, bad anatomy, deformed fingers, extra limbs, watermark, text artifacts, oversaturated, ugly faces",
    compositionNotes: `Cohesive ${panels.length}-panel visual flow from top to bottom, maintaining character appearance and atmospheric lighting across all scenes.`,
    panelPrompts,
    pageIndex: pageNumber - 1,
    style: styleId
  };
}

export function convertSinglePanelToPrompt(
  panel: StoryPanel,
  styleId: string,
  panelIndex: number
): string {
  const chosenStyle = IMAGE_STYLES.find(s => s.id === styleId) || IMAGE_STYLES[0];
  return `${chosenStyle.promptSuffix}, Panel ${panelIndex + 1} scene: ${panel.imageDescription}. Story mood: "${panel.narrative}". Cinematic camera angle, highly detailed, vivid textures, masterpiece quality.`;
}

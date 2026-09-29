export interface StoryPanel {
  imageDescription: string;
  narrative: string;
}

export interface StoryPage {
  panels: StoryPanel[];
}

export interface ImagePromptResult {
  imagePrompt: string;
  negativePrompt: string;
  compositionNotes?: string;
  panelPrompts: string[];
  pageIndex: number;
  style: string;
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, Send, Loader2, Sparkles, Wand2, Copy, Check, Download, 
  Zap, ChevronDown, ChevronUp, Shuffle, CornerDownLeft, 
  Image as ImageIcon, Palette, Eye, ArrowUpRight, CheckCircle2, 
  RefreshCw, Layers, X
} from 'lucide-react';
import { StoryPanel, StoryPage, ImagePromptResult } from './types';
import { 
  STORY_STARTERS, 
  CATEGORIES, 
  findInstantCompletions, 
  getInstantContinuation, 
  getRandomPremise 
} from './autocompleteData';
import {
  IMAGE_STYLES,
  generateFallbackImagePrompt,
  convertSinglePanelToPrompt
} from './imagePromptHelper';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [numPanels, setNumPanels] = useState<number>(4);
  const [numPages, setNumPages] = useState<number>(1);
  
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-complete States
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [ghostSuggestion, setGhostSuggestion] = useState('');
  const [matchingSuggestions, setMatchingSuggestions] = useState<{ title: string; text: string; category: string }[]>([]);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [showSuggestionsDrawer, setShowSuggestionsDrawer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [autocompleteSuccessToast, setAutocompleteSuccessToast] = useState<string | null>(null);

  // Image Prompt Conversion States
  const [isConvertingImagePrompt, setIsConvertingImagePrompt] = useState(false);
  const [imagePromptResult, setImagePromptResult] = useState<ImagePromptResult | null>(null);
  const [showImagePromptCard, setShowImagePromptCard] = useState(false);
  const [selectedImageStyle, setSelectedImageStyle] = useState('manga');
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null);
  const [panelPromptModal, setPanelPromptModal] = useState<{ title: string; prompt: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imagePromptSectionRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopChange = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => stopChange();
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      stopChange();
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const startChange = (
    e: React.PointerEvent<HTMLButtonElement>,
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min: number,
    max: number
  ) => {
    stopChange();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback if pointer capture fails
    }

    // Immediate change on initial press
    setter(prev => Math.min(max, Math.max(min, prev + delta)));

    const startTime = Date.now();

    const loop = () => {
      const elapsed = Date.now() - startTime;
      let step = 1;
      let nextDelay = 45;

      // Dynamic acceleration curve: accelerates smoothly the longer it is held
      if (elapsed > 3500) {
        step = 25;
        nextDelay = 25;
      } else if (elapsed > 2000) {
        step = 10;
        nextDelay = 30;
      } else if (elapsed > 1000) {
        step = 4;
        nextDelay = 35;
      } else if (elapsed > 400) {
        step = 2;
        nextDelay = 40;
      } else {
        step = 1;
        nextDelay = 45;
      }

      setter(prev => Math.min(max, Math.max(min, prev + delta * step)));
      timerRef.current = setTimeout(loop, nextDelay);
    };

    // Start rapid stepping after a brief 200ms initial hold delay
    timerRef.current = setTimeout(loop, 200);
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const showToast = (msg: string) => {
    setAutocompleteSuccessToast(msg);
    setTimeout(() => setAutocompleteSuccessToast(null), 2500);
  };

  // Autocomplete typing effects
  useEffect(() => {
    const matches = findInstantCompletions(prompt);
    setMatchingSuggestions(matches);

    if (!prompt.trim()) {
      setGhostSuggestion('');
      return;
    }

    const instantGhost = getInstantContinuation(prompt);
    setGhostSuggestion(instantGhost);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const words = prompt.trim().split(/\s+/);
    if (words.length >= 3) {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt.trim() })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.completion) {
              setGhostSuggestion(data.completion);
            }
          }
        } catch {
          // Graceful silent fallback
        }
      }, 1000);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [prompt]);

  const acceptGhostSuggestion = (customText?: string) => {
    const textToAdd = customText !== undefined ? customText : ghostSuggestion;
    if (!textToAdd) return;

    setPrompt(prev => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return textToAdd;
      if (textToAdd.startsWith(' ') || /^[,.;:!?]/.test(textToAdd)) {
        return trimmed + textToAdd;
      }
      return trimmed + ' ' + textToAdd;
    });
    setGhostSuggestion('');
    showToast('Auto-completed!');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && ghostSuggestion) {
      e.preventDefault();
      acceptGhostSuggestion();
    } else if (e.key === 'Escape') {
      setGhostSuggestion('');
      setShowAiOptions(false);
    }
  };

  const handleAiAutocomplete = async () => {
    setIsAutocompleting(true);
    setError(null);
    try {
      const res = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });

      if (!res.ok) {
        throw new Error('Autocomplete server busy');
      }

      const data = await res.json();
      if (data.completion) {
        acceptGhostSuggestion(data.completion);
      } else if (data.suggestions && data.suggestions.length > 0) {
        acceptGhostSuggestion(data.suggestions[0]);
      } else {
        const fallback = getRandomPremise();
        setPrompt(fallback);
        showToast('Generated story idea!');
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setAiOptions(data.suggestions);
        setShowAiOptions(true);
      }
    } catch {
      // Offline / rate-limit resilient fallback
      if (!prompt.trim()) {
        const randomHook = getRandomPremise();
        setPrompt(randomHook);
        showToast('Added creative premise!');
      } else {
        const cont = getInstantContinuation(prompt) || "uncovers a long-forgotten relic that unleashes a mysterious pulse across the galaxy.";
        acceptGhostSuggestion(cont);
      }
    } finally {
      setIsAutocompleting(false);
    }
  };

  const handleRandomPremise = () => {
    const random = getRandomPremise();
    setPrompt(random);
    setGhostSuggestion('');
    showToast('Loaded random premise!');
    textareaRef.current?.focus();
  };

  const handleInsertStarter = (text: string) => {
    if (!prompt.trim()) {
      setPrompt(text);
    } else {
      setPrompt(prev => prev.trimEnd() + ' ' + text);
    }
    setGhostSuggestion('');
    showToast('Inserted into story prompt!');
    textareaRef.current?.focus();
  };

  const handleConvertToImagePrompt = async (targetStyle?: string) => {
    if (pages.length === 0 || !pages[currentPage]) return;
    
    const styleToUse = targetStyle || selectedImageStyle;
    setSelectedImageStyle(styleToUse);
    setIsConvertingImagePrompt(true);
    setShowImagePromptCard(true);

    setTimeout(() => {
      imagePromptSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    try {
      const res = await fetch('/api/convert-to-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: currentPage + 1,
          panels: pages[currentPage].panels,
          style: styleToUse,
          storyPrompt: prompt
        })
      });

      if (!res.ok) {
        throw new Error('Server busy or unavailable');
      }

      const data = await res.json();
      setImagePromptResult({
        imagePrompt: data.imagePrompt,
        negativePrompt: data.negativePrompt,
        compositionNotes: data.compositionNotes,
        panelPrompts: data.panelPrompts || [],
        pageIndex: currentPage,
        style: styleToUse
      });
      showToast(`Created Page ${currentPage + 1} image prompt!`);
    } catch {
      // Seamless client-side fallback
      const fallback = generateFallbackImagePrompt(
        currentPage + 1,
        pages[currentPage].panels,
        styleToUse,
        prompt
      );
      setImagePromptResult(fallback);
      showToast(`Created Page ${currentPage + 1} image prompt!`);
    } finally {
      setIsConvertingImagePrompt(false);
    }
  };

  const handleCopyPromptText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPromptKey(key);
      showToast('Copied to clipboard!');
      setTimeout(() => setCopiedPromptKey(null), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleUseAsInputPrompt = (text: string) => {
    setPrompt(text);
    showToast('Loaded into story input prompt!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    textareaRef.current?.focus();
  };

  const handleConvertSinglePanelPrompt = async (panel: StoryPanel, index: number) => {
    const singlePrompt = convertSinglePanelToPrompt(panel, selectedImageStyle, index);
    setPanelPromptModal({
      title: `Panel ${index + 1} Image Prompt`,
      prompt: singlePrompt
    });
    try {
      await navigator.clipboard.writeText(singlePrompt);
      showToast(`Copied Panel ${index + 1} image prompt!`);
    } catch {
      // fallback
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateStory = async () => {
    if (!prompt && !imageFile) {
      setError('Please provide a text prompt or an image to start.');
      return;
    }

    setError(null);
    setIsGeneratingStory(true);
    setPages([]);

    try {
      let base64Image: any = null;
      if (imageFile) {
        const reader = new FileReader();
        base64Image = await new Promise((resolve) => {
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(';');
            const mimeType = parts[0].split(':')[1];
            const data = parts[1].split(',')[1];
            resolve({ data, mimeType });
          };
          reader.readAsDataURL(imageFile);
        });
      }

      const res = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          numPanels,
          numPages,
          image: base64Image
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate story');
      }

      setPages(data.pages);
      setCurrentPage(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const exportStoryAsText = () => {
    if (pages.length === 0) return;

    let content = 'StoryWeaver AI - Generated Story\n\n';
    
    pages.forEach((page, pageIndex) => {
      content += `--- Page ${pageIndex + 1} ---\n\n`;
      page.panels.forEach((panel, panelIndex) => {
        content += `[Panel ${panelIndex + 1}]\n`;
        content += `Scene: ${panel.imageDescription}\n`;
        content += `Narrative: ${panel.narrative}\n\n`;
      });
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'storyweaver_export.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">StoryWeaver AI</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Craft beautiful stories with AI. Provide a prompt or an image, choose the number of pages and panels, and watch your narrative come to life.
          </p>
        </header>

        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
          <div className="space-y-6">
            
            {/* Input Area with Auto-complete */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  What's your story about?
                </label>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRandomPremise}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors shadow-2xs"
                    title="Generate a random creative prompt starter"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Random Idea</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSuggestionsDrawer(prev => !prev)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl transition-colors shadow-2xs ${
                      showSuggestionsDrawer 
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Browse story starters and genre ideas"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Story Prompts</span>
                    {showSuggestionsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleAiAutocomplete}
                    disabled={isAutocompleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                    title="Auto-complete your thought or generate a fresh idea using AI"
                  >
                    {isAutocompleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Completing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Auto-Complete (AI)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Textarea with Tab completion */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., A cyber detective in Neo-Tokyo uncovers a hidden secret, or press Auto-Complete..."
                  className="w-full min-h-[125px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y text-slate-800 placeholder:text-slate-400 font-normal leading-relaxed text-sm md:text-base"
                />

                {/* Inline Tab Ghost Suggestion Banner */}
                {ghostSuggestion && (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl text-xs text-indigo-950 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0 max-w-full sm:max-w-[70%]">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-indigo-900 shrink-0">Auto-complete suggestion:</span>
                      <span className="italic truncate text-slate-700">"{ghostSuggestion}"</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => acceptGhostSuggestion()}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Accept</span>
                        <kbd className="hidden sm:inline bg-indigo-800/50 px-1 py-0.5 rounded text-[10px] font-mono">Tab</kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGhostSuggestion('')}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs transition-colors"
                        title="Dismiss suggestion (Esc)"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status feedback & AI Plot Directions */}
              {autocompleteSuccessToast && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>{autocompleteSuccessToast}</span>
                </div>
              )}

              {/* AI Plot Directions Options */}
              {showAiOptions && aiOptions.length > 0 && (
                <div className="p-3.5 bg-violet-50/80 rounded-2xl border border-violet-200/80 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      Suggested Plot Continuations:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAiOptions(false)}
                      className="text-xs text-violet-600 hover:text-violet-800"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {aiOptions.map((opt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => acceptGhostSuggestion(opt)}
                        className="p-2.5 text-left bg-white hover:bg-violet-100/60 border border-violet-200 rounded-xl text-xs text-slate-800 hover:text-violet-950 transition-all shadow-2xs hover:shadow-xs group"
                      >
                        <span className="font-semibold text-violet-700 block mb-1">Direction {i + 1}</span>
                        <p className="line-clamp-2 leading-relaxed text-slate-600 group-hover:text-slate-900">{opt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Autocomplete Story Starters Drawer */}
              {showSuggestionsDrawer && (
                <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Instant Premise Starters & Templates:</span>
                    </div>
                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                            selectedCategory === cat
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {(selectedCategory === 'All' 
                      ? STORY_STARTERS 
                      : STORY_STARTERS.filter(s => s.category.toLowerCase().includes(selectedCategory.toLowerCase()))
                    ).map((starter, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleInsertStarter(starter.prompt)}
                        className="p-3 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">{starter.title}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{starter.category}</span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{starter.prompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 items-center pt-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                
                {!imagePreview ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Add Reference Image
                  </button>
                ) : (
                  <div className="relative group inline-block">
                    <img src={imagePreview} alt="Reference" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                    <button 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">How many pages?</label>
                  <span className="text-xs text-slate-400 font-medium">Hold +/- to speed up</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onPointerDown={(e) => startChange(e, setNumPages, -1, 1, 1000)}
                    onPointerUp={stopChange}
                    onPointerLeave={stopChange}
                    onPointerCancel={stopChange}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-all active:scale-95 shrink-0 select-none touch-none shadow-sm hover:shadow"
                    title="Press and hold to decrease quickly"
                    aria-label="Decrease pages"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="1000" 
                      value={numPages || ''}
                      onChange={(e) => setNumPages(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="font-mono text-indigo-600 text-xl font-bold bg-indigo-50 px-2 py-2 rounded-xl border border-indigo-100 text-center w-full min-w-[100px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <button 
                    type="button"
                    onPointerDown={(e) => startChange(e, setNumPages, 1, 1, 1000)}
                    onPointerUp={stopChange}
                    onPointerLeave={stopChange}
                    onPointerCancel={stopChange}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-all active:scale-95 shrink-0 select-none touch-none shadow-sm hover:shadow"
                    title="Press and hold to increase quickly"
                    aria-label="Increase pages"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">Panels per page?</label>
                  <span className="text-xs text-slate-400 font-medium">Hold +/- to speed up</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onPointerDown={(e) => startChange(e, setNumPanels, -1, 1, 1000)}
                    onPointerUp={stopChange}
                    onPointerLeave={stopChange}
                    onPointerCancel={stopChange}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-all active:scale-95 shrink-0 select-none touch-none shadow-sm hover:shadow"
                    title="Press and hold to decrease quickly"
                    aria-label="Decrease panels per page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1" 
                      max="1000" 
                      value={numPanels || ''}
                      onChange={(e) => setNumPanels(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="font-mono text-indigo-600 text-xl font-bold bg-indigo-50 px-2 py-2 rounded-xl border border-indigo-100 text-center w-full min-w-[100px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <button 
                    type="button"
                    onPointerDown={(e) => startChange(e, setNumPanels, 1, 1, 1000)}
                    onPointerUp={stopChange}
                    onPointerLeave={stopChange}
                    onPointerCancel={stopChange}
                    onContextMenu={(e) => e.preventDefault()}
                    className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-all active:scale-95 shrink-0 select-none touch-none shadow-sm hover:shadow"
                    title="Press and hold to increase quickly"
                    aria-label="Increase panels per page"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={generateStory}
              disabled={isGeneratingStory}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              {isGeneratingStory ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Weaving your story...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Story
                </>
              )}
            </button>
          </div>
        </section>

        {pages.length > 0 && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Your Story</h2>
                <p className="text-xs text-slate-500">Page {currentPage + 1} of {pages.length} • {pages[currentPage]?.panels.length || 0} Panels</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleConvertToImagePrompt()}
                  disabled={isConvertingImagePrompt}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-all text-sm shadow-sm active:scale-95 cursor-pointer disabled:opacity-60"
                  title="Convert this story page into a master image generation prompt"
                >
                  {isConvertingImagePrompt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Convert Page to Image Prompt</span>
                    </>
                  )}
                </button>

                <button 
                  onClick={exportStoryAsText}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export Text</span>
                </button>
              </div>
            </div>
            
            {/* Pagination Tabs */}
            <div className="flex flex-wrap gap-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                    currentPage === index 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Page {index + 1}
                </button>
              ))}
            </div>

            {/* Image Prompt Generation Result Card */}
            {showImagePromptCard && (
              <div 
                ref={imagePromptSectionRef}
                className="bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-indigo-500/40 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500"
              >
                {/* Header & Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold tracking-tight text-white">
                          Image Prompt for Page {currentPage + 1}
                        </h3>
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/30">
                          {IMAGE_STYLES.find(s => s.id === selectedImageStyle)?.name || 'Manga'}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200/80 mt-0.5">
                        Synthesized from {pages[currentPage]?.panels.length || 0} story panels • Ready for Midjourney, Imagen, DALL-E, & SD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConvertToImagePrompt()}
                      disabled={isConvertingImagePrompt}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium transition-colors border border-white/10 cursor-pointer"
                      title="Re-generate image prompt"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isConvertingImagePrompt ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                    <button
                      onClick={() => setShowImagePromptCard(false)}
                      className="p-1.5 text-indigo-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                      title="Close image prompt card"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Style Selector Chips */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider block">
                    Choose Visual Art Style:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {IMAGE_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleConvertToImagePrompt(style.id)}
                        disabled={isConvertingImagePrompt}
                        className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                          selectedImageStyle === style.id
                            ? 'bg-indigo-600/80 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400/40'
                            : 'bg-white/5 hover:bg-white/10 text-indigo-200 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{style.icon}</span>
                          <span>{style.name}</span>
                        </div>
                        <p className="text-[10px] text-indigo-300/70 mt-1 line-clamp-1">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Image Prompt Box */}
                {isConvertingImagePrompt ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3 text-indigo-200">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-sm font-medium">Synthesizing story panels into an artistic master prompt...</p>
                  </div>
                ) : imagePromptResult ? (
                  <div className="space-y-4">
                    {/* Master Prompt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                          Master Page Image Prompt:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUseAsInputPrompt(imagePromptResult.imagePrompt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-lg transition-colors border border-white/10 cursor-pointer"
                            title="Load this prompt into the story input box"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Use as Input</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPromptText(imagePromptResult.imagePrompt, 'master')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer active:scale-95"
                          >
                            {copiedPromptKey === 'master' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Image Prompt</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-black/40 rounded-2xl border border-indigo-500/30 text-indigo-50 font-mono text-xs md:text-sm leading-relaxed select-all">
                        {imagePromptResult.imagePrompt}
                      </div>
                    </div>

                    {/* Negative Prompt & Composition notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {imagePromptResult.compositionNotes && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                          <span className="font-bold text-indigo-300 block uppercase text-[10px]">Composition & Lighting:</span>
                          <p className="text-indigo-100/90 leading-relaxed">{imagePromptResult.compositionNotes}</p>
                        </div>
                      )}

                      {imagePromptResult.negativePrompt && (
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-300 block uppercase text-[10px]">Negative Prompt:</span>
                            <button
                              type="button"
                              onClick={() => handleCopyPromptText(imagePromptResult.negativePrompt, 'negative')}
                              className="text-[10px] text-indigo-300 hover:text-white underline cursor-pointer"
                            >
                              {copiedPromptKey === 'negative' ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-indigo-200/70 font-mono text-[11px] leading-relaxed select-all truncate">{imagePromptResult.negativePrompt}</p>
                        </div>
                      )}
                    </div>

                    {/* Individual Panel Prompts */}
                    {imagePromptResult.panelPrompts && imagePromptResult.panelPrompts.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-indigo-800/60">
                        <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider block">
                          Individual Panel Prompts ({imagePromptResult.panelPrompts.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {imagePromptResult.panelPrompts.map((pPrompt, pIdx) => (
                            <div 
                              key={pIdx} 
                              className="p-3 bg-black/25 rounded-xl border border-white/10 text-xs flex flex-col justify-between gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-indigo-300 text-[11px]">Panel {pIdx + 1} Prompt</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPromptText(pPrompt, `panel-${pIdx}`)}
                                  className="text-[11px] px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-indigo-200 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedPromptKey === `panel-${pIdx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedPromptKey === `panel-${pIdx}` ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                              <p className="text-indigo-100/80 font-mono text-[11px] line-clamp-2">{pPrompt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
            {/* Current Page Content Panel */}
            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 relative min-h-[350px] flex flex-col">
              <div className="absolute top-0 right-0 flex items-center">
                <button
                  onClick={() => handleConvertToImagePrompt()}
                  disabled={isConvertingImagePrompt}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3.5 py-1.5 rounded-bl-2xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border-b border-l border-indigo-100"
                  title="Convert this page into an AI image prompt"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Page Image Prompt</span>
                </button>
                <div className="bg-indigo-100 text-indigo-800 font-bold px-4 py-1.5 rounded-tr-3xl text-sm">
                  Page {currentPage + 1}
                </div>
              </div>
              
              <div className="flex-1 space-y-8 mt-6">
                {pages[currentPage].panels.map((panel, pIndex) => (
                  <div key={pIndex} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative">
                    <div className="absolute -top-3 -left-3 bg-slate-800 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm">
                      {pIndex + 1}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Scene Description</h3>
                      <p className="text-sm text-slate-500 italic">{panel.imageDescription}</p>
                    </div>
                    
                    <div className="pt-6 mt-4 border-t border-slate-200 relative group">
                      <p className="text-xl text-slate-800 leading-relaxed font-serif pr-32">
                        {panel.narrative}
                      </p>
                      <div className="absolute bottom-0 right-0 flex items-center gap-1.5">
                        <button
                          onClick={() => handleConvertSinglePanelPrompt(panel, pIndex)}
                          className="px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs cursor-pointer opacity-90 group-hover:opacity-100"
                          title="Generate & copy image prompt for this panel"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Panel Image Prompt</span>
                        </button>
                        <button
                          onClick={() => handleCopy(panel.narrative, pIndex)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-2xs"
                          title="Copy narrative"
                        >
                          {copiedIndex === pIndex ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between items-center pt-8 mt-auto border-t border-slate-100">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-200 transition-colors font-medium text-sm"
                >
                  Previous Page
                </button>
                <span className="text-sm font-medium text-slate-400">
                  Page {currentPage + 1} of {pages.length}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                  disabled={currentPage === pages.length - 1}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-200 transition-colors font-medium text-sm"
                >
                  Next Page
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Modal for Single Panel Image Prompt */}
        {panelPromptModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{panelPromptModal.title}</h3>
                    <p className="text-xs text-slate-500">Image generation prompt for this panel</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPanelPromptModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs md:text-sm font-mono leading-relaxed select-all border border-slate-800">
                {panelPromptModal.prompt}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Copied to clipboard automatically!
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleUseAsInputPrompt(panelPromptModal.prompt);
                      setPanelPromptModal(null);
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Use as Input
                  </button>
                  <button
                    onClick={() => setPanelPromptModal(null)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

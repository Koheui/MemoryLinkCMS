"use client";

import { useState } from 'react';
import { suggestTheme, SuggestThemeOutput } from '@/ai/flows/suggest-theme';
import type { Memory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2 } from 'lucide-react';

interface ThemeSuggesterProps {
  memory: Memory;
}

export function ThemeSuggester({ memory }: ThemeSuggesterProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestThemeOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestTheme = async () => {
    setLoading(true);
    setSuggestion(null);
    try {
      const result = await suggestTheme({
        memoryTitle: memory.title,
        description: memory.description,
        // photoDataUris: [] // In a real app, you would provide photo data URIs here
      });
      setSuggestion(result);
      toast({
        title: 'Theme Suggested!',
        description: `AI suggested the theme "${result.theme.themeName}".`,
      });
    } catch (error) {
      console.error('Failed to suggest theme:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate a theme. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTheme = () => {
    if (!suggestion) return;
    // In a real app, you would dispatch an action to update the memory's theme in Firestore
    // For example: updateMemoryTheme(memory.id, suggestion.theme);
    toast({
      title: 'Theme Applied!',
      description: `The "${suggestion.theme.themeName}" theme has been applied to your memory page.`,
    });
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSuggestTheme} disabled={loading} size="lg">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        {loading ? 'Generating...' : 'Suggest a Theme with AI'}
      </Button>

      {suggestion && (
        <div className="p-4 border rounded-lg bg-background animate-in fade-in-50">
          <h3 className="font-bold text-lg mb-2 font-headline">AI Suggestion: <span className="text-primary">{suggestion.theme.themeName}</span></h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <p className="font-semibold">Colors</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: suggestion.theme.primaryColor }} title={`Primary: ${suggestion.theme.primaryColor}`}></div>
                  <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: suggestion.theme.backgroundColor }} title={`Background: ${suggestion.theme.backgroundColor}`}></div>
                  <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: suggestion.theme.accentColor }} title={`Accent: ${suggestion.theme.accentColor}`}></div>
                </div>
            </div>
            <div className="space-y-2">
                <p className="font-semibold">Typography</p>
                <div>
                    <p>Headline: <span className="font-medium" style={{ fontFamily: suggestion.theme.headlineFontFamily }}>{suggestion.theme.headlineFontFamily}</span></p>
                    <p>Body: <span className="font-medium" style={{ fontFamily: suggestion.theme.fontFamily }}>{suggestion.theme.fontFamily}</span></p>
                </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleApplyTheme}>Apply Theme</Button>
          </div>
        </div>
      )}
    </div>
  );
}

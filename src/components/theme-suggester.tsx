
"use client";

import { useState } from 'react';
import { suggestTheme, SuggestThemeOutput } from '@/ai/flows/suggest-theme';
import type { Memory, Design } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2, Check } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';


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
      // In a real app, you might want to fetch actual photo data URIs
      // For this prototype, we'll rely on title and description
      const result = await suggestTheme({
        memoryTitle: memory.title,
        description: memory.description,
        // photoDataUris: [] 
      });
      setSuggestion(result);
      toast({
        title: 'テーマを提案しました！',
        description: `AIが「${result.theme.themeName}」を提案しました。`,
      });
    } catch (error) {
      console.error('Failed to suggest theme:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'テーマの生成に失敗しました。もう一度お試しください。',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTheme = async () => {
    if (!suggestion) return;
    setLoading(true);

    try {
        const memoryRef = doc(db, 'memories', memory.id);
        const newDesign: Partial<Design> = {
            theme: suggestion.theme.themeName.toLowerCase() as Design['theme'] || 'light',
            // Note: The AI doesn't suggest all theme properties from the spec,
            // so we are only applying the ones it does provide.
            // In a real app, the AI prompt would be tuned to return all necessary values.
        };

        await updateDoc(memoryRef, {
            design: {
                ...memory.design, // Preserve existing settings like fontScale
                ...newDesign,
            },
            updatedAt: serverTimestamp(),
        });

        toast({
            title: 'テーマを適用しました！',
            description: `「${suggestion.theme.themeName}」のテーマがあなたの想い出ページに適用されました。`,
        });
    } catch (error) {
         console.error('Failed to apply theme:', error);
        toast({
            variant: 'destructive',
            title: 'エラー',
            description: 'テーマの適用に失敗しました。',
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleSuggestTheme} disabled={loading} size="lg">
        {loading && !suggestion ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        {loading && !suggestion ? '生成中...' : 'AIでテーマを提案'}
      </Button>

      {suggestion && (
        <div className="p-4 border rounded-lg bg-background animate-in fade-in-50">
          <h3 className="font-bold text-lg mb-2 font-headline">AIの提案: <span className="text-primary">{suggestion.theme.themeName}</span></h3>
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
            <Button onClick={handleApplyTheme} disabled={loading}>
                 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                テーマを適用
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

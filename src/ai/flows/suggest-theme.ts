// src/ai/flows/suggest-theme.ts
'use server';
/**
 * @fileOverview A theme suggestion AI agent.
 *
 * - suggestTheme - A function that suggests a theme based on the memory page content.
 * - SuggestThemeInput - The input type for the suggestTheme function.
 * - SuggestThemeOutput - The return type for the suggestTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestThemeInputSchema = z.object({
  memoryTitle: z.string().describe('The title of the memory.'),
  photoDataUris: z.array(z.string()).describe(
    'A list of photos of the memory page, as data URIs that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
  ).optional(),
  description: z.string().describe('The description of the memory.').optional(),
});
export type SuggestThemeInput = z.infer<typeof SuggestThemeInputSchema>;

const SuggestThemeOutputSchema = z.object({
  theme: z.object({
    themeName: z.string().describe('The name of the suggested theme.'),
    primaryColor: z.string().describe('The primary color of the theme (hex code).'),
    backgroundColor: z.string().describe('The background color of the theme (hex code).'),
    accentColor: z.string().describe('The accent color of the theme (hex code).'),
    fontFamily: z.string().describe('The font family of the theme.'),
    headlineFontFamily: z.string().describe('The headline font family of the theme.'),
  }).describe('The suggested theme based on the provided content.'),
});
export type SuggestThemeOutput = z.infer<typeof SuggestThemeOutputSchema>;

export async function suggestTheme(input: SuggestThemeInput): Promise<SuggestThemeOutput> {
  return suggestThemeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestThemePrompt',
  input: {schema: SuggestThemeInputSchema},
  output: {schema: SuggestThemeOutputSchema},
  prompt: `You are an expert design assistant that specializes in generating themes for memory pages.

  Based on the content of the memory page, you will suggest a theme that would be appropriate for the user.
  You should consider the title, description, and photos of the memory page when suggesting a theme.
  If there are no photos, or the description is empty, use the title as the primary source of information.
  The suggested theme should include a theme name, primary color, background color, accent color, font family and headline font family.

  Here's the information about the memory page:
  Title: {{{memoryTitle}}}
  {{#if description}}
  Description: {{{description}}}
  {{/if}}
  {{#if photoDataUris}}
  Photos:
  {{#each photoDataUris}}
  {{media url=this}}
  {{/each}}
  {{/if}}
  `,
});

const suggestThemeFlow = ai.defineFlow(
  {
    name: 'suggestThemeFlow',
    inputSchema: SuggestThemeInputSchema,
    outputSchema: SuggestThemeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

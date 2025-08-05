'use server';
/**
 * @fileOverview An AI flow to generate descriptive tags for a given file.
 *
 * - generateTagsForFile - A function that analyzes a file and suggests tags.
 * - GenerateTagsForFileInput - The input type for the generateTagsForFile function.
 * - GenerateTagsForFileOutput - The return type for the generateTagsForFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateTagsForFileInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "A file represented as a data URI, including MIME type and Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  fileName: z.string().describe('The original name of the file.'),
  fileType: z.string().describe('The MIME type of the file.'),
});
export type GenerateTagsForFileInput = z.infer<typeof GenerateTagsForFileInputSchema>;

const GenerateTagsForFileOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of 3-5 relevant, one-word, lowercase tags in Spanish that describe the file content.'),
});
export type GenerateTagsForFileOutput = z.infer<typeof GenerateTagsForFileOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateTagsForFilePrompt',
  input: {schema: GenerateTagsForFileInputSchema},
  output: {schema: GenerateTagsForFileOutputSchema},
  prompt: `
    You are an expert file organizer. Your task is to analyze the provided file and generate between 3 and 5 relevant, one-word, lowercase descriptive tags in Spanish.

    The tags should accurately represent the main content or purpose of the file. Consider the file name, type, and its content.

    File Information:
    - File Name: {{{fileName}}}
    - File Type: {{{fileType}}}
    - File Content: {{media url=fileDataUri}}

    Generate 3-5 relevant, one-word, lowercase tags in Spanish based on the file's content.
  `,
});

const generateTagsForFileFlow = ai.defineFlow(
  {
    name: 'generateTagsForFileFlow',
    inputSchema: GenerateTagsForFileInputSchema,
    outputSchema: GenerateTagsForFileOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        return { tags: ['archivo', 'documento', 'sin-etiqueta'] };
    }
    return output;
  }
);


export async function generateTagsForFile(input: GenerateTagsForFileInput): Promise<GenerateTagsForFileOutput> {
    if (ai.isMocked) {
        console.warn("Genkit 'ai' object is mocked. AI tagging will be disabled.");
        return { tags: ["tag1-mock", "tag2-mock"] };
    }
    
    try {
        const result = await generateTagsForFileFlow(input);
        return result;
    } catch (error) {
        console.error("Error executing generateTagsForFile:", error);
        let errorTags = ["error-ia"];
        if (error instanceof Error) {
            if (error.message.includes("API key not valid")) {
                errorTags.push("api-key-invalida");
            } else {
                 errorTags.push("error-procesamiento");
            }
        }
        return { tags: errorTags };
    }
}

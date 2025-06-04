import { OpenAIEmbeddings } from "@langchain/openai";
import { globalConfig } from "../config/globalConfig";

// In chrome-extension/src/services/embeddingService.ts
class EmbeddingService {
    private openai_embedding: OpenAIEmbeddings | null = null;
    
    /**
     * Reset the embedding service to pick up new API keys
     */
    reset(): void {
        this.openai_embedding = null;
    }
    
    private async ensureInitialized(): Promise<void> {
        // Always get the latest API key from global config
        await globalConfig.initialize();
        const apiKey = globalConfig.getOpenAIApiKey();
        
        if (!apiKey) {
            throw new Error('OpenAI API key not found in configuration');
        }
        
        // Reinitialize if we don't have an instance or if the API key changed
        if (!this.openai_embedding) {
            this.openai_embedding = new OpenAIEmbeddings({
                apiKey: apiKey, 
                model: 'text-embedding-3-small'
            });
        }
    }
    
    async embedText(text: string): Promise<number[]> {
        await this.ensureInitialized();
        
        if (!this.openai_embedding) {
            throw new Error('Embedding service not properly initialized');
        }
        
        const embedded_text = await this.openai_embedding.embedQuery(text);
        return embedded_text;
    }
}

export const embeddingService = new EmbeddingService();
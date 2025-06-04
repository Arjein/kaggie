// Configuration and initialization helpers
export interface KaggieAgentConfig {
  openaiApiKey: string;
  backendUrl?: string;
  enablePersistence?: boolean;
  model?: string;
  temperature?: number;
}

export const defaultConfig: Partial<KaggieAgentConfig> = {
  backendUrl: 'https://kaggie-backend.onrender.com',
  enablePersistence: true,
  model: 'gpt-4o-mini',
  temperature: 0.1,
};

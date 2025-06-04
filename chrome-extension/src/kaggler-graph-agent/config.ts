// Configuration and initialization helpers
export interface KagglerAgentConfig {
  openaiApiKey: string;
  backendUrl?: string;
  enablePersistence?: boolean;
  model?: string;
  temperature?: number;
}

export const defaultConfig: Partial<KagglerAgentConfig> = {
  backendUrl: 'https://kaggler-api.herokuapp.com',
  enablePersistence: true,
  model: 'gpt-4o-mini',
  temperature: 0.1,
};

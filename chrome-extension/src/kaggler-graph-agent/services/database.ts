import { globalConfig } from "../../config/globalConfig";

// Exact mirror of backend/src/services/database.py
export class DatabaseService {
  constructor(backendUrl: string) {
    // Store backendUrl for potential future use
    console.log('DatabaseService initialized with backend URL:', backendUrl);
  }

  async getCompetition(competitionId: string) {
    try {
      const backendUrl = globalConfig.getBackendUrl();
      const fullUrl = `${backendUrl}/api/competition/${competitionId}`;
      console.log(`DatabaseService: Fetching competition from: ${fullUrl}`);
      
      const response = await fetch(fullUrl);
      console.log(`DatabaseService: Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch competition: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`DatabaseService: Received data:`, {
        hasTitle: !!data.title,
        hasDescription: !!data.description,
        hasEvaluation: !!data.evaluation,
        titleLength: data.title?.length || 0,
        descriptionLength: data.description?.length || 0,
        evaluationLength: data.evaluation?.length || 0,
        rawData: data
      });
      
      return data;
    } catch (error) {
      console.error('Database service error:', error);
      return {
        title: competitionId,
        description: 'Competition description not available',
        evaluation: 'Evaluation criteria not available'
      };
    }
  }
}

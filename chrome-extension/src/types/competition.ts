export interface Competition {
  id: string;
  title: string;
  deadline?: string;
  url: string;
  status?: 'active' | 'rolling' | 'passed';
}

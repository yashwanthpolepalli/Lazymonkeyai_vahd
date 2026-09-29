export interface Trainer {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  specialization: string;
  clients: number;
  rating: number;
  sessions: number;
  revenue: number;
  availability: string;
}

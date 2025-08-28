export interface Player {
  name: string;
  score: number;
  yellowCard: boolean;
  sittingOut: boolean;
}

export interface PreviousPlayer {
  name: string;
  finalScore: number;
  removedAt: string;
}

export interface ScoreInputProps {
  players: Player[];
  onSubmit: (scores: number[]) => void;
  onYellowCard: (index: number) => void;
  onSittingOutChange: (index: number, value: boolean) => void;
}

export interface Settings {
  minimumUnit: number;
  enableYellowCards: boolean;
  redCardPenalty: number;
  zeroSumMode: boolean;
}

export interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}
export interface QianWenResponse {
  output: {
    choices?: Array<{
      message: {
        content: string;
      };
    }>;
    text?: string;
  } | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface LevelGenRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  width: number;
  height: number;
  elements: string[];
  theme?: string;
}

export interface LevelGenResult {
  map: {
    width: number;
    height: number;
    cells: Array<{ x: number; y: number; type: string; dir?: string }>;
    stars: Array<{ x: number; y: number; type: string }>;
  };
  hint: string;
  minCommands: number;
}

export interface SolverRequest {
  map: {
    width: number;
    height: number;
    cells: Array<{ x: number; y: number; type: string }>;
    stars: Array<{ x: number; y: number }>;
  };
  startX: number;
  startY: number;
  startDir: string;
  goalX: number;
  goalY: number;
}

export interface SolverResult {
  commands: Array<{
    type: string;
    params?: {
      times?: number;
      condition?: string;
    };
  }>;
  explanation: string;
}

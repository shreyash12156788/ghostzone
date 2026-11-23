import { IGameService, MockGameService } from './gameService';
import { SocketGameService } from './socketGameService';

const isMock = import.meta.env.VITE_USE_MOCK === 'true';

export const gameService: IGameService = isMock
  ? new MockGameService()
  : new SocketGameService();

export * from './gameService';
export * from './socketGameService';

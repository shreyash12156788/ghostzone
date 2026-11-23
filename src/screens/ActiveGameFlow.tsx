import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import { RoleRevealScreen } from './RoleRevealScreen';
import { HidingPhaseScreen } from './HidingPhaseScreen';
import { LiveGameScreen } from './LiveGameScreen';
import { ResultsScreen } from './ResultsScreen';

export const ActiveGameFlow: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const room = useGameStore((state) => state.room);
  const setRoom = useGameStore((state) => state.setRoom);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameService.subscribeToRoom(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        navigate('/');
        return;
      }
      setRoom(updatedRoom);

      if (updatedRoom.phase === 'LOBBY') {
        navigate(`/lobby/${roomId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, navigate, setRoom]);

  if (!room || !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  switch (room.phase) {
    case 'ROLE_REVEAL':
      return <RoleRevealScreen />;
    case 'HIDING':
      return <HidingPhaseScreen />;
    case 'PLAYING':
      return <LiveGameScreen />;
    case 'ENDED':
      return <ResultsScreen />;
    case 'LOBBY':
    default:
      return null;
  }
};

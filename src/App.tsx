import React, { useState, useEffect } from 'react';
import { Settings2, Users } from 'lucide-react';
import { PlayerSetup } from './components/PlayerSetup';
import { ScoreInput } from './components/ScoreInput';
import { ScoreHistory } from './components/ScoreHistory';
import { TotalScores } from './components/TotalScores';
import { Settings } from './components/Settings';
import { PlayerManagement } from './components/PlayerManagement';
import { Footer } from './components/Footer';
import { Imprint } from './pages/Imprint';
import { Player, PreviousPlayer } from './types';
import { useSettings } from './contexts/SettingsContext';
import { useAuth } from './contexts/AuthContext';
import { calculateTotalScores } from './utils/scoreUtils';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [previousPlayers, setPreviousPlayers] = useState<PreviousPlayer[]>([]);
  const [scores, setScores] = useState<number[][]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);
  const { settings } = useSettings();
  const { signOut } = useAuth();

  useEffect(() => {
    const storedPlayers = localStorage.getItem('players');
    const storedScores = localStorage.getItem('scores');
    const storedPreviousPlayers = localStorage.getItem('previousPlayers');
    
    if (storedPlayers && storedScores) {
      setPlayers(JSON.parse(storedPlayers));
      setScores(JSON.parse(storedScores));
      setShowSetup(false);
    }
    
    if (storedPreviousPlayers) {
      setPreviousPlayers(JSON.parse(storedPreviousPlayers));
    }
  }, []);

  const handlePlayerSetup = (playerNames: string[]) => {
    const newPlayers = playerNames.map(name => ({
      name,
      score: 0,
      yellowCard: false,
      sittingOut: false
    }));

    setPlayers(newPlayers);
    setScores([]);
    setPreviousPlayers([]);
    setShowSetup(false);
    localStorage.setItem('players', JSON.stringify(newPlayers));
    localStorage.setItem('scores', JSON.stringify([]));
    localStorage.setItem('previousPlayers', JSON.stringify([]));
  };

  const path = window.location.pathname;
  if (path === '/imprint') return <Imprint />;

  if (showSetup) {
    return <PlayerSetup onSubmit={handlePlayerSetup} />;
  }

  const handleAddPlayer = (name: string, initialScore: number = 0) => {
    const newPlayer: Player = {
      name,
      score: initialScore,
      yellowCard: false,
      sittingOut: false
    };
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));
  };

  const handleRemovePlayer = (index: number) => {
    const playerToRemove = players[index];
    const totalScores = calculateTotalScores(scores, players.length);
    const finalScore = totalScores[index];

    // Add to previous players
    const newPreviousPlayer: PreviousPlayer = {
      name: playerToRemove.name,
      finalScore: finalScore,
      removedAt: new Date().toISOString()
    };
    const updatedPreviousPlayers = [...previousPlayers, newPreviousPlayer];
    setPreviousPlayers(updatedPreviousPlayers);
    localStorage.setItem('previousPlayers', JSON.stringify(updatedPreviousPlayers));

    // Remove player from active list
    const updatedPlayers = players.filter((_, i) => i !== index);
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));

    // Remove player's scores from history
    const updatedScores = scores.map(roundScores => 
      roundScores.filter((_, i) => i !== index)
    );
    setScores(updatedScores);
    localStorage.setItem('scores', JSON.stringify(updatedScores));
  };

  const handleRemovePreviousPlayer = (name: string) => {
    const updatedPreviousPlayers = previousPlayers.filter(p => p.name !== name);
    setPreviousPlayers(updatedPreviousPlayers);
    localStorage.setItem('previousPlayers', JSON.stringify(updatedPreviousPlayers));
  };

  const handleScoreSubmit = (newScores: number[]) => {
    const updatedScores = [...scores, newScores];
    setScores(updatedScores);
    localStorage.setItem('scores', JSON.stringify(updatedScores));

    // Update sitting out status
    const nextPlayers = players.map((player, i) => ({
      ...player,
      sittingOut: i > 0 ? players[i-1].sittingOut : players[players.length-1].sittingOut
    }));
    setPlayers(nextPlayers);
    localStorage.setItem('players', JSON.stringify(nextPlayers));
  };

  const handleYellowCard = (playerIndex: number) => {
    const updatedPlayers = players.map((player, index) => 
      index === playerIndex 
        ? { ...player, yellowCard: !player.yellowCard }
        : player
    );
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));
  };

  const handleSittingOutChange = (playerIndex: number, value: boolean) => {
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex].sittingOut = value;
    setPlayers(updatedPlayers);
    localStorage.setItem('players', JSON.stringify(updatedPlayers));
  };

  const handleRemoveLastScore = () => {
    if (scores.length === 0) return;
    const newScores = scores.slice(0, -1);
    setScores(newScores);
    localStorage.setItem('scores', JSON.stringify(newScores));
  };

  const handleNewGame = () => {
    if (confirm('Start a new game? This will reset all scores.')) {
      setShowSetup(true);
      setPlayers([]);
      setScores([]);
      setPreviousPlayers([]);
      localStorage.removeItem('players');
      localStorage.removeItem('scores');
      localStorage.removeItem('previousPlayers');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-4 pb-8">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533134486753-c833f0ed4866?q=80&w=3270&auto=format&fit=crop')] opacity-5 bg-cover bg-center pointer-events-none" />
      <div className="relative max-w-5xl mx-auto">
        <header className="text-center mb-8 pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowPlayerManagement(true)}
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                title="Manage Players"
              >
                <Users className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Scorekeeper
            </h1>
            <div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings2 className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <TotalScores 
            players={players} 
            scores={scores}
            previousPlayers={previousPlayers}
          />
          <ScoreInput
            players={players}
            onSubmit={handleScoreSubmit}
            onYellowCard={handleYellowCard}
            onSittingOutChange={handleSittingOutChange}
          />
        </div>

        <ScoreHistory
          players={players}
          scores={scores}
          onRemoveLastScore={handleRemoveLastScore}
          onNewGame={handleNewGame}
        />
        
        <PlayerManagement
          isOpen={showPlayerManagement}
          onClose={() => setShowPlayerManagement(false)}
          players={players}
          previousPlayers={previousPlayers}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          onRemovePreviousPlayer={handleRemovePreviousPlayer}
        />

        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSignOut={signOut}
        />

        <Footer />
      </div>
    </div>
  );
}

export default App;
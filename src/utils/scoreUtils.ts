export const calculateTotalScores = (scores: number[][], playerCount: number): number[] => {
  return Array(playerCount).fill(0).map((_, playerIndex) =>
    scores.reduce((sum, round) => {
      // If this round doesn't have a score for this player (added later), return current sum
      if (playerIndex >= round.length) return sum;
      return sum + round[playerIndex];
    }, 0)
  );
};

export const isValidScore = (score: number, minimumUnit: number): boolean => {
  // Check if the score is a multiple of minimumUnit
  return Math.abs(score % minimumUnit) < 0.01;
};

export const balanceScores = (
  scores: number[],
  sittingOutIndices: number[],
  minimumUnit: number
): { scores: number[], isValid: boolean } => {
  // Keep sitting out players' scores at 0
  const workingScores = scores.map((score, index) => 
    sittingOutIndices.includes(index) ? 0 : score
  );

  // Check if all non-zero scores are multiples of minimumUnit
  const hasInvalidScores = workingScores.some(score => 
    score !== 0 && !isValidScore(score, minimumUnit)
  );

  if (hasInvalidScores) {
    return { scores: workingScores, isValid: false };
  }

  const totalScore = workingScores.reduce((sum, score) => sum + score, 0);
  const zeroScores = workingScores.filter((score, index) => 
    score === 0 && !sittingOutIndices.includes(index)
  ).length;
  
  if (totalScore !== 0 && zeroScores > 0) {
    const balanceValue = -(totalScore / zeroScores);
    
    // Check if balance value is a multiple of minimumUnit
    if (!isValidScore(balanceValue, minimumUnit)) {
      return { scores: workingScores, isValid: false };
    }
    
    return {
      scores: workingScores.map((score, index) => 
        sittingOutIndices.includes(index) ? 0 :
        score === 0 ? balanceValue : score
      ),
      isValid: true
    };
  }
  
  return { scores: workingScores, isValid: true };
};

export const generateRedCardScores = (playerIndex: number, playerCount: number, penalty: number): number[] => {
  return Array(playerCount).fill(penalty).map((value, index) => 
    index === playerIndex ? -penalty * (playerCount - 1) : value
  );
};

export const generateCSV = (players: string[], scores: number[][]): string => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += players.join(',') + '\n';
  scores.forEach(round => {
    csvContent += round.join(',') + '\n';
  });
  csvContent += '\nTotal Scores\n';
  const totalScores = calculateTotalScores(scores, players.length);
  csvContent += players.map((name, i) => `${name},${totalScores[i]}`).join('\n');
  return csvContent;
};
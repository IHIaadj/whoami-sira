import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db, ref, onValue, set, get, update } from "../firebase";
import CharacterCard from "../components/CharacterCard";
import { useTranslation } from "react-i18next";

const charactersPool = [
  "waraka",
  "khadija",
  "abu_bakr",
  "umar",
  "bilal", 
  "salman",
  "uthman",
  "abdullah_az_zubayr",
  "ali",
  "abdurrahman",
  "talha",
  "abu_ubaidah",
  "saad",
  "saeed",
  "um_kulthum",
  "hafsa",
  "sumayya",
  "aisha", 
  "zaynab_bint_djahch", 
  "umm_salama"
];

export default function GamePage() {
  const { code } = useParams();
  const [playerName] = useState(() => localStorage.getItem("playerName"));
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [timer, setTimer] = useState(120);
  const timerRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintFact, setHintFact] = useState("");

  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  useEffect(() => {
    const playersRef = ref(db, `teams/${code}/players`);
    const metaRef = ref(db, `teams/${code}/meta`);

    onValue(playersRef, (snap) => {
      const data = snap.val();
      setPlayers(data ? Object.values(data) : []);
    });

    onValue(metaRef, (snap) => {
      const host = snap.val()?.host;
      setIsHost(host === playerName);
    });
  }, [code, playerName]);

  useEffect(() => {
    const gameRef = ref(db, `teams/${code}/game`);

    if (isHost && players.length > 0) {
      initializeGame();
    }

    onValue(gameRef, (snap) => {
      const data = snap.val();
      if (data) setGameState(data);
    });
  }, [isHost, players]);

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const initializeGame = async () => {
    const gameRef = ref(db, `teams/${code}/game`);
    const snap = await get(gameRef);

    if (!snap.exists()) {
      const shuffledPlayers = shuffleArray(players);
      const shuffledCharacters = shuffleArray(charactersPool);

      const assignedChars = {};
      shuffledPlayers.forEach((p, i) => {
        assignedChars[p] = shuffledCharacters[i % shuffledCharacters.length];
      });


      await set(gameRef, {
        turnOrder: shuffledPlayers,
        currentTurnIndex: 0,
        characters: assignedChars,
        validated: false,
        remainingTime: 120,
        guessTimes: {},
        gameFinished: false,
        tentativePlayer: null,
        tentativeCount: {},
        completed: []
      });
    }
  };
  
  useEffect(() => {
    if (!gameState || !isHost || gameState.gameFinished) return;
  
    const currentPlayer = gameState.turnOrder?.[gameState.currentTurnIndex];
    if (!currentPlayer || gameState.tentativePlayer) return;
  
    let countdown = gameState.remainingTime ?? 120;
  
    clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      let newCountdown = countdown - 1;
  
      // If someone used a hint, apply penalty once
      if (gameState.hintUsedBy === currentPlayer) {
        newCountdown = Math.max(newCountdown - 8, 0); // apply 8s penalty
        await update(ref(db, `teams/${code}/game`), {
          hintUsedBy: null, // reset flag
          remainingTime: newCountdown
        });
      } else {
        await set(ref(db, `teams/${code}/game/remainingTime`), newCountdown);
      }
  
      countdown = newCountdown;
  
      if (newCountdown <= 0) {
        clearInterval(timerRef.current);
        handleEndTurn(false);
      }
    }, 1000);
  
    return () => clearInterval(timerRef.current);
  }, [gameState?.currentTurnIndex, gameState?.tentativePlayer, isHost, gameState?.hintUsedBy]);
  
  
  useEffect(() => {
    const timeRef = ref(db, `teams/${code}/game/remainingTime`);
    onValue(timeRef, (snap) => {
      const val = snap.val();
      if (val !== null) setTimer(val);
    });
  }, [code]);

  const handleMakeTentative = async () => {
    const newCount = { ...(gameState.tentativeCount || {}) };
    const count = (newCount[playerName] || 0) + 1;
    newCount[playerName] = count;

    await update(ref(db, `teams/${code}/game`), {
      tentativePlayer: playerName,
      tentativeTime: 120 - timer,
      tentativeCount: newCount
    });
  };

  const handleValidateTentative = async (correct) => {
    if (correct) {
      await handleEndTurn(true);
    } else {
      const currentPlayer = gameState.turnOrder[gameState.currentTurnIndex];
      const currentTentativeCount = (gameState.tentativeCount?.[currentPlayer] || 0);
  
      console.log("count", currentTentativeCount);
  
      if (currentTentativeCount >= 3) {
        await handleEndTurn(false);
        return;
      }
  
      const newTime = Math.max(timer - 5, 0);
      await update(ref(db, `teams/${code}/game`), {
        tentativePlayer: null,
        tentativeTime: null,
        remainingTime: newTime
      });
  
      if (isHost) {
        clearInterval(timerRef.current);
        let countdown = newTime;
        timerRef.current = setInterval(() => {
          countdown -= 1;
          set(ref(db, `teams/${code}/game/remainingTime`), countdown);
          if (countdown <= 0) {
            clearInterval(timerRef.current);
            handleEndTurn(false);
          }
        }, 1000);
      }
    }
  };
  
  const handleShowHint = async () => {
    if (hintUsed || !facts.length) return;
  
    const randomIndex = Math.floor(Math.random() * facts.length);
    const selectedFact = facts[randomIndex];
  
    setHintFact(selectedFact);
    setHintUsed(true);
  
    // Let host apply the 8s penalty
    await update(ref(db, `teams/${code}/game`), {
      hintUsedBy: playerName
    });
  };
  
// ADDITION: New handler to proceed to next player manually after reveal
const handleRevealAndWait = async () => {
  const gameRef = ref(db, `teams/${code}/game`);
  const snap = await get(gameRef);
  const game = snap.val();

  const currentPlayer = game.turnOrder[game.currentTurnIndex];
  const guessTimes = game.guessTimes || {};
  const completed = game.completed || [];

  const timeTaken = 120 - timer;
  guessTimes[currentPlayer] = timeTaken;
  completed.push(currentPlayer);

  const totalPlayers = game.turnOrder.length;
  let nextIndex = game.currentTurnIndex;

  for (let i = 1; i <= totalPlayers; i++) {
    const candidateIndex = (game.currentTurnIndex + i) % totalPlayers;
    const candidate = game.turnOrder[candidateIndex];
    if (!completed.includes(currentPlayer)) {
      completed.push(currentPlayer);
    }
    
  }

  const gameFinished = completed.length === totalPlayers;

  await update(gameRef, {
    guessTimes,
    currentTurnIndex: nextIndex,
    validated: false,
    remainingTime: 120,
    completed,
    gameFinished,
    tentativePlayer: null,
    tentativeTime: null,
    tentativeCount: {},
    showCharacter: false
  });
};

// MODIFY: handleEndTurn to pause and reveal character instead of progressing immediately
const handleEndTurn = async (guessedCorrectly) => {
  const gameRef = ref(db, `teams/${code}/game`);
  const snap = await get(gameRef);
  const game = snap.val();

  const currentPlayer = game.turnOrder[game.currentTurnIndex];
  const guessTimes = game.guessTimes || {};
  const completed = game.completed || [];

  if (guessedCorrectly && !completed.includes(currentPlayer)) {
    const timeTaken = 120 - timer;
    guessTimes[currentPlayer] = timeTaken;
    completed.push(currentPlayer);
  }

  await update(gameRef, {
    guessTimes,
    completed,
    tentativePlayer: null,
    tentativeTime: null,
    showCharacter: true // New reveal flag
  });
};


  const handleRestartGame = async () => {
    const gameRef = ref(db, `teams/${code}/game`);
  
    // Shuffle players and characters
    const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());
    const shuffledCharacters = [...charactersPool].sort(() => 0.5 - Math.random());
  
    const assignedChars = {};
    shuffledPlayers.forEach((p, i) => {
      assignedChars[p] = shuffledCharacters[i % shuffledCharacters.length];
    });
  
    // Reset game state in the database
    await set(gameRef, {
      turnOrder: shuffledPlayers,
      currentTurnIndex: 0,
      characters: assignedChars,
      validated: false,
      remainingTime: 120,
      guessTimes: {},
      gameFinished: false,
      tentativePlayer: null,
      tentativeTime: null,
      tentativeCount: {},
      completed: []
    });
  
    // Reset hint display locally
    setHintUsed(false);
    setHintFact("");
  };
  

  const currentPlayer = gameState?.turnOrder?.[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer === playerName;
  const charName = gameState?.characters?.[currentPlayer];
  const facts = t(`facts.${charName}`, {
    returnObjects: true,
    defaultValue: []
  });

  if (gameState?.gameFinished && gameState?.guessTimes) {
    const results = Object.entries(gameState.guessTimes).sort(([, a], [, b]) => a - b);

    return (
      <div style={styles.wrapper}>
        <h2 style={styles.roundTitle}>🏁 {t("gameOver")}</h2>
        <h3 style={styles.timer}>🏆 {t("results")}</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map(([name, time], index) => (
            <li key={name} style={styles.timer}>
              {index + 1}. {name} — ⏱ {time} {t("seconds")}
            </li>
          ))}
        </ul>
        {isHost && gameState?.gameFinished && (
  <button onClick={handleRestartGame} style={styles.validateButton}>
    🔄 {t("newGame")}
  </button>
)}

      </div>
    );
  }

  if (gameState?.showCharacter) {
    const revealedChar = gameState?.characters?.[gameState.turnOrder[gameState.currentTurnIndex]];
    const revealedFacts = t(`facts.${revealedChar}`, { returnObjects: true, defaultValue: [] });
  
    return (
      <div style={styles.wrapper}>
        <h2 style={styles.roundTitle}>✅ {t("characterWas")}: {t(`characterNames.${revealedChar}`)}</h2>
        <CharacterCard name={t(`characterNames.${revealedChar}`)} facts={revealedFacts} />
        {isHost && (
          <button onClick={handleRevealAndWait} style={styles.validateButton}>
            ⏭️ {t("nextPlayer")}
          </button>
        )}
      </div>
    );
  }
  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.roundTitle}>🎯 {t("currentRound")}: {currentPlayer}</h2>
        <p style={styles.timer}>⏱ {t("timeLeft")}: <strong>{timer}</strong> {t("seconds")}</p>
      </div>

      {isMyTurn ? (
        <>
          <p style={styles.guessPrompt}>🤔 {t("yourTurn")}</p>
          <div style={{ width: "100%", maxWidth: "400px", marginBottom: "1rem", textAlign: "right" }}>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            style={{
              backgroundColor: "#e0f2f1",
              border: "1px solid #4CAF50",
              borderRadius: "8px",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
              color: "#2e7d32",
              width: "100%",
              textAlign: "right"
            }}
          >
            {showSuggestions ? "🔽 " : "🔼 "}
            {t("suggestedQuestionsTitle")}
          </button>

          {showSuggestions && (
            <ul style={{ padding: "0.5rem 1.2rem", backgroundColor: "#ffffff", borderRadius: "8px", marginTop: "0.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              {t("suggestedQuestions", { returnObjects: true }).map((q, i) => (
                <li key={i} style={{ marginBottom: "0.4rem", color: "#333", fontSize: "1rem" }}>{q}</li>
              ))}
            </ul>
          )}
        </div>

        <button
          style={{ ...styles.validateButton, backgroundColor: "#ffcc00", color: "#333" }}
          onClick={handleShowHint}
          disabled={hintUsed}
        >
          💡 {t("showHint")}
        </button>

        {hintUsed && (
          <p style={{ ...styles.guessPrompt, backgroundColor: "#fffbe6", marginTop: "1rem" }}>
            🔍 {t("hint")}: {hintFact}
          </p>
        )}



          {gameState?.tentativePlayer === playerName ? (
            <p style={styles.guessPrompt}>{t("waitingValidation")}</p>
          ) : (
            <button style={styles.validateButton} onClick={handleMakeTentative}>
              🎯 {t("makeTentative")}
            </button>
          )}
        </>
      ) : (
        <div style={styles.cardSection}>
          <p style={styles.characterLabel}>🔐 {t("notYourTurn")}</p>
          <CharacterCard name={t(`characterNames.${charName}`)} facts={facts} />

          {gameState?.tentativePlayer === currentPlayer && (
            <>
              <button style={styles.validateButton} onClick={() => handleValidateTentative(true)}>
                ✅ {t("validateGuess")}
              </button>
              <button style={styles.validateButton} onClick={() => handleValidateTentative(false)}>
                ❌ {t("rejectGuess")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
const styles = {
  wrapper: {
    minHeight: "100vh",
    padding: "2rem",
    backgroundColor: "#f0fff0",
    direction: "rtl",
    fontFamily: "'Noto Kufi Arabic', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem"
  },
  roundTitle: {
    fontSize: "1.5rem",
    color: "#2e7d32"
  },
  timer: {
    fontSize: "1.2rem",
    marginTop: "0.5rem",
    color: "#444"
  },
  guessPrompt: {
    fontSize: "1.2rem",
    color: "#333",
    backgroundColor: "#fff",
    padding: "1rem",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
  },
  cardSection: {
    width: "100%",
    maxWidth: "400px",
    textAlign: "right"
  },
  characterLabel: {
    fontWeight: "bold",
    marginBottom: "0.5rem",
    color: "#2e7d32"
  },
  validateButton: {
    marginTop: "1rem",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    width: "100%",
    maxWidth: "300px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
    cursor: "pointer"
  }
};

const leaderboardStyles = {
  wrapper: {
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#f0fff0",
    direction: "rtl",
    fontFamily: "'Noto Kufi Arabic', sans-serif",
    textAlign: "center"
  },
  title: {
    fontSize: "2rem",
    color: "#2e7d32",
    marginBottom: "1rem"
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "2rem",
    color: "#444"
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  item: {
    backgroundColor: "#ffffff",
    margin: "0.5rem auto",
    padding: "1rem",
    borderRadius: "10px",
    maxWidth: "400px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    fontSize: "1.1rem"
  },
  rank: (index) => ({
    fontWeight: "bold",
    color: [ "#D4AF37", "#C0C0C0", "#cd7f32" ][index] || "#2e7d32"
  }),
  time: {
    color: "#2e7d32"
  }
};

const rankEmoji = (i) => ["🥇", "🥈", "🥉"][i] || "🎖️";

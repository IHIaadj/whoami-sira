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
  "salman"
];

export default function GamePage() {
  const { code } = useParams();
  const [playerName] = useState(() => localStorage.getItem("playerName"));
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [timer, setTimer] = useState(120);
  const [tentativeCount, setTentativeCount] = useState(0);
  const timerRef = useRef(null);

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

  const initializeGame = async () => {
    const gameRef = ref(db, `teams/${code}/game`);
    const snap = await get(gameRef);

    if (!snap.exists()) {
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      const assignedChars = {};
      shuffled.forEach((p, i) => {
        assignedChars[p] = charactersPool[i % charactersPool.length];
      });

      await set(gameRef, {
        turnOrder: shuffled,
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
    if (currentPlayer && !gameState.tentativePlayer) {
      let countdown = 120;
      set(ref(db, `teams/${code}/game/remainingTime`), countdown);

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        countdown -= 1;
        set(ref(db, `teams/${code}/game/remainingTime`), countdown);

        if (countdown <= 0) {
          clearInterval(timerRef.current);
          handleEndTurn(false);
        }
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [gameState?.currentTurnIndex, gameState?.tentativePlayer, isHost]);

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

    if (count > 3) {
      await handleEndTurn(false);
      return;
    }

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
      const newTime = Math.max(timer - 5, 0);
      await update(ref(db, `teams/${code}/game`), {
        tentativePlayer: null,
        tentativeTime: null,
        remainingTime: newTime
      });
    }
  };

  const handleValidateGuess = async () => {
    await update(ref(db, `teams/${code}/game`), { validated: true });
  };

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

    const totalPlayers = game.turnOrder.length;
    let nextIndex = game.currentTurnIndex;

    for (let i = 1; i <= totalPlayers; i++) {
      const candidateIndex = (game.currentTurnIndex + i) % totalPlayers;
      const candidate = game.turnOrder[candidateIndex];
      if (!completed.includes(candidate)) {
        nextIndex = candidateIndex;
        break;
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
      tentativeTime: null
    });
  };

  const currentPlayer = gameState?.turnOrder?.[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer === playerName;
  const charName = gameState?.characters?.[currentPlayer];
  const facts = t(`facts.${charName}`, {
    returnObjects: true,
    defaultValue: []
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.roundTitle}>🎯 {t("currentRound")}: {currentPlayer}</h2>
        <p style={styles.timer}>⏱ {t("timeLeft")}: <strong>{timer}</strong> {t("seconds")}</p>
      </div>

      {isMyTurn ? (
        <>
          <p style={styles.guessPrompt}>🤔 {t("yourTurn")}</p>
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

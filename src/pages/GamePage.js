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
  const [timer, setTimer] = useState(60);
  const timerRef = useRef(null);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  // Fetch players + host status
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

  // Initialize game (host only)
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
        remainingTime: 60,
        guessTimes: {},
        gameFinished: false
      });
    }
  };

  // Host controls countdown
  useEffect(() => {
    if (!gameState || !isHost || gameState.gameFinished) return;

    const currentPlayer = gameState.turnOrder?.[gameState.currentTurnIndex];
    if (currentPlayer) {
      let countdown = 60;
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
  }, [gameState?.currentTurnIndex, isHost]);

  // All players listen to the shared timer
  useEffect(() => {
    const timeRef = ref(db, `teams/${code}/game/remainingTime`);
    onValue(timeRef, (snap) => {
      const val = snap.val();
      if (val !== null) setTimer(val);
    });
  }, [code]);

  // Host auto-ends turn on validation
  useEffect(() => {
    if (!gameState || !isHost || gameState.gameFinished) return;

    if (gameState.validated === true) {
      clearInterval(timerRef.current);
      handleEndTurn(true);
    }
  }, [gameState?.validated, isHost]);

  // Guess validation handler
  const handleValidateGuess = async () => {
    await update(ref(db, `teams/${code}/game`), { validated: true });
  };

  // Host ends turn (either timeout or correct guess)
  const handleEndTurn = async (guessedCorrectly) => {
    const gameRef = ref(db, `teams/${code}/game`);
    const snap = await get(gameRef);
    const game = snap.val();

    const currentPlayer = game.turnOrder[game.currentTurnIndex];
    const guessTimes = game.guessTimes || {};

    if (guessedCorrectly) {
      const timeTaken = 60 - timer;
      guessTimes[currentPlayer] = timeTaken;
    }

    const nextIndex = game.currentTurnIndex + 1;
    const isFinished = nextIndex >= game.turnOrder.length;

    await update(gameRef, {
      guessTimes,
      currentTurnIndex: nextIndex,
      validated: false,
      remainingTime: 60,
      gameFinished: isFinished
    });
  };

  const handleRestartGame = async () => {
    const gameRef = ref(db, `teams/${code}/game`);
  
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
      remainingTime: 60,
      guessTimes: {},
      gameFinished: false
    });
  };
  

  // Show leaderboard
  if (gameState?.gameFinished && gameState?.guessTimes) {
    const results = Object.entries(gameState.guessTimes).sort(([, a], [, b]) => a - b);
  
    return (
      <div style={leaderboardStyles.wrapper}>
        <h2 style={leaderboardStyles.title}>🏁 {t("gameOver")}</h2>
        <h3 style={leaderboardStyles.subtitle}>🏆 {t("results")}</h3>
        <ul style={leaderboardStyles.list}>
          {results.map(([name, time], index) => (
            <li key={name} style={leaderboardStyles.item}>
              <span style={leaderboardStyles.rank(index)}>{rankEmoji(index)} {index + 1}.</span>{" "}
              <strong>{name}</strong> — ⏱ <span style={leaderboardStyles.time}>{time} {t("seconds")}</span>
            </li>
          ))}
        </ul>

        {isHost && (
      <button
        onClick={handleRestartGame}
        style={{
          marginTop: "2rem",
          padding: "0.8rem 1.5rem",
          fontSize: "1rem",
          backgroundColor: "#2e7d32",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer"
        }}
      >
        🔄 {t("newGame")}
      </button>
    )}
      </div>
    );
  }
  

  if (!gameState || !gameState.turnOrder) {
    return <p>جاري تحميل اللعبة...</p>;
  }

  const currentPlayer = gameState.turnOrder[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer === playerName;
  const charName = gameState.characters[currentPlayer];
  console.log("character", charName);
  console.log("✅ facts.waraka", t("facts.waraka", { returnObjects: true }));
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
       <p style={styles.guessPrompt}>🤔 {t("yourTurn")}</p>
      ) : (
        <div style={styles.cardSection}>
          <p style={styles.characterLabel}>🔐 {t("notYourTurn")}:</p>
          <CharacterCard
  name={t(`characterNames.${charName}`)}
  facts={Array.isArray(facts) ? facts : []}
/>
          {!gameState.validated && (
            <button style={styles.validateButton} onClick={handleValidateGuess}>
              ✅ {t("correctGuess")}
            </button>
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

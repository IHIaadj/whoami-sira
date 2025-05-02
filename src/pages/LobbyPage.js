import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, get, ref, push, onValue, set, update } from "../firebase";
import { useTranslation } from "react-i18next";

export default function LobbyPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [players, setPlayers] = useState([]);
  const [name, setName] = useState(() => {
    const stored = localStorage.getItem("playerName");
    if (stored) return stored;
    const generated = "Player-" + Math.floor(Math.random() * 1000);
    localStorage.setItem("playerName", generated);
    return generated;
  });
  const [isHost, setIsHost] = useState(false);
  const hasJoinedRef = useRef(false);
  const playerKeyRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  useEffect(() => {
    if (!hasJoinedRef.current) {
      const playersRef = ref(db, `teams/${code}/players`);
      const newPlayerRef = push(playersRef);
      set(newPlayerRef, name);
      playerKeyRef.current = newPlayerRef.key;

      const metaRef = ref(db, `teams/${code}/meta`);
      get(metaRef).then((snap) => {
        if (!snap.exists()) {
          set(metaRef, { host: name });
          setIsHost(true);
        } else {
          const hostName = snap.val().host;
          setIsHost(hostName === name);
        }
      });

      hasJoinedRef.current = true;
    }
  }, [code, name]);

  useEffect(() => {
    const playersRef = ref(db, `teams/${code}/players`);
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      const playerList = data ? Object.values(data) : [];
      setPlayers(playerList);
    });
  }, [code]);

  useEffect(() => {
    const gameStartedRef = ref(db, `teams/${code}/gameStarted`);
    onValue(gameStartedRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val() === true) {
        navigate(`/game/${code}`);
      }
    });
  }, [code, navigate]);

  const handleStartGame = () => {
    const gameStartedRef = ref(db, `teams/${code}/gameStarted`);
    set(gameStartedRef, true);
  };

  const handleChangeName = (e) => {
    const newName = e.target.value;
    setName(newName);
    localStorage.setItem("playerName", newName);
    if (playerKeyRef.current) {
      const playerRef = ref(db, `teams/${code}/players/${playerKeyRef.current}`);
      set(playerRef, newName);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>{t("teamCode")}:</h2>
      <div style={styles.codeBox}>{code}</div>

      <label style={{ marginBottom: "1rem" }}>
        ✏️ {t("yourName")}: 
        <input
          type="text"
          value={name}
          onChange={handleChangeName}
          style={{
            marginLeft: "0.5rem",
            padding: "0.4rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "1rem"
          }}
        />
      </label>

      <p style={styles.subheading}>👥 {t("players")}:</p>
      <ul style={styles.playerList}>
        {players.map((p, i) => (
          <li key={i} style={styles.playerItem}>🎮 {p}</li>
        ))}
      </ul>

      {isHost && (
        <button style={styles.startButton} onClick={handleStartGame}>
          {t("startGame")}
        </button>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    backgroundColor: "#f0fff0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    direction: "rtl",
    fontFamily: "'Noto Kufi Arabic', sans-serif",
    textAlign: "center"
  },
  heading: {
    fontSize: "1.5rem",
    color: "#2e7d32",
    marginBottom: "0.5rem"
  },
  codeBox: {
    backgroundColor: "#cce5ff",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    fontSize: "1.3rem",
    fontWeight: "bold",
    marginBottom: "2rem"
  },
  subheading: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginBottom: "1rem"
  },
  playerList: {
    listStyle: "none",
    padding: 0,
    marginBottom: "2rem",
    width: "100%",
    maxWidth: "300px"
  },
  playerItem: {
    backgroundColor: "#e0f2f1",
    margin: "0.5rem 0",
    padding: "0.7rem",
    borderRadius: "6px",
    fontSize: "1rem"
  },
  startButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#4CAF50",
    color: "white",
    fontSize: "1.1rem",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "1rem"
  }
};

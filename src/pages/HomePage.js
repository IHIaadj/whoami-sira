import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [teamCode, setTeamCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  const handleCreateTeam = () => {
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/lobby/${newCode}`);
  };

  const handleJoinTeam = () => {
    if (teamCode.trim()) {
      navigate(`/lobby/${teamCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>{t("title")}</h1>

      <div style={styles.buttonGroup}>
        <button style={styles.createButton} onClick={handleCreateTeam}>
          {t("createTeam")}
        </button>

        <div style={styles.joinGroup}>
          <input
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder={t("enterTeamCode")}
            style={styles.input}
          />
          <button style={styles.joinButton} onClick={handleJoinTeam}>
            {t("joinTeam")}
          </button>
        </div>
      </div>

      <div style={styles.languageSwitch}>
        <button onClick={() => {i18n.changeLanguage("ar")}} style={styles.langBtn}>🇸🇦 عربي</button>
        <button onClick={() => {i18n.changeLanguage("en")}}  style={styles.langBtn}>🇬🇧 English</button>
      </div>

<section style={styles.howToPlaySection}>
  <h3 style={styles.howToPlayTitle}>{t("howToPlayTitle")}</h3>
  <ul style={styles.howToPlayList}>
    {t("howToPlaySteps", { returnObjects: true }).map((step, index) => (
      <li key={index} style={styles.howToPlayItem}>
        ✅ {step}
      </li>
    ))}
  </ul>
</section>

<p style={styles.dedication}>
  {t("dedication")}
</p>
    </div>

    
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#f0fff0",
    fontFamily: "'Noto Kufi Arabic', sans-serif",
    textAlign: "center"
  },
  title: {
    fontSize: "2rem",
    color: "#2e7d32",
    marginBottom: "2rem"
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "100%",
    maxWidth: "320px"
  },
  createButton: {
    padding: "1rem",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1.1rem",
    cursor: "pointer"
  },
  joinGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  input: {
    padding: "0.75rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "1rem"
  },
  joinButton: {
    padding: "0.75rem",
    backgroundColor: "#2e7d32",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer"
  },
  languageSwitch: {
    marginTop: "2rem",
    display: "flex",
    gap: "0.5rem",
    justifyContent: "center"
  },
  langBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "white"
  }, 
  howToPlaySection: {
    backgroundColor: "#e8f5e9",
    padding: "2rem",
    borderRadius: "12px",
    maxWidth: "700px",
    margin: "3rem auto 2rem",
    textAlign: "right"
  },
  howToPlayTitle: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
    color: "#2e7d32"
  },
  howToPlayList: {
    listStyle: "none",
    padding: 0,
    margin: 0
  },
  howToPlayItem: {
    marginBottom: "1rem",
    fontSize: "1.1rem",
    lineHeight: "1.6"
  }, 
  dedication: {
    marginTop: "4rem",
    fontSize: "1rem",
    color: "#777",
    fontStyle: "italic",
    textAlign: "center",
    borderTop: "1px solid #ccc",
    paddingTop: "1rem"
  }
  
  
};

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LobbyPage from "./pages/LobbyPage";
import { useTranslation } from "react-i18next";
import GamePage from "./pages/GamePage";
import InstallPrompt from "./components/InstallPrompt"; // adjust path as needed


function LanguageSwitcher() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.body.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);
  return null; 
}

function App() {
  return (
    <Router>
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lobby/:code" element={<LobbyPage />} />
        <Route path="/game/:code" element={<GamePage />} />
      </Routes>
      <InstallPrompt />
    </Router>
  );
}

export default App;

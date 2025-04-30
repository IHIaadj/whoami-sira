import React from "react";

export default function CharacterCard({ name, facts }) {
  return (
    <div style={{
      border: "2px solid #4CAF50",
      borderRadius: "16px",
      padding: "1.5rem",
      backgroundColor: "#f9fff9",
      maxWidth: "400px",
      margin: "1rem auto",
      direction: "rtl",
      textAlign: "right",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    }}>
      <h3 style={{ color: "#2e7d32", marginBottom: "1rem" }}>{name}</h3>
      <ul style={{ paddingRight: "1rem" }}>
        {facts.map((fact, i) => (
          <li key={i} style={{ marginBottom: "0.5rem" }}>⭐ {fact}</li>
        ))}
      </ul>
    </div>
  );
}

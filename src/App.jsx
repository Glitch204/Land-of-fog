import { useState } from "react";
import Game3D from "./Game3D.jsx";

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');
`;

export default function App() {
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  function handleStart() {
    if (!name.trim()) {
      setError("Enter a name first.");
      return;
    }
    setError("");
    setStarted(true);
  }

  if (started) {
    return <Game3D displayName={name.trim()} />;
  }

  return (
    <div style={styles.wrap}>
      <style>{fontImport}</style>
      <h1 style={styles.title}>Land of Fog</h1>
      <p style={styles.sub}>Walk into the fog. Others are out there too.</p>
      <input
        style={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        maxLength={20}
        onKeyDown={(e) => e.key === "Enter" && handleStart()}
      />
      {error && <div style={styles.error}>{error}</div>}
      <button style={styles.btn} onClick={handleStart}>
        Enter
      </button>
    </div>
  );
}

const styles = {
  wrap: {
    height: "100vh",
    width: "100%",
    background: "#0d0e10",
    color: "#e8e6e1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    padding: "24px",
    textAlign: "center",
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontWeight: 600,
    fontSize: "2.2rem",
    margin: "0 0 8px",
    color: "#d8d4cc",
  },
  sub: {
    color: "#7b828a",
    fontSize: "0.9rem",
    margin: "0 0 28px",
  },
  input: {
    width: "100%",
    maxWidth: "280px",
    background: "#1a1c1f",
    border: "1px solid #34383d",
    borderRadius: "10px",
    padding: "14px 16px",
    color: "#e8e6e1",
    fontSize: "1rem",
    textAlign: "center",
    outline: "none",
    marginBottom: "12px",
  },
  error: {
    color: "#c97b5a",
    fontSize: "0.85rem",
    marginBottom: "12px",
  },
  btn: {
    background: "#9c8465",
    color: "#15130f",
    border: "none",
    borderRadius: "10px",
    padding: "14px 32px",
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "pointer",
  },
};

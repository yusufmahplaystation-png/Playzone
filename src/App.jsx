
import { useState } from "react";
import {
  Gamepad2, Users, Trophy, UserCircle, Settings,
  Sparkles, MessageCircle, Volume2, Plus, ArrowLeft,
  Copy, RotateCcw, LockKeyhole, Globe, Zap
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";

const GAMES = [
  { id: "imposter", name: "Imposter", emoji: "🕵️", desc: "Findet die Person ohne Geheimwort.", type: "party" },
  { id: "werwolf", name: "Werwolf", emoji: "🐺", desc: "Wer ist nachts unterwegs?", type: "party" },
  { id: "quiz", name: "Quiz", emoji: "🧠", desc: "Teste dein Wissen.", type: "quick" },
  { id: "soundboard", name: "Soundboard", emoji: "🔊", desc: "Deine Party-Sound-Ecke.", type: "quick" },
  { id: "challenge", name: "Daily Challenge", emoji: "⚡", desc: "Eine neue Aufgabe für dich.", type: "quick" },
  { id: "ideas", name: "Eigene Spiele", emoji: "✨", desc: "Erfinde deine eigenen Regeln.", type: "create" },
];

const WORDS = [
  "Pizza", "Weltraum", "Schule", "Dschungel", "Kino",
  "Fußball", "Drache", "Strand", "Roboter", "Zauberer",
  "Eiscreme", "Flughafen", "Pirat", "Bibliothek"
];

const QUESTIONS = [
  { q: "Welcher Planet ist der größte?", a: ["Mars", "Jupiter", "Venus"], correct: 1 },
  { q: "Wie viele Seiten hat ein Würfel?", a: ["4", "6", "8"], correct: 1 },
  { q: "Welches Tier ist ein Säugetier?", a: ["Delfin", "Forelle", "Krabbe"], correct: 0 },
  { q: "Wie heißt unser Stern?", a: ["Sirius", "Sonne", "Polarstern"], correct: 1 },
  { q: "Wie viele Minuten hat eine Stunde?", a: ["50", "60", "100"], correct: 1 }
];

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function App() {
  const [page, setPage] = useState("home");
  const [username, setUsername] = useState(() => localStorage.getItem("pz-name") || "");
  const [draftName, setDraftName] = useState(() => localStorage.getItem("pz-name") || "Player");
  const [avatar, setAvatar] = useState(() => localStorage.getItem("pz-avatar") || "🦊");
  const [points, setPoints] = useState(() => Number(localStorage.getItem("pz-points") || 0));
  const [customGames, setCustomGames] = useState(() => read("pz-custom-games", []));
  const [gameTitle, setGameTitle] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [players, setPlayers] = useState(["Player 1", "Player 2", "Player 3"]);
  const [newPlayer, setNewPlayer] = useState("");
  const [secret, setSecret] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [chatText, setChatText] = useState("");
  const [localChat, setLocalChat] = useState(() => read("pz-chat", []));
  const [sound, setSound] = useState(false);

  const allGames = [...GAMES, ...customGames.map((g, i) => ({
    id: `custom-${i}`, name: g.title, emoji: "🎲",
    desc: g.rules, type: "custom"
  }))];

  function tell(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function go(name) {
    setPage(name);
    setSelectedGame(null);
    setNotice("");
  }

  function startGame(game) {
    setSelectedGame(game);
    setSecret(null);
    setRevealed(false);
    setPlayerIndex(0);
    setQuestionIndex(0);
    setQuizScore(0);
    setAnswered(false);
    setPage("play");
  }

  function startImposter() {
    if (players.length < 3) {
      tell("Für diese Runde braucht ihr mindestens 3 Personen.");
      return;
    }
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const imposterIndex = Math.floor(Math.random() * players.length);
    setSecret({ word, imposterIndex });
    setPlayerIndex(0);
    setRevealed(false);
  }

  function saveProfile() {
    const name = draftName.trim().slice(0, 20);
    if (!name) return tell("Bitte gib einen Spielernamen ein.");
    localStorage.setItem("pz-name", name);
    localStorage.setItem("pz-avatar", avatar);
    setUsername(name);
    tell("Profil auf diesem Gerät gespeichert.");
  }

  function awardPoint(n) {
    const next = points + n;
    setPoints(next);
    localStorage.setItem("pz-points", String(next));
  }

  function createGame() {
    if (!gameTitle.trim() || !gameRules.trim()) {
      return tell("Bitte gib einen Namen und Regeln ein.");
    }
    const next = [...customGames, {
      title: gameTitle.trim().slice(0, 50),
      rules: gameRules.trim().slice(0, 500)
    }];
    setCustomGames(next);
    save("pz-custom-games", next);
    setGameTitle("");
    setGameRules("");
    tell("Deine Spielidee wurde lokal gespeichert.");
  }

  function sendLocalChat() {
    if (!chatText.trim()) return;
    const next = [...localChat, {
      text: chatText.trim().slice(0, 300),
      by: username || "Player",
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    }];
    setLocalChat(next);
    save("pz-chat", next);
    setChatText("");
  }

  async function createOnlineRoom() {
    if (!supabase) {
      tell("Supabase ist noch nicht verbunden. Wir richten es als Nächstes ein.");
      return;
    }
    tell("Supabase ist verbunden. Für echte Räume richten wir jetzt die sicheren Datenbanktabellen ein.");
  }

  const nav = [
    { id: "home", label: "Start", icon: Gamepad2 },
    { id: "games", label: "Spiele", icon: Zap },
    { id: "friends", label: "Freunde", icon: Users },
    { id: "leaderboard", label: "Rangliste", icon: Trophy },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "profile", label: "Profil", icon: UserCircle },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark">✦</span> PLAYZONE
        </button>
        <div className="side-caption">DEINE SPIELWELT</div>
        <nav>
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => go(item.id)}>
                <Icon size={19} /> <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-avatar">{avatar}</div>
          <div className="profile-mini">
            <strong>{username || "Gastspieler"}</strong>
            <span>{points} XP</span>
          </div>
          <button className="icon-button" onClick={() => go("settings")} aria-label="Einstellungen">
            <Settings size={18} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand" onClick={() => go("home")}>✦ PLAYZONE</div>
          <span className="connection">
            <i className={isSupabaseConfigured ? "dot green" : "dot"} />
            {isSupabaseConfigured ? "Supabase konfiguriert" : "Lokaler Modus"}
          </span>
          <button className="avatar-button" onClick={() => go("profile")}>{avatar}</button>
        </header>

        {notice && <div className="toast" role="status">{notice}</div>}

        {page === "home" && (
          <div className="page-content">
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow"><Sparkles size={14} /> DEINE FREUNDE. DEINE REGELN.</div>
                <h1>Deine Party.<br /><span>Deine Spielwelt.</span></h1>
                <p>Entdecke Spiele, fordere deine Freunde heraus und mach jeden Moment zum Spiel.</p>
                <button className="primary-button" onClick={() => go("games")}>Spiele entdecken <span>↗</span></button>
              </div>
              <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-emoji">🎮</div><span className="float-emoji e1">✨</span><span className="float-emoji e2">👾</span><span className="float-emoji e3">🏆</span></div>
            </section>

            <div className="section-heading">
              <div><div className="eyebrow">FINDE DEIN SPIEL</div><h2>Beliebte Spiele</h2></div>
              <button className="text-button" onClick={() => go("games")}>Alle ansehen ↗</button>
            </div>
            <div className="game-grid">
              {GAMES.slice(0, 4).map(g => <GameCard key={g.id} game={g} onClick={() => startGame(g)} />)}
            </div>

            <section className="room-banner">
              <div className="room-icon"><Users size={25} /></div>
              <div className="room-copy"><h3>Spielt gemeinsam</h3><p>Erstelle einen Raum und sammle deine Crew.</p></div>
              <button className="secondary-button" onClick={() => go("friends")}>Raum starten <span>→</span></button>
            </section>

            <div className="stat-grid">
              <Stat icon="🏆" label="Deine XP" value={points} />
              <Stat icon="🎲" label="Spielideen" value={customGames.length} />
              <Stat icon="🔥" label="Tages-Challenge" value="Bereit" />
            </div>
          </div>
        )}

        {page === "games" && (
          <div className="page-content">
            <PageTitle eyebrow="SPIELPLATZ" title="Alle Spiele" sub="Such dir ein Spiel aus und leg los." />
            <div className="game-grid">
              {allGames.map(g => <GameCard key={g.id} game={g} onClick={() => startGame(g)} />)}
            </div>
            <section className="panel">
              <h3>🎲 Eigene Spielidee erstellen</h3>
              <input value={gameTitle} onChange={e => setGameTitle(e.target.value)} placeholder="Name deines Spiels" maxLength={50} />
              <textarea value={gameRules} onChange={e => setGameRules(e.target.value)} placeholder="Wie funktioniert dein Spiel?" maxLength={500} />
              <button className="primary-button" onClick={createGame}><Plus size={17} /> Spiel lokal speichern</button>
              <p className="muted">Deine Idee wird vorerst nur auf diesem Gerät gespeichert und noch nicht veröffentlicht.</p>
            </section>
          </div>
        )}

        {page === "play" && selectedGame && (
          <div className="page-content">
            <button className="back-button" onClick={() => go("games")}><ArrowLeft size={17} /> Alle Spiele</button>
            <section className="play-panel">
              <div className="big-game-emoji">{selectedGame.emoji}</div>
              <div className="eyebrow">PLAYZONE GAME</div>
              <h1>{selectedGame.name}</h1>
              <p className="muted">{selectedGame.desc}</p>

              {selectedGame.id === "imposter" && (
                <div className="game-inner">
                  {!secret ? <>
                    <h3>Wer spielt mit?</h3>
                    <p className="muted">Mindestens 3 Personen, ein Gerät. Gebt das Gerät nacheinander weiter.</p>
                    <div className="player-list">
                      {players.map((p, i) => <div className="player-row" key={`${p}-${i}`}><span className="mini-avatar">{["🦊","🐸","🐼","🐯","🐙","🐸","🐨","🐵"][i % 8]}</span><span>{p}</span><button className="remove-player" onClick={() => setPlayers(players.filter((_, j) => j !== i))}>×</button></div>)}
                    </div>
                    <div className="inline-form"><input value={newPlayer} onChange={e => setNewPlayer(e.target.value)} placeholder="Spielername" maxLength={20} /><button className="secondary-button" onClick={() => { if (newPlayer.trim() && players.length < 12) { setPlayers([...players, newPlayer.trim()]); setNewPlayer(""); } }}>Hinzufügen</button></div>
                    <button className="primary-button full-button" onClick={startImposter}>Geheimkarten verteilen</button>
                  </> : <>
                    <div className="secret-card">
                      <span className="eyebrow">SPIELER {playerIndex + 1} VON {players.length}</span>
                      <h2>{players[playerIndex]}</h2>
                      {!revealed ? <><LockKeyhole size={32} /><p>Nur diese Person darf ihre Karte sehen.</p><button className="primary-button" onClick={() => setRevealed(true)}>Meine Karte ansehen</button></> :
                        <><div className="secret-word">{playerIndex === secret.imposterIndex ? "🕵️ IMPOSTER" : `🔑 ${secret.word}`}</div><p>{playerIndex === secret.imposterIndex ? "Du kennst das Geheimwort nicht. Täusche die anderen!" : "Merke dir das Wort. Zeige es niemandem."}</p><button className="primary-button" onClick={() => { if (playerIndex + 1 < players.length) { setPlayerIndex(playerIndex + 1); setRevealed(false); } else { setSecret(null); setRevealed(false); awardPoint(10); tell("Alle Karten verteilt! +10 XP"); } }}>{playerIndex + 1 < players.length ? "Karte verbergen · Weitergeben" : "Runde starten · +10 XP"}</button></>}
                    </div>
                    <button className="text-button" onClick={() => { setSecret(null); setRevealed(false); }}>Runde zurücksetzen</button>
                  </>}
                </div>
              )}

              {selectedGame.id === "quiz" && (
                <div className="game-inner">
                  {questionIndex >= QUESTIONS.length ? <>
                    <h2>Quiz beendet! 🎉</h2><p>Dein Ergebnis: {quizScore} von {QUESTIONS.length}</p>
                    <button className="primary-button" onClick={() => { awardPoint(quizScore * 5); setQuestionIndex(0); setQuizScore(0); setAnswered(false); tell(`+${quizScore * 5} XP`); }}>Nochmal spielen</button>
                  </> : <>
                    <div className="quiz-progress">FRAGE {questionIndex + 1} / {QUESTIONS.length}</div>
                    <h2>{QUESTIONS[questionIndex].q}</h2>
                    {QUESTIONS[questionIndex].a.map((a, i) => <button key={a} className="answer-button" disabled={answered} onClick={() => { setAnswered(true); if (i === QUESTIONS[questionIndex].correct) { setQuizScore(quizScore + 1); tell("Richtig! 🎉"); } else tell("Nicht ganz! Weiter geht's."); }}>{a}</button>)}
                    {answered && <button className="primary-button full-button" onClick={() => { setQuestionIndex(questionIndex + 1); setAnswered(false); }}>Nächste Frage →</button>}
                  </>}
                </div>
              )}

              {selectedGame.id === "werwolf" && (
                <div className="game-inner"><h2>🐺 Werwolf – Vorbereitung</h2><p>Das vollständige Rollenspiel mit geheimen Rollen kommt als nächster Spielmodus. Du kannst bereits das Imposter-Spiel auf diesem Gerät spielen.</p><button className="primary-button" onClick={() => startGame(GAMES[0])}>Jetzt Imposter spielen</button></div>
              )}

              {selectedGame.id === "soundboard" && (
                <div className="game-inner"><h2>🔊 Sound-Ecke</h2><p className="muted">Hier kannst du Töne über deinen Browser abspielen.</p><button className="sound-button" onClick={() => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value = sound ? 660 : 440; gain.gain.value = 0.12; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.22); setSound(!sound); } catch { tell("Audio ist in diesem Browser nicht verfügbar."); } }}><Volume2 size={20} /> {sound ? "Pling!" : "Sound abspielen"}</button></div>
              )}

              {selectedGame.id === "challenge" && (
                <div className="game-inner"><h2>⚡ Tages-Challenge</h2><p>Erfinde einen lustigen Namen für ein erfundenes Videospiel und erkläre es in einem Satz!</p><button className="primary-button" onClick={() => { awardPoint(5); tell("+5 XP! Challenge erledigt."); }}>Challenge erledigt · +5 XP</button></div>
              )}

              {selectedGame.id === "ideas" && (
                <div className="game-inner"><h2>✨ Deine Spielideen</h2><p>Erstelle und speichere deine eigenen Spiele unter „Alle Spiele“. Veröffentlichung und Teilen kommen mit der Online-Datenbank.</p><button className="primary-button" onClick={() => go("games")}>Spielidee erstellen</button></div>
              )}

              {selectedGame.type === "custom" && <div className="game-inner"><h2>Eigene Spielregeln</h2><p>{selectedGame.desc}</p><p className="muted">Dies ist deine gespeicherte Spielidee, noch kein automatisch ausführbares Spiel.</p></div>}
            </section>
          </div>
        )}

        {page === "friends" && (
          <div className="page-content">
            <PageTitle eyebrow="DEINE CREW" title="Mit Freunden spielen" sub="Online-Räume brauchen die Supabase-Einrichtung." />
            <section className="panel">
              <h3><Globe size={20} /> Online-Raum erstellen</h3>
              <p className="muted">Sobald die Datenbank eingerichtet ist, können hier echte Raumcodes erstellt und geteilt werden.</p>
              <button className="primary-button" onClick={createOnlineRoom}>Online-Raum vorbereiten</button>
            </section>
            <section className="panel">
              <h3>Raumcode eingeben</h3>
              <div className="inline-form"><input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 8))} placeholder="z. B. ABC123" maxLength={8} /><button className="secondary-button" onClick={() => tell(supabase ? "Die Raumbeitrittsfunktion benötigt noch die Datenbanktabellen." : "Die Online-Verbindung ist noch nicht eingerichtet.")}>Beitreten</button></div>
            </section>
            <section className="panel"><h3><Users size={20} /> Freundesliste</h3><p className="muted">Freundschaftsanfragen und gemeinsame Gruppen kommen mit dem Kontosystem.</p></section>
          </div>
        )}

        {page === "leaderboard" && (
          <div className="page-content">
            <PageTitle eyebrow="DEIN FORTSCHRITT" title="Bestenliste" sub="Deine lokalen Punkte auf diesem Gerät." />
            <section className="panel">
              <div className="rank-row"><span className="rank-number">★</span><span className="rank-avatar">{avatar}</span><div className="rank-person"><strong>{username || "Gastspieler"}</strong><span>Lokales Profil</span></div><strong>{points} XP</strong></div>
              <p className="muted">Eine globale Bestenliste mit anderen Spielern wird verfügbar, sobald die Datenbank verbunden ist.</p>
            </section>
          </div>
        )}

        {page === "chat" && (
          <div className="page-content">
            <PageTitle eyebrow="COMMUNITY" title="Chat" sub="Lokale Demo – Nachrichten werden nur auf diesem Gerät gespeichert." />
            <section className="panel chat-panel">
              <div className="chat-messages">
                {localChat.length === 0 && <p className="empty-state">Noch keine Nachrichten. Schreib die erste Nachricht!</p>}
                {localChat.map((m, i) => <div className="chat-message" key={`${m.time}-${i}`}><div><strong>{m.by}</strong><span>{m.time}</span></div><p>{m.text}</p></div>)}
              </div>
              <div className="inline-form"><input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendLocalChat()} placeholder="Nachricht schreiben…" maxLength={300} /><button className="primary-button" onClick={sendLocalChat}>Senden</button></div>
            </section>
          </div>
        )}

        {page === "profile" && (
          <div className="page-content">
            <PageTitle eyebrow="DEIN BEREICH" title="Dein Profil" sub="Dein lokales Profil auf diesem Gerät." />
            <section className="panel profile-panel">
              <div className="avatar-picker">{["🦊","🐸","🐼","🐯","🐙","🐨","🐵","🐲"].map(a => <button key={a} className={avatar === a ? "chosen" : ""} onClick={() => setAvatar(a)}>{a}</button>)}</div>
              <label>Spielername</label>
              <input value={draftName} onChange={e => setDraftName(e.target.value)} maxLength={20} placeholder="Dein Name" />
              <button className="primary-button" onClick={saveProfile}>Profil speichern</button>
              <div className="profile-xp"><Trophy size={20} /><div><strong>{points} XP</strong><span>Dein bisheriger Punktestand auf diesem Gerät</span></div></div>
            </section>
          </div>
        )}

        {page === "settings" && (
          <div className="page-content">
            <PageTitle eyebrow="PLAYZONE" title="Einstellungen" sub="Informationen zu deiner App." />
            <section className="panel"><h3>Verbindungsstatus</h3><p>{isSupabaseConfigured ? "Supabase-URL und öffentlicher Schlüssel wurden erkannt." : "Lokaler Modus: Supabase ist noch nicht konfiguriert."}</p><p className="muted">Die App nutzt noch kein Online-Login. Veröffentliche niemals einen Supabase service_role-Schlüssel im Frontend.</p></section>
            <section className="panel"><h3>Lokale Daten</h3><p className="muted">Spielideen, Chat-Demo und Profil liegen vorerst in diesem Browser.</p><button className="secondary-button" onClick={() => { if (window.confirm("Lokale PLAYZONE-Daten auf diesem Gerät löschen?")) { ["pz-name","pz-avatar","pz-points","pz-custom-games","pz-chat"].forEach(k => localStorage.removeItem(k)); window.location.reload(); } }}>Lokale Daten löschen</button></section>
          </div>
        )}

        <footer className="footer">PLAYZONE <span>·</span> Deine Spielwelt <span>·</span> Prototyp</footer>
      </main>

      <nav className="mobile-nav">
        {nav.map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => go(item.id)}><Icon size={20}/><span>{item.label}</span></button>;
        })}
      </nav>
    </div>
  );
}

function GameCard({ game, onClick }) {
  return <button className="game-card" onClick={onClick}><div className="game-card-top"><span className="game-emoji">{game.emoji}</span><span className="card-arrow">↗</span></div><h3>{game.name}</h3><p>{game.desc}</p><span className="play-label">SPIELEN <span>→</span></span></button>;
}

function PageTitle({ eyebrow, title, sub }) {
  return <div className="page-title"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{sub}</p></div>;
}

function Stat({ icon, label, value }) {
  return <div className="stat-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
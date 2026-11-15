import { useEffect, useState } from 'react';

const roleOptions = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Product Manager',
  'Designer',
];

async function apiRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

function Brand() {
  return <div className="brand"><span className="brand-mark" aria-hidden="true">i</span><span>interviewly</span></div>;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await apiRequest(`auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: form,
      });
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow light-eyebrow">PRACTICE WITH PURPOSE</span>
          <h1>Show up ready<br />for your next big thing.</h1>
          <p>A calmer place to prepare, find your words, and build confidence before the real interview.</p>
          <div className="story-note"><span className="sparkle">✳</span><span>Small steps. Stronger answers.</span></div>
        </div>
        <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
        <span className="story-caption">YOUR NEXT CHAPTER STARTS HERE</span>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">YOUR PRACTICE SPACE</span>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">{mode === 'login' ? 'Pick up where you left off.' : 'A few details and you’re ready to practice.'}</p>
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); }} type="button">Sign in</button>
            <button className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setError(''); }} type="button">Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label>Your name<input autoComplete="name" name="name" onChange={update} placeholder="e.g. Alex Morgan" required value={form.name} /></label>}
            <label>Email address<input autoComplete="email" name="email" onChange={update} placeholder="you@example.com" required type="email" value={form.email} /></label>
            <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" name="password" onChange={update} placeholder="At least 8 characters" required type="password" value={form.password} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-footnote">Practice feedback is a learning aid, not a hiring decision.</p>
        </div>
      </section>
    </main>
  );
}

function Header({ user, onLogout, onHome }) {
  return (
    <header className="topbar">
      <button className="brand brand-button" onClick={onHome} type="button"><span className="brand-mark" aria-hidden="true">i</span><span>interviewly</span></button>
      <div className="topbar-right"><span className="user-greeting">{user?.name || user?.email}</span><button className="text-button" onClick={onLogout} type="button">Sign out</button><span className="avatar">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span></div>
    </header>
  );
}

function Dashboard({ user, onStart, onLogout, onHome, busy, error }) {
  const [role, setRole] = useState(roleOptions[0]);
  const [level, setLevel] = useState('Early career');
  const [focus, setFocus] = useState('Communication & clarity');

  return (
    <div className="app-shell">
      <Header onHome={onHome} onLogout={onLogout} user={user} />
      <main className="dashboard content-width">
        <section className="welcome-row"><div><span className="eyebrow">YOUR PRACTICE SPACE</span><h1>Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1><p className="muted">A little practice can make a big difference.</p></div><div className="date-chip"><span className="date-dot" /> Practice at your own pace</div></section>
        <section className="hero-card"><div className="hero-text"><span className="eyebrow light-eyebrow">YOUR NEXT INTERVIEW</span><h2>Make room for<br />your best answer.</h2><p>Choose a role and focus area. Your AI coach will guide you through a short practice round.</p><div className="hero-meta"><span>◷ &nbsp;About 10 minutes</span><span>▤ &nbsp;3 questions</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><span className="art-card-label">A MOMENT TO THINK</span><span className="art-card-line line-a"/><span className="art-card-line line-b"/><span className="art-card-line line-c"/><span className="art-card-spark">✳</span></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✳</span></div></section>
        <div className="section-heading"><div><span className="eyebrow">SET YOUR INTENTION</span><h2>What would you like to practice?</h2></div><span className="step-label">01 <i /> 02 <i /> 03</span></div>
        <section className="setup-card">
          <div className="setup-grid">
            <label>Role or position<select value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.map((option) => <option key={option}>{option}</option>)}</select><span className="field-hint">Pick the kind of work you’re preparing for.</span></label>
            <label>Experience level<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Student</option><option>Early career</option><option>Mid-level</option><option>Senior</option></select><span className="field-hint">Questions are tailored to your level.</span></label>
          </div>
          <div className="focus-section"><div className="focus-label"><span>Focus area</span><span className="optional-label">Choose one</span></div><div className="focus-options">{['Communication & clarity', 'Problem solving', 'Behavioral stories'].map((option, index) => <button className={`focus-option ${focus === option ? 'active' : ''}`} key={option} onClick={() => setFocus(option)} type="button"><span className="focus-icon">{['◌', '⌘', '↗'][index]}</span><span>{option}</span>{focus === option && <span className="check-mark">✓</span>}</button>)}</div></div>
          {error && <div className="form-error start-error" role="alert">{error}</div>}
          <div className="setup-footer"><p><span className="info-icon">i</span> You can take your time. There are no wrong first drafts.</p><button className="button button-primary" disabled={busy} onClick={() => onStart({ role, level, focus })} type="button">{busy ? 'Preparing questions…' : 'Start practice'} <span aria-hidden="true">→</span></button></div>
        </section>
      </main>
      <footer className="footer">AI feedback is for practice and learning, not for employment decisions.</footer>
    </div>
  );
}

function Interview({ session, feedback, onSubmit, onExit, busy, error }) {
  const [answer, setAnswer] = useState('');
  const [showExit, setShowExit] = useState(false);
  const progress = (session.questionNumber / session.totalQuestions) * 100;

  useEffect(() => setAnswer(''), [session.questionNumber]);

  return (
    <div className="app-shell interview-shell">
      <Header onHome={() => setShowExit(true)} onLogout={() => setShowExit(true)} user={{ name: 'Practice session' }} />
      <main className="interview-main">
        <div className="interview-topline"><button className="back-link" onClick={() => setShowExit(true)} type="button">← <span>End practice</span></button><span className="practice-tag"><span className="date-dot" /> AI PRACTICE SESSION</span><span className="interview-role">{session.settings.role}</span></div>
        <div className="progress-heading"><div><span className="eyebrow">QUESTION {String(session.questionNumber).padStart(2, '0')} <span className="muted">/ {String(session.totalQuestions).padStart(2, '0')}</span></span><h1>Take a moment.<br />Then answer in your own words.</h1></div><div className="timer-note">◷ &nbsp;No time limit</div></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        {feedback && <section className="turn-feedback"><span className="eyebrow">FEEDBACK ON YOUR LAST ANSWER · {feedback.score}/5</span><p>{feedback.advice}</p></section>}
        <section className="question-card"><div className="question-card-top"><span className="question-icon">✳</span><span>YOUR QUESTION</span><span className="question-count">{session.questionNumber} of {session.totalQuestions}</span></div><h2>{session.question}</h2><div className="answer-label"><label htmlFor="answer">Your answer</label><span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'Take your time'}</span></div><textarea autoFocus id="answer" maxLength={6000} onChange={(event) => setAnswer(event.target.value)} placeholder="Start wherever feels natural. You can refine your answer as you go…" value={answer} /><div className="answer-tip"><span>✦</span> Try sharing the situation, what you did, and what changed.</div></section>
        {error && <div className="form-error interview-error" role="alert">{error}</div>}
        <div className="interview-actions"><span className="saved-note">Your answer is saved with your interview.</span><button className="button button-primary" disabled={!answer.trim() || busy} onClick={() => onSubmit(answer)} type="button">{busy ? 'Reviewing your answer…' : session.questionNumber === session.totalQuestions ? 'Finish practice' : 'Next question'} <span aria-hidden="true">→</span></button></div>
        <div className="interview-footnote">{session.settings.level} <span>·</span> {session.settings.focus}</div>
      </main>
      {showExit && <div className="modal-backdrop" role="presentation"><section aria-labelledby="exit-title" aria-modal="true" className="confirm-modal" role="dialog"><span className="modal-icon">↗</span><h2 id="exit-title">Leave this practice?</h2><p>Your session will remain incomplete. Answers already submitted are saved.</p><div><button className="button button-secondary" onClick={() => setShowExit(false)} type="button">Keep practicing</button><button className="button button-primary" onClick={onExit} type="button">Leave session</button></div></section></div>}
    </div>
  );
}

function Results({ result, onAgain, onHome }) {
  const summary = result.summary;
  return (
    <div className="app-shell">
      <Header onHome={onHome} onLogout={onHome} user={{ name: 'Practice complete' }} />
      <main className="results-main">
        <div className="results-icon">✳</div><span className="eyebrow">PRACTICE COMPLETE</span><h1>You made space<br />to get better.</h1>
        <p className="muted results-intro">Your AI coach reviewed your {result.role} practice answers. Use this feedback to choose what to strengthen next.</p>
        <section className="results-card">
          <div className="results-card-heading"><div><span className="eyebrow">YOUR SESSION</span><h2>{result.role}</h2></div><span className="results-chip">{result.level} · {summary.score}/5</span></div>
          <p className="summary-overview">{summary.overview}</p>
          <div className="results-list">{result.questions.map((item, index) => <article className="result-answer" key={`${index}-${item.prompt}`}><span className="result-number">0{index + 1}</span><div><h3>{item.prompt}</h3><p>{item.evaluation.score}/5 · {item.evaluation.advice}</p></div><span className="result-check">✓</span></article>)}</div>
          <div className="feedback-columns"><div><h3>What went well</h3><ul>{summary.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>To work on</h3><ul>{summary.improvements.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
          <div className="feedback-note"><span>✦</span><p><strong>Next steps</strong><br />{summary.nextSteps.join(' ')}</p></div>
          <p className="results-disclaimer">Scores and suggestions are AI-generated practice feedback. They are not a measure of your worth or a hiring decision.</p>
        </section>
        <div className="results-actions"><button className="button button-secondary" onClick={onHome} type="button">Back to dashboard</button><button className="button button-primary" onClick={onAgain} type="button">Practice again <span aria-hidden="true">→</span></button></div>
      </main>
      <footer className="footer">Progress comes from practice, one answer at a time.</footer>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [screen, setScreen] = useState('auth');
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');

  async function startPractice(nextSettings) {
    setRequestError('');
    setBusy(true);
    try {
      const created = await apiRequest('interviews/start', { method: 'POST', body: nextSettings });
      setSettings(nextSettings);
      setSession({ ...created, settings: nextSettings });
      setFeedback(null);
      setResult(null);
      setScreen('interview');
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(answer) {
    setRequestError('');
    setBusy(true);
    try {
      const response = await apiRequest(`interviews/${session.interviewId}/answer`, {
        method: 'POST',
        body: { answer },
      });
      setFeedback(response.feedback);
      if (response.completed) {
        setResult(response.result);
        setScreen('results');
      } else {
        setSession((current) => ({
          ...current,
          question: response.question,
          questionNumber: response.questionNumber,
          totalQuestions: response.totalQuestions,
        }));
      }
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function goHome() {
    setRequestError('');
    setFeedback(null);
    setSession(null);
    setResult(null);
    setScreen('dashboard');
  }

  async function signOut() {
    try { await apiRequest('auth/logout'); } catch { /* End the local UI session even if the server is unavailable. */ }
    setUser(null);
    setSettings(null);
    setSession(null);
    setFeedback(null);
    setResult(null);
    setScreen('auth');
  }

  if (screen === 'auth') return <AuthScreen onAuthenticated={(nextUser) => { setUser(nextUser); setScreen('dashboard'); }} />;
  if (screen === 'interview') return <Interview error={requestError} feedback={feedback} onExit={goHome} onSubmit={submitAnswer} session={session} busy={busy} />;
  if (screen === 'results') return <Results onAgain={() => startPractice(settings)} onHome={goHome} result={result} />;
  return <Dashboard busy={busy} error={requestError} onHome={goHome} onLogout={signOut} onStart={startPractice} user={user} />;
}

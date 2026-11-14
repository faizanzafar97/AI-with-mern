import { useMemo, useState } from 'react';

const questionSets = {
  'Software Engineer': [
    'Tell me about a project you built recently. What problem did it solve, and what was your contribution?',
    'Describe a difficult technical bug you solved. How did you narrow down the cause?',
    'How do you decide when to improve existing code and when to ship a simpler solution?',
  ],
  'Frontend Developer': [
    'How do you make a web interface accessible and usable across different screen sizes?',
    'Tell me about a frontend performance problem you investigated. What did you change?',
    'How do you organize components when a product interface starts to grow?',
  ],
  'Backend Developer': [
    'How would you design an API endpoint that needs to handle a large number of requests?',
    'Tell me about a database or backend performance issue you diagnosed.',
    'How do you handle failures between services while keeping an API reliable?',
  ],
  'Product Manager': [
    'Tell me about a product decision you made with incomplete information.',
    'How do you prioritize customer requests when the team has limited time?',
    'Which metrics would you use to decide whether a new feature is successful?',
  ],
  Designer: [
    'Walk me through a design project from the initial problem to the final result.',
    'How do you use research or feedback when your first design direction is challenged?',
    'How do you balance usability, accessibility, and visual consistency?',
  ],
};

const roleOptions = Object.keys(questionSets);

async function authRequest(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Unable to complete that request.');
  return data;
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark" aria-hidden="true">i</span>
      <span>interviewly</span>
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await authRequest(mode === 'login' ? 'login' : 'register', form);
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
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
          <p className="auth-footnote">By continuing, you agree to use practice feedback as a learning aid.</p>
        </div>
      </section>
    </main>
  );
}

function Header({ user, onLogout, onHome }) {
  return <header className="topbar"><button className="brand brand-button" onClick={onHome} type="button"><span className="brand-mark" aria-hidden="true">i</span><span>interviewly</span></button><div className="topbar-right"><span className="user-greeting">{user?.name || user?.email}</span><button className="text-button" onClick={onLogout} type="button">Sign out</button><span className="avatar">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span></div></header>;
}

function Dashboard({ user, onStart, onLogout, onHome }) {
  const [role, setRole] = useState(roleOptions[0]);
  const [level, setLevel] = useState('Early career');
  const [focus, setFocus] = useState('Communication & clarity');
  return <div className="app-shell"><Header onHome={onHome} onLogout={onLogout} user={user} />
    <main className="dashboard content-width">
      <section className="welcome-row"><div><span className="eyebrow">YOUR PRACTICE SPACE</span><h1>Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1><p className="muted">A little practice can make a big difference.</p></div><div className="date-chip"><span className="date-dot" /> Practice at your own pace</div></section>
      <section className="hero-card"><div className="hero-text"><span className="eyebrow light-eyebrow">YOUR NEXT INTERVIEW</span><h2>Make room for<br />your best answer.</h2><p>Choose a role and focus area. We’ll guide you through a short practice round.</p><div className="hero-meta"><span>◷ &nbsp;About 10 minutes</span><span>▤ &nbsp;3 questions</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-ring ring-a"/><div className="art-ring ring-b"/><div className="art-card"><span className="art-card-label">A MOMENT TO THINK</span><span className="art-card-line line-a"/><span className="art-card-line line-b"/><span className="art-card-line line-c"/><span className="art-card-spark">✳</span></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✳</span></div></section>
      <div className="section-heading"><div><span className="eyebrow">SET YOUR INTENTION</span><h2>What would you like to practice?</h2></div><span className="step-label">01 <i /> 02 <i /> 03</span></div>
      <section className="setup-card"><div className="setup-grid"><label>Role or position<select value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.map((option) => <option key={option}>{option}</option>)}</select><span className="field-hint">Pick the kind of work you’re preparing for.</span></label><label>Experience level<select value={level} onChange={(event) => setLevel(event.target.value)}><option>Student</option><option>Early career</option><option>Mid-level</option><option>Senior</option></select><span className="field-hint">Questions are a starting point for your level.</span></label></div><div className="focus-section"><div className="focus-label"><span>Focus area</span><span className="optional-label">Choose one</span></div><div className="focus-options">{['Communication & clarity', 'Problem solving', 'Behavioral stories'].map((option, index) => <button className={`focus-option ${focus === option ? 'active' : ''}`} key={option} onClick={() => setFocus(option)} type="button"><span className="focus-icon">{['◌', '⌘', '↗'][index]}</span><span>{option}</span>{focus === option && <span className="check-mark">✓</span>}</button>)}</div></div><div className="setup-footer"><p><span className="info-icon">i</span> You can take your time. There are no wrong first drafts.</p><button className="button button-primary" onClick={() => onStart({ role, level, focus })} type="button">Start practice <span aria-hidden="true">→</span></button></div></section>
      <p className="demo-banner"><span>✳</span> Preview mode: these are sample prompts. AI-generated questions and feedback will be connected when the interview API is added.</p>
    </main><footer className="footer">A thoughtful practice space for your next opportunity.</footer></div>;
}

function Interview({ settings, onFinish, onExit }) {
  const questions = useMemo(() => questionSets[settings.role] || questionSets['Software Engineer'], [settings.role]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(''));
  const [showExit, setShowExit] = useState(false);
  const answer = answers[index] || '';
  const progress = ((index + 1) / questions.length) * 100;
  function saveAnswer(value) { setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? value : item)); }
  function next() {
    if (!answer.trim()) return;
    if (index === questions.length - 1) onFinish({ settings, questions, answers: answers.map((item, itemIndex) => itemIndex === index ? answer : item) });
    else setIndex((current) => current + 1);
  }
  return <div className="app-shell interview-shell"><Header onHome={() => setShowExit(true)} onLogout={() => setShowExit(true)} user={{ name: 'Practice session' }} />
    <main className="interview-main"><div className="interview-topline"><button className="back-link" onClick={() => setShowExit(true)} type="button">← <span>End practice</span></button><span className="practice-tag"><span className="date-dot" /> PRACTICE SESSION</span><span className="interview-role">{settings.role}</span></div>
      <div className="progress-heading"><div><span className="eyebrow">QUESTION {String(index + 1).padStart(2, '0')} <span className="muted">/ {String(questions.length).padStart(2, '0')}</span></span><h1>Take a moment.<br />Then answer in your own words.</h1></div><div className="timer-note">◷ &nbsp;No time limit</div></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <section className="question-card"><div className="question-card-top"><span className="question-icon">✳</span><span>YOUR QUESTION</span><span className="question-count">{index + 1} of {questions.length}</span></div><h2>{questions[index]}</h2><div className="answer-label"><label htmlFor="answer">Your answer</label><span>{answer.trim() ? `${answer.trim().split(/\s+/).length} words` : 'Take your time'}</span></div><textarea autoFocus id="answer" onChange={(event) => saveAnswer(event.target.value)} placeholder="Start wherever feels natural. You can refine your answer as you go…" value={answer} /><div className="answer-tip"><span>✦</span> Try sharing the situation, what you did, and what changed.</div></section>
      <div className="interview-actions"><span className="saved-note">Your answer stays in this session.</span><button className="button button-primary" disabled={!answer.trim()} onClick={next} type="button">{index === questions.length - 1 ? 'Finish practice' : 'Next question'} <span aria-hidden="true">→</span></button></div>
      <div className="interview-footnote">{settings.level} <span>·</span> {settings.focus}</div>
    </main>
    {showExit && <div className="modal-backdrop" role="presentation"><section aria-labelledby="exit-title" aria-modal="true" className="confirm-modal" role="dialog"><span className="modal-icon">↗</span><h2 id="exit-title">Leave this practice?</h2><p>Your answers from this session won’t be saved.</p><div><button className="button button-secondary" onClick={() => setShowExit(false)} type="button">Keep practicing</button><button className="button button-primary" onClick={onExit} type="button">Leave session</button></div></section></div>}
  </div>;
}

function Results({ result, onAgain, onHome }) {
  return <div className="app-shell"><Header onHome={onHome} onLogout={onHome} user={{ name: 'Practice complete' }} /><main className="results-main"><div className="results-icon">✳</div><span className="eyebrow">PRACTICE COMPLETE</span><h1>You made space<br />to get better.</h1><p className="muted results-intro">You worked through {result.questions.length} prompts for a {result.settings.role} interview. Take a moment to reflect on what felt strong.</p><section className="results-card"><div className="results-card-heading"><div><span className="eyebrow">YOUR SESSION</span><h2>{result.settings.role}</h2></div><span className="results-chip">{result.settings.level}</span></div><div className="results-list">{result.questions.map((question, index) => <article className="result-answer" key={question}><span className="result-number">0{index + 1}</span><div><h3>{question}</h3><p>{result.answers[index]?.trim() ? `${result.answers[index].trim().split(/\s+/).length} words in your response` : 'No response entered'}</p></div><span className="result-check">✓</span></article>)}</div><div className="feedback-note"><span>✦</span><p><strong>What’s next</strong><br />AI-powered feedback will be available once the interview API is connected. For now, review your answers and note one thing you’d like to make clearer next time.</p></div></section><div className="results-actions"><button className="button button-secondary" onClick={onHome} type="button">Back to dashboard</button><button className="button button-primary" onClick={onAgain} type="button">Practice again <span aria-hidden="true">→</span></button></div></main><footer className="footer">Progress comes from practice, one answer at a time.</footer></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [result, setResult] = useState(null);
  const [screen, setScreen] = useState('auth');

  function startPractice(nextSettings) { setSettings(nextSettings); setResult(null); setScreen('interview'); }
  function finishPractice(nextResult) { setResult(nextResult); setScreen('results'); }
  function goHome() { setResult(null); setScreen('dashboard'); }
  async function signOut() {
    try { await fetch('/api/auth/logout', { method: 'GET', credentials: 'include' }); } catch { /* The local session can still end if the server is unavailable. */ }
    setUser(null); setScreen('auth'); setResult(null); setSettings(null);
  }

  if (screen === 'auth') return <AuthScreen onAuthenticated={(nextUser) => { setUser(nextUser); setScreen('dashboard'); }} />;
  if (screen === 'interview') return <Interview onExit={goHome} onFinish={finishPractice} settings={settings} />;
  if (screen === 'results') return <Results onAgain={() => startPractice(settings)} onHome={goHome} result={result} />;
  return <Dashboard onHome={goHome} onLogout={signOut} onStart={startPractice} user={user} />;
}

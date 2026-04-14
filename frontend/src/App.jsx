import { useState } from 'react'

function App() {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [length, setLength] = useState('medium')
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [inputMode, setInputMode] = useState('text')
  const [copied, setCopied] = useState(false)
  const [language, setLanguage] = useState('English')
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoginMode, setIsLoginMode] = useState(true)

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const endpoint = isLoginMode ? '/login' : '/register';

    try {
      const response = await fetch(`https://ai-summarizer-iwtj.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Authentication failed.');

      if (isLoginMode) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userEmail', authEmail);
        setToken(data.access_token);
        setUserEmail(authEmail);
        setShowAuthModal(false);
        setAuthPassword('');
      } else {
        setIsLoginMode(true);
        setAuthError('Registration successful! Please log in.');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUserEmail(null);
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch('https://ai-summarizer-iwtj.onrender.com/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data.history);
      }
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (selectedFile) {
      if (selectedFile.size > 5242880) {
        setError("File size is too large! Maximum limit is 5MB.");
        setFile(null);
        e.target.value = null; 
      } else {
        setFile(selectedFile);
      }
    }
  };

  const handleSummarize = async () => {
    setError('')
    setSummary('')
    setTruncated(false)
    setIsLoading(true)

    try {
      if (inputMode === 'text' && text.trim().length < 50) {
        throw new Error("Text is too short! Please enter at least 50 characters for an effective summary.");
      }

      let response;

      if (inputMode === 'pdf') {
        if (!file) throw new Error("Please select a PDF file.");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('length', length);
        formData.append('language', language);

        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        response = await fetch('https://ai-summarizer-iwtj.onrender.com/summarize-pdf', {
          method: 'POST',
          headers: headers,
          body: formData,
        });
      }
      else {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        response = await fetch('https://ai-summarizer-iwtj.onrender.com/summarize', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            text: inputMode === 'text' ? text : "",
            url: inputMode === 'url' ? url : "",
            length: length,
            language: language
          }),
        });
      }

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = typeof data.detail === 'string'
          ? data.detail
          : (Array.isArray(data.detail) ? data.detail[0].msg : 'An error occurred while communicating with the server.');
        throw new Error(errorMessage);
      }

      setSummary(data.summary)
      if (data.truncated) setTruncated(true)

    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = summary ? summary.split(/\s+/).filter(Boolean).length : 0
  const isDisabled = isLoading ||
    (inputMode === 'text' ? !text.trim() :
      inputMode === 'url' ? !url.trim() :
        !file);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">

      <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">

        <div className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Summarize<span className="text-violet-400">.ai</span>
              </h1>
            </div>
            <p className="text-sm text-zinc-600 ml-[52px]">Summarize your texts instantly with AI</p>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-violet-400">{userEmail?.split('@')[0]}</span>
                <div className="flex gap-3 mt-1">
                  <button
                    onClick={() => { setShowHistoryModal(true); fetchHistory(); }}
                    className="text-xs text-zinc-400 hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    History
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-4">
          {['text', 'url', 'pdf'].map((mode) => (
            <button
              key={mode}
              onClick={() => { setInputMode(mode); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 capitalize cursor-pointer
                ${inputMode === mode
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm shadow-black/30'
                  : 'text-zinc-500 hover:text-zinc-400'
                }`}
            >
              {mode === 'text' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 6.1H3M21 12.1H3M15.1 18H3" /></svg>}
              {mode === 'url' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
              {mode === 'pdf' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
              {mode}
            </button>
          ))}
        </div>

        <div className="mb-4">
          {inputMode === 'text' && (
            <textarea
              rows="7"
              placeholder="Paste the text you want to summarize here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm leading-relaxed resize-y placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
            />
          )}

          {inputMode === 'url' && (
            <input
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all duration-200"
            />
          )}

          {inputMode === 'pdf' && (
            <div className="w-full bg-zinc-900/50 border border-dashed border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center transition-all hover:border-violet-500/50 hover:bg-zinc-900/80">
              <input
                type="file"
                accept=".pdf"
                id="pdf-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-3 text-center cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span className="text-zinc-300 text-sm font-medium">
                  {file ? file.name : "Click to upload a PDF file"}
                </span>
                <span className="text-zinc-500 text-xs">
                  {file ? "Click to change the file" : "Maximum file size: 5MB"}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-zinc-800/50 text-zinc-200 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2 border border-zinc-700/50 outline-none transition-all cursor-pointer hover:bg-zinc-800 cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Turkish">Türkçe</option>
              <option value="German">Deutsch</option>
              <option value="French">Français</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Length</span>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                {[
                  { value: 'short', label: 'Short' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'long', label: 'Detailed' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLength(opt.value)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
                    ${length === opt.value
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                        : 'border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {length === 'short' && <span className="text-[10px] text-zinc-500/80 italic ml-2 transition-all">~20-50 words</span>}
              {length === 'medium' && <span className="text-[10px] text-zinc-500/80 italic ml-2 transition-all">~50-150 words</span>}
              {length === 'long' && <span className="text-[10px] text-zinc-500/80 italic ml-2 transition-all">~150-300 words</span>}
            </div>
          </div>
        </div>

        <button
          onClick={handleSummarize}
          disabled={isDisabled}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer
            ${isLoading
              ? 'bg-zinc-800 border border-zinc-700 text-zinc-400'
              : isDisabled
                ? 'bg-violet-500/30 text-violet-300/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/25 active:translate-y-0'
            }`}
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin" />
              AI is thinking...
            </>
          ) : (
            <>
              Summarize
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-red-300 text-sm flex items-center gap-3">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {truncated && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-amber-300 text-sm flex items-center gap-3">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Text was truncated before summarization due to AI limits.
          </div>
        )}

        {summary && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-[fadeIn_0.4s_ease]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Summary</span>
              <span className="text-xs text-zinc-600 font-mono">{wordCount} words</span>
            </div>
            <p className="text-sm text-zinc-400 leading-7">{summary}</p>
            <button
              onClick={handleCopy}
              className="mt-4 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-500 text-xs font-medium flex items-center gap-2 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200 cursor-pointer"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3">
          <p className="text-xs text-zinc-700">
            Built by <a href="https://github.com/BeratTansu" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors font-medium cursor-pointer">Berat Tansu Çabuk</a> — Powered by Hugging Face AI
          </p>
          <div className="flex items-center gap-4 text-zinc-600">
            <a href="https://github.com/BeratTansu" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            <a href="https://www.linkedin.com/in/berat-tansu-çabuk-02b55b244/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
          </div>
        </div>
      </div>

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl relative animate-[fadeIn_0.2s_ease]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-100">My Summaries</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isHistoryLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : historyData.length === 0 ? (
                <p className="text-zinc-500 text-center text-sm py-8">No summaries found yet. Start summarizing!</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {historyData.map((item, index) => (
                    <div key={index} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold text-violet-400 uppercase bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20">
                          {item.language} • {item.length}
                        </span>
                        <span className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3 line-clamp-2 italic border-l-2 border-zinc-700 pl-3">"{item.original_text}"</p>
                      <p className="text-sm text-zinc-200 leading-relaxed bg-black/20 p-3 rounded-lg border border-zinc-800/50">{item.summary_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 relative animate-[fadeIn_0.2s_ease]">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <h2 className="text-xl font-bold text-zinc-100 mb-6">
              {isLoginMode ? 'Welcome back' : 'Create an account'}
            </h2>

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm focus:outline-none focus:border-violet-500/50"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm focus:outline-none focus:border-violet-500/50"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className={`text-xs p-2 rounded ${authError.includes('successful') ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-3 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors mt-2 disabled:opacity-50 cursor-pointer"
              >
                {isAuthLoading ? 'Please wait...' : (isLoginMode ? 'Sign in' : 'Create account')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-zinc-500">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }}
                className="text-violet-400 hover:text-violet-300 font-medium cursor-pointer"
              >
                {isLoginMode ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default App
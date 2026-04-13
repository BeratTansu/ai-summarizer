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

  // Dosya seçildiğinde çalışan kontrol fonksiyonu
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError('');

    if (selectedFile) {
      // 5MB Limit Kontrolü (5 * 1024 * 1024 bytes)
      if (selectedFile.size > 5242880) {
        setError("Dosya boyutu çok büyük! Maksimum limit 5MB.");
        setFile(null);
        e.target.value = null; // Input alanını temizle
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
      let response;

      if (inputMode === 'pdf') {
        if (!file) throw new Error("Lütfen bir PDF dosyası seçin.");
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('length', length);
        formData.append('language', language);

        response = await fetch('https://ai-summarizer-iwtj.onrender.com/summarize-pdf', {
          method: 'POST',
          body: formData, 
        });
      } 
      else {
        response = await fetch('https://ai-summarizer-iwtj.onrender.com/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        // Backend'den gelen hata mesajını (detail) yakalıyoruz
        const errorMessage = typeof data.detail === 'string' 
          ? data.detail 
          : (Array.isArray(data.detail) ? data.detail[0].msg : 'Bir hata oluştu.');
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

      {/* Background Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">

        {/* Header */}
        <div className="mb-8">
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
          <p className="text-sm text-zinc-600 pl-13 ml-[52px]">Metinlerinizi yapay zeka ile saniyeler içinde özetleyin</p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-4">
          {['text', 'url', 'pdf'].map((mode) => (
            <button
              key={mode}
              onClick={() => { setInputMode(mode); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 capitalize
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

        {/* Input Area */}
        <div className="mb-4">
          {inputMode === 'text' && (
            <textarea
              rows="7"
              placeholder="Özetlemek istediğiniz metni buraya yapıştırın..."
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
              <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <span className="text-zinc-300 text-sm font-medium">
                  {file ? file.name : "PDF Yüklemek için Tıklayın"}
                </span>
                <span className="text-zinc-500 text-xs">
                  {file ? "Dosyayı değiştirmek için tıklayın" : "Maksimum limit 5MB"}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Dil</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-zinc-800/50 text-zinc-200 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2 border border-zinc-700/50 outline-none transition-all cursor-pointer hover:bg-zinc-800"
            >
              <option value="English">English</option>
              <option value="Turkish">Türkçe</option>
              <option value="German">Deutsch</option>
              <option value="French">Français</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Uzunluk</span>
            <div className="flex gap-1.5">
              {[
                { value: 'short', label: 'Short' },
                { value: 'medium', label: 'Medium' },
                { value: 'long', label: 'Detailed' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLength(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                    ${length === opt.value
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                      : 'border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summarize Button */}
        <button
          onClick={handleSummarize}
          disabled={isDisabled}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2
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
              AI Düşünüyor...
            </>
          ) : (
            <>
              Özetle
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12,5 19,12 12,19" />
              </svg>
            </>
          )}
        </button>

        {/* Error */}
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

        {/* Truncated Warning */}
        {truncated && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-amber-300 text-sm flex items-center gap-3">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Yapay zeka sınırları nedeniyle metin özetleme öncesinde kısaltıldı.
          </div>
        )}

        {/* Result */}
        {summary && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-[fadeIn_0.4s_ease]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Özet</span>
              <span className="text-xs text-zinc-600 font-mono">{wordCount} kelime</span>
            </div>
            <p className="text-sm text-zinc-400 leading-7">{summary}</p>
            <button
              onClick={handleCopy}
              className="mt-4 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-500 text-xs font-medium flex items-center gap-2 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all duration-200"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700 mt-10">
          Built by <span className="text-violet-400">Berat Tansu Çabuk</span> — Powered by Hugging Face AI
        </p>
      </div>

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
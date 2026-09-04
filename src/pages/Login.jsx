import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, EyeOff, Eye, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import { CustomSelect } from '../components/CustomSelect.jsx';


export default function Login({ 
  appSettings, username, setUsername, password, setPassword, showPassword, setShowPassword, rememberMe, setRememberMe,
  handleLogin, isLoggingIn, loginError, uiTheme, loginBrandTitle
}) {
  const [viewMode, setViewMode] = React.useState("login"); // "login" | "forgot"
  const [forgotRole, setForgotRole] = React.useState("guru");
  const [forgotUsername, setForgotUsername] = React.useState("");
  const [forgotWhatsapp, setForgotWhatsapp] = React.useState("");
  const [forgotSuccess, setForgotSuccess] = React.useState(false);
  const [forgotError, setForgotError] = React.useState(null);
  const [forgotMessage, setForgotMessage] = React.useState("");
  const [captcha, setCaptcha] = React.useState({ id: "", question: "" });
  const [captchaAnswer, setCaptchaAnswer] = React.useState("");
  
  const [liveWeather, setLiveWeather] = React.useState('cloudy');
  const [weatherTemp, setWeatherTemp] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    const WEATHER_CACHE_KEY = 'kurmon_weather_bekasi';
    const WEATHER_CACHE_TTL = 5 * 60 * 1000;

    try {
      const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const { ts, condition, temp } = JSON.parse(cached);
        if (Date.now() - ts < WEATHER_CACHE_TTL) {
          if (isMounted) {
            setLiveWeather(condition);
            if (temp !== undefined) setWeatherTemp(temp);
          }
          return () => { isMounted = false; };
        }
      }
    } catch { /* ignore */ }

    fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.2383&longitude=106.9756&current=temperature_2m,is_day,precipitation,rain,weather_code&timezone=Asia%2FJakarta')
      .then(res => res.json())
      .then(data => {
        if (!isMounted || !data?.current) return;
        const { rain, precipitation, weather_code, temperature_2m } = data.current;
        if (temperature_2m !== undefined) setWeatherTemp(Math.round(temperature_2m));
        
        const now = new Date();
        const jktHour = parseInt(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(now), 10);
        const isDaytimeHour = (jktHour >= 6 && jktHour < 18);
        const isMiddayPeak = (jktHour >= 11 && jktHour <= 14);

        let detected = 'cloudy';
        if (rain > 0.1 || precipitation > 0.1 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(weather_code)) {
          detected = 'rain';
        } else if (!isDaytimeHour) {
          detected = 'night';
        } else if (isMiddayPeak && (temperature_2m >= 32 || [0, 1].includes(weather_code))) {
          detected = 'hot';
        } else {
          detected = 'cloudy';
        }
        if (isMounted) {
          setLiveWeather(detected);
          try {
            sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), condition: detected, temp: Math.round(temperature_2m) }));
          } catch {}
        }
      })
      .catch(() => {});
      
    return () => { isMounted = false; };
  }, []);

  const weatherCondition = liveWeather;

  const fetchCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      if (data.ok) {
        setCaptcha({ id: data.id, question: data.question });
        setCaptchaAnswer("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (viewMode === "forgot") fetchCaptcha();
  }, [viewMode]);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage("");
    if (!forgotUsername.trim() || !forgotWhatsapp.trim() || !captchaAnswer.trim()) {
      setForgotError("Harap isi semua kolom termasuk captcha!");
      return;
    }
    try {
      const response = await fetch("/api/auth/forgot-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: forgotRole,
          username: forgotUsername.trim(),
          whatsapp: forgotWhatsapp.trim(),
          captchaId: captcha.id,
          captchaAnswer: captchaAnswer.trim()
        })
      });
      const data = await response.json();
      if (!data.ok) {
        setForgotError(data.message || "Validasi gagal.");
        fetchCaptcha();
        return;
      }
      setForgotMessage(data.message);
      setForgotSuccess(true);
      setForgotUsername("");
      setForgotWhatsapp("");
      setCaptchaAnswer("");
      if (data.whatsappAlert) {
        setForgotMessage(prev => prev + "\n\n" + data.whatsappAlert);
      }
    } catch (err) {
      console.error(err);
      setForgotError("Terjadi kesalahan sistem saat mengirimkan permintaan.");
      fetchCaptcha();
    }
  };

  const inputClass = "w-full border border-[var(--ui-border-soft)] bg-white py-2.5 px-3.5 text-base font-semibold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-[var(--ui-primary)] focus:shadow-[var(--ui-focus-ring)] hover:border-slate-300 shadow-[var(--ui-shadow-control)]";

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center items-center p-5 sm:p-8 relative font-sans overflow-hidden"
      style={{
        ...uiTheme,
        background: appSettings.bgImage 
          ? `url(${appSettings.bgImage}) center/cover`
          : weatherCondition === 'night'
            ? 'linear-gradient(to bottom, #0f172a, #1e293b, #0f172a)'
            : weatherCondition === 'rain'
              ? 'linear-gradient(to bottom, #f8fafc, #e2e8f0, #cbd5e1)'
              : weatherCondition === 'hot'
                ? 'linear-gradient(to bottom, #fdfbfb, #fef3c7, #fdfbfb)'
                : 'linear-gradient(to bottom, #fdfbfb, #f1f5f9, #fdfbfb)',
      }}
    >
      {/* Dark overlay for better contrast if using background image */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-0"></div>

      {/* Ambient blur effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Animations (Bird/Bat, Plane, UFO, Rain) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60">
        {weatherCondition === 'night' && (
          <>
            <div className="absolute top-[15%] right-[20%] scale-75">
              <div className="relative">
                <div className="absolute top-0 left-0"><svg viewBox="0 0 34 20" className="w-7 h-4.5 fill-slate-800 drop-shadow-md animate-bat-wing"><path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" /></svg></div>
                <div className="absolute -top-4 left-6"><svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-700 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.24s' }}><path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" /></svg></div>
                <div className="absolute top-5 left-6"><svg viewBox="0 0 34 20" className="w-5.5 h-3.5 fill-slate-700 drop-shadow-md animate-bat-wing" style={{ animationDuration: '0.26s' }}><path d="M 17,6 Q 14,0 12,4 Q 8,2 2,9 Q 7,12 11,10 Q 14,14 17,11 Q 20,14 23,10 Q 27,12 32,9 Q 26,2 22,4 Q 20,0 17,6 Z" /></svg></div>
              </div>
            </div>
            <div className="absolute top-[64%] right-0 animate-ufo-fly flex flex-col items-center">
              <div className="relative">
                <svg viewBox="0 0 48 24" className="w-8 h-4.5 drop-shadow-lg animate-ufo-glow">
                  <ellipse cx="24" cy="9" rx="9" ry="5.5" fill="#38bdf8" fillOpacity="0.85" />
                  <ellipse cx="22" cy="7.5" rx="4" ry="2" fill="#ffffff" fillOpacity="0.7" />
                  <path d="M 6,14 C 6,8 42,8 42,14 C 42,20 6,20 6,14 Z" fill="#94a3b8" />
                  <path d="M 12,14 C 12,16 36,16 36,14 C 36,12 12,12 12,14 Z" fill="#64748b" />
                  <circle cx="16" cy="14" r="1.5" fill="#38bdf8" className="animate-pulse" />
                  <circle cx="24" cy="14" r="1.5" fill="#38bdf8" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <circle cx="32" cy="14" r="1.5" fill="#38bdf8" className="animate-pulse" style={{ animationDelay: "0.4s" }} />
                </svg>
              </div>
              <div className="w-16 h-24 bg-gradient-to-b from-sky-400/20 via-sky-400/5 to-transparent blur-sm rounded-t-full transform -mt-1" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }} />
            </div>
            
            {/* Stars */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute w-0.5 h-0.5 bg-white rounded-full"
                style={{
                  top: `${Math.random() * 50}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.7 + 0.3,
                  animation: `pulse ${Math.random() * 3 + 2}s infinite`
                }}
              />
            ))}
          </>
        )}
        
        {weatherCondition !== 'night' && (
          <div className="absolute top-[38%] left-0 animate-single-plane flex items-center">
            <div className="w-18 sm:w-24 h-[1.5px] bg-gradient-to-r from-transparent via-slate-400/35 to-slate-400/60 blur-[0.5px] -mr-1" />
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-500 drop-shadow-md transform -rotate-12">
              <path fill="currentColor" d="M21,16V14L13,9V3.5C13,2.67 12.33,2 11.5,2C10.67,2 10,2.67 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
            </svg>
          </div>
        )}

        {weatherCondition === 'rain' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={`rain-${i}`}
                className="absolute w-[1px] bg-gradient-to-b from-transparent to-slate-400/40 animate-rain-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20 + 10}%`,
                  height: `${Math.random() * 15 + 10}%`,
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${Math.random() * 0.5 + 0.7}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-[380px] flex flex-col relative z-10 bg-white/95 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-white/20" style={{ borderRadius: "var(--ui-radius-card, 24px)" }}>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 flex items-center justify-center text-[20px] font-black text-white shadow-lg ring-4 ring-white/50"
            style={{
              backgroundColor: "var(--ui-primary)",
              borderRadius: "var(--ui-radius-control, 16px)"
            }}
          >
            {appSettings.logoText || "TS"}
          </div>
        </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-black text-slate-900 mb-1.5 tracking-tight">
              {viewMode === "forgot" ? "Lupa Kata Sandi" : "Masuk ke Akun"}
            </h1>
            <p className="text-[13px] text-slate-500 font-medium">
              {viewMode === "forgot"
                ? "Minta reset kata sandi ke Administrator"
                : <span>Portal akademik <span className="text-[var(--ui-primary)] font-bold">{appSettings.appName || "TimeSchedule"}</span></span>
              }
            </p>
          </div>

          {/* ── Forgot Password Flow ──────────────────────────────── */}
          {viewMode === "forgot" ? (
            forgotSuccess ? (
              <div className="text-center py-6 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 mb-1">Permintaan Terkirim!</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                    {forgotMessage || "Permintaan reset sandi Anda sudah diteruskan ke Administrator."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => { setForgotSuccess(false); setViewMode("login"); }}
                  className="w-full"
                >
                  Kembali ke Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} action="javascript:void(0);" className="space-y-4">
                {forgotError && (
                  <div className="flex items-start gap-2 rounded-[var(--ui-radius-control)] border border-rose-100 bg-rose-50 p-3 text-[11px] font-semibold text-rose-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                    <span className="leading-snug">{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">Role Anda</label>
                  <CustomSelect
                    value={forgotRole}
                    onChange={val => setForgotRole(val)}
                    searchable={false}
                    options={[
                      { value: 'guru', label: 'Guru / Karyawan' },
                      { value: 'siswa', label: 'Siswa' },
                    ]}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Username / NIS / Kode Guru <span className="text-rose-500 normal-case">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={e => setForgotUsername(e.target.value)}
                    placeholder="Masukkan username atau kode"
                    className={inputClass}
                    style={{ borderRadius: "var(--ui-radius-control, 12px)" }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Nomor WhatsApp Aktif <span className="text-rose-500 normal-case">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotWhatsapp}
                    onChange={e => setForgotWhatsapp(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className={inputClass}
                    style={{ borderRadius: "var(--ui-radius-control, 12px)" }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Verifikasi Captcha <span className="text-rose-500 normal-case">*</span>
                  </label>
                  <div className="flex gap-2 items-stretch">
                    <div className="bg-[var(--ui-surface-muted)] border border-[var(--ui-border-soft)] h-10 flex items-center justify-center text-[12px] font-black text-slate-700 select-none rounded-[var(--ui-radius-control)] w-24 shrink-0 text-center shadow-[var(--ui-shadow-control)]">
                      {captcha.question || "Memuat..."}
                    </div>
                    <input
                      type="text"
                      required
                      value={captchaAnswer}
                      onChange={e => setCaptchaAnswer(e.target.value)}
                      placeholder="Jawaban"
                      className={`flex-1 min-w-0 h-10 ${inputClass}`}
                      style={{ borderRadius: "var(--ui-radius-control, 12px)" }}
                    />
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      title="Segarkan captcha"
                      className="shrink-0 w-10 h-10 rounded-[var(--ui-radius-control)] border border-[var(--ui-border-soft)] bg-white text-slate-500 hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-primary)] transition-all shadow-[var(--ui-shadow-control)] flex items-center justify-center cursor-pointer"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Kirim Permintaan Reset
                </Button>
                <button
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="w-full h-9 rounded-[var(--ui-radius-control)] text-[12px] font-bold text-slate-500 hover:text-[var(--ui-primary)] transition-colors border-none bg-transparent cursor-pointer"
                >
                  Batal & Kembali ke Login
                </button>
              </form>
            )
          ) : (
            /* ── Login Form ──────────────────────────────────────── */
            <>
              {loginError && (
                <div className="mb-4 flex items-start gap-2 rounded-[var(--ui-radius-control)] border border-rose-100 bg-rose-50 p-3 text-[11px] font-semibold text-rose-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                  <span className="leading-snug">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} action="javascript:void(0);" className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Username / Kode Guru <span className="text-rose-500 normal-case">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoggingIn}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username atau kode"
                    className={inputClass}
                    style={{ borderRadius: "var(--ui-radius-control, 12px)" }}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Kata Sandi <span className="text-rose-500 normal-case">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isLoggingIn}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                      style={{ borderRadius: "var(--ui-radius-control, 12px)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 text-[13px] font-semibold text-slate-600 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="peer absolute h-5 w-5 cursor-pointer opacity-0"
                      />
                      <div className={`flex h-5 w-5 items-center justify-center rounded-[6px] border transition-all ${rememberMe ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]' : 'border-slate-300 bg-white group-hover:border-[var(--ui-primary)]'}`}>
                        {rememberMe && (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="group-hover:text-slate-900 transition-colors select-none">Ingat saya</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setViewMode("forgot")}
                    className="text-[12px] font-bold text-[var(--ui-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                  >
                    Lupa Sandi?
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center py-0.5 opacity-60">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="flex-shrink-0 mx-3 text-slate-400 text-[9px] font-black uppercase tracking-widest">Atau</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex items-center justify-center gap-2 h-11 text-[13px] font-bold shadow-lg shadow-[var(--ui-primary)]/20"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4.5 w-4.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    <>Masuk ke Akun <ArrowRight size={16} strokeWidth={2.5} /></>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Footer links */}
          <div className="mt-8 text-center text-[11px] font-medium text-slate-400 space-y-1.5">
            <Link to="/" className="block text-slate-500 hover:text-[var(--ui-primary)] transition-colors font-semibold">
              ← Kembali ke Beranda
            </Link>
            <p>{appSettings.footerText || `© ${new Date().getFullYear()} ${loginBrandTitle}.`}</p>
          </div>
        </div>
    </div>
  );
}

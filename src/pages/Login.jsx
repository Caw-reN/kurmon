import React from'react';
import { Link } from'react-router-dom';
import { AlertCircle, ChevronDown, EyeOff, Eye, ArrowUpRight } from'lucide-react';
import { UISelect, Button } from'../components/ui.jsx';


export default function Login({ 
  appSettings, username, setUsername, password, setPassword, showPassword, setShowPassword, rememberMe, setRememberMe,
  handleLogin, isLoggingIn, loginError, uiTheme, loginBrandTitle
}) {
  const [viewMode, setViewMode] = React.useState("login"); //"login" or"forgot"
  const [forgotRole, setForgotRole] = React.useState("guru");
  const [forgotUsername, setForgotUsername] = React.useState("");
  const [forgotWhatsapp, setForgotWhatsapp] = React.useState("");
  const [forgotSuccess, setForgotSuccess] = React.useState(false);
  const [forgotError, setForgotError] = React.useState(null);
  const [forgotMessage, setForgotMessage] = React.useState("");
  const [captcha, setCaptcha] = React.useState({ id:"", question:"" });
  const [captchaAnswer, setCaptchaAnswer] = React.useState("");

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
    if (viewMode ==="forgot") {
      fetchCaptcha();
    }
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
        method:"POST",
        headers: {"Content-Type":"application/json" },
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
        setForgotError(data.message ||"Validasi gagal.");
        fetchCaptcha(); // Refresh captcha on failure
        return;
      }

      setForgotMessage(data.message);
      setForgotSuccess(true);
      setForgotUsername("");
      setForgotWhatsapp("");
      setCaptchaAnswer("");
      if (data.whatsappAlert) {
        setForgotMessage(prev => prev +"\n\n" + data.whatsappAlert);
      }
    } catch (err) {
      console.error(err);
      setForgotError("Terjadi kesalahan sistem saat mengirimkan permintaan.");
      fetchCaptcha();
    }
  };
  return (
    <div className="min-h-screen w-full flex bg-[#faf9ff] font-sans text-slate-900" style={uiTheme}>
      {/* Right Area - Main Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative bg-white overflow-hidden">
        {/* Subtle Ambient Background on Right */}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--ui-primary)]/5 rounded-[var(--ui-radius-small)] blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-[320px] flex flex-col relative z-10">
          {/* Center Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 flex items-center justify-center text-[16px] font-black text-white shadow-sm" style={{
              backgroundColor:"var(--ui-primary)",
              borderRadius:"var(--ui-radius-small, 10px)"
            }}>
              {appSettings.logoText ||"TS"}
            </div>
          </div>

          {/* Headers */}
          <div className="text-center mb-6">
            <h1 className="text-[24px] font-black text-slate-900 mb-1 tracking-tight">
              {viewMode ==="forgot" ?"Lupa Sandi" :"Masuk"}
            </h1>
            <p className="text-[12px] text-slate-500 font-medium">
              {viewMode ==="forgot" ? (
                <span>Minta reset kata sandi ke Admin</span>
              ) : (
                <span>
                  Portal akademik{""}
                  <span className="text-[var(--ui-primary)] font-bold">
                    {appSettings.appName ||"TimeSchedule"}
                  </span>
                </span>
              )}
            </p>
          </div>

          {viewMode ==="forgot" ? (
            forgotSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="mb-2 inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800">Permintaan Terkirim!</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">
                  {forgotMessage ||"Permintaan reset sandi Anda sudah diproses."}
                </p>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setForgotSuccess(false);
                    setViewMode("login");
                  }}
                  className="w-full"
                >
                  Kembali ke Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5">
                {forgotError && (
                  <div className="flex items-start gap-2 rounded-[var(--ui-radius-small)] border border-red-105 bg-red-50 p-2.5 text-[11px] font-semibold text-red-600 animate-in fade-in">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="leading-snug">{forgotError}</span>
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">Role Anda</label>
                  <UISelect
                    value={forgotRole}
                    onChange={(e) => setForgotRole(e.target.value)}
                    className="w-full"
                  >
                    <option value="guru">Guru / Karyawan</option>
                    <option value="siswa">Siswa</option>
                  </UISelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">Username / NIS / Kode Guru <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Masukkan username atau kode"
                    className="w-full border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15"
                    style={{ borderRadius:"var(--ui-radius-control, 10px)" }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">Nomor WhatsApp Aktif <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={forgotWhatsapp}
                    onChange={(e) => setForgotWhatsapp(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-[13px] font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15"
                    style={{ borderRadius:"var(--ui-radius-control, 10px)" }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">Verifikasi Captcha <span className="text-red-500">*</span></label>
                  <div className="flex gap-2 items-center w-full">
                    <div className="bg-slate-100 h-10 flex items-center justify-center text-[12px] font-black text-slate-700 select-none border border-slate-200 rounded-[var(--ui-radius-control,10px)] w-24 shrink-0 text-center">
                      {captcha.question ||"Memuat..."}
                    </div>
                    <input
                      type="text"
                      required
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      placeholder="Jawaban"
                      className="flex-1 min-w-0 h-10 border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15"
                      style={{ borderRadius:"var(--ui-radius-control, 10px)" }}
                    />
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      className="shrink-0 h-10 px-3 rounded-[var(--ui-radius-control,10px)] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      Segarkan
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full mt-2"
                >
                  Kirim Permintaan Reset
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setViewMode("login")}
                  className="w-full mt-1"
                >
                  Batal & Kembali ke Login
                </Button>
              </form>
            )
          ) : (
            <>
              {loginError && <div className="mb-4 flex items-start gap-2 rounded-[var(--ui-radius-small)] -[var(--ui-radius-control, 10px)] border border-red-100 bg-red-50 p-2.5 text-[11px] font-semibold text-red-600 animate-pulse">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <span className="leading-snug">{loginError}</span>
              </div>}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">
                    Username / Kode Guru <span className="text-red-500">*</span>
                  </label>
                  <input type="text" required disabled={isLoggingIn} value={username} onChange={e => setUsername(e.target.value)} className="w-full border-none bg-white py-2.5 px-3.5 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:border-[var(--ui-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15 shadow-sm hover:border-[var(--ui-primary)]/50" style={{
                    borderRadius:"var(--ui-radius-control, 10px)"
                  }} placeholder="Masukkan username/kode" />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-bold text-slate-700">
                    Kata Sandi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input type={showPassword ?"text" :"password"} required disabled={isLoggingIn} value={password} onChange={e => setPassword(e.target.value)} className="w-full border-none bg-white py-2.5 pl-3.5 pr-9 text-[13px] font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:border-[var(--ui-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-primary)]/15 shadow-sm hover:border-[var(--ui-primary)]/50" style={{
                      borderRadius:"var(--ui-radius-control, 10px)"
                    }} placeholder="••••••••" />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent text-slate-400 hover:text-slate-650 transition-colors flex items-center justify-center"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="peer absolute h-4 w-4 cursor-pointer opacity-0" />
                      <div className="flex h-4 w-4 items-center justify-center rounded-[var(--ui-radius-small)] -[3px] border border-slate-300 transition-all peer-checked:border-[var(--ui-primary)] peer-checked:bg-[var(--ui-primary)]">
                        <svg className="h-2 w-2 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <span className="group-hover:text-slate-900 transition-colors">
                      Ingat saya
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setViewMode("forgot")}
                    className="text-[12px] font-bold text-[var(--ui-primary)] hover:underline cursor-pointer border-none bg-transparent p-0"
                  >
                    Lupa Sandi?</button>
                </div>

                <div className="relative flex items-center py-1 opacity-70">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Atau
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <Button type="submit" disabled={isLoggingIn} className="w-full mt-2 flex items-center justify-center gap-2">
                  {isLoggingIn ?"Memproses..." :"Masuk ke Akun"}{""}
                  {!isLoggingIn && <ArrowUpRight size={16} />}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-[11px] font-medium text-slate-400">
            <Link to="/" className="text-slate-500 hover:text-[var(--ui-primary)] transition-colors block mb-3">
              Kembali ke Beranda
            </Link>
            <p>
              {appSettings.footerText || `(c) ${new Date().getFullYear()} ${loginBrandTitle}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

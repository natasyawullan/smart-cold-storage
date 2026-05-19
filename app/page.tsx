"use client";

import React, { useState, useEffect } from "react";

export default function SmartColdStorage() {
  // ==========================================
  // STATE NAVIGATION SYSTEM (PENGGANTI MULTI-PAGE)
  // ==========================================
  const [activeTab, setActiveTab] = useState<"home" | "login" | "register" | "dashboard" | "settings">("home");

  // ==========================================
  // STATE LOGIKA AUTH (DARI SCRIPT.JS)
  // ==========================================
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPass1, setRegPass1] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Akun terdaftar disimpan di state (Simulasi LocalStorage)
  const [savedUsername, setSavedUsername] = useState("wullan");
  const [savedPassword, setSavedPassword] = useState("admin123");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ==========================================
  // STATE DATA REAL-TIME SENSOR & IOT
  // ==========================================
  const [suhu, setSuhu] = useState(-0.8);
  const [pintuFrequency, setPintuFrequency] = useState(10);
  const [amonia, setAmonia] = useState(7); // default 7 ppm sesuai script.js kamu
  const [expiryDate, setExpiryDate] = useState("");
  const [habisReset, setHabisReset] = useState(false);

  // State untuk jam realtime di dashboard
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // LOGIKA HANDLER (DARI SCRIPT.JS)
  // ==========================================
  
  // Alert Suhu & Amonia otomatis saat masuk dashboard
  useEffect(() => {
    if (activeTab === "dashboard") {
      if (suhu > 7) {
        alert("🚨 PERINGATAN SUHU!\n\nSuhu cold storage melebihi batas aman!");
      }
      if (amonia > 5) {
        alert("☣️ PERINGATAN PEMBUSUKAN!\n\nTerdeteksi indikasi pembusukan produk!");
      }
    }
  }, [activeTab]);

  // 🛠️ FIX LOGIKA REGISTRASI: CEK USERNAME YANG SUDAH TERDAFTAR
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Cek apakah username yang diinput sama dengan username yang sudah tersimpan
    if (regUsername.toLowerCase() === savedUsername.toLowerCase()) {
      alert(`❌ Registrasi Gagal! Username "${regUsername}" sudah terdaftar di sistem.`);
      return; // Stop fungsi di sini, jangan lanjut simpan
    }

    // 2. Cek apakah konfirmasi password cocok
    if (regPass1 !== regPass2) {
      alert("❌ Password tidak sama!");
      return;
    }

    // 3. Jika lolos semua pengecekan, daftarkan akun baru
    setSavedUsername(regUsername);
    setSavedPassword(regPass1);
    alert("🎉 Registrasi berhasil! Silakan login dengan akun baru kamu.");
    setActiveTab("login");
    
    // Reset form input registrasi
    setRegUsername(""); 
    setRegPass1(""); 
    setRegPass2("");
  };

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput === savedUsername && passwordInput === savedPassword) {
      setIsLoggedIn(true);
      setLoginAttempts(0);
      alert("Login berhasil!");
      setActiveTab("dashboard");
    } else {
      const nextAttempts = loginAttempts + 1;
      setLoginAttempts(nextAttempts);
      alert(`Login gagal! Percobaan: ${nextAttempts}/3`);
      if (nextAttempts >= 3) {
        alert("Terlalu banyak percobaan! Kembali ke menu utama.");
        setLoginAttempts(0);
        setActiveTab("home");
      }
    }
  };

  // Logika Penentuan Status Pembusukan Produk (Amonia)
  const getSpoilageStatus = (ppm: number) => {
    if (ppm < 5) return { text: "Produk Aman Dikonsumsi", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (ppm >= 5 && ppm <= 15) return { text: "Indikasi Awal Pembusukan", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (ppm > 15 && ppm <= 100) return { text: "Produk Mulai Membusuk", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    return { text: "Produk Tidak Layak Konsumsi", color: "text-red-500 bg-red-500/10 border-red-500/25 font-bold" };
  };

  // Tanggal kadaluarsa handler
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(e.target.value);
    if (e.target.value !== "") {
      if (habisReset) {
        alert("Reset tanggal berhasil!");
        setHabisReset(false);
      } else {
        alert("Pengaturan tanggal kadaluarsa berhasil!");
      }
    }
  };

  const handleResetDate = () => {
    if (expiryDate === "") {
      alert("Belum ada tanggal yang diinput!");
    } else {
      const konfirmasi = confirm("Apakah yakin untuk mereset tanggal?");
      if (konfirmasi) {
        setExpiryDate("");
        setHabisReset(true);
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-slate-100 font-sans overflow-x-hidden flex flex-col justify-between">
      
      {/* BACKGROUND IMAGE OVERLAY */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none bg-cover bg-center z-0"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000')` }}
      ></div>

      {/* GLOBAL NAVBAR */}
      <nav className="relative z-10 w-full bg-[#161b22]/90 border-b border-slate-800 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <h2 className="text-lg font-bold text-teal-400 tracking-tight flex items-center gap-2">
          ❄️ Smart Cold Storage System
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("home")} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "home" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            Menu Utama
          </button>
          
          {!isLoggedIn ? (
            <>
              <button 
                onClick={() => setActiveTab("login")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "login" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                Login
              </button>
              <button 
                onClick={() => setActiveTab("register")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "register" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                Registrasi
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveTab("dashboard")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "dashboard" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab("settings")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "settings" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
              >
                Pengaturan
              </button>
              <button 
                onClick={() => { setIsLoggedIn(false); setActiveTab("home"); alert("Sesi Keluar."); }} 
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      {/* CORE PAGES RENDER */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col justify-center">
        
        {/* TAB 1: MENU UTAMA (HOMEPAGE) */}
        {activeTab === "home" && (
          <div className="space-y-12 py-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Smart Cold Storage <span className="text-teal-400">Monitoring</span>
              </h1>
              <h3 className="text-lg md:text-xl font-medium text-slate-300">
                Solusi Penyimpanan Dingin Yang Andal!
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sistem monitoring berbasis IoT untuk membantu pelaku UMKM menjaga kualitas produk pangan basah secara realtime.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => setActiveTab(isLoggedIn ? "dashboard" : "login")}
                  className="bg-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm shadow-lg hover:bg-teal-400 shadow-teal-500/10 hover:scale-[1.02] transition-all"
                >
                  Mulai Sekarang!
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
                <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">⚠️ Permasalahan</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Penurunan mutu dan kualitas produk pangan basah sering terjadi akibat fluktuasi suhu pada penyimpanan dingin.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Permasalahan diperburuk karena belum adanya sistem pemantauan otomatis yang mampu memberikan data realtime, alarm peringatan, serta data logging historis.
                </p>
              </div>
              <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
                <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">💡 Solusi Kami</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Smart Cold Storage Monitoring dirancang untuk memenuhi kebutuhan kamu sebagai pelaku UMKM pangan basah dalam memantau suhu, gas pembusukan, dan status buka-tutup pintu secara otomatis.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sistem ini membantu memastikan kualitas dan konsistensi mutu produk dengan pengoperasian yang sederhana dan mudah digunakan.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-center text-white tracking-tight">Fitur Utama Smart Cold Storage</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#161b22]/40 border border-slate-800/60 p-5 rounded-xl text-center space-y-2">
                  <span className="text-2xl">🚨</span>
                  <h4 className="text-sm font-bold text-white">Alarm & Kontrol Suhu</h4>
                  <p className="text-xs text-slate-400">Mendeteksi perubahan suhu dan memberikan peringatan jika terjadi lonjakan suhu.</p>
                </div>
                <div className="bg-[#161b22]/40 border border-slate-800/60 p-5 rounded-xl text-center space-y-2">
                  <span className="text-2xl">📊</span>
                  <h4 className="text-sm font-bold text-white">Data Logging</h4>
                  <p className="text-xs text-slate-400">Menyimpan histori monitoring untuk analisis dan dokumentasi kondisi penyimpanan.</p>
                </div>
                <div className="bg-[#161b22]/40 border border-slate-800/60 p-5 rounded-xl text-center space-y-2">
                  <span className="text-2xl">🍇</span>
                  <h4 className="text-sm font-bold text-white">Kadaluarsa Produk</h4>
                  <p className="text-xs text-slate-400">Mendeteksi indikasi amonia pembusukan dan memberikan notifikasi langsung ke sistem.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LOGIN PAGE */}
        {activeTab === "login" && (
          <div className="max-w-sm w-full mx-auto bg-[#161b22]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
            <h1 className="text-2xl font-black text-center text-white mb-6 tracking-tight">LOGIN PENGGUNA</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan Username" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan Password" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs mt-2 shadow-lg shadow-teal-500/10 hover:bg-teal-400 transition-all"
              >
                LOGIN PENGGUNA
              </button>
            </form>
            <div className="mt-6 text-center space-y-2 text-xs">
              <p className="text-slate-400">Belum Punya Akun?</p>
              <button onClick={() => setActiveTab("register")} className="text-teal-400 hover:underline font-medium">
                Daftar dulu disini yach →
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: REGISTRASI PAGE */}
        {activeTab === "register" && (
          <div className="max-w-sm w-full mx-auto bg-[#161b22]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
            <h1 className="text-2xl font-black text-center text-white mb-6 tracking-tight">REGISTRASI AKUN</h1>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Buat Username Baru</label>
                <input 
                  type="text" 
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Masukkan Username Baru" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Buat Password Baru</label>
                <input 
                  type="password" 
                  value={regPass1}
                  onChange={(e) => setRegPass1(e.target.value)}
                  placeholder="Masukkan Password Baru" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  value={regPass2}
                  onChange={(e) => setRegPass2(e.target.value)}
                  placeholder="Ulangi Password Baru" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs mt-2 shadow-lg hover:bg-teal-400 transition-all"
              >
                Daftar Sekarang!
              </button>
            </form>
            <div className="mt-6 text-center space-y-2 text-xs">
              <p className="text-slate-400">Sudah Punya Akun?</p>
              <button onClick={() => setActiveTab("login")} className="text-teal-400 hover:underline font-medium">
                Lakukan Login Disini yaaa!
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DASHBOARD UTAMA */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 py-4">
            <div className="w-full flex flex-col sm:flex-row justify-between sm:items-center text-xs text-slate-400 bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-800/40 gap-2">
              <div className="flex items-center gap-4">
                <span className="font-bold text-teal-400 tracking-wider">SYSTEM LOG</span>
                <span className="text-slate-700">|</span>
                <span>User: <strong className="text-white font-mono">{savedUsername}</strong></span>
              </div>
              <div className="text-teal-400/80 font-medium font-mono truncate">
                Status Amonia: {amonia} ppm ({getSpoilageStatus(amonia).text})
              </div>
            </div>

            <header className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">— IoT Node Telemetry</p>
                <h1 className="text-2xl font-black text-white mt-1 tracking-tight">Dashboard Monitoring UMKM</h1>
              </div>
              <div className="text-right font-mono text-[10px] text-slate-500">
                Data Refresh Mode<br />
                <span className="text-emerald-400 font-bold animate-pulse">● LIVE FROM MQTT</span>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD 1: TEMPERATURE */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suhu Pendingin</span>
                  <span className="text-sky-400 text-sm">❄️</span>
                </div>
                <div className="my-1">
                  <span className={`text-4xl font-black tracking-tight ${suhu > 7 ? "text-rose-500" : "text-sky-400"}`}>
                    {suhu > 0 ? `+${suhu}` : suhu}
                  </span>
                  <span className="text-lg font-medium text-slate-400 ml-1">°C</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${suhu > 7 ? "text-rose-400" : "text-emerald-400"}`}>
                  {suhu > 7 ? "🚨 Di Luar Batas Aman" : "✓ Suhu Stabil Aman"}
                </span>
              </div>

              {/* CARD 2: DOOR CLOSURE */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frekuensi Pintu</span>
                  <span className="text-teal-400 text-sm">🚪</span>
                </div>
                <div className="my-1">
                  <span className="text-4xl font-black text-white tracking-tight">{pintuFrequency}</span>
                  <span className="text-sm font-semibold text-slate-400 ml-1.5">Kali</span>
                </div>
                <span className="text-[10px] text-slate-400">Total deteksi siklus buka-tutup</span>
              </div>

              {/* CARD 3: AMMONIA GAS */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kadar Gas Amonia</span>
                  <span className="text-amber-500 text-sm">☣️</span>
                </div>
                <div className="my-1">
                  <span className="text-4xl font-black text-amber-500 tracking-tight">{amonia}</span>
                  <span className="text-sm font-semibold text-slate-400 ml-1.5">ppm</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min((amonia/30)*100, 100)}%` }}></div>
                </div>
              </div>

              {/* CARD 4: LIVE TIMESTAMP */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waktu Node</span>
                  <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/25 px-1.5 py-0.5 rounded-md">
                    ONLINE
                  </span>
                </div>
                <div className="my-1 font-mono text-3xl font-black text-teal-400 tracking-wider">
                  {currentTime || "00:00:00"}
                </div>
                <span className="text-[10px] font-mono text-slate-500">WIB • ESP32 EDGE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* BOX KIRI: STATUS PEMBUSUKAN */}
              <div className="bg-[#161b22]/95 border border-slate-800 p-5 rounded-xl flex flex-col justify-between shadow-xl backdrop-blur-sm">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-800">
                    Status Pembusukan Produk
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    Kombinasi analisis gas amonia mendeteksi kondisi kelayakan komoditas pangan saat ini:
                  </p>
                </div>
                <div className={`p-4 rounded-xl text-center border text-xs font-bold tracking-wide ${getSpoilageStatus(amonia).color}`}>
                  {getSpoilageStatus(amonia).text}
                </div>
              </div>

              {/* BOX KANAN: MANAGEMENT EXPIRY DATE */}
              <div className="md:col-span-2 bg-[#161b22]/95 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-800">
                    Manajemen Kadaluarsa Produk Pangan
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-4">
                    Masukkan estimasi tanggal kadaluarsa untuk memicu notifikasi sistem penanganan logistik UMKM.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 bg-[#0d1117] p-4 rounded-xl border border-slate-800/80">
                  <div className="w-full sm:w-1/2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Input Tanggal Eksprasi</label>
                    <input 
                      type="date" 
                      id="expiry-date" 
                      value={expiryDate}
                      onChange={handleDateChange}
                      className="w-full bg-[#161b22] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="w-full sm:w-1/2 flex flex-col justify-end h-full">
                    <button 
                      onClick={handleResetDate}
                      className="w-full bg-slate-800 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold py-2 px-4 rounded-lg transition-all"
                    >
                      🗑️ Reset Tanggal Kadaluarsa
                    </button>
                  </div>
                </div>

                {expiryDate && (
                  <div className="mt-3 text-[11px] font-mono text-teal-400/90 bg-teal-500/5 px-3 py-1.5 rounded-lg border border-teal-500/10">
                    ✓ Terjadwal kadaluarsa pada: <strong className="text-white">{expiryDate}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PENGATURAN */}
        {activeTab === "settings" && (
          <div className="space-y-6 py-4">
            <header className="pb-3 border-b border-slate-800">
              <h1 className="text-xl font-black text-white tracking-tight">PENGATURAN STRATEGIS</h1>
              <p className="text-xs text-slate-400 mt-0.5">Modifikasi otentikasi data dan penanganan berkas log.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between gap-4 backdrop-blur-sm">
                <div>
                  <h3 className="text-sm font-bold text-white">Ubah Username</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Ganti identitas akses login utama.</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Username Baru" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
                <button 
                  onClick={() => alert("Username berhasil diperbarui!")}
                  className="w-full bg-slate-800 hover:bg-teal-500 hover:text-slate-950 font-bold py-2 rounded-lg text-xs transition-all border border-slate-700 hover:border-teal-500"
                >
                  Simpan Username
                </button>
              </div>

              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between gap-4 backdrop-blur-sm">
                <div>
                  <h3 className="text-sm font-bold text-white">Ganti Password</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Perbarui sandi enkripsi akun.</p>
                </div>
                <input 
                  type="password" 
                  placeholder="Password Baru" 
                  className="w-full bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
                <button 
                  onClick={() => alert("Password sandi berhasil diganti!")}
                  className="w-full bg-slate-800 hover:bg-teal-500 hover:text-slate-950 font-bold py-2 rounded-lg text-xs transition-all border border-slate-700 hover:border-teal-500"
                >
                  Simpan Password
                </button>
              </div>

              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between gap-4 backdrop-blur-sm">
                <div>
                  <h3 className="text-sm font-bold text-white">Download History</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Unduh seluruh histori logging terpusat.</p>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800/80 text-center text-[11px] text-slate-400 font-mono">
                  [ format_log_historis.csv ]
                </div>
                <button 
                  onClick={() => alert("Menyiapkan berkas CSV... Berhasil mengunduh 142 baris log histori!")}
                  className="w-full bg-teal-500 text-slate-950 font-bold py-2 rounded-lg text-xs hover:bg-teal-400 transition-all shadow-md"
                >
                  Download Data CSV
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full bg-[#161b22]/40 border-t border-slate-900 px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 tracking-wide font-mono mt-8 gap-1">
        <p>Smart Cold Storage Monitoring System © 2026</p>
        <p className="text-slate-400">by Wullan Natasya</p>
      </footer>
    </div>
  );
}
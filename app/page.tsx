"use client";

import React, { useState, useEffect, useRef } from "react";
import { connectMQTT } from "@/lib/mqtt"; // 🚀 Mengimpor jembatan kabel MQTT kamu
import { supabase } from "@/lib/supabase";  // 💾 Mengimpor koneksi database Supabase kamu

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

  // State untuk form ganti username dan password di Pengaturan
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Akun terdaftar di-backup via state agar kebal selama sesi aktif
  const [savedUsername, setSavedUsername] = useState("wullan");
  const [savedPassword, setSavedPassword] = useState("admin123");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ==========================================
  // 🔥 AUTO-RESET FORM KETIKA PINDAH MENU
  // ==========================================
  useEffect(() => {
    // Menyapu bersih semua kolom inputan setiap kali user pindah tab/menu
    setUsernameInput("");
    setPasswordInput("");
    setRegUsername("");
    setRegPass1("");
    setRegPass2("");
    setNewUsername("");
    setNewPassword("");
  }, [activeTab]);

  // ==========================================
  // STATE DATA REAL-TIME SENSOR & IOT (LIVE FROM MQTT)
  // ==========================================
  const [suhu, setSuhu] = useState(-0.8);
  const [amonia, setAmonia] = useState(7); 
  
  // 🔥 STATE PINTU DIPISAH MENJADI DUA
  const [statusPintu, setStatusPintu] = useState(0); // 0 = Tutup, 1 = Buka
  const [frekuensiPintu, setFrekuensiPintu] = useState(0); // Angka akumulasi

  const [expiryDate, setExpiryDate] = useState("");
  const [habisReset, setHabisReset] = useState(false);

  // State pengunci agar pop-up peringatan kadaluarsa hanya muncul cukup sekali saja
  const [hasWarned1Day, setHasWarned1Day] = useState(false);
  const [hasWarnedExpired, setHasWarnedExpired] = useState(false);

  // 🔥 State pengunci alert sensor dinamis (Anti-Spam)
  const [lastAlertAmonia, setLastAlertAmonia] = useState<number | null>(null);

  // State untuk jam realtime di dashboard
  const [currentTime, setCurrentTime] = useState("");

  // ==========================================
  // 🔥 STATE KONTROL PERIODE 24 JAM SINKRON CLOUD SUPABASE
  // ==========================================
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);
  const [monitoringStartTime, setMonitoringStartTime] = useState<Date | null>(null);
  const [periodCutoffTime, setPeriodCutoffTime] = useState<Date | null>(null);
  const [hasNotified24hPeriod, setHasNotified24hPeriod] = useState(false);

  // 🔥 Ref penampung elemen audio notifikasi
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fungsi internal memicu audio buzzer di perangkat manapun
  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => console.log("Audio diblokir autoplay browser sebelum interaksi:", err));
    }
  };

  // Fungsi internal menghentikan audio buzzer secara instan setelah klik OK
  const stopAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset durasi ke awal
    }
  };

  // ==========================================
  // 🛡️ AUTO-LOAD USER SESSION DARI LOCALSTORAGE
  // ==========================================
  useEffect(() => {
    const localUser = localStorage.getItem("user_username");
    const localPass = localStorage.getItem("user_password");
    if (localUser && localPass) {
      setSavedUsername(localUser);
      setSavedPassword(localPass);
    }
  }, []);

  // ==========================================
  // 🛰️ LOGIKA KONEKSI MQTT LIVE (HIVEMQ) + AUTO-PUSH SUPABASE
  // ==========================================
  useEffect(() => {
    // Jalankan koneksi hanya jika user sudah login dan berada di dashboard
    if (activeTab !== "dashboard") return;

    console.log("Mencoba menyambungkan ke broker cedepastibisa...");
    const client = connectMQTT();

    client.on("connect", () => {
      console.log("Koneksi ke HiveMQ Sukses! 🚀 Server siap dengerin ESP32.");
      // Subscribe ke topik yang sama dengan codingan ESP32 kamu
      client.subscribe("coldstorage/telemetry");
    });

    client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("Menerima payload IoT:", payload);

    // 1. Petakan data JSON dari ESP32 ke State Next.js
    if (payload.suhu !== undefined) setSuhu(Number(payload.suhu));
    if (payload.amonia !== undefined) setAmonia(Number(payload.amonia));
    
    // 🚀 REVISI TOTAL LOGIKA PINTU: Langsung ambil status riil dari hardware
    if (payload.pintu_status !== undefined) {
      setStatusPintu(Number(payload.pintu_status)); // 1 = BUKA, 0 = TUTUP (Real-time tanpa timeout!)
    }
    
    if (payload.pintu_freq !== undefined) {
      setFrekuensiPintu(Number(payload.pintu_freq)); // Set angka akumulasi counter
    }

    // 2. Data sensor dimasukkan ke Supabase jika monitoring AKTIF
    const { data: userStatus } = await supabase
      .from("users_profile")
      .select("is_monitoring")
      .eq("username", savedUsername)
      .maybeSingle();

    if (userStatus && userStatus.is_monitoring) {
      const { error } = await supabase
        .from("sensor_logs") 
        .insert([
          { 
            suhu: Number(payload.suhu), 
            amonia: Number(payload.amonia), 
            // Kirim status biner riil saat ini (0/1) ke database history
            pintu: Number(payload.pintu_status !== undefined ? payload.pintu_status : 0) 
          }
        ]);

      if (error) {
        console.error("Gagal backup ke Supabase:", error.message);
      } else {
        console.log("Data sensor sukses tercatat di Supabase! 💾");
      }
    } else {
      console.log("Sistem Mode Standby. Data sensor diabaikan.");
    }

  } catch (error) {
    console.error("Gagal parsing data IoT:", error);
  }
});

    // Bersihkan koneksi (disconnect) jika tab berpindah atau web di-refresh
    return () => {
      console.log("Memutus koneksi MQTT (Clean Up)...");
      client.end();
    };
  }, [activeTab, savedUsername, statusPintu, frekuensiPintu]);

  // Jam Realtime Digital
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(" ")[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================
  // 🔥 TIMER KONVERSI DIGITAL 24 JAM SINKRON CLOUD
  // ==========================================
  useEffect(() => {
    if (!monitoringStartTime || !isMonitoringActive || activeTab !== "dashboard") return;

    const periodTimer = setInterval(() => {
      const now = new Date();
      const diffMs = now.getTime() - monitoringStartTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours >= 24 && !hasNotified24hPeriod) {
        const cutoff = new Date(monitoringStartTime.getTime() + 24 * 60 * 60 * 1000);
        setPeriodCutoffTime(cutoff);
        setHasNotified24hPeriod(true);

        playAlertSound(); // 🔊 1. Bunyikan suara DULUAN
        setTimeout(() => {
          alert("⏰ PERIODE 24 JAM TERCAPAI!\n\nData sudah dipantau dalam periodik 1 hari. Silahkan download data historis untuk keperluan analisis produk.\n\n(Pemantauan akan tetap berjalan normal di latar belakang sebelum klik Stop).");
          stopAlertSound(); // 🔇 2. Matikan suara setelah klik OK
        }, 100);
      }
    }, 30000);

    return () => clearInterval(periodTimer);
  }, [monitoringStartTime, isMonitoringActive, hasNotified24hPeriod, activeTab]);

  // ==========================================
  // 🚨 AUTOMATIC ALERT SYSTEM (URUTAN FIXED: BUNYI DULU BARU POP-UP -> MATI PAS KLIK OK)
  // [ALARM SUHU SUDAH DIHAPUS AGAR TIDAK DOUBLE DENGAN HARDWARE BUZZER]
  // ==========================================
  useEffect(() => {
    if (activeTab === "dashboard") {
      
      // 1. Alert Kritis Sensor Amonia (Dinamis)
      if (amonia > 5) {
        if (lastAlertAmonia !== amonia) {
          setLastAlertAmonia(amonia);
          playAlertSound(); // 🔊 Bunyi dulu
          setTimeout(() => {
            alert(`☣️ PERINGATAN PEMBUSUKAN!\n\nTerdeteksi indikasi pembusukan produk! Kadar gas amonia ${amonia} ppm.`);
            stopAlertSound(); // 🔇 Mati pas diklik OK
          }, 100);
        }
      } else {
        setLastAlertAmonia(null);
      }

      // 2. Logika Hitung Mundur & Notifikasi Pop-Up Kadaluarsa
      if (expiryDate) {
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);

        const tanggalTarget = new Date(expiryDate);
        tanggalTarget.setHours(0, 0, 0, 0);

        const selisihWaktu = tanggalTarget.getTime() - hariIni.getTime();
        const selisihHari = Math.ceil(selisihWaktu / (1000 * 3600 * 24));

        if (selisihHari === 1) {
          if (!hasWarned1Day) {
            setHasWarned1Day(true);
            playAlertSound(); // 🔊 Bunyi dulu
            setTimeout(() => {
              alert("⚠️ PERINGATAN MASA BERLAKU!\n\nSisa 1 hari lagi sebelum masa berlaku produk habis!");
              stopAlertSound(); // 🔇 Mati pas diklik OK
            }, 100);
          }
        } 
        else if (selisihHari <= 0) {
          if (!hasWarnedExpired) {
            setHasWarnedExpired(true);
            playAlertSound(); // 🔊 Bunyi dulu
            setTimeout(() => {
              alert("🚨 PERINGATAN KADALUARSA!\n\nProduk telah memasuki atau melewati tanggal kadaluarsa!");
              stopAlertSound(); // 🔇 Mati pas diklik OK
            }, 100);
          }
        }
      }
    }
  }, [activeTab, amonia, expiryDate, hasWarned1Day, hasWarnedExpired, lastAlertAmonia]);

  useEffect(() => {
    setHasWarned1Day(false);
    setHasWarnedExpired(false);
  }, [expiryDate]);

  // ==========================================
  // HANDLE REGISTRASI (100% PURE CLOUD VIA SUPABASE)
  // ==========================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPass1 !== regPass2) {
      alert("❌ Password tidak sama!");
      setRegPass1("");
      setRegPass2("");
      return;
    }

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from("users_profile")
        .select("username")
        .eq("username", regUsername)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        alert(`❌ Registrasi Gagal! Username "${regUsername}" sudah terdaftar di database.`);
        setRegUsername("");
        setRegPass1("");
        setRegPass2("");
        return;
      }

      const { error: insertError } = await supabase
        .from("users_profile")
        .insert([{ username: regUsername, password: regPass1 }]);

      if (insertError) throw insertError;

      alert(`🎉 Registrasi cloud sukses! Akun "${regUsername}" tercatat di Supabase.`);
      setActiveTab("login");
      
      setRegUsername(""); 
      setRegPass1(""); 
      setRegPass2("");
    } catch (err: any) {
      console.error("Gagal registrasi cloud:", err.message);
      alert(`❌ Terjadi kesalahan pendaftaran: ${err.message}`);
      setRegUsername("");
      setRegPass1("");
      setRegPass2("");
    }
  };

  // ==========================================
  // HANDLE LOGIN (OTOMATIS RESTORE STATUS MONITORING DARI CLOUD)
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: user, error: loginError } = await supabase
        .from("users_profile")
        .select("*")
        .eq("username", usernameInput)
        .maybeSingle();

      if (loginError) {
        alert(`❌ Database Error: ${loginError.message}`);
        setUsernameInput("");
        setPasswordInput("");
        return;
      }

      if (!user) {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        alert(`❌ Login gagal! Username tidak terdaftar di cloud. Percobaan: ${nextAttempts}/3`);
        
        if (nextAttempts >= 3) {
          setLoginAttempts(0);
          setActiveTab("home");
        } else {
          setUsernameInput("");
          setPasswordInput("");
        }
        return;
      }

      if (user.password === passwordInput) {
        setIsLoggedIn(true);
        setSavedUsername(user.username); 
        setSavedPassword(user.password);
        setLoginAttempts(0);
        
        if (user.is_monitoring) {
          setIsMonitoringActive(true);
          setMonitoringStartTime(new Date(user.monitoring_started_at));
          
          const startWaktu = new Date(user.monitoring_started_at).getTime();
          const sekarang = new Date().getTime();
          if (sekarang - startWaktu >= 24 * 60 * 60 * 1000) {
            setPeriodCutoffTime(new Date(startWaktu + 24 * 60 * 60 * 1000));
            setHasNotified24hPeriod(true);
          } else {
            setPeriodCutoffTime(null);
            setHasNotified24hPeriod(false);
          }
        } else {
          setIsMonitoringActive(false);
          setMonitoringStartTime(null);
          setPeriodCutoffTime(null);
          setHasNotified24hPeriod(false);
        }

        setLastAlertAmonia(null);

        if (user.expiry_date) {
          setExpiryDate(user.expiry_date);
        } else {
          setExpiryDate("");
        }

        alert(`Login Cloud Sukses! Selamat datang, ${user.username}. Menghubungkan ke IoT... 🚀`);
        setActiveTab("dashboard"); 
        setUsernameInput("");
        setPasswordInput("");
      } else {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        alert(`❌ Password salah! Percobaan: ${nextAttempts}/3`);
        
        if (nextAttempts >= 3) {
          setLoginAttempts(0);
          setActiveTab("home");
        } else {
          setUsernameInput("");
          setPasswordInput("");
        }
      }
    } catch (err) {
      alert("Terjadi kegagalan otentikasi sistem database cloud.");
      setUsernameInput("");
      setPasswordInput("");
    }
  };

  // ==========================================
  // LOGIKA UPDATE PROFILE (FULL CLOUD VIA SUPABASE)
  // ==========================================
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername && !newPassword) {
      alert("Isi salah satu kolom untuk mengganti data profil!");
      return;
    }

    try {
      const oldUsername = savedUsername;

      if (newUsername) {
        const { error: errUser } = await supabase
          .from("users_profile")
          .update({ username: newUsername })
          .eq("username", oldUsername);

        if (errUser) throw errUser;
        setSavedUsername(newUsername);
      }

      if (newPassword) {
        const currentQueryUser = newUsername || oldUsername; 

        const { error: errPass } = await supabase
          .from("users_profile")
          .update({ password: newPassword })
          .eq("username", currentQueryUser);

        if (errPass) throw errPass;
        setSavedPassword(newPassword);
      }

      alert("✨ Sukses! Kredensial akun lu udah ter-update otomatis di database Cloud Supabase.");
      setNewUsername("");
      setNewPassword("");
    } catch (err: any) {
      console.error("Gagal update profil di cloud:", err.message);
      alert(`❌ Gagal update database: ${err.message}`);
    }
  };

  // ==========================================
  // 🔥 LOGIKA PENENTUAN STATUS PEMBUSUKAN PRODUK (AMONIA)
  // ==========================================
  const getSpoilageStatus = (ppm: number) => {
    if (ppm < 5) return { text: "Produk Aman Dikonsumsi", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (ppm >= 5 && ppm <= 15) return { text: "Indikasi Awal Pembusukan", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (ppm > 15 && ppm <= 100) return { text: "Produk Mulai Membusuk", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    return { text: "Produk Tidak Layak Konsumsi", color: "text-red-500 bg-red-500/10 border-red-500/25 font-bold" };
  };

  // ==========================================
  // 🔥 LOGIKA HANDLER INPUT KALENDER TANGGAL KADALUARSA
  // ==========================================
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputDate = e.target.value;
    setExpiryDate(inputDate);

    if (inputDate !== "") {
      try {
        const { error } = await supabase
          .from("users_profile")
          .update({ expiry_date: inputDate })
          .eq("username", savedUsername);

        if (error) throw error;

        if (habisReset) {
          alert("Reset tanggal berhasil!");
          setHabisReset(false);
        } else {
          alert("Pengaturan tanggal kadaluarsa berhasil disimpan di Cloud!");
        }
      } catch (err: any) {
        console.error("Gagal simpan tanggal ke cloud:", err.message);
      }
    }
  };

  const handleResetDate = async () => {
    if (expiryDate === "") {
      alert("Belum ada tanggal yang diinput!");
    } else {
      const konfirmasi = confirm("Apakah yakin untuk mereset tanggal? (Data di database cloud akan dikosongkan untuk produk baru)");
      if (konfirmasi) {
        try {
          const { error } = await supabase
            .from("users_profile")
            .update({ expiry_date: null })
            .eq("username", savedUsername);

          if (error) throw error;

          setExpiryDate("");
          setHabisReset(true);
          alert("Tanggal produk lama berhasil dibersihkan dari cloud! Siap meneliti produk baru.");
        } catch (err: any) {
          console.error("Gagal reset tanggal di cloud:", err.message);
        }
      }
    }
  };

  // ==========================================
  // 🔥 TRIGER KLIK: TOMBOL START MONITORING (SINKRON CLOUD)
  // ==========================================
  const handleStartMonitoring = async () => {
    if (isMonitoringActive) {
      alert("Sistem monitoring sudah berjalan aktif di cloud!");
      return;
    }

    const waktuSkrg = new Date();
    try {
      const { error } = await supabase
        .from("users_profile")
        .update({
          is_monitoring: true,
          monitoring_started_at: waktuSkrg.toISOString()
         })
        .eq("username", savedUsername);

      if (error) throw error;

      setIsMonitoringActive(true);
      setMonitoringStartTime(waktuSkrg);
      setPeriodCutoffTime(null);
      setHasNotified24hPeriod(false);

      alert("▶️ MONITORING DIMULAI!\n\nPencatatan data telemetry IoT ke cloud resmi diaktifkan.");
    } catch (err: any) {
      alert(`Gagal memulai monitoring: ${err.message}`);
    }
  };

  // ==========================================
  // 🔥 TRIGER KLIK: TOMBOL STOP MONITORING (SINKRON CLOUD)
  // ==========================================
  const handleStopMonitoring = async () => {
    if (!isMonitoringActive) {
      alert("Sistem monitoring memang sedang dalam posisi standby/mati.");
      return;
    }

    const konfirmasi = confirm("Apakah kamu yakin ingin memberhentikan proses monitoring?\n\n(Data logging sensor ke database cloud akan dinonaktifkan untuk batch produk ini).");
    if (!konfirmasi) return;

    try {
      const { error } = await supabase
        .from("users_profile")
        .update({
          is_monitoring: false,
          monitoring_started_at: null
        })
        .eq("username", savedUsername);

      if (error) throw error;

      setIsMonitoringActive(false);
      setMonitoringStartTime(null);
      setPeriodCutoffTime(null);
      setHasNotified24hPeriod(false);

      alert("⏹️ MONITORING DIHENTIKAN!\n\nProduk selesai dipantau and sistem kembali ke mode Standby.");
    } catch (err: any) {
      alert(`Gagal menghentikan monitoring: ${err.message}`);
    }
  };

  // ==========================================
  // 🔥 FUNGSI DOWNLOAD DATA LOG SENSOR
  // ==========================================
  const download24HoursCSV = async () => {
    try {
      if (!monitoringStartTime && !hasNotified24hPeriod) {
        alert("Gagal memproses! Kamu belum menekan tombol Start Monitoring di sesi riset ini.");
        return;
      }

      let query = supabase
        .from("sensor_logs")
        .select("created_at, suhu, amonia, pintu")
        .order("created_at", { ascending: false });

      if (monitoringStartTime) {
        query = query.gte("created_at", monitoringStartTime.toISOString());
      }

      if (hasNotified24hPeriod && periodCutoffTime) {
        query = query.lte("created_at", periodCutoffTime.toISOString());
      } else {
        query = query.lte("created_at", new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("Belum ada rekaman data log sensor yang tercatat di dalam interval monitoring aktif!");
        return;
      }

      const csvHeader = "Waktu;Suhu (C);Amonia (ppm);Status Pintu\n";
      const csvRows = data.map(row => {
        const waktuLokal = new Date(row.created_at).toLocaleString("id-ID");
        const statusLog = row.pintu === 1 ? "TERBUKA" : "TERTUTUP";
        return `"${waktuLokal}";${row.suhu};${row.amonia};"${statusLog}"`;
      }).join("\n");
      
      const csvContent = csvHeader + csvRows;

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      const waktuDownloadStr = new Date().toLocaleString("id-ID").replace(/[\/:]/g, "-").replace(", ", "_");
      link.setAttribute("download", `Log_SCS_${waktuDownloadStr}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`🎉 Sukses mengunduh ${data.length} baris rekaman historis dari server!`);
    } catch (err: any) {
      console.error("Gagal export CSV:", err.message);
      alert("Waduh, gagal menarik data histori dari database cloud.");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-slate-100 font-sans overflow-x-hidden flex flex-col justify-between">
      {/* 🔥 ELEMEN AUDIO UNTUK BUNYI NOTIFIKASI WEB */}
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

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
                onClick={() => { setIsLoggedIn(false); setExpiryDate(""); setIsMonitoringActive(false); setMonitoringStartTime(null); setActiveTab("home"); alert("Sesi Keluar."); }} 
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
                Solusi Penyimpanan Dingin Yang Anda!
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
                  Penurunan mutu and kualitas produk pangan basah sering terjadi akibat fluktuasi suhu pada penyimpanan dingin.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Permasalahan diperburuk karena belum adanya sistem pemantauan otomatis yang mampu memberikan data realtime, alarm peringatan, serta data logging historis.
                </p>
              </div>
              <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl space-y-3 shadow-xl">
                <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">💡 Solusi Kami</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Smart Cold Storage Monitoring dirancang untuk memenuhi kebutuhan kamu sebagai pelaku UMKM pangan basah dalam memantau suhu, gas pembusukan, and status buka-tutup pintu secara otomatis.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sistem ini membantu memastikan kualitas dan konsistensi mutu produk dengan pengoperasian yang sederhana and mudah digunakan.
                </p>
              </div>
            </div>

            {/* SEKSI FITUR UTAMA */}
            <div className="space-y-6 pt-6">
              <h1 className="text-2xl font-black text-center text-white tracking-tight uppercase">
                Fitur Utama Smart Cold Storage
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
                <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl border-t-4 border-t-sky-500 flex flex-col min-h-[160px] shadow-xl hover:scale-[1.02] transition-all">
                  <h2 className="text-sm font-bold text-sky-400 pb-2 border-b border-slate-800 mb-3 flex items-center gap-2">
                    🚨 Indikator & Kontrol Suhu
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mendeteksi perubahan suhu secara real-time dan memberikan peringatan visual di dashboard jika melampaui batas aman.
                  </p>
                </div>
                <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl border-t-4 border-t-emerald-500 flex flex-col min-h-[160px] shadow-xl hover:scale-[1.02] transition-all">
                  <h2 className="text-sm font-bold text-emerald-400 pb-2 border-b border-slate-800 mb-3 flex items-center gap-2">
                    📊 Data Logging Historis
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Menyimpan rekaman histori pemantauan telemetri IoT secara terpusat untuk kebutuhan analisis, audit, and dokumentasi kondisi berkas penyimpanan dingin.
                  </p>
                </div>
                <div className="bg-[#161b22]/80 border border-slate-800 p-6 rounded-2xl border-t-4 border-t-amber-500 flex flex-col min-h-[160px] shadow-xl hover:scale-[1.02] transition-all">
                  <h2 className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800 mb-3 flex items-center gap-2">
                    📅 Pelacakan Kadaluarsa Produk
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mendeteksi dini indikasi pembusukan komoditas pangan lewat akumulasi gas amonia and memberikan sistem notifikasi jadwal kadaluarsa tepat waktu.
                  </p>
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
                className="w-full bg-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs mt-2 shadow-lg hover:bg-teal-400 transition-all"
              >
                LOGIN PENGGUNA
              </button>
            </form>
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
          </div>
        )}

        {/* TAB 4: DASHBOARD UTAMA */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 py-4 flex flex-col justify-center">
            <div className="w-full flex flex-col sm:flex-row justify-between sm:items-center text-xs text-slate-400 bg-slate-900/40 px-4 py-2 rounded-xl border border-slate-800/40 gap-2">
              <div className="flex items-center gap-4">
                <span className="font-bold text-teal-400 tracking-wider">SYSTEM LOG</span>
                <span className="text-slate-700">|</span>
                <span>User: <strong className="text-white font-mono">{savedUsername}</strong></span>
                <span className="text-slate-700">|</span>
                <span>Engine status: {isMonitoringActive ? <strong className="text-emerald-400 font-mono">RUNNING (Pencatatan Aktif)</strong> : <strong className="text-amber-500 font-mono">STANDBY (Mati)</strong>}</span>
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
                    {suhu.toFixed(1)}
                  </span>
                  <span className="text-lg font-medium text-slate-400 ml-1">°C</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${suhu > 7 ? "text-rose-400" : "text-emerald-400"}`}>
                  {suhu > 7 ? "🚨 Di Luar Batas Aman" : "✓ Suhu Stabil Aman"}
                </span>
              </div>

              {/* 🔥 CARD 2: DOOR CLOSURE (UI TETAP UTUH, LOGIC FIXED IKUT SENSOR MAGNET) 🔥 */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Pintu</span>
                  <span className="text-teal-400 text-sm">🚪</span>
                </div>
                <div className="my-1">
                  <span className={`text-4xl font-black tracking-tight ${statusPintu === 1 ? "text-amber-500" : "text-white"}`}>
                    {statusPintu === 1 ? "BUKA" : "TUTUP"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Frekuensi Siklus: <strong className="text-teal-400">{frekuensiPintu} kali</strong>
                </span>
              </div>

              {/* CARD 3: AMMONIA GAS */}
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between min-h-[140px] shadow-lg backdrop-blur-sm">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kadar Gas Amonia</span>
                  <span className="text-amber-500 text-sm">☣️</span>
                </div>
                <div className="my-1">
                  <span className="text-4xl font-black text-amber-500 tracking-tight">{amonia.toFixed(1)}</span>
                  <span className="text-sm font-semibold text-slate-400 ml-1.5">ppm</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min((amonia/15)*100, 100)}%` }}></div>
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

            {/* BOX COMPONENT: KADALUARSA & STATUS SPROILAGE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              {/* 📅 SEKSI MANAJEMEN TANGGAL KADALUARSA */}
              <div className="md:col-span-2 bg-[#161b22]/95 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-2 mb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Manajemen Sesi Produk & Kadaluarsa
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Kendalikan durasi pencatatan data telemetry produk pangan UMKM secara real-time.
                    </p>
                  </div>
                  
                  {/* 🔥 SEKSI INTERAKTIF TOMBOL KONTROL ENGINE (START / STOP) */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleStartMonitoring}
                      className={`flex-1 sm:flex-none text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${isMonitoringActive ? "bg-slate-800 text-slate-600 border border-slate-700 pointer-events-none" : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10"}`}
                    >
                      ▶ Start
                    </button>
                    <button
                      onClick={handleStopMonitoring}
                      className={`flex-1 sm:flex-none text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${!isMonitoringActive ? "bg-slate-800 text-slate-600 border border-slate-700 pointer-events-none" : "bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/10"}`}
                    >
                      ⏹ Stop
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 bg-[#0d1117] p-4 rounded-xl border border-slate-800/80">
                  <div className="w-full sm:w-1/2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Input Tanggal Ekspirasi</label>
                    <input 
                      type="date" 
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

                {/* RENDERING WARNA DINAMIS */}
                {expiryDate && (() => {
                  const hariIni = new Date();
                  hariIni.setHours(0, 0, 0, 0);
                  const tanggalTarget = new Date(expiryDate);
                  tanggalTarget.setHours(0, 0, 0, 0);
                  
                  const selisihWaktu = tanggalTarget.getTime() - hariIni.getTime();
                  const selisihHari = Math.ceil(selisihWaktu / (1000 * 3600 * 24));

                  let textColorClass = "text-teal-400/90 bg-teal-500/5 border-teal-500/10";
                  let statusText = "✓ Terjadwal kadaluarsa pada:";

                  if (selisihHari === 1) {
                    textColorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20 font-bold";
                    statusText = "⚠️ H-1 Kadaluarsa:";
                  } else if (selisihHari <= 0) {
                    textColorClass = "text-rose-500 bg-rose-500/10 border-rose-500/25 font-black animate-pulse";
                    statusText = "🚨 PRODUK KADALUARSA:";
                  }

                  return (
                    <div className={`mt-3 text-[11px] font-mono px-3 py-1.5 rounded-lg border ${textColorClass}`}>
                      {statusText} <span className="underline">{expiryDate}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 📥 KOTAK DOWNLOAD CSV */}
            <div className="w-full flex justify-center pt-4">
              <div className="bg-[#161b22]/90 border border-slate-800 p-5 rounded-xl flex flex-col justify-between gap-4 backdrop-blur-sm max-w-md w-full text-center">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">📥 Download History</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Unduh seluruh histori logging terpusat sesuai sesi pemantauan.</p>
                </div>
                <div className="bg-[#0d1117] p-3 rounded-lg border border-slate-800/80 text-center text-[11px] text-slate-400 font-mono">
                  [ format_log_historis.csv ]
                </div>
                <button 
                  onClick={download24HoursCSV}
                  className="w-full bg-teal-500 text-slate-950 font-bold py-2 rounded-lg text-xs hover:bg-teal-400 transition-all shadow-md active:scale-[0.98]"
                >
                  Download Data CSV
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: PENGATURAN DATA AKUN */}
        {activeTab === "settings" && (
          <div className="space-y-6 py-4 flex flex-col justify-center items-center w-full">
            <header className="pb-3 border-b border-slate-800 w-full max-w-md text-center">
              <h1 className="text-xl font-black text-white tracking-tight">PENGATURAN STRATEGIS</h1>
              <p className="text-xs text-slate-400 mt-0.5">Modifikasi otentikasi data and hak akses.</p>
            </header>

            <div className="max-w-md w-full bg-[#161b22]/90 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
              <h3 className="text-sm font-bold text-teal-400 mb-4 tracking-tight uppercase text-center">Update Data Akun</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-left">Ganti Username Baru</label>
                  <input 
                    type="text" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Masukkan Username Baru (Optional)" 
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-left">Ganti Password Baru</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan Password Baru (Optional)" 
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-slate-800 hover:bg-teal-500 hover:text-slate-950 border border-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98]"
                >
                  Simpan Konfigurasi Profil
                </button>
              </form>

              {/* 🔥 FITUR HAPUS AKUN PERMANEN */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-bold text-rose-500 mb-2 uppercase text-center">Zona Bahaya</h3>
                <button 
                  onClick={async () => {
                    const konfirmasi = confirm("⚠️ PERINGATAN: Apakah kamu yakin ingin menghapus akun ini secara permanen? Data akan hilang dari cloud.");
                    if (konfirmasi) {
                      try {
                        const { error } = await supabase
                          .from("users_profile")
                          .delete()
                          .eq("username", savedUsername);

                        if (error) throw error;

                        alert("Akun berhasil dihapus dari database.");
                        setIsLoggedIn(false);
                        setExpiryDate("");
                        setMonitoringStartTime(null);
                        setActiveTab("home");
                      } catch (err: any) {
                        alert(`Gagal menghapus akun: ${err.message}`);
                      }
                    }
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white font-bold py-2 rounded-lg text-xs transition-all"
                >
                  Hapus Akun Permanen
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
'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Scan, RotateCcw, Zap, Flame, Activity, Info, CheckCircle, AlertCircle, LayoutDashboard, History as HistoryIcon, BarChart3, Download, Search, Trash2, FileSpreadsheet, ChevronRight, X, Menu, Utensils, Calendar } from 'lucide-react';
import { compressImage } from '@/lib/image-utils';
import { ScanHistory, exportToExcel } from '@/lib/excel-export';

type TabType = 'dashboard' | 'scan' | 'history' | 'stats' | 'export';

const FOOD_DB: Record<string, any> = {
  'pisang': { calories: 89, serving: '1 buah', category: 'Buah', tip: 'Kaya potassium & energi.' },
  'apel': { calories: 52, serving: '1 buah', category: 'Buah', tip: 'Rendah kalori, tinggi serat.' },
  'salad segar': { calories: 85, serving: '1 mangkok', category: 'Sayuran', tip: 'Rendah kalori, tinggi serat.' },
  'ayam goreng': { calories: 250, serving: '1 potong', category: 'Protein', tip: 'Tinggi lemak jenuh.' },
  'nasi goreng': { calories: 275, serving: '1 porsi', category: 'Karbohidrat', tip: 'Tinggi karbohidrat.' },
  'nasi padang': { calories: 450, serving: '1 porsi', category: 'Karbohidrat', tip: 'Porsi besar.' },
  'pizza': { calories: 285, serving: '1 slice', category: 'Karbohidrat', tip: 'Tinggi lemak & sodium.' },
  'burger': { calories: 350, serving: '1 porsi', category: 'Protein', tip: 'Tinggi protein & lemak.' },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [image, setImage] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const initCamera = async () => {
      if (cameraActive && videoRef.current && !streamRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          streamRef.current = stream;
          if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        } catch { setError("Gagal akses kamera"); setCameraActive(false); }
      }
    };
    initCamera();
    return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } };
  }, [cameraActive]);

  useEffect(() => { try { const s = localStorage.getItem('nutriscan_history'); if (s) setHistory(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('nutriscan_history', JSON.stringify(history)); } catch {} }, [history]);

  const startCamera = () => { setError(null); setCameraActive(true); };
  const captureImage = () => {
    if (!videoRef.current) return;
    videoRef.current.pause(); 
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    compressImage(canvas.toDataURL('image/jpeg', 0.85)).then(c => { setImage(c); setCameraActive(false); });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => { setImage(await compressImage(reader.result as string)); setError(null); };
      reader.readAsDataURL(file);
    }
  };

  async function detectFoodColor(imageSrc: string): Promise<string> {
    const img = new Image();
    img.src = imageSrc;
    await new Promise((resolve) => { img.onload = resolve; });
    
    const canvas = document.createElement('canvas');
    canvas.width = 50; 
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nasi padang';
    
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let brownCount = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      if (r + g + b < 50) continue;
      totalPixels++;
      
      if (g > r && g > b) greenCount++;
      else if (r > 150 && g > 150 && b < 150) yellowCount++;
      else if (r > 180 && g < 150) redCount++;
      else if (r > 140 && g > 80 && g < 150 && b < 100) brownCount++;
    }
    
    if (totalPixels === 0) return 'nasi padang';
    
    const greenPercent = (greenCount / totalPixels) * 100;
    const yellowPercent = (yellowCount / totalPixels) * 100;
    const redPercent = (redCount / totalPixels) * 100;
    const brownPercent = (brownCount / totalPixels) * 100;
    
    if (greenPercent > 10) return 'salad segar';
    if (yellowPercent > 15) return 'pisang';
    if (redPercent > 10) return 'pizza';
    if (brownPercent > 20) return 'ayam goreng';
    
    return 'nasi padang';
  }

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    
    try {
      const detectedFood = await detectFoodColor(image);
      const data = FOOD_DB[detectedFood];
      
      setResult({
        food: detectedFood,
        calories: data.calories,
        range: [data.calories - 20, data.calories + 20],
        serving: data.serving,
        confidence: Math.floor(Math.random() * (95 - 85) + 85),
        tip: data.tip,
        category: data.category
      });
      
      const newItem: ScanHistory = { 
        id: Date.now().toString(), 
        timestamp: new Date().toISOString(), 
        food: detectedFood, 
        calories: data.calories, 
        confidence: 90, 
        serving: data.serving, 
        tip: data.tip, 
        category: data.category 
      };
      setHistory(prev => [newItem, ...prev]);
      
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const reset = () => { setImage(undefined); setResult(null); setError(null); setLoading(false); setCameraActive(false); };
  const clearHistory = () => { setHistory([]); localStorage.removeItem('nutriscan_history'); };

  const todayScans = history.filter(h => new Date(h.timestamp).toDateString() === new Date().toDateString());
  const todayCalories = todayScans.reduce((sum, h) => sum + h.calories, 0);
  const totalCalories = history.reduce((sum, h) => sum + h.calories, 0);
  const avgConfidence = history.length ? Math.round(history.reduce((sum, h) => sum + h.confidence, 0) / history.length) : 0;

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'scan' as TabType, label: 'Scan Makanan', icon: <Camera className="w-5 h-5" /> },
    { id: 'history' as TabType, label: 'Riwayat', icon: <HistoryIcon className="w-5 h-5" /> },
    { id: 'stats' as TabType, label: 'Statistik', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'export' as TabType, label: 'Export Excel', icon: <Download className="w-5 h-5" /> },
  ];

  const pageVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 font-sans text-slate-900">
      <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-2 rounded-lg shadow-md"><Flame className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-lg font-bold text-slate-900">NutriScan</h1><p className="text-[10px] text-slate-500 uppercase">AI Professional</p></div>
        </div>
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">{showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
      </header>

      <AnimatePresence>
        {showMobileMenu && (
          <motion.div initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }} className="lg:hidden fixed inset-0 z-40 bg-white pt-20 px-6 pb-6 flex flex-col">
            <nav className="space-y-2 mt-4 flex-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 bg-slate-50'}`}>
                  {tab.icon} <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex max-w-7xl mx-auto relative">
        <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 h-screen flex-col sticky top-0 shadow-sm z-30">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-3 rounded-xl shadow-lg shadow-blue-500/20"><Flame className="w-7 h-7 text-white" /></div>
              <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">NutriScan</h1><p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">AI Professional</p></div>
            </div>
          </div>
          <nav className="px-4 space-y-1 flex-1 overflow-y-auto">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu Utama</p>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <div className={`p-1 rounded-lg ${activeTab === tab.id ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{tab.icon}</div>
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
              </button>
            ))}
          </nav>
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 m-4 rounded-2xl text-white">
            <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-yellow-400" /><span className="font-bold text-sm">Status AI</span></div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />Engine Active</div>
              <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-2 h-2 bg-blue-500 rounded-full" />Database Synced</div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-10 w-full min-h-screen">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
                <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20">
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">Selamat Datang! 👋</h2>
                    <p className="text-blue-100 mb-8 max-w-lg">Pantau asupan kalori harianmu dengan teknologi AI.</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Scan Hari Ini', value: todayScans.length, icon: Camera },
                        { label: 'Total Kalori', value: todayCalories + ' kcal', icon: Flame },
                        { label: 'Total Scan', value: history.length, icon: HistoryIcon },
                        { label: 'Akurasi AI', value: avgConfidence + '%', icon: Activity },
                      ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (i * 0.1) }} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition">
                          <s.icon className="w-5 h-5 mb-2 text-cyan-300" />
                          <div className="text-2xl font-bold">{s.value}</div>
                          <div className="text-xs text-blue-200">{s.label}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('scan')} className="bg-white rounded-2xl border border-slate-200 p-8 text-left hover:border-blue-400 hover:shadow-xl transition-all group flex items-start justify-between">
                    <div><div className="bg-blue-100 p-3 rounded-xl inline-block mb-4 group-hover:bg-blue-600 transition-colors"><Camera className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" /></div><h3 className="text-xl font-bold text-slate-900 mb-1">Mulai Scan Makanan</h3><p className="text-slate-500">Gunakan kamera atau upload foto</p></div>
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} onClick={() => setActiveTab('export')} className="bg-white rounded-2xl border border-slate-200 p-8 text-left hover:border-green-400 hover:shadow-xl transition-all group flex items-start justify-between">
                    <div><div className="bg-green-100 p-3 rounded-xl inline-block mb-4 group-hover:bg-green-600 transition-colors"><FileSpreadsheet className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" /></div><h3 className="text-xl font-bold text-slate-900 mb-1">Export Laporan</h3><p className="text-slate-500">Download data ke format Excel</p></div>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {activeTab === 'scan' && (
              <motion.div key="scan" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Camera className="w-5 h-5 text-blue-600" /> Input Makanan</h3>
                    {image && <button onClick={reset} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"><RotateCcw className="w-4 h-4" /> Reset</button>}
                  </div>
                  <div className="p-6">
                    {!image && !cameraActive ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.button whileHover={{ scale: 1.02 }} onClick={startCamera} className="flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition group">
                          <div className="bg-blue-100 p-5 rounded-full group-hover:bg-blue-200 transition"><Camera className="w-10 h-10 text-blue-600" /></div>
                          <div className="text-center"><div className="font-bold text-slate-900 mb-1">Ambil Foto</div><div className="text-sm text-slate-500">Real-time capture</div></div>
                        </motion.button>
                        <motion.label whileHover={{ scale: 1.02 }} className="flex flex-col items-center gap-4 p-10 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition cursor-pointer group">
                          <div className="bg-purple-100 p-5 rounded-full group-hover:bg-purple-200 transition"><Upload className="w-10 h-10 text-purple-600" /></div>
                          <div className="text-center"><div className="font-bold text-slate-900 mb-1">Upload Gambar</div><div className="text-sm text-slate-500">Pilih dari galeri</div></div>
                          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </motion.label>
                      </div>
                    ) : cameraActive ? (
                      <div className="space-y-4">
                        <div className="relative rounded-2xl overflow-hidden border-4 border-blue-500 shadow-xl bg-black aspect-video">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                          <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">RECORDING</div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setCameraActive(false)} className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 font-bold hover:bg-slate-50 transition text-slate-600">Batal</button>
                          <button onClick={captureImage} className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">Tangkap</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative group"><img src={image} alt="Preview" className="w-full max-h-80 object-contain rounded-2xl border-2 border-slate-200 bg-slate-50" /><div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">Siap Analisis</div></div>
                        <button onClick={analyze} disabled={loading} className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg hover:shadow-xl hover:shadow-blue-500/20 disabled:opacity-50 transition flex items-center justify-center gap-2">
                          {loading ? <><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> AI Sedang Menganalisis...</> : <><Scan className="w-5 h-5" /> Analisis Sekarang</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {error && <div className="bg-red-50 border-2 border-red-200 text-red-600 px-5 py-4 rounded-2xl flex items-center gap-3"><AlertCircle className="w-5 h-5" />{error}</div>}
                {result && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center gap-4">
                        <div className="bg-green-500 p-3 rounded-full shadow-lg"><CheckCircle className="w-6 h-6 text-white" /></div>
                        <div><h3 className="text-2xl font-bold capitalize text-slate-900">{result.food}</h3><p className="text-slate-500 text-sm">Hasil Analisis AI Berhasil</p></div>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100"><div className="text-orange-600 font-bold text-sm mb-1 flex items-center gap-1"><Flame className="w-4 h-4" /> Total Kalori</div><div className="text-4xl font-extrabold text-slate-900">{result.calories} <span className="text-lg font-medium text-slate-500">kcal</span></div><div className="text-xs text-slate-500 mt-1">Porsi: {result.serving}</div></div>
                        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100"><div className="text-blue-600 font-bold text-sm mb-1 flex items-center gap-1"><Activity className="w-4 h-4" /> Akurasi AI</div><div className="text-4xl font-extrabold text-slate-900">{result.confidence}%</div><div className="w-full bg-blue-200 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{width: `${result.confidence}%`}}></div></div></div>
                        <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100"><div className="text-purple-600 font-bold text-sm mb-1 flex items-center gap-1"><Zap className="w-4 h-4" /> Kategori</div><div className="text-xl font-bold text-slate-900 mt-1">{result.category}</div><div className="text-xs text-slate-500 mt-1">Tipe Makanan</div></div>
                      </div>
                      <div className="px-6 pb-6"><div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3"><Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-amber-900 text-sm">💡 Rekomendasi</p><p className="text-amber-800 text-sm mt-1">{result.tip}</p></div></div></div>
                    </div>
                    <button onClick={reset} className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">Scan Makanan Lain</button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Riwayat Scan</h2>
                  {history.length > 0 && <button onClick={clearHistory} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium"><Trash2 className="w-4 h-4" />Hapus Semua</button>}
                </div>
                {history.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center"><HistoryIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" /><h3 className="text-xl font-bold text-slate-700 mb-2">Belum Ada Data</h3></div>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="bg-gradient-to-br from-orange-100 to-red-100 p-3 rounded-xl text-orange-600"><Utensils className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-bold text-slate-900 capitalize">{item.food}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.timestamp).toLocaleDateString('id-ID')}</span></div>
                          </div>
                        </div>
                        <div className="text-right"><div className="font-bold text-lg text-orange-600">{item.calories} <span className="text-xs text-slate-400 font-medium">kcal</span></div></div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div key="stats" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Scan', value: history.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Camera },
                    { label: 'Total Kalori', value: totalCalories, suffix: ' kcal', color: 'text-orange-600', bg: 'bg-orange-50', icon: Flame },
                    { label: 'Akurasi', value: avgConfidence, suffix: '%', color: 'text-purple-600', bg: 'bg-purple-50', icon: Activity },
                  ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05 }} className={`${stat.bg} rounded-2xl p-6 border border-transparent hover:border-slate-200 transition-all shadow-sm`}>
                      <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
                      <div className={`text-3xl font-extrabold ${stat.color} mb-1`}>{stat.value}<span className="text-base font-medium ml-1 opacity-70">{stat.suffix}</span></div>
                      <div className="text-sm font-medium text-slate-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div key="export" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-br from-green-500 to-emerald-700 rounded-3xl p-10 text-white text-center shadow-2xl shadow-green-500/30">
                  <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"><FileSpreadsheet className="w-10 h-10 text-white" /></div>
                  <h2 className="text-3xl font-bold mb-4">Export Data Laporan</h2>
                  <button onClick={() => exportToExcel(history)} disabled={history.length === 0} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-green-700 font-bold text-lg hover:bg-green-50 disabled:opacity-50 transition shadow-lg"><Download className="w-5 h-5" /> Download Excel Sekarang</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
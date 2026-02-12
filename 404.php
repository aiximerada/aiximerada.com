@extends('layouts.dashboard')

@section('breadcrumbs', Breadcrumbs::render('userprofile'))

@section('page_css')
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    corePlugins: {
      preflight: false, // 重要：禁用 Tailwind 的 Preflight 以防止破壞 Bootstrap 的基本樣式
    }
  }
</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<style type="text/css">
  /* 修正 Tailwind 與 Bootstrap 衝突的微調 */
  .main-panel { background-color: #f4f3ef; }
  .tw-scope { all: initial; font-family: 'Montserrat', "sans-serif"; }
  input[type="date"] { line-height: 1.2; }
  /* 確保 React 容器不被 Bootstrap 容器限制過死 */
  #profile-root { width: 100%; }
</style>
@endsection

@section('content')
<div class="content">
    <div id="profile-root">
        <div class="text-center p-5">
            <i class="fa fa-spinner fa-spin fa-3x"></i>
            <p className="mt-2">正在載入個人資料...</p>
        </div>
    </div>
</div>
@endsection

@section('script')
<script type="text/babel">
    const { useState, useEffect, useRef, useMemo } = React;

    // --- 封裝 Icon 元件 (簡化版) ---
    const Icon = ({ name, className = "w-5 h-5" }) => {
        const icons = {
            user: <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>,
            camera: <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>,
            package: <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>,
            coins: <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {icons[name] || null}
            </svg>
        );
    };

    function ProfileApp() {
        // 從 Laravel Auth 注入初始資料
        const [formData, setFormData] = useState({
            name: "{{ auth()->user()->name }}",
            role: "{{ auth()->user()->role ?? '家長' }}", // 假設欄位名
            email: "{{ auth()->user()->email }}",
            phone: "{{ auth()->user()->phone ?? '' }}",
            birthday: "{{ auth()->user()->birthday ?? '' }}",
            gender: "{{ auth()->user()->gender ?? '男' }}",
            country: "台灣",
            region: "台北市",
            address: "{{ auth()->user()->address ?? '' }}",
            teachingAidStatus: "動力教具",
            points: {{ auth()->user()->points ?? 0 }}
        });

        const [avatarPreview, setAvatarPreview] = useState("{{ auth()->user()->avatar }}");
        const [bgPreview, setBgPreview] = useState('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop');
        
        // 處理輸入變更
        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        // 儲存邏輯 (對接 Laravel Route)
        const handleSave = async () => {
            try {
                // 這裡可以呼叫 axios.post('/myprofile/user/update', formData)
                alert('資料已準備提交：' + JSON.stringify(formData));
            } catch (err) {
                console.error(err);
            }
        };

        return (
            <div className="tw-scope">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-8 transition-all">
                    {/* 背景與頭像區 */}
                    <div className="relative h-48 md:h-60 bg-gray-200">
                        <img src={bgPreview} className="w-full h-full object-cover" />
                        <div className="absolute -bottom-12 left-10">
                            <div className="relative group">
                                <img src={avatarPreview} className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <Icon name="camera" className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 表單內容 */}
                    <div className="pt-20 pb-10 px-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">姓名</label>
                                <input name="name" value={formData.name} onChange={handleChange} className="w-full border rounded-xl p-2.5 focus:ring-2 focus:ring-blue-400 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">身份別</label>
                                <input value={formData.role} disabled className="w-full border rounded-xl p-2.5 bg-gray-50 text-gray-400" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">電子郵件 (不可修改)</label>
                                <input value={formData.email} disabled className="w-full border rounded-xl p-2.5 bg-gray-50 text-gray-400" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">聯絡電話</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border rounded-xl p-2.5" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                    <Icon name="package" className="w-4 h-4 text-indigo-500" /> 教具狀態
                                </label>
                                <select name="teachingAidStatus" value={formData.teachingAidStatus} onChange={handleChange} className="w-full border rounded-xl p-2.5">
                                    <option value="動力教具">動力教具</option>
                                    <option value="充電教具">充電教具</option>
                                    <option value="租借">租借</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                    <Icon name="coins" className="w-4 h-4 text-yellow-500" /> 持有點數
                                </label>
                                <input value={formData.points} disabled className="w-full border rounded-xl p-2.5 bg-gray-50 font-bold text-yellow-600" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button onClick={handleSave} className="bg-[#68C1C6] hover:bg-[#5bb2b8] text-white px-10 py-2.5 rounded-xl font-bold shadow-lg transition-transform active:scale-95">
                                儲存變更
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const root = ReactDOM.createRoot(document.getElementById('profile-root'));
    root.render(<ProfileApp />);
</script>
@endsection

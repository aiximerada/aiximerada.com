@extends('layouts.dashboard')

@section('breadcrumbs')
<!-- 若您的系統有麵包屑設定可放這裡，例如 Breadcrumbs::render('profile') -->
<h5 class="navbar-brand mb-0">個人資料設定</h5>
@endsection

@section('page_css')
<style type="text/css">
  /* 客製化卡片與表單樣式，保留圓潤活潑的現代感 */
  .profile-card {
    border-radius: 20px;
    box-shadow: 0 4px 20px 0 rgba(0,0,0,0.05);
    border: none;
    overflow: hidden;
    background-color: #ffffff;
    margin-bottom: 30px;
  }
  
  /* 封面背景區塊 */
  .cover-container {
    height: 250px;
    background-size: cover;
    background-position: center;
    position: relative;
    transition: opacity 0.3s;
  }
  .cover-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.15);
    transition: background 0.3s;
  }
  .cover-container:hover .cover-overlay {
    background: rgba(0, 0, 0, 0.25);
  }
  .btn-change-cover {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(4px);
    border-radius: 30px;
    color: #444;
    font-weight: 600;
    border: none;
    padding: 8px 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    transition: all 0.2s;
  }
  .btn-change-cover:hover {
    background: #ffffff;
    transform: translateY(-2px);
  }

  /* 大頭照區塊 */
  .avatar-wrapper {
    position: absolute;
    bottom: -60px;
    left: 40px;
    width: 130px;
    height: 130px;
    z-index: 10;
  }
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    border: 5px solid #ffffff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    background-color: #fff;
  }
  .avatar-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.3s;
    border: 5px solid transparent; /* 佔位用避免閃爍 */
  }
  .avatar-wrapper:hover .avatar-overlay {
    opacity: 1;
  }

  /* 表單輸入框優化 */
  .custom-form-group label {
    font-weight: 600;
    color: #555;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  .custom-form-group label i {
    color: #68C1C6;
    font-size: 16px;
  }
  .custom-input {
    border-radius: 12px;
    border: 1px solid #e0e0e0;
    padding: 12px 16px;
    height: auto;
    background-color: #fafafa;
    transition: all 0.2s;
  }
  .custom-input:focus {
    background-color: #ffffff;
    border-color: #68C1C6;
    box-shadow: 0 0 0 0.2rem rgba(104, 193, 198, 0.25);
  }
  .custom-input:disabled, .custom-input[readonly] {
    background-color: #f0f0f0;
    cursor: not-allowed;
    color: #888;
  }
  
  /* 儲存按鈕 */
  .btn-save {
    background-color: #68C1C6;
    border-color: #68C1C6;
    border-radius: 12px;
    padding: 12px 30px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 10px rgba(104, 193, 198, 0.3);
    transition: all 0.2s;
  }
  .btn-save:hover {
    background-color: #5bb2b8;
    border-color: #5bb2b8;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(104, 193, 198, 0.4);
  }
</style>
@endsection

@section('content')
<div class="content">
  <!-- 您若有系統訊息可利用 include，如：@include('dashboard.messages') -->
  
  <div class="row">
    <div class="col-md-12">
      <div class="profile-card">
        
        <!-- 1. 封面與大頭照區塊 -->
        <div class="cover-container" id="coverPreviewBox" style="background-image: url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop');">
          <div class="cover-overlay"></div>
          
          <!-- 改用原生 JS: document.getElementById('bgInput').click() -->
          <button type="button" class="btn-change-cover" onclick="document.getElementById('bgInput').click()">
            <i class="far fa-image"></i> 更改封面
          </button>
          <input type="file" id="bgInput" class="d-none" accept="image/*">

          <!-- 大頭照 -->
          <div class="avatar-wrapper">
            <img src="https://i.pravatar.cc/150?img=11" id="avatarPreviewImg" class="avatar-img" alt="Avatar">
            <!-- 改用原生 JS: document.getElementById('avatarInput').click() -->
            <div class="avatar-overlay" onclick="document.getElementById('avatarInput').click()">
              <i class="fas fa-camera text-white" style="font-size: 24px; margin-bottom: 4px;"></i>
              <span class="text-white" style="font-size: 11px; font-weight: bold;">更換照片</span>
            </div>
            <input type="file" id="avatarInput" class="d-none" accept="image/*">
          </div>
        </div>

        <!-- 2. 表單輸入區塊 -->
        <div class="card-body" style="padding: 90px 40px 40px 40px;">
          <!-- 這裡可以放您的 form action -->
          <form id="profileForm" method="POST" action="">
            @csrf
            
            <div class="row">
              <!-- 姓名 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-user"></i> 姓名</label>
                <input type="text" class="form-control custom-input" name="name" value="王大明" placeholder="請輸入姓名">
              </div>

              <!-- 身份別 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-id-badge"></i> 身份別</label>
                <select class="form-control custom-input" name="role">
                  <option value="學生">學生</option>
                  <option value="家長" selected>家長</option>
                  <option value="老師">老師</option>
                  <option value="行政">行政</option>
                </select>
              </div>

              <!-- Email (不可更動) -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-envelope"></i> Email <span class="text-danger ml-1" style="font-size:12px; font-weight:normal;">(不可更動)</span></label>
                <input type="email" class="form-control custom-input" name="email" value="parent@example.com" disabled>
              </div>

              <!-- 電話 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-phone-alt"></i> 電話</label>
                <input type="tel" class="form-control custom-input" name="phone" value="0912345678" placeholder="請輸入聯絡電話">
              </div>

              <!-- 生日 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-birthday-cake"></i> 生日</label>
                <input type="date" class="form-control custom-input" id="birthday" name="birthday" value="1985-05-15">
              </div>

              <!-- 年齡 (自動計算) -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-calendar-day"></i> 年齡</label>
                <div class="d-flex align-items-center">
                  <input type="text" class="form-control custom-input w-25 text-center font-weight-bold" id="age" value="" readonly style="background-color: #f8f9fa;">
                  <span class="ml-2 text-muted">歲</span>
                </div>
              </div>

              <!-- 性別 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-venus-mars"></i> 性別</label>
                <select class="form-control custom-input" name="gender">
                  <option value="男" selected>男</option>
                  <option value="女">女</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <!-- 國家 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-globe-asia"></i> 國家</label>
                <select class="form-control custom-input" name="country">
                  <option value="台灣" selected>台灣</option>
                  <option value="日本">日本</option>
                  <option value="韓國">韓國</option>
                  <option value="美國">美國</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <!-- 地區 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-map-marker-alt"></i> 地區</label>
                <select class="form-control custom-input" name="region">
                  <option value="基隆市">基隆市</option>
                  <option value="台北市" selected>台北市</option>
                  <option value="新北市">新北市</option>
                  <option value="桃園市">桃園市</option>
                  <option value="台中市">台中市</option>
                  <option value="台南市">台南市</option>
                  <option value="高雄市">高雄市</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <!-- 地址 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-home"></i> 地址</label>
                <input type="text" class="form-control custom-input" name="address" value="信義區市府路1號" placeholder="請輸入詳細地址">
              </div>

              <!-- 教具狀態 -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-box text-primary"></i> 教具狀態</label>
                <select class="form-control custom-input font-weight-bold" name="teachingAidStatus">
                  <option value="充電教具">🔋 充電教具</option>
                  <option value="動力教具" selected>⚙️ 動力教具</option>
                  <option value="租借">📦 租借</option>
                </select>
              </div>

              <!-- 點數 (不可修改) -->
              <div class="col-md-6 custom-form-group mb-4">
                <label><i class="fas fa-coins text-warning"></i> 持有點數 <span class="text-danger ml-1" style="font-size:12px; font-weight:normal;">(不可更動)</span></label>
                <input type="number" class="form-control custom-input text-warning font-weight-bold" style="font-size: 1.1rem;" name="points" value="1250" disabled>
              </div>
            </div>

            <!-- 按鈕列 -->
            <div class="row mt-4">
              <div class="col-12 text-right">
                <button type="submit" class="btn btn-primary btn-save">
                  儲存設定
                </button>
              </div>
            </div>
            
          </form>
        </div>

      </div>
    </div>
  </div>
</div>
@endsection

@section('script')
<script type="text/javascript">
  // --- 圖片壓縮功能函式 (Vanilla JS) ---
  function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
      };
    });
  }

  // --- 年齡計算功能 ---
  function calculateAge(dateString) {
    if(!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    // 若還沒過生日，年齡減 1
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }

  // 使用原生的 DOMContentLoaded 取代 $(document).ready()
  document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 設定生日欄位最大值為「今天」，防止選到未來日期
    const todayStr = new Date().toISOString().split('T')[0];
    const birthdayInput = document.getElementById('birthday');
    const ageInput = document.getElementById('age');

    if (birthdayInput) {
      birthdayInput.max = todayStr;

      // 2. 初始化並監聽生日變更計算年齡
      ageInput.value = calculateAge(birthdayInput.value);
      
      birthdayInput.addEventListener('change', function() {
        ageInput.value = calculateAge(this.value);
      });
    }

    // 3. 處理大頭照上傳與壓縮預覽
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    if (avatarInput) {
      avatarInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
          try {
            // 呼叫壓縮 (設定寬高最大 800px, 畫質 0.8)
            const compressedDataUrl = await compressImage(file, 800, 800, 0.8);
            avatarPreviewImg.src = compressedDataUrl;
          } catch (error) {
            console.error("圖片壓縮失敗", error);
            alert("圖片處理發生錯誤，請重試！");
          }
        }
      });
    }

    // 4. 處理封面照上傳與壓縮預覽
    const bgInput = document.getElementById('bgInput');
    const coverPreviewBox = document.getElementById('coverPreviewBox');
    if (bgInput) {
      bgInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
          try {
            // 呼叫壓縮 (設定寬高最大 1600px, 畫質 0.8)
            const compressedDataUrl = await compressImage(file, 1600, 1600, 0.8);
            coverPreviewBox.style.backgroundImage = `url(${compressedDataUrl})`;
          } catch (error) {
            console.error("圖片壓縮失敗", error);
            alert("圖片處理發生錯誤，請重試！");
          }
        }
      });
    }

  });
</script>
@endsection
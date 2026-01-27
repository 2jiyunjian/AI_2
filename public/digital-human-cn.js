// ========== API 配置 ==========
// API 基础 URL 配置（支持本地和线上测试）
// 可以通过 localStorage 设置 'api_base_url' 来覆盖默认值
// 设置 'use_local' 为 'true' 强制使用本地地址（即使在线上也使用localhost）
function getApiBaseUrl() {
  // 优先从 localStorage 读取配置
  try {
    const customBaseUrl = localStorage.getItem('api_base_url');
    if (customBaseUrl && customBaseUrl.trim()) {
      // 如果明确设置了api_base_url，使用该值（允许localhost）
      return customBaseUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    console.warn('无法读取 api_base_url 配置:', e);
  }
  
  // 检查是否强制使用本地
  const useLocal = localStorage.getItem('use_local') === 'true';
  const currentOrigin = window.location.origin;
  const isLocalhost = currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1');
  
  if (useLocal || isLocalhost) {
    // 本地环境：使用相对路径（空字符串），这样会使用当前域名和端口
    return '';
  }
  
  // 线上环境：使用当前页面的origin
  return currentOrigin;
}

// 构建完整的 API URL
function buildApiUrl(path) {
  const baseUrl = getApiBaseUrl();
  // 确保 path 以 / 开头
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return baseUrl + normalizedPath;
}

// 立即定义 switchMenu 函数，确保在 HTML 解析时就可访问
function switchMenu(menu) {
  // 更新菜单激活状态
  document.querySelectorAll('.menu-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(`[data-menu="${menu}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // 隐藏所有面板
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  
  // 显示对应面板
  const panelMap = {
    'create': 'createPanel',
    'manage': 'managePanel',
    'works': 'worksPanel',
    'recite': 'recitePanel',
    'promote': 'promotePanel'
  };
  
  const panelId = panelMap[menu];
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.remove('hidden');
    }
  }
  
  // 根据菜单加载相应数据（延迟执行，确保其他函数已定义）
  setTimeout(() => {
    if (typeof window.loadDigitalHumans === 'function' && menu === 'manage') {
      window.loadDigitalHumans();
    } else if (typeof window.loadWorks === 'function' && menu === 'works') {
      window.loadWorks();
    } else if (typeof window.loadRecitePanel === 'function' && menu === 'recite') {
      window.loadRecitePanel();
    } else if (typeof window.loadPromotePanel === 'function' && menu === 'promote') {
      window.loadPromotePanel();
    }
  }, 100);
}
window.switchMenu = switchMenu;

// ========== 分隔的脚本块 ==========

// 检查登录
const user = JSON.parse(sessionStorage.getItem('user'));
if (!user) window.location.href = '/';

// 全局变量
    let currentPlatform = 'heygen';
    let selectedAvatar = '👩‍💼';
    let selectedAvatarId = null; // 选中的 HeyGen avatar ID
    let selectedAvatarForRecite = null; // 诵读文案选中的 avatar ID
    let selectedAvatarForPromote = null; // 卖货推送选中的 avatar ID
    let reciteAvatarMode = 'template'; // 诵读文案选择模式：'template' 或 'myDigitalHuman'
    let promoteAvatarMode = 'template'; // 卖货推送选择模式：'template' 或 'myDigitalHuman'
    let heygenAvatarsCache = null; // 缓存的 avatar 列表
    let heygenVoicesCache = null; // 缓存的语音列表
    let selectedVoiceId = null; // 选中的语音ID
    let currentAvatarMode = 'template'; // 当前选择的形象模式：'template', 'upload', 'record'
    let selectedTemplatePreviewVideo = null; // 模板模式下步骤3展示用的预览视频 URL
    let selectedTemplatePreviewImage = null; // 模板模式下步骤3展示用的预览图片 URL
    let selectedTemplateName = null; // 选中的模板名称
    
    // 资源类型和分页相关变量
    let currentResourceType = 'video'; // 固定为视频类型
    let currentPage = 1;
    let pageSize = 30; // 每页显示的数量
    let totalAvatars = 0;
    let displayedAvatars = 0;
    let digitalHumanType = 'video'; // 视频数字人
    let currentAudioUrl = null;
    let currentAudioBlob = null;
    let audioContext = null;
    
    // 录制相关变量
    let videoStream = null;
    let audioStream = null;
    let videoRecorder = null;
    let audioRecorder = null;
    let recordedVideoBlob = null;
    let recordedAudioBlob = null;
    let currentVideoUrl = null;
    let isRecordingVideo = false;
    let isRecordingAudio = false;
    let recordStartTime = null;
    let recordTimer = null;
    
    // 当前步骤
    let currentStep = 1;
    let uploadedMaterials = [];
    let selectedVideoFile = null;
    let selectedAudioFile = null;
    let selectedVideoUrl = null;
    let extractedFrames = [];
    let selectedFrameId = null;
    
    // 任务轮询状态管理
    const taskPollingIntervals = new Map();
    
    // 加载诵读文案面板
    function loadRecitePanel() {
      // 初始化模式按钮状态
      const templateBtn = document.getElementById('reciteModeTemplate');
      const myDigitalHumanBtn = document.getElementById('reciteModeMyDigitalHuman');
      if (templateBtn && myDigitalHumanBtn) {
        if (reciteAvatarMode === 'template') {
          templateBtn.classList.remove('secondary');
          templateBtn.classList.add('primary');
          myDigitalHumanBtn.classList.remove('primary');
          myDigitalHumanBtn.classList.add('secondary');
        } else {
          templateBtn.classList.remove('primary');
          templateBtn.classList.add('secondary');
          myDigitalHumanBtn.classList.remove('secondary');
          myDigitalHumanBtn.classList.add('primary');
        }
      }
      
      // 加载数字人列表
      loadReciteAvatars();
      
      // 加载历史记录
      loadReciteHistory();
      
      // 加载缓存的语音列表
      loadCachedVoicesForContext('recite');
      
      // 绑定字数统计
      const scriptInput = document.getElementById('reciteScript');
      if (scriptInput) {
        scriptInput.addEventListener('input', updateReciteCharCount);
        updateReciteCharCount();
      }
    }
    
    // 加载卖货推送面板
    function loadPromotePanel() {
      // 初始化模式按钮状态
      const templateBtn = document.getElementById('promoteModeTemplate');
      const myDigitalHumanBtn = document.getElementById('promoteModeMyDigitalHuman');
      if (templateBtn && myDigitalHumanBtn) {
        if (promoteAvatarMode === 'template') {
          templateBtn.classList.remove('secondary');
          templateBtn.classList.add('primary');
          myDigitalHumanBtn.classList.remove('primary');
          myDigitalHumanBtn.classList.add('secondary');
        } else {
          templateBtn.classList.remove('primary');
          templateBtn.classList.add('secondary');
          myDigitalHumanBtn.classList.remove('secondary');
          myDigitalHumanBtn.classList.add('primary');
        }
      }
      
      // 加载数字人列表
      loadPromoteAvatars();
      
      // 加载历史记录
      loadPromoteHistory();
      
      // 加载缓存的语音列表
      loadCachedVoicesForContext('promote');
      
      // 绑定字数统计
      const descInput = document.getElementById('promoteProductDesc');
      if (descInput) {
        descInput.addEventListener('input', updatePromoteCharCount);
        updatePromoteCharCount();
      }
    }
    
    // 初始化
    function init() {
      loadConfigs();
      loadHistory();
      loadDigitalHumans();
      loadWorks();
      updateStepIndicator(1);
      
      // 自动加载 avatar 模板（如果 API Key 已配置）
      const apiKey = getHeyGenApiKey();
      if (apiKey) {
        setTimeout(() => {
          loadHeyGenAvatars('create');
        }, 500);
      }

      // 绑定平台标签切换（HeyGen / 云雾数字人）
      document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const platform = tab.getAttribute('data-platform');
          if (!platform || platform === currentPlatform) return;

          currentPlatform = platform;

          // 更新标签激活样式
          document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          // 在步骤1中显示当前平台对应的 API 配置
          document.querySelectorAll('.api-config').forEach(config => {
            config.classList.add('hidden');
          });
          const configEl = document.getElementById(currentPlatform + 'Config');
          if (configEl) {
            configEl.classList.remove('hidden');
          }
          
          // ✅ 切换平台时自动加载对应的API Key
          if (platform === 'heygen') {
            const heygenApiKey = localStorage.getItem('heygen_api_key');
            if (heygenApiKey) {
              const inputEl = document.getElementById('heygenApiKey');
              if (inputEl && !inputEl.value) {
                inputEl.value = heygenApiKey;
              }
            }
          } else if (platform === 'yunwu') {
            const yunwuApiKey = localStorage.getItem('yunwu_api_key');
            if (yunwuApiKey) {
              const inputEl = document.getElementById('yunwuApiKey');
              if (inputEl && !inputEl.value) {
                inputEl.value = yunwuApiKey;
              }
            }
          }
          
          // 更新步骤2和步骤3的内容
          updateStep2ForPlatform();
        });
      });
      
      // 在步骤1中显示API配置
      document.querySelectorAll('.api-config').forEach(config => {
        config.classList.add('hidden');
      });
      const configEl = document.getElementById(currentPlatform + 'Config');
      if (configEl) {
        configEl.classList.remove('hidden');
      }
      
      // ✅ 初始化时自动加载当前平台的API Key
      if (currentPlatform === 'heygen') {
        const heygenApiKey = localStorage.getItem('heygen_api_key');
        if (heygenApiKey) {
          const inputEl = document.getElementById('heygenApiKey');
          if (inputEl && !inputEl.value) {
            inputEl.value = heygenApiKey;
          }
        }
      } else if (currentPlatform === 'yunwu') {
        const yunwuApiKey = localStorage.getItem('yunwu_api_key');
        if (yunwuApiKey) {
          const inputEl = document.getElementById('yunwuApiKey');
          if (inputEl && !inputEl.value) {
            inputEl.value = yunwuApiKey;
          }
        }
      }
    }
    
    // ========== 步骤管理 ==========
    
    function goToStep(step) {
      // 验证当前步骤
      if (step > currentStep && !validateCurrentStep()) {
        return;
      }
      
      currentStep = step;
      updateStepIndicator(step);
      
      // 隐藏所有步骤内容
      document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // 显示对应步骤
      document.getElementById(`step${step}Content`).classList.add('active');
      
      // 在步骤1中显示当前平台的API配置
      if (step === 1) {
        document.querySelectorAll('.api-config').forEach(config => {
          config.classList.add('hidden');
        });
        const configEl = document.getElementById(currentPlatform + 'Config');
        if (configEl) {
          configEl.classList.remove('hidden');
        }
      }
      
      // 在步骤2中根据平台更新内容
      if (step === 2) {
        updateStep2ForPlatform();
      }
      
      // 在步骤3中根据平台更新内容并显示视频预览
      if (step === 3) {
        updateStep3ForPlatform();
        updateStep3VideoPreview();
      }
      
      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    function updateStepIndicator(step) {
      document.querySelectorAll('.step-item').forEach((item, index) => {
        const stepNum = index + 1;
        item.classList.remove('active', 'completed');
        
        if (stepNum < step) {
          item.classList.add('completed');
        } else if (stepNum === step) {
          item.classList.add('active');
        }
      });
      
      document.querySelectorAll('.step-line').forEach((line, index) => {
        if (index + 1 < step) {
          line.classList.add('completed');
        } else {
          line.classList.remove('completed');
        }
      });
    }
    
    // 获取 HeyGen API Key 的辅助函数
    function getHeyGenApiKey() {
      // 优先从输入框读取
      const inputEl = document.getElementById('heygenApiKey');
      if (inputEl) {
        const inputValue = inputEl.value.trim();
        if (inputValue && inputValue.length > 10) {
          return inputValue;
        }
      }
      
      // 从 localStorage 读取
      try {
        const apiKey = localStorage.getItem('heygen_api_key');
        if (apiKey && apiKey.trim().length > 10) {
          return apiKey.trim();
        }
      } catch (e) {
        console.warn('无法从 localStorage 读取:', e);
      }
      
      return null;
    }

    // 获取 云雾 API Key 的辅助函数
    function getYunwuApiKey() {
      const inputEl = document.getElementById('yunwuApiKey');
      if (inputEl) {
        const inputValue = inputEl.value.trim();
        if (inputValue && inputValue.length > 10) {
          return inputValue;
        }
      }
      
      try {
        const apiKey = localStorage.getItem('yunwu_api_key');
        if (apiKey && apiKey.trim().length > 10) {
          return apiKey.trim();
        }
      } catch (e) {
        console.warn('无法从 localStorage 读取云雾 API Key:', e);
      }
      
      return null;
    }
    
    function validateCurrentStep() {
      if (currentStep === 1) {
        // 根据当前平台验证对应的 API 配置
        if (currentPlatform === 'heygen') {
          const apiKey = getHeyGenApiKey();
          if (!apiKey) {
            alert('请先配置并测试 HeyGen API 连接\n\n提示：请填写 HeyGen API Key 并点击"保存配置"按钮。');
            return false;
          }
        } else if (currentPlatform === 'yunwu') {
          const apiKey = getYunwuApiKey();
          if (!apiKey) {
            alert('请先配置并测试 云雾 API 连接\n\n提示：请填写 云雾 API Key 并点击"保存配置"按钮。');
            return false;
          }
        }
      } else if (currentStep === 2) {
        // 验证必须同时有视频和语音资源
        if (currentAvatarMode === 'template') {
          // 模板模式：需要选择模板（视频）和语音
          // ✅ 修复：根据HeyGen官方文档，avatar_id是必需的，不能使用默认值
          if (!selectedAvatarId || selectedAvatarId === 'default' || selectedAvatarId === 'default_avatar_id') {
            alert('❌ 请先选择一个数字人模板\n\n根据HeyGen API要求，必须选择一个有效的数字人模板才能继续。\n\n请从模板列表中选择一个数字人形象。');
            return false;
          }
          // 语音是可选的，但建议选择
          // 不强制要求选择语音，因为系统可以自动选择
        } else if (currentAvatarMode === 'upload') {
          // 上传模式
          if (!selectedVideoFile) {
            alert('请先上传视频或图片文件');
            return false;
          }
          if (currentPlatform === 'heygen') {
            if (!selectedAudioFile) {
              alert('请先上传音频文件\n\n提示：HeyGen 上传参考文件时需要同时上传视频和音频。');
              return false;
            }
          }
          if (currentPlatform === 'yunwu') {
            if (!selectedAudioFile) {
              alert('请先上传音频文件\n\n提示：可灵数字人接口要求必须提供音频。支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
              return false;
            }
          }
        } else if (currentAvatarMode === 'record') {
          // 录制模式：需要同时录制视频和音频
          if (!recordedVideoBlob) {
            alert('请先录制视频');
            return false;
          }
          if (!recordedAudioBlob) {
            alert('请先录制音频\n\n提示：实时录制时需要同时录制视频和音频。');
            return false;
          }
        } else {
          // 未选择任何模式
          alert('请先选择一种形象选择方式（模板、上传或录制）');
          return false;
        }
      } else if (currentStep === 3) {
        const name = document.getElementById('digitalHumanName').value.trim();
        if (!name) {
          alert('请输入数字人名称');
          return false;
        }
        const script = document.getElementById('scriptInput').value.trim();
        const hasAudio = !!(selectedAudioFile || recordedAudioBlob);
        if (currentPlatform === 'yunwu') {
          if (!hasAudio) {
            alert('云雾数字人必须提供音频。请返回步骤2上传或录制音频文件。\n\n支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
            return false;
          }
        } else {
          if (!script) {
            alert('请输入文案内容');
            return false;
          }
        }
      }
      return true;
    }
    
    // ========== 形象选择方式切换 ==========
    function switchAvatarMode(mode) {
      console.log('切换形象选择方式:', mode);
      
      currentAvatarMode = mode; // 保存当前模式
      
      const templateBtn = document.getElementById('avatarModeTemplate');
      const uploadBtn = document.getElementById('avatarModeUpload');
      const recordBtn = document.getElementById('avatarModeRecord');
      const templateSection = document.getElementById('templateSelectionSection');
      const uploadSection = document.getElementById('uploadReferenceSection');
      const recordSection = document.getElementById('recordSection');
      const voiceSelectionSection = document.getElementById('voiceSelectionSection');
      
      // 更新按钮状态
      if (templateBtn && uploadBtn && recordBtn) {
        templateBtn.classList.remove('active');
        uploadBtn.classList.remove('active');
        recordBtn.classList.remove('active');
        
        if (mode === 'template') {
          templateBtn.classList.add('active');
          if (templateSection) templateSection.style.display = 'block';
          if (uploadSection) uploadSection.style.display = 'none';
          if (recordSection) recordSection.style.display = 'none';
          // 显示语音选择（模板模式需要TTS语音）
          if (voiceSelectionSection) voiceSelectionSection.style.display = 'block';
          
          // 清除上传的文件和录制的内容
          clearUploadedFiles();
          clearRecordedFiles();
        } else if (mode === 'upload') {
          uploadBtn.classList.add('active');
          if (templateSection) templateSection.style.display = 'none';
          if (uploadSection) uploadSection.style.display = 'block';
          if (recordSection) recordSection.style.display = 'none';
          // 隐藏语音选择（上传模式已有音频文件）
          if (voiceSelectionSection) voiceSelectionSection.style.display = 'none';
          
          // 清除模板选择和录制的内容
          clearTemplateSelection();
          clearRecordedFiles();
        } else if (mode === 'record') {
          recordBtn.classList.add('active');
          if (templateSection) templateSection.style.display = 'none';
          if (uploadSection) uploadSection.style.display = 'none';
          if (recordSection) recordSection.style.display = 'block';
          // 隐藏语音选择（录制模式已有音频文件）
          if (voiceSelectionSection) voiceSelectionSection.style.display = 'none';
          
          // 清除模板选择和上传的文件
          clearTemplateSelection();
          clearUploadedFiles();
        }
      }
    }
    
    // 清除录制的文件
    function clearRecordedFiles() {
      recordedVideoBlob = null;
      recordedAudioBlob = null;
      currentVideoUrl = null;
      
      // 清除录制预览
      const videoRecordPreview = document.getElementById('videoRecordPreview');
      const audioRecordPreview = document.getElementById('audioRecordPreview');
      const recordedVideo = document.getElementById('recordedVideo');
      const recordedAudio = document.getElementById('recordedAudio');
      const recordStatus = document.getElementById('recordStatus');
      
      if (videoRecordPreview) {
        videoRecordPreview.style.display = 'none';
        videoRecordPreview.style.border = '';
        videoRecordPreview.style.background = '';
      }
      if (audioRecordPreview) {
        audioRecordPreview.style.display = 'none';
        audioRecordPreview.style.border = '';
        audioRecordPreview.style.background = '';
      }
      if (recordedVideo && recordedVideo.src) {
        URL.revokeObjectURL(recordedVideo.src);
        recordedVideo.src = '';
      }
      if (recordedAudio && recordedAudio.src) {
        URL.revokeObjectURL(recordedAudio.src);
        recordedAudio.src = '';
      }
      if (recordStatus) recordStatus.style.display = 'none';
      
      // 停止录制（如果正在录制）
      if (isRecordingVideo) {
        stopVideoRecording();
      }
      if (isRecordingAudio) {
        stopAudioRecording();
      }
      
      console.log('已清除录制的文件');
    }
    
    // 清除上传的文件
    function clearUploadedFiles() {
      selectedVideoFile = null;
      selectedVideoUrl = null;
      selectedAudioFile = null;
      
      // 清除预览
      const videoPreview = document.getElementById('videoPreviewSection');
      const audioPreview = document.getElementById('audioPreviewSection');
      
      if (videoPreview) {
        videoPreview.style.display = 'none';
        videoPreview.style.border = '';
        videoPreview.style.background = '';
      }
      if (audioPreview) {
        audioPreview.style.display = 'none';
        audioPreview.style.border = '';
        audioPreview.style.background = '';
      }
      
      // 清除文件输入
      const uploadFileInput = document.getElementById('uploadFile');
      const uploadAudioInput = document.getElementById('uploadAudioFile');
      if (uploadFileInput) uploadFileInput.value = '';
      if (uploadAudioInput) uploadAudioInput.value = '';
      
      const uploadedVideoPreview = document.getElementById('uploadedVideoPreview');
      const uploadedImagePreview = document.getElementById('uploadedImagePreview');
      const uploadedAudioPreview = document.getElementById('uploadedAudioPreview');
      if (uploadedVideoPreview && uploadedVideoPreview.src) {
        URL.revokeObjectURL(uploadedVideoPreview.src);
        uploadedVideoPreview.src = '';
        uploadedVideoPreview.style.display = '';
      }
      if (uploadedImagePreview && uploadedImagePreview.src) {
        URL.revokeObjectURL(uploadedImagePreview.src);
        uploadedImagePreview.src = '';
        uploadedImagePreview.style.display = 'none';
      }
      if (uploadedAudioPreview && uploadedAudioPreview.src) {
        URL.revokeObjectURL(uploadedAudioPreview.src);
        uploadedAudioPreview.src = '';
      }

      console.log('已清除上传的文件');
    }
    
    // 清除模板选择
    function clearTemplateSelection() {
      selectedAvatarId = null;
      selectedTemplatePreviewVideo = null;
      selectedTemplatePreviewImage = null;
      selectedTemplateName = null;
      
      // 清除模板选择状态
      document.querySelectorAll('.avatar-template-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // 隐藏模板预览
      hideTemplatePreview();
      
      console.log('已清除模板选择');
    }
    
    // ========== 标签切换 ==========
    function switchTab(tab) {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      event.currentTarget.classList.add('active');
      document.getElementById(tab + 'Tab').classList.add('active');
    }
    
    function handleDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleVideoFile(files[0]);
      }
    }
    
    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.add('dragover');
    }
    
    function handleDragLeave(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadArea').classList.remove('dragover');
    }
    
    function handleVideoFileUpload(input) {
      if (input.files.length > 0) {
        handleVideoFile(input.files[0]);
      }
    }
    
    function handleVideoFile(file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isVideo && !isImage) {
        alert('请选择视频或图片文件');
        return;
      }
      if (isImage && currentPlatform !== 'yunwu') {
        alert('HeyGen 模式下请选择视频文件');
        return;
      }

      if (isVideo && file.size > 100 * 1024 * 1024) {
        alert('视频文件大小不能超过100MB');
        return;
      }
      if (isImage && file.size > 20 * 1024 * 1024) {
        alert('图片文件大小不能超过20MB');
        return;
      }

      clearTemplateSelection();
      clearRecordedFiles();

      selectedVideoFile = file;
      const url = URL.createObjectURL(file);
      selectedVideoUrl = url;

      const previewSection = document.getElementById('videoPreviewSection');
      const videoPreview = document.getElementById('uploadedVideoPreview');
      const imagePreview = document.getElementById('uploadedImagePreview');
      const fileName = document.getElementById('videoFileName');
      const durationEl = document.getElementById('videoDuration');

      fileName.textContent = file.name;
      previewSection.style.display = 'block';

      if (isImage) {
        videoPreview.src = '';
        videoPreview.style.display = 'none';
        if (imagePreview) {
          imagePreview.src = url;
          imagePreview.style.display = 'block';
        }
        if (durationEl) durationEl.textContent = '-';
      } else {
        if (imagePreview) imagePreview.style.display = 'none';
        videoPreview.style.display = 'block';
        videoPreview.src = url;
        videoPreview.onloadedmetadata = () => {
          const d = videoPreview.duration;
          const m = Math.floor(d / 60);
          const s = Math.floor(d % 60);
          if (durationEl) durationEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        };
        setTimeout(() => extractVideoFrame(), 500);
      }
    }
    
    // ========== 音频文件上传处理 ==========
    
    function handleAudioDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('uploadAudioArea').classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleAudioFile(files[0]);
      }
    }
    // ✅ 修复：handleAudioFileUpload 函数（修复404错误）
    // 音频文件直接在前端处理，转换为 base64，不需要先上传到服务器
    function handleAudioFileUpload(input) {
      if (input && input.files && input.files.length > 0) {
        handleAudioFile(input.files[0]);
      }
    }
    
    function handleAudioFile(file) {
      if (!file.type.startsWith('audio/')) {
        alert('请选择音频文件');
        return;
      }
      
      // 验证音频文件格式（云雾可灵数字人要求：.mp3/.wav/.m4a/.aac）
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
      if (!isValidType) {
        alert('音频格式不支持。\n\n请上传以下格式的音频文件：\n• MP3 (.mp3)\n• WAV (.wav)\n• M4A (.m4a)\n• AAC (.aac)');
        return;
      }
      
      // 验证文件大小（≤5MB）
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert(`音频文件过大（${(file.size / 1024 / 1024).toFixed(2)} MB）。\n\n请上传 ≤5MB 的音频文件。`);
        return;
      }
      
      // 清除模板选择和录制的内容（互斥逻辑）
      clearTemplateSelection();
      clearRecordedFiles();
      
      selectedAudioFile = file;
      
      const audioPreview = document.getElementById('uploadedAudioPreview');
      const fileName = document.getElementById('audioFileName');
      const fileSize = document.getElementById('audioFileSize');
      const previewSection = document.getElementById('audioPreviewSection');
      
      if (audioPreview && fileName && fileSize) {
        const url = URL.createObjectURL(file);
        audioPreview.src = url;
        fileName.textContent = file.name;
        fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        previewSection.style.display = 'block';
      }
    }
    
    function removeUploadedAudio() {
      selectedAudioFile = null;
      const audioPreview = document.getElementById('uploadedAudioPreview');
      const fileName = document.getElementById('audioFileName');
      const fileSize = document.getElementById('audioFileSize');
      const previewSection = document.getElementById('audioPreviewSection');
      
      if (audioPreview && audioPreview.src) {
        URL.revokeObjectURL(audioPreview.src);
        audioPreview.src = '';
      }
      if (fileName) fileName.textContent = '-';
      if (fileSize) fileSize.textContent = '-';
      if (previewSection) previewSection.style.display = 'none';
    }
    
    function removeUploadedVideo() {
      if (selectedVideoUrl) URL.revokeObjectURL(selectedVideoUrl);
      selectedVideoFile = null;
      selectedVideoUrl = null;
      extractedFrames = [];

      const videoPreviewSection = document.getElementById('videoPreviewSection');
      if (videoPreviewSection) videoPreviewSection.style.display = 'none';
      const framePreviewSection = document.getElementById('framePreviewSection');
      if (framePreviewSection) framePreviewSection.style.display = 'none';

      const uploadedVideoPreview = document.getElementById('uploadedVideoPreview');
      const uploadedImagePreview = document.getElementById('uploadedImagePreview');
      if (uploadedVideoPreview) {
        uploadedVideoPreview.src = '';
        uploadedVideoPreview.style.display = '';
      }
      if (uploadedImagePreview) {
        uploadedImagePreview.src = '';
        uploadedImagePreview.style.display = 'none';
      }

      const frameGrid = document.getElementById('frameGrid');
      if (frameGrid) frameGrid.innerHTML = '';
    }
    
    // 提取视频关键帧
    function extractVideoFrame() {
      const video = document.getElementById('uploadedVideoPreview');
      if (!video || !selectedVideoUrl) {
        alert('请先上传视频');
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      extractedFrames = [];
      const frameGrid = document.getElementById('frameGrid');
      frameGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-secondary);">正在提取关键帧...</div>';
      
      // 等待视频元数据加载
      if (!video.videoWidth || !video.videoHeight) {
        video.onloadedmetadata = () => {
          extractFramesFromVideo(video, canvas, ctx);
        };
      } else {
        extractFramesFromVideo(video, canvas, ctx);
      }
    }
    
    function extractFramesFromVideo(video, canvas, ctx) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // 提取多个关键帧（视频开始、1/4、1/2、3/4、结束）
      const frameTimes = [];
      const duration = video.duration || 10;
      
      frameTimes.push(0);
      if (duration > 2) frameTimes.push(duration * 0.25);
      if (duration > 4) frameTimes.push(duration * 0.5);
      if (duration > 6) frameTimes.push(duration * 0.75);
      if (duration > 1) frameTimes.push(Math.max(0, duration - 0.5));
      
      let extractedCount = 0;
      const totalFrames = frameTimes.length;
      
      frameTimes.forEach((time, index) => {
        const originalTime = video.currentTime;
        video.currentTime = time;
        
        const seekHandler = () => {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            extractedFrames.push({
              id: Date.now() + index,
              time: time,
              dataUrl: frameDataUrl
            });
            
            extractedCount++;
            if (extractedCount === totalFrames) {
              video.removeEventListener('seeked', seekHandler);
              renderFrames();
              video.currentTime = originalTime;
            }
          } catch (e) {
            console.error('提取帧失败:', e);
            extractedCount++;
            if (extractedCount === totalFrames) {
              video.removeEventListener('seeked', seekHandler);
              renderFrames();
            }
          }
        };
        
        video.addEventListener('seeked', seekHandler, { once: true });
      });
    }
    
    function renderFrames() {
      const frameGrid = document.getElementById('frameGrid');
      const frameSection = document.getElementById('framePreviewSection');
      
      if (extractedFrames.length === 0) {
        frameGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-secondary);">未能提取关键帧</div>';
        return;
      }
      
      frameGrid.innerHTML = extractedFrames.map((frame, index) => `
        <div class="material-item ${index === 0 ? 'selected' : ''}" onclick="selectFrame(${frame.id}, this)">
          <img class="material-preview" src="${frame.dataUrl}" style="object-fit: cover;">
          <div class="material-info">
            <div class="material-name">帧 ${index + 1}</div>
          </div>
        </div>
      `).join('');
      
      frameSection.style.display = 'block';
    }
    
    function selectFrame(id, element) {
      selectedFrameId = id;
      document.querySelectorAll('#frameGrid .material-item').forEach(item => {
        item.classList.remove('selected');
      });
      if (element) element.classList.add('selected');
    }
    
    function confirmVideoSelection() {
      if (!selectedVideoFile) {
        alert('请先上传视频');
        return;
      }
      
      // 清除模板选择（互斥逻辑）
      clearTemplateSelection();
      
      // 标记已选择视频
      const previewSection = document.getElementById('videoPreviewSection');
      previewSection.style.border = '2px solid var(--success)';
      previewSection.style.background = 'rgba(82, 196, 26, 0.1)';
      
      alert('✅ 视频已确认！\n\n您可以继续下一步配置生成参数。');
    }
    
    // 确认视频和音频选择（上传模式）
    function confirmVideoAndAudioSelection() {
      if (!selectedVideoFile) {
        alert('❌ 请先上传视频或图片文件');
        return;
      }
      if (currentPlatform === 'heygen' && !selectedAudioFile) {
        alert('❌ 请先上传音频文件\n\nHeyGen 上传参考文件时需要同时提供视频和音频。');
        return;
      }
      if (currentPlatform === 'yunwu' && !selectedAudioFile) {
        alert('❌ 请先上传音频文件\n\n可灵数字人接口要求必须提供音频。支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
        return;
      }

      clearTemplateSelection();
      clearRecordedFiles();

      const videoPreviewSection = document.getElementById('videoPreviewSection');
      const audioPreviewSection = document.getElementById('audioPreviewSection');
      if (videoPreviewSection) {
        videoPreviewSection.style.border = '2px solid var(--success)';
        videoPreviewSection.style.background = 'rgba(82, 196, 26, 0.1)';
      }
      if (audioPreviewSection) {
        audioPreviewSection.style.border = '2px solid var(--success)';
        audioPreviewSection.style.background = 'rgba(82, 196, 26, 0.1)';
      }

      if (currentPlatform === 'yunwu') {
        alert('✅ 图片/视频和音频已确认！\n\n您可以继续下一步配置生成。');
      } else {
        alert('✅ 视频和音频已确认！\n\n您可以继续下一步配置生成参数。');
      }
    }
    
    // 确认录制的视频和音频
    function confirmRecordedVideoAndAudio() {
      if (!recordedVideoBlob) {
        alert('❌ 请先录制视频');
        return;
      }
      
      if (!recordedAudioBlob) {
        alert('❌ 请先录制音频\n\n实时录制时需要同时录制视频和音频。');
        return;
      }
      
      // 清除模板选择和上传的文件（互斥逻辑）
      clearTemplateSelection();
      clearUploadedFiles();
      
      // 标记已选择录制的视频和音频
      const videoRecordPreview = document.getElementById('videoRecordPreview');
      const audioRecordPreview = document.getElementById('audioRecordPreview');
      
      if (videoRecordPreview) {
        videoRecordPreview.style.border = '2px solid var(--success)';
        videoRecordPreview.style.background = 'rgba(82, 196, 26, 0.1)';
      }
      
      if (audioRecordPreview) {
        audioRecordPreview.style.border = '2px solid var(--success)';
        audioRecordPreview.style.background = 'rgba(82, 196, 26, 0.1)';
      }
      
      alert('✅ 录制的视频和音频已确认！\n\n您可以继续下一步配置生成参数。');
    }
    
    // 更新步骤3的视频预览
    function updateStep3VideoPreview() {
      const displayEl = document.getElementById('step3VideoDisplay');
      if (!displayEl) return;
      
      // 模板模式：已选择模板时，展示模板预览（视频或图片）
      if (currentAvatarMode === 'template' && selectedAvatarId) {
        const name = selectedTemplateName || '已选模板';
        if (selectedTemplatePreviewVideo) {
          displayEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: center;">
              <div>
                <video src="${selectedTemplatePreviewVideo}" style="width: 100%; border-radius: 12px; border: 2px solid var(--primary);" muted autoplay loop playsinline></video>
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 600; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">模板ID: ${selectedAvatarId}</div>
                <button class="btn secondary" style="margin-top: 12px; padding: 8px 16px; font-size: 0.85rem;" onclick="goToStep(2)">返回修改</button>
              </div>
            </div>
          `;
        } else if (selectedTemplatePreviewImage) {
          displayEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: center;">
              <div>
                <img src="${selectedTemplatePreviewImage}" style="width: 100%; border-radius: 12px; border: 2px solid var(--primary); object-fit: contain;" alt="${name}">
              </div>
              <div style="text-align: left;">
                <div style="font-weight: 600; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">模板ID: ${selectedAvatarId}</div>
                <button class="btn secondary" style="margin-top: 12px; padding: 8px 16px; font-size: 0.85rem;" onclick="goToStep(2)">返回修改</button>
              </div>
            </div>
          `;
        } else {
          displayEl.innerHTML = `
            <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: center;">
              <div style="width: 200px; height: 120px; background: var(--bg-secondary); border-radius: 12px; border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 2.5rem;">📹</div>
              <div style="text-align: left;">
                <div style="font-weight: 600; margin-bottom: 8px;">${name}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">模板ID: ${selectedAvatarId}（该模板暂无预览）</div>
                <button class="btn secondary" style="margin-top: 12px; padding: 8px 16px; font-size: 0.85rem;" onclick="goToStep(2)">返回修改</button>
              </div>
            </div>
          `;
        }
        return;
      }
      
      if (selectedVideoUrl) {
        const selectedFrame = extractedFrames.find(f => f.id === selectedFrameId) || extractedFrames[0];
        
        displayEl.innerHTML = `
          <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: center;">
            <div>
              ${selectedFrame ? 
                `<img src="${selectedFrame.dataUrl}" style="width: 100%; border-radius: 12px; border: 2px solid var(--primary);">` :
                `<video src="${selectedVideoUrl}" style="width: 100%; border-radius: 12px; border: 2px solid var(--primary);" muted autoplay loop></video>`
              }
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 600; margin-bottom: 8px;">${selectedVideoFile ? selectedVideoFile.name : '录制的视频'}</div>
              <div style="font-size: 0.9rem; color: var(--text-secondary);">
                ${selectedVideoFile ? `文件大小: ${(selectedVideoFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
              </div>
              <button class="btn secondary" style="margin-top: 12px; padding: 8px 16px; font-size: 0.85rem;" onclick="goToStep(2)">返回修改</button>
            </div>
          </div>
        `;
      } else if (recordedVideoBlob) {
        displayEl.innerHTML = `
          <div style="display: grid; grid-template-columns: 200px 1fr; gap: 20px; align-items: center;">
            <div>
              <video src="${currentVideoUrl}" style="width: 100%; border-radius: 12px; border: 2px solid var(--primary);" muted autoplay loop></video>
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 600; margin-bottom: 8px;">实时录制的视频</div>
              <div style="font-size: 0.9rem; color: var(--text-secondary);">
                已录制完成
              </div>
              <button class="btn secondary" style="margin-top: 12px; padding: 8px 16px; font-size: 0.85rem;" onclick="goToStep(2)">返回修改</button>
            </div>
          </div>
        `;
      } else {
        displayEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">请返回上一步选择视频形象</div>';
      }
    }
    
    // ========== 分页控制 ==========
    function changePage(direction) {
      console.log('切换页面:', direction);
      const totalPages = Math.ceil(totalAvatars / pageSize);
      const newPage = currentPage + direction;
      
      if (newPage < 1 || newPage > totalPages) {
        console.log('页码超出范围:', newPage);
        return;
      }
      
      currentPage = newPage;
      displayedAvatars = 0; // 重置为分页模式
      renderAvatars();
      updatePaginationControls();
    }
    
    function updatePaginationControls() {
      const totalPages = Math.ceil(totalAvatars / pageSize);
      const paginationContainer = document.getElementById('paginationContainer');
      const pageInfo = document.getElementById('pageInfo');
      const prevBtn = document.getElementById('prevPageBtn');
      const nextBtn = document.getElementById('nextPageBtn');
      
      if (totalPages > 1) {
        paginationContainer.style.display = 'flex';
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
      } else {
        paginationContainer.style.display = 'none';
      }
    }
    
    // ========== 加载更多模板 ==========
    function loadMoreAvatars(context) {
      console.log('加载更多模板, context:', context, '当前显示:', displayedAvatars, '总数:', totalAvatars);
      
      if (displayedAvatars >= totalAvatars) {
        console.log('已显示全部模板');
        return;
      }
      
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      const loadMoreText = document.getElementById('loadMoreText');
      const loadMoreIcon = document.getElementById('loadMoreIcon');
      
      if (!loadMoreBtn) {
        console.error('找不到加载更多按钮');
        return;
      }
      
      loadMoreBtn.disabled = true;
      if (loadMoreText) loadMoreText.textContent = '加载中...';
      if (loadMoreIcon) loadMoreIcon.textContent = '⏳';
      
      // 增加显示数量
      displayedAvatars = Math.min(displayedAvatars + pageSize, totalAvatars);
      renderAvatars();
      
      // 恢复按钮状态
      setTimeout(() => {
        loadMoreBtn.disabled = false;
        if (loadMoreText) loadMoreText.textContent = '加载更多模板';
        if (loadMoreIcon) loadMoreIcon.textContent = '⬇️';
        
        // 如果已显示全部，隐藏加载更多按钮
        if (displayedAvatars >= totalAvatars) {
          const loadMoreContainer = document.getElementById('loadMoreContainer');
          if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        }
      }, 500);
    }
    
    // ========== 渲染模板列表 ==========
    function renderAvatars() {
      console.log('渲染模板列表, 当前页:', currentPage, '显示数量:', displayedAvatars);
      
      if (!heygenAvatarsCache || !Array.isArray(heygenAvatarsCache)) {
        console.warn('没有缓存的avatar列表或格式不正确');
        return;
      }
      
      const container = document.getElementById('avatarTemplateGrid');
      if (!container) {
        console.error('找不到avatarTemplateGrid容器');
        return;
      }
      
      // 过滤视频类型的avatar
      const filteredAvatars = heygenAvatarsCache.filter(avatar => {
        return avatar.type === 'video' || avatar.avatar_type === 'video' || !avatar.type;
      });
      
      totalAvatars = filteredAvatars.length;
      console.log('过滤后的模板数量:', totalAvatars);
      
      // 计算当前页要显示的范围（分页模式）
      let avatarsToShow;
      if (displayedAvatars > 0 && displayedAvatars < totalAvatars) {
        // 下拉加载模式：显示从0到displayedAvatars
        avatarsToShow = filteredAvatars.slice(0, displayedAvatars);
      } else {
        // 分页模式：显示当前页的数据
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalAvatars);
        avatarsToShow = filteredAvatars.slice(startIndex, endIndex);
      }
      
      console.log('要显示的模板数量:', avatarsToShow.length);
      
      // 清空容器（保留加载状态）
      const loadingState = document.getElementById('avatarLoadingState');
      container.innerHTML = '';
      if (loadingState) {
        container.appendChild(loadingState);
      }
      
      // 渲染模板
      avatarsToShow.forEach((avatar, index) => {
        const avatarId = avatar.avatar_id || avatar.id || avatar;
        const avatarName = avatar.avatar_name || avatar.name || `Avatar ${index + 1}`;
        const previewImage = avatar.preview_image_url || avatar.preview_url || '';
        const gender = avatar.gender || 'unknown';
        const genderIcon = gender === 'female' ? '👩' : gender === 'male' ? '👨' : '👤';
        
        const avatarItem = document.createElement('div');
        avatarItem.className = 'avatar-template-item';
        avatarItem.setAttribute('data-avatar-id', avatarId);
        // 保存完整的avatar数据以便预览
        avatarItem.setAttribute('data-avatar-data', JSON.stringify(avatar));
        avatarItem.style.cssText = 'background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.3s; text-align: center;';
        avatarItem.onclick = () => {
          console.log('选择模板:', avatarId);
          selectAvatarTemplate(avatarId, 'create', avatar);
        };
        
        if (previewImage) {
          avatarItem.innerHTML = `
            <img src="${previewImage}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="font-size: 2.5rem; margin-bottom: 8px; display: none;">${genderIcon}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${avatarName}">
              ${avatarName}
            </div>
          `;
        } else {
          avatarItem.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 8px;">${genderIcon}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${avatarName}">
              ${avatarName}
            </div>
          `;
        }
        
        container.appendChild(avatarItem);
      });
      
      // 添加样式（如果还没有）
      if (!document.getElementById('avatarTemplateStyles')) {
        const style = document.createElement('style');
        style.id = 'avatarTemplateStyles';
        style.textContent = `
          .avatar-template-item:hover {
            border-color: var(--primary) !important;
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(24, 144, 255, 0.2);
          }
          .avatar-template-item.selected {
            border-color: var(--primary) !important;
            background: rgba(24, 144, 255, 0.1) !important;
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.2);
          }
          .digital-human-type-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
          }
        `;
        document.head.appendChild(style);
      }
      
      // 更新加载更多按钮和分页控制
      const loadMoreContainer = document.getElementById('loadMoreContainer');
      const paginationContainer = document.getElementById('paginationContainer');
      if (displayedAvatars > 0 && displayedAvatars < totalAvatars) {
        // 下拉加载模式
        if (loadMoreContainer) loadMoreContainer.style.display = 'block';
        if (paginationContainer) paginationContainer.style.display = 'none';
      } else {
        // 分页模式
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        updatePaginationControls();
      }
      
      // 隐藏加载状态
      if (loadingState) {
        loadingState.style.display = 'none';
      }
    }
    
    // ========== API Key 管理 ==========

// 获取 HeyGen API Key
function getHeyGenApiKey() {
  // 先从localStorage获取
  let apiKey = localStorage.getItem('heygen_api_key');
  
  // 如果没有，尝试从输入框获取
  if (!apiKey) {
    const input = document.getElementById('heygenApiKey');
    if (input && input.value) {
      apiKey = input.value;
      // 保存到localStorage
      localStorage.setItem('heygen_api_key', apiKey);
    }
  }
  
  return apiKey;
}

// ========== 统一的错误处理函数 ==========

/**
 * 检测错误响应是否为Token类型错误（mistake类型）
 * @param {Object} errorData - 错误响应数据
 * @returns {boolean} - 是否为Token类型错误
 */
function isTokenTypeErrorResponse(errorData) {
  if (!errorData) return false;
  
  // 检查错误代码
  if (errorData.errorCode === 'TOKEN_TYPE_ERROR' || errorData.error === 'TOKEN_TYPE_ERROR') {
    return true;
  }
  
  // 检查错误消息
  const errorMessage = errorData.message || '';
  if (!errorMessage) return false;
  
  const errorMsgLower = errorMessage.toLowerCase();
  const tokenTypeErrorPatterns = [
    /token.*type.*mistake/i,
    /type.*mistake.*token/i,
    /令牌类型.*mistake/i,
    /mistake.*token.*type/i,
    /TOKEN_TYPE_ERROR/i,
    /类型错误.*token/i,
    /token.*type.*错误/i,
    /令牌类型.*错误/i
  ];
  
  return tokenTypeErrorPatterns.some(pattern => pattern.test(errorMsgLower));
}

/**
 * 检测错误响应是否为配额不足错误
 * @param {Object} errorData - 错误响应数据
 * @returns {boolean} - 是否为配额不足错误
 */
function isQuotaErrorResponse(errorData) {
  if (!errorData) return false;
  
  // 检查错误代码
  if (errorData.errorCode === 'QUOTA_INSUFFICIENT' || errorData.error === 'QUOTA_INSUFFICIENT') {
    return true;
  }
  
  // 检查错误消息
  const errorMessage = errorData.message || '';
  if (!errorMessage) return false;
  
  const errorMsgLower = errorMessage.toLowerCase();
  return /配额不足|余额不足|quota.*insufficient|insufficient.*quota|余额.*不足/i.test(errorMsgLower);
}

/**
 * 处理Token类型错误
 * @param {Object} errorData - 错误响应数据
 */
function handleTokenTypeError(errorData) {
  const tokenErrorMessage = errorData?.message || 'API令牌类型错误';
  const helpUrl = errorData?.helpUrl || 'https://yunwu.ai/token';
  
  alert(tokenErrorMessage);
  
  if (confirm('⚠️ 检测到Token类型为"mistake"！\n\n是否现在打开令牌管理页面修复Token类型？')) {
    window.open(helpUrl, '_blank');
  }
}

/**
 * 处理配额不足错误
 * @param {Object} errorData - 错误响应数据
 */
function handleQuotaError(errorData) {
  const quotaMessage = errorData?.message || '账号配额不足';
  const suggestCheckToken = errorData?.suggestCheckToken || 
                           quotaMessage.includes('Token类型') || 
                           quotaMessage.includes('mistake');
  const helpUrl = suggestCheckToken 
    ? (errorData?.helpUrl || 'https://yunwu.ai/token')
    : (errorData?.helpUrl || 'https://yunwu.ai/topup');
  
  alert(quotaMessage);
  
  if (suggestCheckToken) {
    if (confirm('⚠️ 这很可能是Token类型问题导致的！\n\n是否现在打开令牌管理页面检查Token类型？')) {
      window.open(helpUrl, '_blank');
    }
  } else {
    if (confirm('是否现在打开充值页面？')) {
      window.open(helpUrl, '_blank');
    }
  }
}

/**
 * 统一处理API错误响应
 * @param {Object} errorData - 错误响应数据
 * @param {Function} onOtherError - 处理其他错误的回调函数
 */
function handleApiError(errorData, onOtherError) {
  if (isTokenTypeErrorResponse(errorData)) {
    handleTokenTypeError(errorData);
  } else if (isQuotaErrorResponse(errorData)) {
    handleQuotaError(errorData);
  } else if (onOtherError) {
    onOtherError(errorData);
  } else {
    alert('❌ 操作失败：' + (errorData?.message || '未知错误'));
  }
}

// 获取云雾 API Key
function getYunwuApiKey() {
  // 先从localStorage获取
  let apiKey = localStorage.getItem('yunwu_api_key');
  
  // 如果没有，尝试从输入框获取
  if (!apiKey) {
    const input = document.getElementById('yunwuApiKey');
    if (input && input.value) {
      apiKey = input.value;
      // 保存到localStorage
      localStorage.setItem('yunwu_api_key', apiKey);
    }
  }
  
  return apiKey;
}

// 保存 HeyGen API Key
function saveHeyGenConfig() {
  const apiKey = document.getElementById('heygenApiKey').value.trim();
  if (!apiKey) {
    alert('请填写 HeyGen API Key');
    return;
  }
  
  // ✅ 保存到localStorage
  try {
    localStorage.setItem('heygen_api_key', apiKey);
    showStatus('heygenStatus', '✅ API Key 保存成功！已保存到本地，下次打开页面将自动加载。', 'success');
    console.log('HeyGen API Key 已保存到 localStorage');
  } catch (e) {
    console.error('保存 HeyGen API Key 失败:', e);
    showStatus('heygenStatus', '❌ 保存失败：' + e.message, 'error');
    return;
  }
  
  // 自动测试连接
  setTimeout(() => testHeyGenApi(), 500);
}


// 保存云雾 API Key（增强版，包含预防性检查）
async function saveYunwuConfig() {
  const apiKey = document.getElementById('yunwuApiKey')?.value.trim();
  if (!apiKey) {
    alert('请填写云雾 API Key');
    return;
  }
  
  // 基本格式验证
  if (apiKey.length < 10 || apiKey.length > 200) {
    showStatus('yunwuStatus', '❌ API Key 格式不正确（长度应在10-200字符之间）', 'error');
    return;
  }
  
  // 检查是否是之前保存的Token（避免重复验证）
  const savedKey = localStorage.getItem('yunwu_api_key');
  const wasTested = localStorage.getItem('yunwu_api_tested') === 'true';
  
  // 如果是新Token或之前未测试过，自动进行验证
  if (apiKey !== savedKey || !wasTested) {
    showStatus('yunwuStatus', '⏳ 正在验证Token配置（防止type为"mistake"）...', 'warning');
    
    try {
      // 自动调用测试接口进行验证
      const response = await fetch(buildApiUrl('/api/yunwu/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      
      const contentType = response.headers.get('content-type') || '';
      let result;
      
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('验证接口返回非JSON响应:', text.substring(0, 200));
        throw new Error('验证接口返回了非 JSON 格式的响应');
      }
      
      if (result.success) {
        // 验证通过，保存Token
        try {
          localStorage.setItem('yunwu_api_key', apiKey);
          localStorage.setItem('yunwu_api_tested', 'true');
          localStorage.setItem('yunwu_api_test_time', new Date().toISOString());
          showStatus('yunwuStatus', '✅ Token验证通过！配置已保存（Token类型正常，可以正常使用）', 'success');
          console.log('云雾 API Key 已保存到 localStorage（已验证）');
        } catch (e) {
          console.error('保存云雾 API Key 失败:', e);
          showStatus('yunwuStatus', '❌ 验证通过但保存失败：' + e.message, 'error');
          return;
        }
      } else {
        // 验证失败，检查是否是Token类型错误
        if (isTokenTypeErrorResponse(result)) {
          showStatus('yunwuStatus', '❌ Token类型错误（type为"mistake"）', 'error');
          handleTokenTypeError(result);
          
          // 不保存错误的Token
          return;
        } else {
          // 其他错误，仍然保存但提示用户
          try {
            localStorage.setItem('yunwu_api_key', apiKey);
            localStorage.removeItem('yunwu_api_tested');
            showStatus('yunwuStatus', '⚠️ Token已保存，但验证失败：' + (result.message || '未知错误') + '\n\n建议：点击"测试连接"进行详细检查', 'warning');
            console.log('云雾 API Key 已保存（但验证失败）');
          } catch (e) {
            console.error('保存云雾 API Key 失败:', e);
            showStatus('yunwuStatus', '❌ 验证失败且无法保存：' + (result.message || '未知错误'), 'error');
            return;
          }
        }
      }
    } catch (error) {
      console.error('自动验证Token错误:', error);
      // 验证失败，但仍然保存（可能是网络问题）
      try {
        localStorage.setItem('yunwu_api_key', apiKey);
        showStatus('yunwuStatus', '⚠️ Token已保存，但自动验证失败（可能是网络问题）\n\n强烈建议：点击"测试连接"按钮进行验证，确保Token类型正确', 'warning');
        console.log('云雾 API Key 已保存（但自动验证失败）');
      } catch (e) {
        console.error('保存云雾 API Key 失败:', e);
        showStatus('yunwuStatus', '❌ 无法保存Token：' + error.message, 'error');
        return;
      }
    }
  } else {
    // 已测试过的Token，直接保存
    try {
      localStorage.setItem('yunwu_api_key', apiKey);
      showStatus('yunwuStatus', '✅ API Key 保存成功！已保存到本地，下次打开页面将自动加载。', 'success');
      console.log('云雾 API Key 已保存到 localStorage（之前已验证）');
    } catch (e) {
      console.error('保存云雾 API Key 失败:', e);
      showStatus('yunwuStatus', '❌ 保存失败：' + e.message, 'error');
      return;
    }
  }
}
    // ========== 创建数字人（修改版） ==========
    
    async function createDigitalHuman() {
      const name = document.getElementById('digitalHumanName').value.trim();
      const desc = document.getElementById('digitalHumanDesc').value.trim();
      const script = document.getElementById('scriptInput').value.trim();
      
      if (!name) {
        alert('请输入数字人名称');
        return;
      }
      
      // 根据当前平台选择不同的数字人创建方式
      if (currentPlatform === 'heygen') {
        await createHeyGenDigitalHuman(name, desc, script);
        return;
      } else if (currentPlatform === 'yunwu') {
        await createYunwuDigitalHuman(name, desc, script);
        return;
      }
      
      alert('当前仅支持 HeyGen 或 云雾数字人平台');
    }
    
    // HeyGen 数字人创建（后台处理，支持图片和视频数字人）
    async function createHeyGenDigitalHuman(name, desc, script) {
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置 HeyGen API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"保存配置"。');
        return;
      }
      
      if (!script) {
        alert('请输入文案内容');
        return;
      }
      
      // 获取当前选择的 avatar_id
      let avatarId = selectedAvatarId;
      
      // 如果没有选择 avatar，尝试从模板中选择
      if (!avatarId) {
        // 尝试从选中的模板中获取 avatar_id
        const selectedTemplate = currentAvatarTemplates.find(t => t.selected);
        if (selectedTemplate && selectedTemplate.avatar_id) {
          avatarId = selectedTemplate.avatar_id;
        }
      }
      
      // ✅ 修复：强制要求选择 avatar（根据HeyGen官方文档，avatar_id是必需的，不能使用默认值）
      if (!avatarId || avatarId === 'default' || avatarId === 'default_avatar_id') {
        showLoading(false);
        alert('❌ 请先选择数字人形象\n\n根据HeyGen API要求，必须选择一个有效的数字人模板。\n\n请在步骤2中选择一个数字人模板，然后继续。');
        // 自动跳转到步骤2
        goToStep(2);
        return;
      }
      
      // 获取语音ID
      let voiceId = selectedVoiceId;
      if (!voiceId) {
        // 从select元素获取（向后兼容）
        const voiceSelect = document.getElementById('voiceSelect');
        if (voiceSelect && voiceSelect.value) {
          voiceId = voiceSelect.value;
        }
      }
      
      // 如果没有选择语音，根据文案语言自动选择
      if (!voiceId) {
        const hasChinese = /[\u4e00-\u9fa5]/.test(script);
        voiceId = hasChinese ? 'zh' : 'en';
        console.log('未选择语音，自动推断:', voiceId);
      }
      
      showLoading(true, '正在创建 HeyGen 数字人视频...');
      
      try {
        // ✅ 修复：正确的API请求格式
        const response = await fetch(buildApiUrl('/api/heygen/video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey, // 必须的API Key
            avatarId: avatarId, // 使用的avatar ID
            text: script, // 用户输入的文案
            voiceId: voiceId, // 语音ID
            // 可选参数
            digitalHumanType: 'video',
            name: name,
            description: desc
          })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应。请检查服务器配置。');
        }
        
        console.log('HeyGen API 响应:', result);
        
        if (!result.success) {
          showLoading(false);
          
          // 详细的错误处理
          let errorMessage = '创建任务失败：' + (result.message || '未知错误');
          
          // 特殊错误处理
          if (result.message && result.message.includes('avatar')) {
            errorMessage += '\n\n可能原因：\n1. avatar_id 不正确\n2. 该avatar不可用\n3. API Key权限不足';
          }
          
          if (result.message && result.message.includes('voice')) {
            errorMessage += '\n\n可能原因：\n1. voice_id 不正确\n2. 语音不支持该语言';
          }
          
          alert('❌ ' + errorMessage);
          
          // 显示调试信息
          if (result.debug) {
            console.error('调试信息:', result.debug);
          }
          
          return;
        }
        
        // ✅ 修复：正确处理返回的taskId/video_id
        let taskId = null;
        if (result.data) {
          taskId = result.data.video_id || result.data.id || result.video_id;
        } else {
          taskId = result.video_id || result.id;
        }
        
        if (!taskId) {
          showLoading(false);
          console.error('HeyGen 未返回有效的任务ID:', result);
          alert('❌ 创建任务失败：服务器未返回有效的任务ID（video_id）。\n\n响应数据：' + JSON.stringify(result).substring(0, 300));
          return;
        }
        
        console.log('HeyGen 任务创建成功，任务ID:', taskId);
        
        const digitalHumanId = 'heygen_' + Date.now();
        
        // 获取缩略图
        let thumbnail = null;
        if (selectedTemplatePreviewImage) {
          thumbnail = selectedTemplatePreviewImage;
        } else if (selectedVideoFile && extractedFrames.length > 0) {
          const selectedFrame = extractedFrames.find(f => f.id === selectedFrameId) || extractedFrames[0];
          thumbnail = selectedFrame ? selectedFrame.dataUrl : null;
        }
        
        // 创建数字人记录
        const digitalHuman = {
          id: digitalHumanId,
          name: name,
          description: desc,
          script: script,
          platform: 'heygen',
          taskId: taskId,
          avatarId: avatarId,
          voiceId: voiceId,
          status: 'processing',
          progress: 0,
          videoUrl: null,
          thumbnail: thumbnail,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        // 保存到localStorage
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        digitalHumans.unshift(digitalHuman);
        if (digitalHumans.length > 50) digitalHumans.length = 50;
        localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
        
        showLoading(false);
        
        // 显示成功消息
        alert(`✅ HeyGen 数字人创建任务已提交！
        
    任务ID: ${taskId}
    状态: 处理中...
    预估时间: 约1-3分钟
    
    您可以在"数字人管理"中查看进度。`);
        
        // 重置表单
        resetCreateForm();
        
        // 切换到数字人管理
        switchMenu('manage');
        
        // 开始轮询任务状态
        startTaskPolling(digitalHumanId, taskId, apiKey, 'heygen');
        
      } catch (error) {
        console.error('创建 HeyGen 数字人错误:', error);
        showLoading(false);
        alert('❌ 创建任务时发生错误：' + error.message);
      }
    }

    // 云雾数字人创建（基于统一数字人创建接口）
    async function createYunwuDigitalHuman(name, desc, script) {
      const apiKey = getYunwuApiKey();

      if (!apiKey) {
        alert('请先配置 云雾 API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"保存配置"。');
        return;
      }

      // 云雾可灵数字人：必须提供音频（规范要求 audio_id 与 sound_file 二选一必填）
      const hasAudio = !!(selectedAudioFile || recordedAudioBlob);
      if (!hasAudio) {
        alert('云雾可灵数字人必须提供音频。请返回步骤2上传或录制音频文件。\n\n支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
        return;
      }

      showLoading(true, '正在创建云雾数字人...');

      try {
        // 获取图片URL（需要转换为纯base64格式）
        let imageUrl = null;

        // 优先使用上传的视频文件中的帧
        if (extractedFrames && extractedFrames.length > 0) {
          const selectedFrame = extractedFrames.find(f => f.id === selectedFrameId) || extractedFrames[0];
          if (selectedFrame && selectedFrame.dataUrl) {
            // 移除data URL前缀，只保留base64数据
            imageUrl = selectedFrame.dataUrl.includes(',') ? selectedFrame.dataUrl.split(',')[1] : selectedFrame.dataUrl;
            console.log('✅ 图片已从视频帧提取，大小:', (imageUrl.length / 1024).toFixed(2), 'KB', '格式: Base64');
          }
        }

        // 如果没有帧缩略图，尝试使用上传的图片文件
        if (!imageUrl && selectedVideoFile) {
          // 如果上传的是图片文件，直接使用
          if (selectedVideoFile.type && selectedVideoFile.type.startsWith('image/')) {
            console.log('📷 开始转换图片文件为 base64，文件类型:', selectedVideoFile.type, '文件大小:', (selectedVideoFile.size / 1024).toFixed(2), 'KB');
            imageUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                // 移除data URL前缀，只保留base64数据
                const dataUrl = reader.result;
                const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                console.log('✅ 图片文件已转换为 base64，大小:', (base64.length / 1024).toFixed(2), 'KB', '格式:', selectedVideoFile.type, 'Base64长度:', base64.length);
                resolve(base64);
              };
              reader.onerror = (error) => {
                console.error('❌ 图片文件转换失败:', error);
                reject(error);
              };
              reader.readAsDataURL(selectedVideoFile);
            });
          }
        }

        // 如果还没有图片，尝试使用模板预览图
        if (!imageUrl && typeof selectedTemplatePreviewImage !== 'undefined' && selectedTemplatePreviewImage) {
          // 如果模板预览图是data URL，也需要移除前缀
          const originalLength = selectedTemplatePreviewImage.length;
          imageUrl = selectedTemplatePreviewImage.includes(',') 
            ? selectedTemplatePreviewImage.split(',')[1] 
            : selectedTemplatePreviewImage;
          console.log('✅ 图片已从模板预览图提取，原始大小:', (originalLength / 1024).toFixed(2), 'KB', 'Base64大小:', (imageUrl.length / 1024).toFixed(2), 'KB');
        }

        if (!imageUrl) {
          console.error('❌ 图片验证失败: 未找到图片');
          showLoading(false);
          alert('请先在步骤2中上传一张数字人头像图片。\n\n提示：云雾数字人需要一张清晰的正面或半侧面人物照片。');
          return;
        }
        
        // 验证图片base64格式
        if (imageUrl.trim().length === 0) {
          console.error('❌ 图片验证失败: base64为空');
          showLoading(false);
          alert('图片base64编码为空，请重新上传图片。');
          return;
        }
        
        console.log('✅ 图片准备完成，最终大小:', (imageUrl.length / 1024).toFixed(2), 'KB', 'Base64长度:', imageUrl.length);

        // 处理音频文件（如果有）
        let audioFileBase64 = null;
        if (hasAudio) {
          const audioFile = selectedAudioFile || recordedAudioBlob;
          if (audioFile) {
            // 检查音频格式（云雾可灵数字人要求：.mp3/.wav/.m4a/.aac）
            const audioType = audioFile.type || '';
            const isWebm = audioType.includes('webm') || (audioFile.name && audioFile.name.toLowerCase().endsWith('.webm'));
            
            if (isWebm) {
              showLoading(false);
              alert('录制的音频格式（WebM）不支持。\n\n请使用以下方式之一：\n1. 上传音频文件（.mp3/.wav/.m4a/.aac）\n2. 使用支持格式的录音工具录制后上传');
              return;
            }
            
            // 验证文件大小（≤5MB）
            if (audioFile.size > 5 * 1024 * 1024) {
              showLoading(false);
              alert(`音频文件过大（${(audioFile.size / 1024 / 1024).toFixed(2)} MB）。\n\n请上传 ≤5MB 的音频文件。`);
              return;
            }
            
            try {
              audioFileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  // 提取纯base64数据（移除data URL前缀）
                  const dataUrl = reader.result;
                  if (!dataUrl || dataUrl.trim().length === 0) {
                    reject(new Error('音频文件base64转换失败：结果为空'));
                    return;
                  }
                  
                  // 提取base64部分
                  let base64 = dataUrl;
                  if (dataUrl.includes(',')) {
                    base64 = dataUrl.split(',')[1];
                  }
                  
                  // 验证base64格式
                  if (!base64 || base64.trim().length === 0) {
                    reject(new Error('音频文件base64转换失败：base64数据为空'));
                    return;
                  }
                  
                  // 清理base64字符串（移除可能的空白字符）
                  base64 = base64.replace(/[\s\n\r]/g, '');
                  
                  // 验证base64字符集
                  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
                    reject(new Error('音频文件base64格式无效：包含非法字符'));
                    return;
                  }
                  
                  // 返回完整的data URL（后端会提取纯base64部分）
                  resolve(dataUrl);
                };
                reader.onerror = (error) => {
                  reject(new Error('读取音频文件失败：' + (error.message || '未知错误')));
                };
                reader.readAsDataURL(audioFile);
              });
              console.log('音频文件已转换为 base64，大小:', (audioFileBase64.length / 1024 / 1024).toFixed(2), 'MB', '格式:', audioType, 'data URL:', audioFileBase64.substring(0, 50) + '...');
            } catch (error) {
              console.error('转换音频文件失败:', error);
              showLoading(false);
              alert('⚠️ 音频文件转换失败，请重新上传或录制音频文件');
              return;
            }
          }
        }

        // 验证请求参数
        if (!imageUrl) {
          showLoading(false);
          alert('❌ 缺少必需参数：数字人头像图片\n\n请确保在步骤2中上传了数字人头像图片。');
          return;
        }
        
        if (!audioFileBase64) {
          showLoading(false);
          alert('❌ 缺少必需参数：音频文件\n\n云雾数字人必须提供音频，请：\n1. 在步骤2中上传音频文件\n2. 或使用实时录制功能录制音频');
          return;
        }
        
        // 详细记录请求参数
        const requestPayload = {
          provider: 'yunwu',
          apiKey,
          imageUrl,
          text: script || '数字人视频',
          prompt: script || '数字人视频生成',
          audioFile: audioFileBase64,
          name,
          description: desc,
          mode: 'std'
        };
        
        console.log('=== 发送创建请求 ===');
        console.log('请求参数摘要:', {
          provider: requestPayload.provider,
          hasApiKey: !!requestPayload.apiKey,
          apiKeyLength: requestPayload.apiKey ? requestPayload.apiKey.length : 0,
          hasImageUrl: !!requestPayload.imageUrl,
          imageUrlType: typeof requestPayload.imageUrl,
          imageUrlLength: requestPayload.imageUrl ? String(requestPayload.imageUrl).length : 0,
          imageUrlPreview: requestPayload.imageUrl ? String(requestPayload.imageUrl).substring(0, 50) + '...' : '无',
          hasAudioFile: !!requestPayload.audioFile,
          audioFileType: typeof requestPayload.audioFile,
          audioFileLength: requestPayload.audioFile ? String(requestPayload.audioFile).length : 0,
          audioFilePreview: requestPayload.audioFile ? String(requestPayload.audioFile).substring(0, 50) + '...' : '无',
          audioFileStartsWithData: requestPayload.audioFile ? String(requestPayload.audioFile).startsWith('data:') : false,
          text: requestPayload.text,
          prompt: requestPayload.prompt,
          name: requestPayload.name,
          description: requestPayload.description,
          mode: requestPayload.mode
        });
        
        const response = await fetch(buildApiUrl('/api/digital-human/create'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        // ✅ 增强错误处理
        if (!response.ok) {
          showLoading(false);
          let errorMessage = '服务器错误';
          let errorData = null;
          
          try {
            const errorText = await response.text();
            console.error('=== 服务器错误响应 ===');
            console.error('HTTP状态码:', response.status, response.statusText);
            console.error('响应文本:', errorText);
            
            try {
              errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorText.substring(0, 200);
              console.error('解析后的错误数据:', errorData);
            } catch {
              errorMessage = errorText.substring(0, 200) || `HTTP ${response.status} ${response.statusText}`;
              console.error('无法解析JSON，使用原始文本');
            }
          } catch (e) {
            errorMessage = `HTTP ${response.status} ${response.statusText}`;
            console.error('读取错误响应失败:', e);
          }
          // ✅ 特殊处理：配额不足错误
          if (response.status === 403 || /配额不足|余额不足|quota/i.test(errorMessage)) {
            // 尝试解析JSON错误响应
            try {
              const errorData = JSON.parse(errorMessage);
              if (errorData.message) {
                alert(errorData.message.replace(/\n\n/g, '\n'));
              } else {
                alert('❌ 账号配额不足\n\n请访问 https://yunwu.ai/topup 充值余额后重试。');
              }
            } catch {
              alert('❌ 账号配额不足\n\n请访问 https://yunwu.ai/topup 充值余额后重试。\n\n错误详情：' + errorMessage);
            }
          } else if (response.status === 400) {
            // ✅ 使用统一的错误处理函数
            if (isTokenTypeErrorResponse(errorData)) {
              handleTokenTypeError(errorData);
            } else {
              // 其他参数错误
              alert('❌ 参数错误：' + errorMessage + '\n\n请检查：\n1. 是否上传了数字人头像图片\n2. 是否上传了音频文件\n3. 文件格式是否正确');
            }
          } else {
            // 使用统一的错误处理函数处理其他错误
            handleApiError(errorData, (err) => {
              alert('❌ 创建任务失败：' + (err?.message || errorMessage));
            });
          }
          console.error('服务器错误响应:', response.status, errorMessage);
          return;
        }
        
        const contentType = response.headers.get('content-type') || '';
        let result;

        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          showLoading(false);
          alert('❌ 服务器返回了非 JSON 格式的响应。请检查服务器配置。');
          return;
        }

        if (!result.success) {
          showLoading(false);
          
          // ✅ 使用统一的错误处理函数
          handleApiError(result, (err) => {
            alert('❌ 创建任务失败：' + (err?.message || '未知错误'));
          });
          
          return;
        }

        const taskId = result.taskId || result.id || result.data?.id || result.data?.task_id || result.data?.request_id || null;
        if (!taskId) {
          showLoading(false);
          console.error('云雾数字人未返回任务ID:', {
            result,
            resultKeys: Object.keys(result || {}),
            dataKeys: result.data ? Object.keys(result.data) : []
          });
          alert('❌ 创建任务失败：服务器未返回任务ID。\n\n响应数据：' + JSON.stringify(result).substring(0, 300));
          return;
        }
        const altTaskId = result.altTaskId || result.data?.request_id || null;

        console.log('云雾数字人任务创建成功，任务ID:', taskId, altTaskId ? '备用ID: ' + altTaskId : '', '完整响应:', result);

        const digitalHumanId = Date.now().toString();

        const digitalHuman = {
          id: digitalHumanId,
          name,
          description: desc,
          script: hasAudio ? '(使用音频文件)' : script,
          platform: 'yunwu',
          taskId: taskId,
          ...(altTaskId ? { altTaskId } : {}),
          status: result.status || 'processing',
          progress: 0,
          videoUrl: result.videoUrl || null,
          thumbnail: imageUrl,
          hasAudio: hasAudio,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };

        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        digitalHumans.unshift(digitalHuman);
        if (digitalHumans.length > 50) digitalHumans.length = 50;
        localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));

        showLoading(false);

        alert('✅ 云雾数字人创建任务已提交！\n\n任务正在后台处理中，您可以在"数字人管理"中查看进度。\n\n任务ID: ' + taskId);

        // 重置表单并切换到管理面板
        resetCreateForm();
        switchMenu('manage');

        // 启动统一任务轮询（云雾首次延迟 15s，便于任务在云端可查；并传 altTaskId 作备用查询）
        startTaskPolling(digitalHumanId, taskId, apiKey, 'yunwu', altTaskId);
      } catch (error) {
        console.error('创建 云雾 数字人错误:', error);
        showLoading(false);
        alert('❌ 创建任务时发生错误：' + error.message);
      }
    }
    
    // 开始轮询任务状态（支持 HeyGen / 云雾）
    // altId：云雾备用任务 ID（如 request_id），查询失败时会由后端用其重试
    function startTaskPolling(digitalHumanId, taskId, apiKey, provider = 'heygen', altId = null) {
      // 如果已有轮询，先清除（可能是 setTimeout 或 setInterval 的 id）
      if (taskPollingIntervals.has(digitalHumanId)) {
        const existing = taskPollingIntervals.get(digitalHumanId);
        if (existing != null) { clearTimeout(existing); clearInterval(existing); }
        taskPollingIntervals.delete(digitalHumanId);
      }

      const taskUrl = () => {
        let url = buildApiUrl(`/api/digital-human/task/${provider}/${taskId}?apiKey=${encodeURIComponent(apiKey)}`);
        if (provider === 'yunwu' && altId && String(altId).trim() !== String(taskId)) {
          url += '&altId=' + encodeURIComponent(String(altId).trim());
        }
        return url;
      };
      
      let pollCount = 0;
      const maxPolls = 60;
      let consecutiveFatal = 0; // 重大故障（如任务不存在）连续次数，出现即停止

      // 统一：停止轮询并标记失败（超时、任务不存在、连续失败等）
      const stopPollingAndFail = (errorMsg) => {
        const cur = taskPollingIntervals.get(digitalHumanId);
        if (cur != null) { clearTimeout(cur); clearInterval(cur); }
        taskPollingIntervals.delete(digitalHumanId);
        updateTaskStatus(digitalHumanId, 'failed', 0, null, errorMsg);
        if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
          loadDigitalHumans();
        }
      };

      const runPoll = async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          stopPollingAndFail('任务超时（10分钟仍未完成），已判定失败');
          return;
        }

        try {
          const response = await fetch(taskUrl());

          const contentType = response.headers.get('content-type') || '';
          let result;

          if (contentType.includes('application/json')) {
            result = await response.json();
          } else {
            const text = await response.text();
            console.error('服务器返回非JSON响应:', text.substring(0, 200));
            return;
          }

          if (result.success) {
            consecutiveFatal = 0; // 成功则重置
            const rawStatus = (result.status || '').toString().toLowerCase();
            const status =
              (rawStatus === 'succeed' || rawStatus === 'succeeded' || rawStatus === 'success' || rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'finish' || rawStatus === 'finished')
                ? 'completed'
                : (rawStatus === 'fail' || rawStatus === 'failed' || rawStatus === 'error')
                  ? 'failed'
                  : (result.status || 'processing');
            const progress = result.progress || 0;
            const videoUrl = result.videoUrl || result.data?.video_url;
            const error = result.error;

            updateTaskStatus(digitalHumanId, status, progress, videoUrl, error);

            if (status === 'completed' || status === 'failed') {
              const cur = taskPollingIntervals.get(digitalHumanId);
              if (cur != null) { clearTimeout(cur); clearInterval(cur); }
              taskPollingIntervals.delete(digitalHumanId);
              if (status === 'completed') {
                if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
                  loadDigitalHumans();
                }
              } else if (status === 'failed') {
                const isFatalError = error && (
                  error.includes('Insufficient credit') ||
                  error.includes('余额不足') ||
                  error.includes('MOVIO_PAYMENT_INSUFFICIENT_CREDIT') ||
                  error.includes('unauthorized') ||
                  error.includes('权限') ||
                  error.includes('invalid') ||
                  error.includes('forbidden')
                );
                if (isFatalError) {
                  updateTaskStatus(digitalHumanId, 'failed', 0, null, error);
                }
                const errorMsg = error || '任务失败，原因未知';
                console.error('任务失败:', { digitalHumanId, taskId, error: errorMsg, isFatalError });
                if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
                  loadDigitalHumans();
                } else if (isFatalError) {
                  alert('❌ 数字人创建失败\n\n任务ID: ' + taskId + '\n错误信息: ' + errorMsg + '\n\n请前往"数字人管理"查看详细信息。');
                }
              }
            }
          } else {
            const msg = (result.message || '').toLowerCase();
            const isTaskNotExist = /task.*not.*exist|任务不存在|task_not_exist/i.test(msg);
            if (isTaskNotExist) {
              consecutiveFatal++;
              console.error('重大故障（任务不存在），停止轮询:', { digitalHumanId, taskId, error: result.message });
              stopPollingAndFail('任务不存在：' + (result.message || 'task_not_exist'));
              return;
            }
            consecutiveFatal = 0;
            console.error('查询任务状态失败:', { digitalHumanId, taskId, error: result.message });
            if (pollCount > 10 && pollCount % 5 === 0) {
              console.error('连续多次失败，停止轮询:', { digitalHumanId, taskId });
              stopPollingAndFail('查询状态失败: ' + (result.message || '未知错误'));
            }
          }
        } catch (err) {
          console.error('轮询任务状态错误:', err);
        }
      };

      if (provider === 'yunwu') {
        // 云雾创建后需数秒才可查询，首次轮询延迟 15s，之后每 10s
        const timeoutId = setTimeout(() => {
          runPoll();
          const intervalId = setInterval(runPoll, 10000);
          taskPollingIntervals.set(digitalHumanId, intervalId);
        }, 15000);
        taskPollingIntervals.set(digitalHumanId, timeoutId);
      } else {
        runPoll();
        const intervalId = setInterval(runPoll, 10000);
        taskPollingIntervals.set(digitalHumanId, intervalId);
      }
    }

    // 手动停止该数字人的任务轮询（重大故障或用户主动停止时调用）
    function stopTaskPollingForDigitalHuman(digitalHumanId) {
      if (!taskPollingIntervals.has(digitalHumanId)) {
        return;
      }
      const cur = taskPollingIntervals.get(digitalHumanId);
      if (cur != null) {
        clearTimeout(cur);
        clearInterval(cur);
      }
      taskPollingIntervals.delete(digitalHumanId);
      updateTaskStatus(digitalHumanId, 'failed', 0, null, '用户已停止查询');
      if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
        loadDigitalHumans();
      }
    }

    // ========== 数字人管理：按任务ID查询视频（10秒轮询，10分钟超时） ==========
    const taskIdQueryKeyPrefix = 'taskIdQuery_';

    function normalizeTaskStatus(status) {
      const s = (status || '').toString().toLowerCase();
      if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].includes(s)) return 'completed';
      if (['fail', 'failed', 'error'].includes(s)) return 'failed';
      return status || 'processing';
    }

    function renderTaskIdQueryStatus(text, type = 'info') {
      const el = document.getElementById('taskIdQueryStatus');
      if (!el) return;
      const color =
        type === 'success' ? 'var(--success)' :
        type === 'error' ? 'var(--danger)' :
        type === 'warning' ? 'var(--warning)' :
        'var(--text-secondary)';
      el.style.color = color;
      el.textContent = text;
    }

    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderTaskIdQueryResult(result) {
      const container = document.getElementById('taskIdQueryResult');
      if (!container) return;

      if (!result) {
        container.innerHTML = '';
        return;
      }

      const status = normalizeTaskStatus(result.status);
      const progress = result.progress || 0;
      const videoUrl = result.videoUrl || result.data?.video_url || result.data?.url || '';
      const message = result.message || result.error || '';

      let html = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
          <div style="display:flex; justify-content: space-between; gap: 12px; align-items:center;">
            <div style="font-weight: 700;">状态：${status}</div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">进度：${progress || 0}</div>
          </div>
      `;

      if (message && status !== 'completed') {
        html += `<div style="margin-top: 8px; color: var(--text-secondary); white-space: pre-wrap;">${escapeHtml(message)}</div>`;
      }

      if (videoUrl) {
        html += `
          <div style="margin-top: 12px;">
            <div style="font-weight: 700; margin-bottom: 8px;">🎬 视频结果</div>
            <video controls style="width: 100%; border-radius: 12px; background: #000;" src="${videoUrl}"></video>
            <div style="margin-top: 8px; display:flex; gap: 10px; flex-wrap: wrap;">
              <a class="btn secondary" href="${videoUrl}" target="_blank" rel="noopener" style="text-decoration:none; padding: 10px 14px;">🔗 打开链接</a>
              <a class="btn primary" href="${videoUrl}" download style="text-decoration:none; padding: 10px 14px;">⬇️ 下载视频</a>
            </div>
            <div style="margin-top: 8px; color: var(--text-secondary); font-size: 0.85rem; word-break: break-all;">${videoUrl}</div>
          </div>
        `;
      }

      html += `</div>`;
      container.innerHTML = html;
    }

    function stopTaskIdQueryPolling() {
      try {
        const providerEl = document.getElementById('taskIdQueryProvider');
        const taskIdEl = document.getElementById('taskIdQueryInput');
        const provider = providerEl ? providerEl.value : 'yunwu';
        const taskId = taskIdEl ? taskIdEl.value.trim() : '';
        const key = `${taskIdQueryKeyPrefix}${provider}_${taskId || 'current'}`;
        if (taskPollingIntervals.has(key)) {
          clearInterval(taskPollingIntervals.get(key));
          taskPollingIntervals.delete(key);
        }
      } catch {}
      renderTaskIdQueryStatus('已停止查询', 'warning');
    }

    async function startTaskIdQueryPolling() {
      const providerEl = document.getElementById('taskIdQueryProvider');
      const taskIdEl = document.getElementById('taskIdQueryInput');
      const provider = providerEl ? providerEl.value : 'yunwu';
      const taskId = taskIdEl ? taskIdEl.value.trim() : '';

      if (!taskId) {
        renderTaskIdQueryStatus('请输入任务ID', 'error');
        return;
      }

      // 读取对应API Key
      const apiKey = provider === 'yunwu' ? getYunwuApiKey() : getHeyGenApiKey();
      if (!apiKey) {
        renderTaskIdQueryStatus(`未检测到 ${provider === 'yunwu' ? '云雾' : 'HeyGen'} API Key，请先在“创建数字人”页面配置并保存`, 'error');
        return;
      }

      const key = `${taskIdQueryKeyPrefix}${provider}_${taskId}`;
      // 如果已有轮询，先清除
      if (taskPollingIntervals.has(key)) {
        clearInterval(taskPollingIntervals.get(key));
        taskPollingIntervals.delete(key);
      }

      renderTaskIdQueryResult(null);
      renderTaskIdQueryStatus(`开始查询：${provider}/${taskId}（每10秒一次，最长10分钟）`, 'info');

      const pollIntervalMs = 10000;
      const maxPolls = 60; // 10分钟
      let pollCount = 0;

      const pollInterval = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          taskPollingIntervals.delete(key);
          renderTaskIdQueryStatus('查询超时（10分钟仍未完成），已判定失败', 'error');
          renderTaskIdQueryResult({ success: false, status: 'failed', message: '查询超时（10分钟）' });
          return;
        }

        try {
          const resp = await fetch(buildApiUrl(`/api/digital-human/task/${provider}/${taskId}?apiKey=${encodeURIComponent(apiKey)}`));
          const contentType = resp.headers.get('content-type') || '';
          let result;
          if (contentType.includes('application/json')) {
            result = await resp.json();
          } else {
            const text = await resp.text();
            renderTaskIdQueryStatus(`服务器返回非JSON响应 (HTTP ${resp.status})`, 'error');
            renderTaskIdQueryResult({ success: false, status: 'failed', message: text.substring(0, 200) });
            return;
          }

          if (!result.success) {
            // 继续轮询，但展示最新错误
            renderTaskIdQueryStatus(`查询中（第${pollCount}/${maxPolls}次）：${result.message || '查询失败'}`, 'warning');
            renderTaskIdQueryResult({ ...result, status: 'processing' });
            return;
          }

          const status = normalizeTaskStatus(result.status);
          renderTaskIdQueryResult(result);
          renderTaskIdQueryStatus(`查询中（第${pollCount}/${maxPolls}次）：状态=${status}${result.progress ? `，进度=${result.progress}` : ''}`, 'info');

          if (status === 'completed') {
            clearInterval(pollInterval);
            taskPollingIntervals.delete(key);
            renderTaskIdQueryStatus('✅ 查询成功：任务已完成', 'success');
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            taskPollingIntervals.delete(key);
            renderTaskIdQueryStatus('❌ 查询失败：任务失败', 'error');
          }
        } catch (e) {
          renderTaskIdQueryStatus('查询异常：' + (e && e.message ? e.message : String(e)), 'warning');
        }
      }, pollIntervalMs);
      taskPollingIntervals.set(key, pollInterval);
    }

    // 更新任务状态
    function updateTaskStatus(digitalHumanId, status, progress, videoUrl, error) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const index = digitalHumans.findIndex(dh => dh.id === digitalHumanId);
      
      if (index !== -1) {
        const oldStatus = digitalHumans[index].status;
        digitalHumans[index].status = status;
        digitalHumans[index].progress = progress;
        digitalHumans[index].updateDate = new Date().toISOString();
        
        if (videoUrl) {
          digitalHumans[index].videoUrl = videoUrl;
        }
        
        // 保存错误信息（如果有）
        if (error) {
          digitalHumans[index].error = error;
        } else if (status === 'failed' && !digitalHumans[index].error) {
          // 如果状态是失败但没有错误信息，设置默认错误信息
          digitalHumans[index].error = '任务失败，原因未知';
        }
        
        localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
        
        // 如果正在查看数字人管理页面，刷新显示
        if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
          loadDigitalHumans();
        }
        
        // 记录状态变化
        if (oldStatus !== status) {
          console.log('任务状态更新:', { digitalHumanId, oldStatus, newStatus: status, error });
        }
      }
    }
    
    function resetCreateForm() {
      currentStep = 1;
      selectedAvatar = '👩‍💼';
      uploadedMaterials = [];
      recordedVideoBlob = null;
      recordedAudioBlob = null;
      selectedVideoFile = null;
      selectedVideoUrl = null;
      extractedFrames = [];
      selectedFrameId = null;
      selectedAvatarId = null;
      selectedTemplatePreviewVideo = null;
      selectedTemplatePreviewImage = null;
      selectedTemplateName = null;
      currentPlatform = 'heygen';
      document.getElementById('scriptInput').value = '';
      document.getElementById('digitalHumanName').value = '';
      document.getElementById('digitalHumanDesc').value = '';
      updateStepIndicator(1);
      goToStep(1);
      
      // 重置平台标签激活状态与 API 配置显示
      document.querySelectorAll('.platform-tab').forEach(tab => {
        const platform = tab.getAttribute('data-platform');
        if (platform === 'heygen') {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      document.querySelectorAll('.api-config').forEach(config => {
        config.classList.add('hidden');
      });
      const heygenConfig = document.getElementById('heygenConfig');
      if (heygenConfig) {
        heygenConfig.classList.remove('hidden');
      }
      
      // 清理视频预览
      removeUploadedVideo();
      hideTemplatePreview();
    }
    
    // ========== 数字人管理 ==========
    
    function loadDigitalHumans() {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const container = document.getElementById('digitalHumanManageList');
      
      // 如果容器不存在，直接返回
      if (!container) {
        console.warn('找不到digitalHumanManageList容器，跳过加载数字人列表');
        return;
      }
      
      if (digitalHumans.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无数字人，请先创建数字人</div>';
        return;
      }
      
      container.innerHTML = digitalHumans.map(dh => {
        // 使用视频缩略图或视频预览
        let thumbnailUrl = dh.thumbnail;
        
        // 处理 thumbnail：确保 base64 数据有正确的 data: 前缀
        if (thumbnailUrl && !thumbnailUrl.startsWith('data:') && !thumbnailUrl.startsWith('http://') && !thumbnailUrl.startsWith('https://') && !thumbnailUrl.startsWith('blob:')) {
          // 检查是否是 base64 字符串（JPEG 通常以 /9j/ 开头，PNG 以 iVBORw0KGgo 开头）
          const isBase64 = /^[A-Za-z0-9+/=\s]+$/.test(thumbnailUrl.replace(/[\s\n\r]/g, ''));
          if (isBase64) {
            // 检测图片类型
            const cleanBase64 = thumbnailUrl.replace(/[\s\n\r]/g, '');
            let mimeType = 'image/jpeg'; // 默认 JPEG
            if (cleanBase64.startsWith('iVBORw0KGgo')) {
              mimeType = 'image/png';
            } else if (cleanBase64.startsWith('R0lGODlh') || cleanBase64.startsWith('R0lGODdh')) {
              mimeType = 'image/gif';
            } else if (cleanBase64.startsWith('UklGR')) {
              mimeType = 'image/webp';
            }
            thumbnailUrl = `data:${mimeType};base64,${cleanBase64}`;
          } else {
            // 如果不是有效的 URL 或 base64，使用默认头像
            thumbnailUrl = null;
          }
        }
        
        // 如果 thumbnail 太长（超过 100KB），使用默认头像避免性能问题
        if (thumbnailUrl && thumbnailUrl.startsWith('data:') && thumbnailUrl.length > 100000) {
          console.warn('缩略图过大，使用默认头像');
          thumbnailUrl = null;
        }
        
        const avatarDisplay = thumbnailUrl
          ? `<img src="${thumbnailUrl}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" onerror="this.parentElement.innerHTML='<span class=\\'history-avatar\\'>${dh.avatar || '👤'}</span>';">`
          : dh.videoUrl
          ? `<video src="${dh.videoUrl}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" muted></video>`
          : `<span class="history-avatar">${dh.avatar || '👤'}</span>`;
        
        // 状态显示（HeyGen 和 云雾平台）
        // 改进状态显示逻辑
let statusBadge = '';
if (dh.status) {
  if (dh.status === 'processing') {
    const progress = dh.progress || 0;
    const estimatedTime = dh.platform === 'heygen' ? '1-3分钟' : '2-5分钟';
    const isPolling = taskPollingIntervals.has(dh.id);
    
    statusBadge = `
      <div style="margin-top: 8px; padding: 12px; background: linear-gradient(135deg, rgba(24, 144, 255, 0.1), rgba(24, 144, 255, 0.05)); border: 1px solid var(--primary); border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 12px; height: 12px; background: var(--primary); border-radius: 50%; animation: blink 1s infinite;"></span>
            <span style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">处理中...</span>
          </div>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">${progress}%</span>
        </div>
        <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
          <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--primary), #52c41a); transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 0.75rem; color: var(--text-secondary);">
          <span>任务ID: ${dh.taskId ? dh.taskId.substring(0, 12) + '...' : 'N/A'}</span>
          <span>预估: ${estimatedTime}</span>
          ${isPolling ? `<button type="button" onclick="stopTaskPollingForDigitalHuman('${dh.id}')" style="padding: 4px 10px; background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.5); border-radius: 4px; font-size: 0.75rem; cursor: pointer;">⏹️ 停止查询</button>` : ''}
        </div>
      </div>
    `;
  } else if (dh.status === 'completed') {
    statusBadge = `
      <div style="margin-top: 8px; padding: 8px 12px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05)); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
        <span style="color: #22c55e; font-size: 1rem;">✅</span>
        <span style="font-size: 0.85rem; color: #22c55e; font-weight: 600;">已完成</span>
      </div>
    `;
  } else if (dh.status === 'failed') {
    // 简化的错误显示；云雾失败/任务不存在时可手动输入任务ID重新查询
    const errorPreview = dh.error ? dh.error.substring(0, 50) + (dh.error.length > 50 ? '...' : '') : '未知错误';
    const isTaskNotExist = dh.error && /任务不存在|task_not_exist/i.test(dh.error);
    const showManualTaskId = dh.platform === 'yunwu' && (isTaskNotExist || dh.status === 'failed');
    
    statusBadge = `
      <div style="margin-top: 8px; padding: 10px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
          <span style="color: #ef4444; font-size: 1rem;">❌</span>
          <span style="font-size: 0.85rem; color: #ef4444; font-weight: 600;">创建失败</span>
        </div>
        ${dh.error ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px;">${errorPreview}</div>` : ''}
        <div style="display:flex; gap: 8px; flex-wrap: wrap;">
          ${dh.taskId ? `
            <button onclick="requeryTaskStatus('${dh.id}')" style="padding: 4px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              <span>🔎</span>
              <span>重新查询</span>
            </button>
          ` : ''}
          <button onclick="retryTask('${dh.id}')" style="padding: 4px 12px; background: rgba(255,255,255,0.08); color: var(--text-primary); border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            <span>🔄</span>
            <span>重新创建</span>
          </button>
        </div>
        ${showManualTaskId ? `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 6px;">若云雾控制台有不同任务ID，可输入后重新查询：</div>
          <div style="display:flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <input type="text" id="requeryTaskId_${dh.id}" placeholder="输入云雾控制台任务ID" value="${(dh.taskId || '')}" style="flex:1; min-width: 140px; padding: 6px 10px; font-size: 0.8rem; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px; color: var(--text-primary);">
            <button onclick="requeryWithNewTaskId('${dh.id}')" style="padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; font-size: 0.75rem; cursor: pointer; white-space: nowrap;">用新ID查询</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }
}
        
        // 平台标识
        const platformBadge = dh.platform === 'heygen' 
          ? '<span style="font-size: 0.75rem; padding: 2px 6px; background: var(--primary); color: white; border-radius: 4px; margin-left: 8px;">HeyGen</span>'
          : dh.platform === 'yunwu'
          ? '<span style="font-size: 0.75rem; padding: 2px 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 4px; margin-left: 8px;">云雾AI</span>'
          : '';
        
        return `
        <div class="history-item">
          <div class="history-header">
            ${avatarDisplay}
            <div class="history-meta">
              <div class="history-date">${new Date(dh.createDate || Date.now()).toLocaleString()}</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <h4 style="margin-bottom: 8px; display: flex; align-items: center;">
              ${dh.name}
              ${platformBadge}
            </h4>
            <div class="history-script">${dh.description || '暂无描述'}</div>
            ${dh.videoFile ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">📹 ${dh.videoFile.name}</div>` : ''}
            ${statusBadge}
          </div>
          <div class="history-actions">
            ${dh.status === 'completed' || !dh.status || dh.status !== 'processing' ? `
              <button class="history-btn" onclick="previewDigitalHumanVideo('${dh.id}')">👁️ 预览</button>
              ${dh.videoUrl || dh.videoFile?.dataUrl ? `<button class="history-btn" onclick="downloadDigitalHumanVideo('${dh.id}')">📥 下载</button>` : ''}
            ` : ''}
            ${dh.taskId ? `<button class="history-btn" onclick="requeryTaskStatus('${dh.id}')">🔎 重新查询</button>` : ''}
            ${dh.status === 'processing' && taskPollingIntervals.has(dh.id) ? `<button class="history-btn" onclick="stopTaskPollingForDigitalHuman('${dh.id}')" style="color: var(--warning);">⏹️ 停止查询</button>` : ''}
            ${dh.platform === 'heygen' && dh.status === 'processing' ? `<button class="history-btn" onclick="refreshTaskStatus('${dh.id}')">🔄 刷新</button>` : ''}
            ${dh.platform === 'yunwu' && dh.status === 'processing' ? `<button class="history-btn" onclick="refreshYunwuTaskStatus('${dh.id}')">🔄 刷新</button>` : ''}
            <button class="history-btn" onclick="deleteDigitalHuman('${dh.id}')">🗑️ 删除</button>
          </div>
        </div>
      `;
      }).join('');
    }

    // 重新查询（不重新创建）：用已有 taskId 启动10秒轮询，10分钟超时失败
    function requeryTaskStatus(digitalHumanId) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === digitalHumanId);
      if (!dh || !dh.taskId) {
        alert('无法重新查询：缺少任务ID');
        return;
      }

      const provider = dh.platform || dh.provider || 'yunwu';
      const apiKey = provider === 'yunwu' ? getYunwuApiKey() : getHeyGenApiKey();
      if (!apiKey) {
        alert(`请先配置 ${provider === 'yunwu' ? '云雾' : 'HeyGen'} API Key`);
        return;
      }

      // 先把状态设为 processing，清理错误，触发UI更新
      updateTaskStatus(digitalHumanId, 'processing', dh.progress || 0, dh.videoUrl || null, null);
      // 启动统一轮询（云雾首次延迟 15s 并传 altTaskId）
      const altId = (provider === 'yunwu' && dh.altTaskId) ? dh.altTaskId : null;
      startTaskPolling(digitalHumanId, dh.taskId, apiKey, provider, altId);
      alert(`已开始重新查询任务状态：${provider}/${dh.taskId}\n\n每10秒查询一次，最长10分钟。`);
    }

    // 手动输入任务ID重新查询（云雾创建失败/任务不存在时用新ID重试）
    function requeryWithNewTaskId(digitalHumanId) {
      const inputEl = document.getElementById('requeryTaskId_' + digitalHumanId);
      const newTaskId = inputEl ? String(inputEl.value || '').trim() : '';
      if (!newTaskId) {
        alert('请输入云雾控制台中的任务ID');
        return;
      }
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === digitalHumanId);
      if (!dh) {
        alert('未找到该数字人记录');
        return;
      }
      if (dh.platform !== 'yunwu') {
        alert('仅云雾任务支持手动输入任务ID重新查询');
        return;
      }
      const apiKey = getYunwuApiKey();
      if (!apiKey) {
        alert('请先配置云雾 API Key');
        return;
      }
      const idx = digitalHumans.findIndex(d => d.id === digitalHumanId);
      if (idx !== -1) {
        digitalHumans[idx].taskId = newTaskId;
        digitalHumans[idx].altTaskId = null;
        digitalHumans[idx].error = null;
        localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
      }
      updateTaskStatus(digitalHumanId, 'processing', 0, null, null);
      startTaskPolling(digitalHumanId, newTaskId, apiKey, 'yunwu', null);
      loadDigitalHumans();
      alert('已用新任务ID开始查询：' + newTaskId + '\n\n每10秒查询一次，最长10分钟。');
    }
    
    // 刷新云雾任务状态
    async function refreshYunwuTaskStatus(digitalHumanId) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === digitalHumanId);
      
      if (!dh || dh.platform !== 'yunwu' || !dh.taskId) {
        alert('无法刷新：任务信息不完整');
        return;
      }
      
      const apiKey = getYunwuApiKey();
      
      if (!apiKey) {
        alert('请先配置 云雾 API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"保存配置"。');
        return;
      }
      
      try {
        const response = await fetch(buildApiUrl(`/api/digital-human/task/yunwu/${dh.taskId}?apiKey=${encodeURIComponent(apiKey)}`));
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          alert('服务器响应格式错误');
          return;
        }
        
        if (result.success) {
          updateTaskStatus(digitalHumanId, result.status, result.progress, result.videoUrl, result.error);
          alert('✅ 任务状态已刷新');
        } else {
          alert('❌ 刷新失败：' + (result.message || '未知错误'));
        }
      } catch (error) {
        console.error('刷新云雾任务状态错误:', error);
        alert('❌ 刷新失败：' + error.message);
      }
    }
    
    // 刷新任务状态
    async function refreshTaskStatus(digitalHumanId) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === digitalHumanId);
      
      if (!dh || dh.platform !== 'heygen' || !dh.taskId) {
        alert('无法刷新：任务信息不完整');
        return;
      }
      
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置 HeyGen API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"保存配置"。');
        return;
      }
      
      try {
        const response = await fetch(buildApiUrl(`/api/heygen/task/${dh.taskId}?apiKey=${encodeURIComponent(apiKey)}`));
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          alert('服务器返回了非 JSON 格式的响应。请检查服务器配置。');
          return;
        }
        
        if (result.success) {
          updateTaskStatus(digitalHumanId, result.status, result.progress, result.videoUrl, result.error);
          loadDigitalHumans();
          
          if (result.status === 'completed') {
            alert('✅ 任务已完成！');
          } else if (result.status === 'failed') {
            alert('❌ 任务失败：' + (result.error || '未知错误'));
          } else {
            alert('任务状态已更新：' + (result.progress || 0) + '%');
          }
        } else {
          alert('刷新失败：' + result.message);
        }
      } catch (error) {
        console.error('刷新任务状态错误:', error);
        alert('刷新失败：' + error.message);
      }
    }
    
    // 重试 HeyGen 任务
    async function retryHeyGenTask(digitalHumanId) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === digitalHumanId);
      
      if (!dh || dh.platform !== 'heygen') {
        alert('无法重试：不是 HeyGen 数字人');
        return;
      }
      
      if (!confirm('确定要重新创建这个数字人吗？')) {
        return;
      }
      
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置 HeyGen API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"保存配置"。');
        return;
      }
      
      showLoading(true, '正在重新创建任务...');
      
      try {
        const response = await fetch(buildApiUrl('/api/heygen/video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            avatarId: 'default',
            text: dh.script,
            voiceId: dh.voice || null
          })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应。请检查服务器配置。');
        }
        
        if (!result.success) {
          showLoading(false);
          alert('❌ 重试失败：' + result.message);
          return;
        }
        
        const taskId = result.data?.video_id || result.data?.id || null;
        if (!taskId) {
          showLoading(false);
          alert('❌ 重试失败：未返回任务ID（video_id），无法查询状态。');
          return;
        }
        
        const index = digitalHumans.findIndex(d => d.id === digitalHumanId);
        if (index !== -1) {
          digitalHumans[index].taskId = taskId;
          digitalHumans[index].status = 'processing';
          digitalHumans[index].progress = 0;
          digitalHumans[index].error = null;
          digitalHumans[index].updateDate = new Date().toISOString();
          localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
        }
        
        showLoading(false);
        alert('✅ 任务已重新提交！正在后台处理中...');
        
        startTaskPolling(digitalHumanId, taskId, apiKey);
        loadDigitalHumans();
        
      } catch (error) {
        console.error('重试任务错误:', error);
        showLoading(false);
        alert('❌ 重试失败：' + error.message);
      }
    }
    // ========== 任务重试 ==========

async function retryTask(digitalHumanId) {
  const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
  const dh = digitalHumans.find(d => d.id === digitalHumanId);
  
  if (!dh) {
    alert('数字人不存在');
    return;
  }
  
  if (!confirm(`确定要重新创建数字人 "${dh.name}" 吗？`)) {
    return;
  }
  
  showLoading(true, '正在重新创建任务...');
  
  try {
    if (dh.platform === 'heygen') {
      await retryHeyGenTask(dh);
    } else if (dh.platform === 'yunwu') {
      await retryYunwuTask(dh);
    } else {
      throw new Error('不支持的平台');
    }
  } catch (error) {
    console.error('重试任务错误:', error);
    showLoading(false);
    alert('❌ 重试失败：' + error.message);
  }
}


    function previewDigitalHumanVideo(id) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === id);
      
      if (!dh) {
        alert('数字人不存在');
        return;
      }
      
      if (dh.videoUrl || dh.videoFile?.dataUrl) {
        let videoUrl = dh.videoUrl || dh.videoFile.dataUrl;
        
        // 处理纯 base64 字符串：如果 videoUrl 是纯 base64（没有 data: 前缀），转换为 data URL
        if (!videoUrl.startsWith('data:') && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !videoUrl.startsWith('blob:')) {
          // 假设是视频格式，尝试检测是否为 base64
          if (/^[A-Za-z0-9+/=]+$/.test(videoUrl.replace(/[\s\n\r]/g, ''))) {
            // 是 base64 字符串，转换为 data URL（假设是 mp4 格式）
            videoUrl = `data:video/mp4;base64,${videoUrl}`;
          }
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
          <div style="position: relative; max-width: 90%; max-height: 90%; background: var(--bg-primary); border-radius: 12px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="color: var(--text-primary); margin: 0;">${dh.name || '数字人视频预览'}</h3>
              <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="background: var(--danger); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">✕ 关闭</button>
            </div>
            <video src="${videoUrl}" controls autoplay style="max-width: 100%; max-height: 70vh; border-radius: 8px; background: #000;"></video>
            <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: center;">
              <button onclick="downloadDigitalHumanVideo('${id}')" style="background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600;">📥 下载视频</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => {
          if (e.target === modal) modal.remove();
        };
      } else {
        alert('该数字人没有视频文件');
      }
    }
    
    // 下载数字人视频
    async function downloadDigitalHumanVideo(id) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = digitalHumans.find(d => d.id === id);
      
      if (!dh) {
        alert('数字人不存在');
        return;
      }
      
      let videoUrl = dh.videoUrl || dh.videoFile?.dataUrl;
      if (!videoUrl) {
        alert('该数字人没有视频文件');
        return;
      }
      
      // 处理纯 base64 字符串：如果 videoUrl 是纯 base64（没有 data: 前缀），转换为 data URL
      if (!videoUrl.startsWith('data:') && !videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !videoUrl.startsWith('blob:')) {
        // 假设是视频格式，尝试检测是否为 base64
        if (/^[A-Za-z0-9+/=]+$/.test(videoUrl.replace(/[\s\n\r]/g, ''))) {
          // 是 base64 字符串，转换为 data URL（假设是 mp4 格式）
          videoUrl = `data:video/mp4;base64,${videoUrl}`;
        }
      }
      
      try {
        // 如果是远程URL，尝试通过fetch下载（处理CORS）
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
          const response = await fetch(videoUrl);
          if (!response.ok) {
            throw new Error('下载失败');
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${dh.name || 'digital-human'}_${dh.id}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else if (videoUrl.startsWith('data:') || videoUrl.startsWith('blob:')) {
          // 如果是data URL或blob URL，直接下载
          const link = document.createElement('a');
          link.href = videoUrl;
          link.download = `${dh.name || 'digital-human'}_${dh.id}.mp4`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // 其他情况，尝试转换为 blob URL
          try {
            // 如果是 base64，先转换为 blob
            if (videoUrl.startsWith('data:')) {
              const response = await fetch(videoUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${dh.name || 'digital-human'}_${dh.id}.mp4`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } else {
              throw new Error('不支持的视频格式');
            }
          } catch (e) {
            throw new Error('无法处理视频URL');
          }
        }
      } catch (error) {
        console.error('下载视频失败:', error);
        // 如果下载失败，只有在是有效的 data URL 或 HTTP URL 时才尝试在新窗口打开
        if (videoUrl.startsWith('data:') || videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
          const newWindow = window.open(videoUrl, '_blank');
          if (!newWindow) {
            alert('无法自动下载，请右键点击视频选择"另存为"进行下载。\n\n提示：如果视频是 base64 格式，请尝试在预览窗口中右键保存。');
          } else {
            alert('已在新窗口打开视频，请右键点击视频选择"另存为"进行下载。');
          }
        } else {
          alert('无法下载视频：视频格式不支持或已损坏。\n\n请尝试在预览窗口中右键点击视频选择"另存为"。');
        }
      }
    }
    
    function deleteDigitalHuman(id) {
      if (!confirm('确定要删除这个数字人吗？')) return;
      
      let digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      digitalHumans = digitalHumans.filter(dh => dh.id !== id);
      localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
      
      loadDigitalHumans();
    }
    
    // ========== 作品管理 ==========
    
    function loadWorks() {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const container = document.getElementById('worksList');
      
      // 如果容器不存在，直接返回
      if (!container) {
        console.warn('找不到worksList容器，跳过加载作品列表');
        return;
      }
      
      if (works.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无作品</div>';
        return;
      }
      
      container.innerHTML = works.map(work => {
        const typeLabel = work.type === 'product' ? '🛒 商品推广' : '🎬 其他';
        const title = work.type === 'product' ? work.productName : work.title;
        
        return `
          <div class="history-item">
            <div class="history-header">
              <span class="history-avatar">${typeLabel}</span>
              <div class="history-meta">
                <div class="history-platform" style="background: ${work.status === 'ready' ? 'var(--success)' : 'var(--warning)'};">${work.status === 'ready' ? '已完成' : '处理中'}</div>
                <div class="history-date">${new Date(work.createDate).toLocaleString()}</div>
              </div>
            </div>
            <div class="history-script">${title}</div>
            <div class="history-actions">
              <button class="history-btn" onclick="playWork('${work.id}')">▶️ 播放</button>
              <button class="history-btn" onclick="downloadWork('${work.id}')">📥 下载</button>
              <button class="history-btn" onclick="deleteWork('${work.id}')">🗑️ 删除</button>
            </div>
          </div>
        `;
      }).join('');
    }
    
    function playWork(id) {
      alert('播放功能开发中...');
    }
    
    function downloadWork(id) {
      alert('下载功能开发中...');
    }
    
    function deleteWork(id) {
      if (!confirm('确定要删除这个作品吗？')) return;
      
      let works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      works = works.filter(w => w.id !== id);
      localStorage.setItem('cn_dh_works', JSON.stringify(works));
      
      loadWorks();
    }
    
    // ========== 通用功能 ==========
    
    // 更新字数统计
    function updateCharCount() {
      const text = document.getElementById('scriptInput').value;
      const count = text.length;
      const countEl = document.getElementById('charCount');
      
      countEl.textContent = `${count} / 500 字`;
      countEl.className = 'char-count';
      
      if (count > 500) {
        countEl.classList.add('error');
      } else if (count > 400) {
        countEl.classList.add('warning');
      }
    }
    
    // 更新滑块值
    function updateSliderValue(type) {
      const slider = document.getElementById(type + 'Slider');
      const valueEl = document.getElementById(type + 'Value');
      valueEl.textContent = slider.value;
    }
    
    // ========== HeyGen API ==========
    
    function saveHeyGenConfig() {
      const apiKey = document.getElementById('heygenApiKey').value.trim();
      
      if (!apiKey) {
        showStatus('heygenStatus', '请填写API Key', 'error');
        return;
      }
      
      try {
        localStorage.setItem('heygen_api_key', apiKey);
        showStatus('heygenStatus', '✅ 配置已保存（建议点击"测试连接"验证配置）', 'success');
      } catch (e) {
        console.warn('无法保存到 localStorage:', e);
        showStatus('heygenStatus', '⚠️ 配置已保存到输入框，但 localStorage 可能不可用', 'warning');
      }
    }
    
    async function testHeyGenApi() {
      const apiKey = document.getElementById('heygenApiKey').value.trim();
      
      if (!apiKey) {
        showStatus('heygenStatus', '请先填写API Key', 'error');
        return;
      }
      
      showStatus('heygenStatus', '⏳ 正在测试连接...', 'warning');
      
      try {
        const response = await fetch(buildApiUrl('/api/heygen/test'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey
          })
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('非JSON响应:', text.substring(0, 200));
          showStatus('heygenStatus', '❌ 服务器返回了非JSON响应，请检查服务器配置', 'error');
          return;
        }
        
        const result = await response.json();
        
        if (result.success) {
          localStorage.setItem('heygen_api_key', apiKey);
          localStorage.setItem('heygen_api_tested', 'true');
          localStorage.setItem('heygen_api_test_time', new Date().toISOString());
          showStatus('heygenStatus', '✅ ' + (result.message || '连接成功！API Key 验证通过'), 'success');
          
          // 测试成功后自动加载语音列表
          setTimeout(() => {
            loadHeyGenVoices();
          }, 500);
        } else {
          localStorage.removeItem('heygen_api_tested');
          showStatus('heygenStatus', '❌ 连接失败：' + (result.message || '未知错误'), 'error');
        }
      } catch (error) {
        console.error('HeyGen API测试错误:', error);
        if (error.message.includes('JSON')) {
          showStatus('heygenStatus', '❌ 服务器响应格式错误，请检查服务器配置', 'error');
        } else {
          showStatus('heygenStatus', '❌ 网络错误：' + error.message, 'error');
        }
      }
    }

    // ========== 云雾AI 文案模型 ==========
    
    function saveYunwuConfig() {
      const apiKey = document.getElementById('yunwuApiKey')?.value.trim();
      
      if (!apiKey) {
        showStatus('yunwuStatus', '请填写云雾 API Key', 'error');
        return;
      }
      
      try {
        localStorage.setItem('yunwu_api_key', apiKey);
        showStatus('yunwuStatus', '✅ 云雾 API Key 已保存（建议点击“测试连接”验证配置）', 'success');
      } catch (e) {
        console.warn('无法保存云雾 API Key 到 localStorage:', e);
        showStatus('yunwuStatus', '⚠️ 配置已保存到输入框，但 localStorage 可能不可用', 'warning');
      }
    }
    
    async function testYunwuApi() {
      const apiKeyInput = document.getElementById('yunwuApiKey');
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : getYunwuApiKey();
      
      if (!apiKey) {
        showStatus('yunwuStatus', '请先填写云雾 API Key', 'error');
        return;
      }
      
      showStatus('yunwuStatus', '⏳ 正在测试数字人API连接...', 'warning');
      
      try {
        const response = await fetch(buildApiUrl('/api/yunwu/test'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('云雾测试接口返回非JSON响应:', text.substring(0, 200));
          throw new Error('云雾测试接口返回了非 JSON 格式的响应');
        }
        
        if (result.success) {
          localStorage.setItem('yunwu_api_key', apiKey);
          localStorage.setItem('yunwu_api_tested', 'true');
          localStorage.setItem('yunwu_api_test_time', new Date().toISOString());
          showStatus('yunwuStatus', '✅ ' + (result.message || '云雾数字人API连接正常，可以用于创建数字人视频'), 'success');
        } else {
          localStorage.removeItem('yunwu_api_tested');
          
          // ✅ 使用统一的错误处理函数
          if (isTokenTypeErrorResponse(result)) {
            const tokenErrorMessage = result.message || 'API令牌类型错误';
            showStatus('yunwuStatus', '❌ ' + tokenErrorMessage, 'error');
            // 显示详细提示
            setTimeout(() => {
              handleTokenTypeError(result);
            }, 500);
          } else {
            showStatus('yunwuStatus', '❌ 云雾数字人API测试失败：' + (result.message || '未知错误'), 'error');
          }
        }
      } catch (error) {
        console.error('测试云雾API错误:', error);
        localStorage.removeItem('yunwu_api_tested');
        if (error.message.includes('JSON')) {
          showStatus('yunwuStatus', '❌ 服务器响应格式错误，请检查服务器配置', 'error');
        } else {
          showStatus('yunwuStatus', '❌ 网络错误：' + error.message, 'error');
        }
      }
    }
    
    // 暴露函数到全局作用域
    window.updateStep2ForPlatform = updateStep2ForPlatform;
    
    // 根据平台更新步骤2的内容
    function updateStep2ForPlatform() {
      const step2Content = document.getElementById('step2Content');
      if (!step2Content) return;
      
      // 更新平台说明
      const platformNotice = step2Content.querySelector('.platform-notice');
      if (platformNotice) {
        const noticeContent = platformNotice.querySelector('#platformNoticeContent') || platformNotice.querySelector('div[style*="flex: 1"]');
        if (noticeContent) {
          if (currentPlatform === 'heygen') {
            noticeContent.innerHTML = `
              <div style="font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 8px;">
                HeyGen 平台说明
              </div>
              <div style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.8;">
                <strong>系统将自动从 HeyGen 平台选择数字人形象进行视频生成。</strong><br>
                • HeyGen 平台提供 1287+ 种数字人形象供您选择<br>
                • 您可以从模板列表中选择一个数字人形象<br>
                • 也可以跳过选择，系统将自动选择默认形象<br>
                <br>
                <strong style="color: var(--warning);">⚠️ 注意：</strong>HeyGen API 不支持直接上传视频或音频文件。<br>
                如需使用自定义音频，需要通过 HeyGen 平台的 Upload Asset API 先上传，然后使用 asset_id。
              </div>
            `;
          } else if (currentPlatform === 'yunwu') {
            noticeContent.innerHTML = `
              <div style="font-size: 1.1rem; font-weight: 600; color: var(--primary); margin-bottom: 8px;">
                云雾数字人平台说明
              </div>
              <div style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.8;">
                <strong>云雾数字人支持图片转视频的数字人生成。</strong><br>
                • 请上传一张清晰的数字人头像图片<br>
                • 图片将作为数字人的形象参考<br>
                • 建议使用正面或半侧面的人物照片，分辨率建议 720p 以上
              </div>
            `;
          }
        }
      }
      
      // 根据平台显示/隐藏不同的选择方式，并更新上传区域提示与按钮
      const hintEl = document.getElementById('uploadSectionHintText');
      const acceptInput = document.getElementById('uploadFile');
      const confirmBtn = document.getElementById('uploadConfirmBtn');

      if (currentPlatform === 'heygen') {
        // ✅ HeyGen: 只显示模板选择，隐藏上传和录制功能（HeyGen API不支持直接上传视频/音频）
        document.getElementById('templateSelectionSection')?.style.setProperty('display', 'block');
        document.getElementById('uploadReferenceSection')?.style.setProperty('display', 'none');
        document.getElementById('recordSection')?.style.setProperty('display', 'none');
        // 隐藏上传和录制按钮
        document.getElementById('avatarModeUpload')?.style.setProperty('display', 'none');
        document.getElementById('avatarModeRecord')?.style.setProperty('display', 'none');
        // 确保模板按钮显示
        document.getElementById('avatarModeTemplate')?.style.setProperty('display', 'inline-block');
        // 显示HeyGen平台提示
        const heygenNotice = document.getElementById('heygenModeNotice');
        if (heygenNotice) heygenNotice.style.display = 'block';
        // 强制切换到模板模式
        if (currentAvatarMode !== 'template') switchAvatarMode('template');
        
        // 恢复HeyGen的视频要求卡片
        const videoRequirementCard = document.querySelector('#uploadReferenceSection > div > div:first-child > div[style*="background: rgba"]');
        if (videoRequirementCard) {
          const title = videoRequirementCard.querySelector('strong');
          const content = videoRequirementCard.querySelector('div[style*="font-size: 0.9rem"]');
          if (title) title.textContent = '视频要求';
          if (content) {
            content.innerHTML = `
              • <strong>时长：</strong>建议 10-60 秒<br>
              • <strong>内容：</strong>人物清晰可见，正面或半侧面为佳<br>
              • <strong>格式：</strong>MP4、WebM、MOV 等常见格式<br>
              • <strong>分辨率：</strong>建议 720p 以上
            `;
          }
        }
        
        // 恢复HeyGen的上传区域文本
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
          const uploadText = uploadArea.querySelector('.upload-text-large');
          const uploadHint = uploadArea.querySelector('.upload-hint');
          const uploadBtn = uploadArea.querySelector('button');
          if (uploadText) uploadText.textContent = '点击或拖拽视频到此处上传';
          if (uploadHint) uploadHint.textContent = '支持 MP4、WebM、MOV 格式';
          if (uploadBtn) uploadBtn.textContent = '选择视频文件';
        }
      } else if (currentPlatform === 'yunwu') {
        // 云雾可灵数字人：仅上传方式；必须同时上传图片/视频 + 音频（规范要求 audio_id 与 sound_file 二选一必填）
        document.getElementById('templateSelectionSection')?.style.setProperty('display', 'none');
        document.getElementById('uploadReferenceSection')?.style.setProperty('display', 'block');
        document.getElementById('recordSection')?.style.setProperty('display', 'none');
        document.getElementById('avatarModeTemplate')?.style.setProperty('display', 'none');
        document.getElementById('avatarModeRecord')?.style.setProperty('display', 'none');
        // 显示上传按钮
        document.getElementById('avatarModeUpload')?.style.setProperty('display', 'inline-block');
        // 隐藏HeyGen平台提示
        const heygenNotice = document.getElementById('heygenModeNotice');
        if (heygenNotice) heygenNotice.style.display = 'none';
        if (currentAvatarMode !== 'upload') switchAvatarMode('upload');
        
        // 更新提示文本
        if (hintEl) hintEl.innerHTML = '请<strong style="color: var(--primary);">上传头像图片或短视频</strong>（视频将提取首帧），并<strong style="color: var(--primary);">必须上传音频</strong>。<br>音频支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。';
        
        // 更新文件选择器
        if (acceptInput) acceptInput.setAttribute('accept', 'video/*,image/*');
        
        // 更新上传区域的文本
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
          const uploadText = uploadArea.querySelector('.upload-text-large');
          const uploadHint = uploadArea.querySelector('.upload-hint');
          const uploadBtn = uploadArea.querySelector('button');
          if (uploadText) uploadText.textContent = '点击或拖拽图片或视频到此处上传';
          if (uploadHint) uploadHint.textContent = '支持图片（JPG/PNG）或视频（MP4/WebM/MOV）格式';
          if (uploadBtn) uploadBtn.textContent = '选择图片/视频文件';
        }
        
        // 更新视频要求卡片（云雾平台显示图片/视频要求）
        const videoRequirementCard = document.querySelector('#uploadReferenceSection > div > div:first-child > div[style*="background: rgba"]');
        if (videoRequirementCard) {
          const title = videoRequirementCard.querySelector('strong');
          const content = videoRequirementCard.querySelector('div[style*="font-size: 0.9rem"]');
          if (title) title.textContent = '图片/视频要求';
          if (content) {
            content.innerHTML = `
              • <strong>图片：</strong>JPG、PNG 格式，人物清晰可见，正面或半侧面为佳<br>
              • <strong>视频：</strong>MP4、WebM、MOV 格式，建议 10-60 秒（将提取首帧）<br>
              • <strong>分辨率：</strong>建议 720p 以上
            `;
          }
        }
        
        // 更新确认按钮
        if (confirmBtn) confirmBtn.textContent = '✅ 确认使用此图片/视频和音频';
      }
    }
    
    // 根据平台更新步骤3的内容
    function updateStep3ForPlatform() {
      const step3Content = document.getElementById('step3Content');
      if (!step3Content) return;
      
      const scriptInputSection = document.getElementById('scriptInputSection');
      const yunwuAudioHint = document.getElementById('yunwuAudioHint');
      const audioSettingsSection = step3Content.querySelector('.section-title[style*="margin-top: 24px"]')?.parentElement;
      
      if (currentPlatform === 'yunwu') {
        // 云雾可灵数字人：必须提供音频，文案可选
        if (yunwuAudioHint) {
          yunwuAudioHint.style.display = 'block';
        }
        if (scriptInputSection) {
          const textarea = scriptInputSection.querySelector('#scriptInput');
          if (textarea) {
            textarea.placeholder = '（可选）文案仅作备注，生成以步骤2上传的音频为准。\n\n例如：大家好，欢迎来到我们的直播间！...';
          }
        }
        
        // 隐藏音频设置（云雾AI不使用这些设置）
        const audioSettingsSection = document.getElementById('audioSettingsSection');
        const audioSettingsTitle = Array.from(step3Content.querySelectorAll('.section-title')).find(
          title => title.textContent.includes('音频设置')
        );
        if (audioSettingsSection) {
          audioSettingsSection.style.display = 'none';
        }
        if (audioSettingsTitle) {
          audioSettingsTitle.style.display = 'none';
        }
      } else {
        // HeyGen: 隐藏云雾AI提示，显示音频设置
        if (yunwuAudioHint) {
          yunwuAudioHint.style.display = 'none';
        }
        if (scriptInputSection) {
          const textarea = scriptInputSection.querySelector('#scriptInput');
          if (textarea) {
            textarea.placeholder = '输入数字人要说的话...\n\n例如：大家好，欢迎来到我们的直播间！今天给大家带来超值好物...';
          }
        }
        // 显示音频设置（HeyGen使用）
        const audioSettingsSection = document.getElementById('audioSettingsSection');
        const audioSettingsTitle = Array.from(step3Content.querySelectorAll('.section-title')).find(
          title => title.textContent.includes('音频设置')
        );
        if (audioSettingsSection) {
          audioSettingsSection.style.display = 'block';
        }
        if (audioSettingsTitle) {
          audioSettingsTitle.style.display = 'block';
        }
      }
    }
    
    // 暴露函数到全局作用域
    window.updateStep3ForPlatform = updateStep3ForPlatform;
    
    // 加载 HeyGen Avatar 模板列表（支持分页和资源类型过滤）
    async function loadHeyGenAvatars(context = 'create', resetPage = true) {
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置并测试 HeyGen API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"测试连接"。');
        return;
      }
      
      // 根据上下文选择容器
      let containerId;
      if (context === 'create') {
        containerId = 'avatarTemplateGrid';
      } else if (context === 'recite') {
        containerId = 'reciteAvatarSelector';
      } else if (context === 'promote') {
        containerId = 'promoteAvatarSelector';
      } else {
        console.warn('未知的上下文:', context);
        return;
      }
      
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('找不到容器:', containerId);
        return;
      }
      
      // 重置分页（如果需要）
      if (resetPage) {
        currentPage = 1;
        displayedAvatars = pageSize; // 初始显示第一页的数量
      }
      
      // 显示加载状态
      const loadingState = document.getElementById('avatarLoadingState');
      if (loadingState) {
        loadingState.style.display = 'block';
        loadingState.innerHTML = `
          <div style="font-size: 2.5rem; margin-bottom: 12px; animation: pulse 2s infinite;">⏳</div>
          <div style="font-size: 0.9rem; margin-bottom: 8px;">正在加载模板...</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7;">请稍候，正在从 HeyGen 平台获取数字人模板</div>
        `;
      }
      
      // 更新刷新按钮状态
      const refreshBtn = document.getElementById('refreshAvatarBtn');
      const refreshIcon = document.getElementById('refreshAvatarIcon');
      const refreshText = document.getElementById('refreshAvatarText');
      if (refreshBtn) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        if (refreshIcon) refreshIcon.innerHTML = '<span class="loading-spinner">🔄</span>';
        if (refreshText) refreshText.textContent = '加载中...';
      }
      
      try {
        // 构建API请求URL，添加资源类型参数
        let apiUrl = `/api/heygen/avatars?apiKey=${encodeURIComponent(apiKey)}`;
        if (context === 'create') {
          apiUrl += `&resourceType=video`;
        }
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应');
        }
        
        if (result.success && result.avatars && result.avatars.length > 0) {
          // 缓存 avatar 列表
          heygenAvatarsCache = result.avatars;
          
          // 初始化显示数量（如果还没有设置）
          if (displayedAvatars === 0) {
            displayedAvatars = pageSize;
          }
          
          // 使用新的渲染函数
          renderAvatars();
          
          console.log('已加载', result.avatars.length, '个 avatar 模板');
          
          // 恢复刷新按钮状态
          if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            if (refreshIcon) refreshIcon.textContent = '🔄';
            if (refreshText) refreshText.textContent = '刷新模板';
          }
        } else {
          container.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); padding: 20px; grid-column: 1 / -1;">
              <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
              <div style="font-size: 0.9rem; margin-bottom: 12px; color: var(--warning);">${result.message || '无法加载模板列表'}</div>
              <button class="btn secondary" onclick="loadHeyGenAvatars('${context}')" style="padding: 8px 16px; font-size: 0.85rem;">
                🔄 重试
              </button>
            </div>
          `;
          
          // 恢复刷新按钮状态
          if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            if (refreshIcon) refreshIcon.textContent = '🔄';
            if (refreshText) refreshText.textContent = '刷新模板';
          }
        }
      } catch (error) {
        console.error('加载 avatar 模板错误:', error);
        
        let errorMessage = error.message || '未知错误';
        if (error.message && error.message.includes('超时')) {
          errorMessage = '请求超时，请稍后重试';
        } else if (error.message && error.message.includes('fetch')) {
          errorMessage = '网络请求失败，请检查网络连接';
        }
        
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 20px; grid-column: 1 / -1;">
            <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
            <div style="font-size: 0.9rem; margin-bottom: 12px; color: var(--warning);">${errorMessage}</div>
            <button class="btn secondary" onclick="loadHeyGenAvatars('${context}')" style="padding: 8px 16px; font-size: 0.85rem;">
              🔄 重试
            </button>
          </div>
        `;
        
        // 恢复刷新按钮状态
        if (refreshBtn) {
          refreshBtn.classList.remove('loading');
          refreshBtn.disabled = false;
          if (refreshIcon) refreshIcon.textContent = '🔄';
          if (refreshText) refreshText.textContent = '刷新模板';
        }
      }
    }
    
    // 选择 avatar 模板
    function selectAvatarTemplate(avatarId, context, avatarData = null) {
      // 清除上传的文件和录制的内容（互斥逻辑）
      clearUploadedFiles();
      clearRecordedFiles();
      
      // 移除之前的选中状态
      document.querySelectorAll('.avatar-template-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // 添加选中状态
      const selectedItem = document.querySelector(`[data-avatar-id="${avatarId}"]`);
      if (selectedItem) {
        selectedItem.classList.add('selected');
        
        // 如果没有传入avatarData，尝试从data属性获取
        if (!avatarData) {
          const dataAttr = selectedItem.getAttribute('data-avatar-data');
          if (dataAttr) {
            try {
              avatarData = JSON.parse(dataAttr);
            } catch (e) {
              console.warn('解析avatar数据失败:', e);
            }
          }
        }
      }
      
      // 保存选中的 avatar ID
      if (context === 'create') {
        selectedAvatarId = avatarId;
        
        // 保存模板预览 URL，供步骤3「数字人视频形象」展示
        if (avatarData) {
          selectedTemplatePreviewVideo = avatarData.preview_video_url || avatarData.video_url || avatarData.preview_video || null;
          selectedTemplatePreviewImage = avatarData.preview_image_url || avatarData.preview_url || null;
          selectedTemplateName = avatarData.avatar_name || avatarData.name || '未知模板';
          showTemplatePreview(avatarData);
        } else {
          selectedTemplatePreviewVideo = null;
          selectedTemplatePreviewImage = null;
          selectedTemplateName = null;
          // 如果没有数据，尝试从缓存中查找
          if (heygenAvatarsCache && Array.isArray(heygenAvatarsCache)) {
            const foundAvatar = heygenAvatarsCache.find(a => 
              (a.avatar_id || a.id) === avatarId
            );
            if (foundAvatar) {
              selectedTemplatePreviewVideo = foundAvatar.preview_video_url || foundAvatar.video_url || foundAvatar.preview_video || null;
              selectedTemplatePreviewImage = foundAvatar.preview_image_url || foundAvatar.preview_url || null;
              selectedTemplateName = foundAvatar.avatar_name || foundAvatar.name || '未知模板';
              showTemplatePreview(foundAvatar);
            } else {
              selectedTemplatePreviewVideo = null;
              selectedTemplatePreviewImage = null;
              selectedTemplateName = null;
              hideTemplatePreview();
            }
          } else {
            selectedTemplatePreviewVideo = null;
            selectedTemplatePreviewImage = null;
            selectedTemplateName = null;
            hideTemplatePreview();
          }
        }
      } else if (context === 'recite') {
        selectedAvatarForRecite = avatarId;
      } else if (context === 'promote') {
        selectedAvatarForPromote = avatarId;
      }
      
      console.log('已选择 avatar:', avatarId, '上下文:', context);
    }
    
    // 显示模板预览
    function showTemplatePreview(avatarData) {
      const previewSection = document.getElementById('templatePreviewSection');
      const previewContent = document.getElementById('templatePreviewContent');
      
      if (!previewSection || !previewContent) {
        return;
      }
      
      const avatarName = avatarData.avatar_name || avatarData.name || '未知模板';
      const previewVideoUrl = avatarData.preview_video_url || avatarData.video_url || avatarData.preview_video || '';
      const previewImageUrl = avatarData.preview_image_url || avatarData.preview_url || '';
      
      // 显示预览区域
      previewSection.style.display = 'block';
      
      // 构建预览内容
      let previewHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
            ${avatarName}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            模板ID: ${avatarData.avatar_id || avatarData.id || '未知'}
          </div>
        </div>
      `;
      
      // 如果有预览视频，优先显示视频
      if (previewVideoUrl) {
        previewHTML += `
          <div style="margin-bottom: 12px;">
            <video 
              id="templatePreviewVideo" 
              controls 
              style="width: 100%; max-width: 600px; max-height: 400px; border-radius: 8px; background: #000; margin: 0 auto; display: block;"
              preload="metadata"
              onerror="this.parentElement.innerHTML='<div style=\\'text-align:center;color:var(--text-secondary);padding:20px;\\'>视频加载失败</div>'">
              <source src="${previewVideoUrl}" type="video/mp4">
              <source src="${previewVideoUrl}" type="video/webm">
              您的浏览器不支持视频播放。
            </video>
          </div>
        `;
      } else if (previewImageUrl) {
        // 如果没有视频但有图片，显示图片
        previewHTML += `
          <div style="margin-bottom: 12px;">
            <img 
              src="${previewImageUrl}" 
              style="width: 100%; max-width: 400px; max-height: 400px; border-radius: 8px; object-fit: contain; margin: 0 auto; display: block;"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div style="text-align: center; color: var(--text-secondary); padding: 20px; display: none;">
              <div style="font-size: 2rem; margin-bottom: 8px;">🖼️</div>
              <div>图片加载失败</div>
            </div>
          </div>
        `;
      } else {
        // 如果既没有视频也没有图片，显示提示
        previewHTML += `
          <div style="text-align: center; color: var(--text-secondary); padding: 20px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">📹</div>
            <div>该模板暂无预览内容</div>
          </div>
        `;
      }
      
      previewContent.innerHTML = previewHTML;
    }
    
    // 隐藏模板预览
    function hideTemplatePreview() {
      const previewSection = document.getElementById('templatePreviewSection');
      if (previewSection) {
        previewSection.style.display = 'none';
      }
    }
    
    // 渲染语音卡片（网格布局）
    function renderVoices(voices, filterText = '') {
      const voiceGrid = document.getElementById('voiceGrid');
      const voiceLoadingState = document.getElementById('voiceLoadingState');
      
      if (!voiceGrid) {
        console.warn('找不到voiceGrid容器');
        return;
      }
      
      // 隐藏加载状态
      if (voiceLoadingState) {
        voiceLoadingState.style.display = 'none';
      }
      
      // 过滤语音
      let filteredVoices = voices;
      if (filterText && filterText.trim()) {
        const searchLower = filterText.toLowerCase().trim();
        filteredVoices = voices.filter(voice => {
          const name = (voice.name || voice.voice_id || '').toLowerCase();
          const language = (voice.language || '').toLowerCase();
          const gender = voice.gender === 'female' ? '女' : voice.gender === 'male' ? '男' : '';
          const voiceId = (voice.voice_id || '').toLowerCase();
          
          return name.includes(searchLower) || 
                 language.includes(searchLower) || 
                 gender.includes(searchLower) ||
                 voiceId.includes(searchLower);
        });
      }
      
      // 清空容器
      voiceGrid.innerHTML = '';
      
      if (filteredVoices.length === 0) {
        voiceGrid.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 40px; grid-column: 1 / -1;">
            <div style="font-size: 2rem; margin-bottom: 12px;">🔍</div>
            <div style="font-size: 0.9rem; margin-bottom: 8px;">未找到匹配的语音</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7;">请尝试其他搜索关键词</div>
          </div>
        `;
        return;
      }
      
      // 渲染语音卡片
      filteredVoices.forEach((voice, index) => {
        const voiceId = voice.voice_id || voice.id || `voice_${index}`;
        const voiceName = voice.name || voiceId;
        const language = voice.language || '未知';
        const gender = voice.gender || 'unknown';
        const genderIcon = gender === 'female' ? '👩' : gender === 'male' ? '👨' : '👤';
        const genderText = gender === 'female' ? '女声' : gender === 'male' ? '男声' : '未知';
        
        const voiceItem = document.createElement('div');
        voiceItem.className = 'voice-template-item';
        voiceItem.setAttribute('data-voice-id', voiceId);
        voiceItem.style.cssText = 'background: var(--bg-secondary); border: 2px solid var(--border); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.3s; text-align: center;';
        voiceItem.onclick = () => {
          selectVoice(voiceId, voice);
        };
        
        voiceItem.innerHTML = `
          <div style="font-size: 2.5rem; margin-bottom: 12px;">${genderIcon}</div>
          <div style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${voiceName}">
            ${voiceName}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">
            🌐 ${language}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            ${genderText}
          </div>
        `;
        
        voiceGrid.appendChild(voiceItem);
      });
      
      // 添加样式（如果还没有）
      if (!document.getElementById('voiceTemplateStyles')) {
        const style = document.createElement('style');
        style.id = 'voiceTemplateStyles';
        style.textContent = `
          .voice-template-item:hover {
            border-color: var(--primary) !important;
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(24, 144, 255, 0.2);
          }
          .voice-template-item.selected {
            border-color: var(--primary) !important;
            background: rgba(24, 144, 255, 0.1) !important;
            box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.2);
          }
        `;
        document.head.appendChild(style);
      }
      
      // 如果之前有选中的语音，恢复选中状态
      if (selectedVoiceId) {
        const selectedItem = voiceGrid.querySelector(`[data-voice-id="${selectedVoiceId}"]`);
        if (selectedItem) {
          selectedItem.classList.add('selected');
        }
      }
    }
    
    // 选择语音
    function selectVoice(voiceId, voiceData = null) {
      // 移除之前的选中状态
      document.querySelectorAll('.voice-template-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      // 添加选中状态
      const selectedItem = document.querySelector(`[data-voice-id="${voiceId}"]`);
      if (selectedItem) {
        selectedItem.classList.add('selected');
      }
      
      // 保存选中的语音ID
      selectedVoiceId = voiceId;
      
      // 更新隐藏的select元素（向后兼容）
      const voiceSelect = document.getElementById('voiceSelect');
      if (voiceSelect) {
        voiceSelect.value = voiceId;
      }
      
      console.log('已选择语音:', voiceId, voiceData);
    }
    
    // 过滤语音（搜索功能）
    function filterVoices() {
      const searchInput = document.getElementById('voiceSearchInput');
      const searchText = searchInput ? searchInput.value : '';
      
      if (heygenVoicesCache && Array.isArray(heygenVoicesCache)) {
        renderVoices(heygenVoicesCache, searchText);
      }
    }
    
    // 获取 HeyGen 语音列表（支持不同上下文）
    async function loadHeyGenVoices(context = 'create') {
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置并测试 HeyGen API Key\n\n提示：请返回步骤1，填写正确的 API Key 并点击"测试连接"。');
        return;
      }
      
      // 根据上下文选择下拉框
      let voiceSelectId;
      if (context === 'create') {
        voiceSelectId = 'voiceSelect';
      } else if (context === 'recite') {
        voiceSelectId = 'reciteVoiceSelect';
      } else if (context === 'promote') {
        voiceSelectId = 'promoteVoiceSelect';
      } else {
        console.warn('未知的上下文:', context);
        return;
      }
      
      const voiceSelect = document.getElementById(voiceSelectId);
      if (!voiceSelect) {
        console.warn('找不到语音选择下拉框:', voiceSelectId);
        return;
      }
      
      // 显示加载状态
      const originalHtml = voiceSelect.innerHTML;
      voiceSelect.innerHTML = '<option value="">⏳ 正在获取语音列表...</option>';
      voiceSelect.disabled = true;
      
      // 更新刷新按钮状态（如果存在）
      const refreshVoiceBtn = document.getElementById('refreshVoiceBtn');
      const refreshVoiceIcon = document.getElementById('refreshVoiceIcon');
      const refreshVoiceText = document.getElementById('refreshVoiceText');
      if (refreshVoiceBtn) {
        refreshVoiceBtn.classList.add('loading');
        refreshVoiceBtn.disabled = true;
        if (refreshVoiceIcon) refreshVoiceIcon.innerHTML = '<span class="loading-spinner">🔄</span>';
        if (refreshVoiceText) refreshVoiceText.textContent = '加载中...';
      }
      
      try {
        const response = await fetch(buildApiUrl(`/api/heygen/voices?apiKey=${encodeURIComponent(apiKey)}`), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应');
        }
        
        if (result.success && result.voices && result.voices.length > 0) {
          // 缓存语音列表
          heygenVoicesCache = result.voices;
          
          // 更新语音选择下拉框（向后兼容）
          voiceSelect.innerHTML = '<option value="">默认语音（自动选择）</option>';
          
          result.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            let displayName = voice.name || voice.voice_id;
            if (voice.language) {
              displayName += ` (${voice.language})`;
            }
            if (voice.gender) {
              displayName += ` - ${voice.gender === 'female' ? '女声' : voice.gender === 'male' ? '男声' : voice.gender}`;
            }
            option.textContent = displayName;
            voiceSelect.appendChild(option);
          });
          
          // 如果是create上下文，使用网格布局渲染
          if (context === 'create') {
            const searchInput = document.getElementById('voiceSearchInput');
            const searchText = searchInput ? searchInput.value : '';
            renderVoices(result.voices, searchText);
          }
          
          // 保存到 localStorage
          localStorage.setItem('heygen_voices', JSON.stringify(result.voices));
          localStorage.setItem('heygen_voices_update_time', new Date().toISOString());
          
          console.log('已加载语音列表:', result.voices.length, '个语音');
          
          // 恢复刷新按钮状态
          const refreshVoiceBtn = document.getElementById('refreshVoiceBtn');
          const refreshVoiceIcon = document.getElementById('refreshVoiceIcon');
          const refreshVoiceText = document.getElementById('refreshVoiceText');
          if (refreshVoiceBtn) {
            refreshVoiceBtn.classList.remove('loading');
            refreshVoiceBtn.disabled = false;
            if (refreshVoiceIcon) refreshVoiceIcon.textContent = '🔄';
            if (refreshVoiceText) refreshVoiceText.textContent = '刷新语音';
          }
          
          voiceSelect.disabled = false;
        } else {
          // 如果没有获取到语音列表，恢复默认选项
          voiceSelect.innerHTML = originalHtml;
          voiceSelect.disabled = false;
          
          // 恢复刷新按钮状态
          const refreshVoiceBtn = document.getElementById('refreshVoiceBtn');
          const refreshVoiceIcon = document.getElementById('refreshVoiceIcon');
          const refreshVoiceText = document.getElementById('refreshVoiceText');
          if (refreshVoiceBtn) {
            refreshVoiceBtn.classList.remove('loading');
            refreshVoiceBtn.disabled = false;
            if (refreshVoiceIcon) refreshVoiceIcon.textContent = '🔄';
            if (refreshVoiceText) refreshVoiceText.textContent = '刷新语音';
          }
          
          if (context === 'create') {
            const warningMsg = document.createElement('div');
            warningMsg.id = 'voiceLoadWarningMsg';
            warningMsg.style.cssText = 'background: rgba(250, 173, 20, 0.1); border: 1px solid var(--warning); border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 0.85rem; color: var(--warning); text-align: center;';
            warningMsg.textContent = `⚠️ 无法获取语音列表：${result.message || '未知错误'}，将使用默认语音`;
            const existingMsg = document.getElementById('voiceLoadWarningMsg');
            if (existingMsg) existingMsg.remove();
            voiceSelect.parentElement.insertBefore(warningMsg, voiceSelect);
            setTimeout(() => {
              if (warningMsg && warningMsg.parentElement) {
                warningMsg.style.transition = 'opacity 0.3s';
                warningMsg.style.opacity = '0';
                setTimeout(() => warningMsg.remove(), 300);
              }
            }, 5000);
          }
        }
      } catch (error) {
        console.error('获取语音列表错误:', error);
        
        // 恢复默认选项
        voiceSelect.innerHTML = originalHtml;
        voiceSelect.disabled = false;
        
        // 恢复刷新按钮状态
        const refreshVoiceBtn = document.getElementById('refreshVoiceBtn');
        const refreshVoiceIcon = document.getElementById('refreshVoiceIcon');
        const refreshVoiceText = document.getElementById('refreshVoiceText');
        if (refreshVoiceBtn) {
          refreshVoiceBtn.classList.remove('loading');
          refreshVoiceBtn.disabled = false;
          if (refreshVoiceIcon) refreshVoiceIcon.textContent = '🔄';
          if (refreshVoiceText) refreshVoiceText.textContent = '刷新语音';
        }
        
        if (context === 'create') {
          // 显示错误提示（不弹窗）
          const errorMsg = document.createElement('div');
          errorMsg.id = 'voiceLoadErrorMsg';
          errorMsg.style.cssText = 'background: rgba(255, 77, 79, 0.1); border: 1px solid var(--danger); border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 0.85rem; color: var(--danger); text-align: center;';
          errorMsg.textContent = `❌ 获取语音列表失败：${error.message || '未知错误'}`;
          
          const existingMsg = document.getElementById('voiceLoadErrorMsg');
          if (existingMsg) existingMsg.remove();
          voiceSelect.parentElement.insertBefore(errorMsg, voiceSelect);
          
          setTimeout(() => {
            if (errorMsg && errorMsg.parentElement) {
              errorMsg.style.transition = 'opacity 0.3s';
              errorMsg.style.opacity = '0';
              setTimeout(() => errorMsg.remove(), 300);
            }
          }, 5000);
        }
      }
    }
    
    // 加载历史
    function loadHistory() {
      const history = JSON.parse(localStorage.getItem('cn_dh_history') || '[]');
      const container = document.getElementById('historyList');
      
      // 如果容器不存在，直接返回
      if (!container) {
        console.warn('找不到historyList容器，跳过加载历史记录');
        return;
      }
      
      if (history.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无生成记录</div>';
        return;
      }
      
      const platformNames = {
        heygen: 'HeyGen'
      };
      
      container.innerHTML = history.map(item => `
        <div class="history-item">
          <div class="history-header">
            <span class="history-avatar">${item.avatar}</span>
            <div class="history-meta">
              <div class="history-platform">${platformNames[item.platform] || item.platform}</div>
              <div class="history-date">${new Date(item.createDate).toLocaleString()}</div>
            </div>
          </div>
          <div class="history-script">${item.script}</div>
          <div class="history-actions">
            <button class="history-btn" onclick="deleteHistory('${item.id}')">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
    }
    
    // 删除历史
    function deleteHistory(id) {
      if (!confirm('确定要删除这条记录吗？')) return;
      
      let history = JSON.parse(localStorage.getItem('cn_dh_history') || '[]');
      history = history.filter(h => h.id != id);
      localStorage.setItem('cn_dh_history', JSON.stringify(history));
      loadHistory();
    }
    
    // 加载配置
    function loadConfigs() {
      // ✅ 加载 HeyGen API Key
      const heygenApiKey = localStorage.getItem('heygen_api_key');
      if (heygenApiKey) {
        const inputEl = document.getElementById('heygenApiKey');
        if (inputEl) {
          inputEl.value = heygenApiKey;
          // 显示已保存的提示
          showStatus('heygenStatus', '💾 已加载保存的 API Key', 'success');
          console.log('已加载保存的 HeyGen API Key');
        }
      }
      
      // ✅ 加载云雾 API Key
      const yunwuApiKey = localStorage.getItem('yunwu_api_key');
      if (yunwuApiKey) {
        const inputEl = document.getElementById('yunwuApiKey');
        if (inputEl) {
          inputEl.value = yunwuApiKey;
          // 显示已保存的提示
          showStatus('yunwuStatus', '💾 已加载保存的 API Key', 'success');
          console.log('已加载保存的云雾 API Key');
        }
      }
      
      // 加载缓存的语音列表
      loadCachedVoices();
    }
    
    // 加载缓存的语音列表
    function loadCachedVoices() {
      try {
        const cachedVoices = localStorage.getItem('heygen_voices');
        if (cachedVoices) {
          const voices = JSON.parse(cachedVoices);
          heygenVoicesCache = voices; // 缓存到全局变量
          
          const voiceSelect = document.getElementById('voiceSelect');
          
          if (voiceSelect && Array.isArray(voices) && voices.length > 0) {
            voiceSelect.innerHTML = '<option value="">默认语音（自动选择）</option>';
            
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.value = voice.voice_id;
              let displayName = voice.name || voice.voice_id;
              if (voice.language) {
                displayName += ` (${voice.language})`;
              }
              if (voice.gender) {
                displayName += ` - ${voice.gender === 'female' ? '女声' : voice.gender === 'male' ? '男声' : voice.gender}`;
              }
              option.textContent = displayName;
              voiceSelect.appendChild(option);
            });
            
            // 渲染语音卡片
            const searchInput = document.getElementById('voiceSearchInput');
            const searchText = searchInput ? searchInput.value : '';
            renderVoices(voices, searchText);
            
            console.log('已加载缓存的语音列表:', voices.length, '个语音');
          }
        }
      } catch (error) {
        console.warn('加载缓存的语音列表失败:', error);
      }
    }
    
    // 显示状态
    function showStatus(elementId, message, type) {
      const el = document.getElementById(elementId);
      el.className = 'api-status ' + type;
      el.textContent = message;
      el.style.display = 'block';
    }
    
    // 显示/隐藏加载
    function showLoading(show, text) {
      const overlay = document.getElementById('loadingOverlay');
      const loadingText = document.getElementById('loadingText');
      
      if (show) {
        overlay.classList.remove('hidden');
        loadingText.textContent = text || '处理中...';
      } else {
        overlay.classList.add('hidden');
      }
    }
    
    // ========== 录制功能 ==========
    
    // 切换视频录制
    async function toggleVideoRecording() {
      if (isRecordingVideo) {
        stopVideoRecording();
      } else {
        await startVideoRecording();
      }
    }
    
    // 检查浏览器支持
    function checkMediaSupport() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('您的浏览器不支持摄像头/麦克风访问功能。\n\n请使用现代浏览器（Chrome、Firefox、Edge、Safari）');
        return false;
      }
      return true;
    }
    
    // 检查可用设备
    async function checkAvailableDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        return {
          hasVideo: videoDevices.length > 0,
          hasAudio: audioDevices.length > 0,
          videoCount: videoDevices.length,
          audioCount: audioDevices.length
        };
      } catch (error) {
        console.warn('无法枚举设备:', error);
        // 如果枚举失败，返回未知状态，让后续的 getUserMedia 来处理
        return {
          hasVideo: null,
          hasAudio: null,
          videoCount: 0,
          audioCount: 0
        };
      }
    }
    
    // 开始视频录制
    async function startVideoRecording() {
      if (!checkMediaSupport()) {
        return;
      }
      
      const recordBtn = document.getElementById('recordVideoBtn');
      if (recordBtn) {
        recordBtn.disabled = true;
        recordBtn.querySelector('.record-text').textContent = '正在检查设备...';
      }
      
      try {
        // 先停止之前的流（如果有）
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          videoStream = null;
        }
        
        // 先请求一个临时权限以便枚举设备（如果设备标签为空）
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // 忽略临时流的错误，继续尝试
        }
        
        // 检查可用设备
        const deviceInfo = await checkAvailableDevices();
        if (deviceInfo.hasVideo === false) {
          throw new Error('未检测到摄像头设备。\n\n请确保：\n1. 摄像头已正确连接\n2. 摄像头未被其他应用占用\n3. 已在浏览器中授予摄像头权限');
        }
        if (deviceInfo.hasAudio === false) {
          console.warn('未检测到麦克风设备，将仅录制视频');
        }
        
        if (recordBtn) {
          recordBtn.querySelector('.record-text').textContent = '正在请求权限...';
        }
        
        // 请求摄像头和麦克风权限
        let constraints = {
          video: {
            facingMode: { ideal: 'user' }
          },
          audio: true
        };
        
        // 尝试请求权限
        try {
          videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (constraintError) {
          console.warn('使用理想约束失败，尝试使用基本约束:', constraintError);
          
          // 根据错误类型给出不同处理
          if (constraintError.name === 'NotFoundError' || constraintError.name === 'DevicesNotFoundError') {
            throw new Error('未找到摄像头或麦克风设备。\n\n请确保：\n1. 设备已正确连接\n2. 设备未被其他应用占用\n3. 已在浏览器设置中授予权限');
          } else if (constraintError.name === 'NotAllowedError' || constraintError.name === 'PermissionDeniedError') {
            throw new Error('摄像头/麦克风权限被拒绝。\n\n请在浏览器设置中允许访问摄像头和麦克风，然后刷新页面重试。');
          } else if (constraintError.name === 'NotReadableError' || constraintError.name === 'TrackStartError') {
            throw new Error('无法访问摄像头/麦克风。\n\n可能原因：\n1. 设备正被其他应用使用\n2. 设备驱动问题\n3. 请关闭其他使用摄像头的应用后重试');
          }
          
          // 如果错误不是设备未找到，尝试使用基本约束
          constraints = {
            video: true,
            audio: true
          };
          videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
        
        if (!videoStream || videoStream.getVideoTracks().length === 0) {
          throw new Error('无法获取视频流');
        }
        
        const videoRecordPreview = document.getElementById('videoRecordPreview');
        const recordedVideo = document.getElementById('recordedVideo');
        
        if (!videoRecordPreview || !recordedVideo) {
          throw new Error('找不到预览元素');
        }
        
        // 显示预览区域
        videoRecordPreview.style.display = 'block';
        
        // 创建或获取预览视频元素
        let previewVideo = videoRecordPreview.querySelector('.preview-live-video');
        if (!previewVideo) {
          previewVideo = document.createElement('video');
          previewVideo.className = 'preview-live-video';
          previewVideo.autoplay = true;
          previewVideo.muted = true;
          previewVideo.playsInline = true;
          previewVideo.style.cssText = 'max-width: 100%; max-height: 200px; border-radius: 8px; background: #000;';
          videoRecordPreview.insertBefore(previewVideo, videoRecordPreview.firstChild);
        }
        
        // 设置视频流
        previewVideo.srcObject = videoStream;
        
        // 等待视频元数据加载
        await new Promise((resolve, reject) => {
          previewVideo.onloadedmetadata = () => {
            resolve();
          };
          previewVideo.onerror = (e) => {
            reject(new Error('视频预览加载失败'));
          };
          setTimeout(() => {
            if (previewVideo.readyState >= 2) {
              resolve();
            } else {
              reject(new Error('视频加载超时'));
            }
          }, 3000);
        });
        
        // 隐藏已录制的视频（如果有）
        if (recordedVideo.src) {
          recordedVideo.style.display = 'none';
        }
        
        // 开始录制
        const chunks = [];
        
        // 检测支持的 MIME 类型
        let mimeType = '';
        const supportedTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264,opus',
          'video/webm',
          'video/mp4'
        ];
        
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }
        
        if (!mimeType) {
          console.warn('未找到支持的 MIME 类型，使用默认值');
        }
        
        // 创建 MediaRecorder
        const options = mimeType ? { mimeType: mimeType } : {};
        
        // 设置录制选项
        if (mimeType.includes('webm')) {
          options.videoBitsPerSecond = 2500000;
        }
        
        videoRecorder = new MediaRecorder(videoStream, options);
        
        // 处理数据可用事件
        videoRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        // 处理停止事件
        videoRecorder.onstop = () => {
          if (chunks.length === 0) {
            alert('录制失败：没有录制到任何数据');
            return;
          }
          
          recordedVideoBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
          
          // 清除模板选择和上传的文件（互斥逻辑）
          clearTemplateSelection();
          clearUploadedFiles();
          
          if (recordedVideoBlob.size === 0) {
            alert('录制失败：视频文件为空');
            return;
          }
          
          const url = URL.createObjectURL(recordedVideoBlob);
          recordedVideo.src = url;
          recordedVideo.style.display = 'block';
          
          currentVideoUrl = url;
          
          const previewVideo = videoRecordPreview.querySelector('.preview-live-video');
          if (previewVideo) {
            previewVideo.srcObject = null;
            previewVideo.remove();
          }
          
          if (videoStream) {
            videoStream.getTracks().forEach(track => {
              track.stop();
            });
            videoStream = null;
          }
        };
        
        // 开始录制
        videoRecorder.start(100);
        
        isRecordingVideo = true;
        if (recordBtn) {
          recordBtn.disabled = false;
          recordBtn.classList.add('recording');
          recordBtn.querySelector('.record-text').textContent = '停止录制';
        }
        
        // 显示录制状态
        startRecordTimer();
        
      } catch (error) {
        console.error('录制视频失败:', error);
        
        const recordBtn = document.getElementById('recordVideoBtn');
        if (recordBtn) {
          recordBtn.disabled = false;
          recordBtn.querySelector('.record-text').textContent = '录制视频';
        }
        
        // 根据错误类型显示不同的提示
        let errorMessage = '录制失败：';
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '未找到摄像头或麦克风设备。\n\n请确保：\n1. 设备已正确连接\n2. 设备未被其他应用占用\n3. 已在浏览器设置中授予权限';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '摄像头/麦克风权限被拒绝。\n\n请在浏览器设置中允许访问摄像头和麦克风，然后刷新页面重试。';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = '无法访问摄像头/麦克风。\n\n可能原因：\n1. 设备正被其他应用使用\n2. 设备驱动问题\n3. 请关闭其他使用摄像头的应用后重试';
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage += error.toString();
        }
        
        alert(errorMessage);
      }
    }
    
    // 停止视频录制
    function stopVideoRecording() {
      if (videoRecorder && isRecordingVideo) {
        try {
          if (videoRecorder.state === 'recording') {
            videoRecorder.stop();
          }
          
          isRecordingVideo = false;
          
          const recordBtn = document.getElementById('recordVideoBtn');
          if (recordBtn) {
            recordBtn.classList.remove('recording');
            recordBtn.disabled = false;
            recordBtn.querySelector('.record-text').textContent = '录制视频';
          }
          
          stopRecordTimer();
        } catch (error) {
          console.error('停止录制时出错:', error);
        }
      }
    }
    
    // 播放录制的视频
    function playRecordedVideo() {
      const recordedVideo = document.getElementById('recordedVideo');
      if (recordedVideo.src) {
        recordedVideo.play();
      }
    }
    
    // 删除录制的视频
    function removeRecordedVideo() {
      if (!confirm('确定要删除录制的视频吗？')) return;
      
      const videoRecordPreview = document.getElementById('videoRecordPreview');
      const recordedVideo = document.getElementById('recordedVideo');
      
      if (recordedVideo && recordedVideo.src) {
        URL.revokeObjectURL(recordedVideo.src);
        recordedVideo.src = '';
      }
      
      recordedVideoBlob = null;
      
      if (videoRecordPreview) {
        videoRecordPreview.style.display = 'none';
      }
    }
    
    // 切换音频录制
    async function toggleAudioRecording() {
      if (isRecordingAudio) {
        stopAudioRecording();
      } else {
        await startAudioRecording();
      }
    }
    
    // 开始音频录制
    async function startAudioRecording() {
      if (!checkMediaSupport()) {
        return;
      }
      
      const recordBtn = document.getElementById('recordAudioBtn');
      if (recordBtn) {
        recordBtn.disabled = true;
        recordBtn.querySelector('.record-text').textContent = '正在检查设备...';
      }
      
      try {
        // 先停止之前的流（如果有）
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          audioStream = null;
        }
        
        // 先请求一个临时权限以便枚举设备（如果设备标签为空）
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // 忽略临时流的错误，继续尝试
        }
        
        // 检查可用设备
        const deviceInfo = await checkAvailableDevices();
        if (deviceInfo.hasAudio === false) {
          throw new Error('未检测到麦克风设备。\n\n请确保：\n1. 麦克风已正确连接\n2. 麦克风未被其他应用占用\n3. 已在浏览器中授予麦克风权限');
        }
        
        if (recordBtn) {
          recordBtn.querySelector('.record-text').textContent = '正在请求权限...';
        }
        
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        if (recordBtn) {
          recordBtn.disabled = false;
        }
        
        const audioRecordPreview = document.getElementById('audioRecordPreview');
        const recordedAudio = document.getElementById('recordedAudio');
        
        // 开始录制
        const chunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        
        audioRecorder = new MediaRecorder(audioStream, {
          mimeType: mimeType || undefined
        });
        
        audioRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        audioRecorder.onstop = () => {
          recordedAudioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          
          // 清除模板选择和上传的文件（互斥逻辑）
          clearTemplateSelection();
          clearUploadedFiles();
          
          const url = URL.createObjectURL(recordedAudioBlob);
          recordedAudio.src = url;
          
          if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
          }
          
          audioRecordPreview.style.display = 'block';
        };
        
        audioRecorder.start();
        isRecordingAudio = true;
        recordBtn.classList.add('recording');
        recordBtn.querySelector('.record-text').textContent = '停止录制';
        
        // 显示录制状态
        startRecordTimer();
        
      } catch (error) {
        console.error('录制音频失败:', error);
        
        const recordBtn = document.getElementById('recordAudioBtn');
        if (recordBtn) {
          recordBtn.disabled = false;
          recordBtn.querySelector('.record-text').textContent = '录制语音';
        }
        
        // 根据错误类型显示不同的提示
        let errorMessage = '录制失败：';
        if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = '未找到麦克风设备。\n\n请确保：\n1. 麦克风已正确连接\n2. 麦克风未被其他应用占用\n3. 已在浏览器设置中授予权限';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = '麦克风权限被拒绝。\n\n请在浏览器设置中允许访问麦克风，然后刷新页面重试。';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = '无法访问麦克风。\n\n可能原因：\n1. 设备正被其他应用使用\n2. 设备驱动问题\n3. 请关闭其他使用麦克风的应用后重试';
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage += error.toString();
        }
        
        alert(errorMessage);
      }
    }
    
    // 停止音频录制
    function stopAudioRecording() {
      if (audioRecorder && isRecordingAudio) {
        audioRecorder.stop();
        isRecordingAudio = false;
        
        const recordBtn = document.getElementById('recordAudioBtn');
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('.record-text').textContent = '录制语音';
        
        stopRecordTimer();
      }
    }
    
    // 播放录制的音频
    function playRecordedAudio() {
      const recordedAudio = document.getElementById('recordedAudio');
      if (recordedAudio.src) {
        recordedAudio.play();
      }
    }
    
    // 删除录制的音频
    function removeRecordedAudio() {
      if (!confirm('确定要删除录制的音频吗？')) return;
      
      const audioRecordPreview = document.getElementById('audioRecordPreview');
      const recordedAudio = document.getElementById('recordedAudio');
      
      if (recordedAudio && recordedAudio.src) {
        URL.revokeObjectURL(recordedAudio.src);
        recordedAudio.src = '';
      }
      
      recordedAudioBlob = null;
      
      if (audioRecordPreview) {
        audioRecordPreview.style.display = 'none';
      }
    }
    
    // 开始录制计时器
    function startRecordTimer() {
      recordStartTime = Date.now();
      const recordStatus = document.getElementById('recordStatus');
      const recordTime = document.getElementById('recordTime');
      
      recordStatus.style.display = 'flex';
      
      recordTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        recordTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }, 1000);
    }
    
    // 停止录制计时器
    function stopRecordTimer() {
      if (recordTimer) {
        clearInterval(recordTimer);
        recordTimer = null;
      }
      
      const recordStatus = document.getElementById('recordStatus');
      recordStatus.style.display = 'none';
    }
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      stopRecordTimer();
    });
    
    function goBack() {
      window.location.href = 'page.html?page=my-digital-worker';
    }
    
    // ========== 诵读文案功能 ==========
    
    // 切换诵读文案的数字人选择模式
    function switchReciteAvatarMode(mode) {
      reciteAvatarMode = mode;
      selectedAvatarForRecite = null;
      
      // 更新按钮状态
      const templateBtn = document.getElementById('reciteModeTemplate');
      const myDigitalHumanBtn = document.getElementById('reciteModeMyDigitalHuman');
      if (templateBtn && myDigitalHumanBtn) {
        if (mode === 'template') {
          templateBtn.classList.remove('secondary');
          templateBtn.classList.add('primary');
          myDigitalHumanBtn.classList.remove('primary');
          myDigitalHumanBtn.classList.add('secondary');
        } else {
          templateBtn.classList.remove('primary');
          templateBtn.classList.add('secondary');
          myDigitalHumanBtn.classList.remove('secondary');
          myDigitalHumanBtn.classList.add('primary');
        }
      }
      
      // 加载对应的列表
      loadReciteAvatars();
    }
    
    // 加载诵读文案的数字人列表（根据模式）
    function loadReciteAvatars() {
      if (reciteAvatarMode === 'template') {
        loadHeyGenAvatars('recite');
      } else {
        loadMyDigitalHumans('recite');
      }
    }
    
    // 切换卖货推送的数字人选择模式
    function switchPromoteAvatarMode(mode) {
      promoteAvatarMode = mode;
      selectedAvatarForPromote = null;
      
      // 更新按钮状态
      const templateBtn = document.getElementById('promoteModeTemplate');
      const myDigitalHumanBtn = document.getElementById('promoteModeMyDigitalHuman');
      if (templateBtn && myDigitalHumanBtn) {
        if (mode === 'template') {
          templateBtn.classList.remove('secondary');
          templateBtn.classList.add('primary');
          myDigitalHumanBtn.classList.remove('primary');
          myDigitalHumanBtn.classList.add('secondary');
        } else {
          templateBtn.classList.remove('primary');
          templateBtn.classList.add('secondary');
          myDigitalHumanBtn.classList.remove('secondary');
          myDigitalHumanBtn.classList.add('primary');
        }
      }
      
      // 加载对应的列表
      loadPromoteAvatars();
    }
    
    // 加载卖货推送的数字人列表（根据模式）
    function loadPromoteAvatars() {
      if (promoteAvatarMode === 'template') {
        loadHeyGenAvatars('promote');
      } else {
        loadMyDigitalHumans('promote');
      }
    }
    
    // 加载用户自己创建的数字人列表
    function loadMyDigitalHumans(context) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      
      // 只显示已完成（completed）的数字人
      const completedDigitalHumans = digitalHumans.filter(dh => 
        dh.platform === 'heygen' && 
        dh.status === 'completed' && 
        dh.avatarId // 必须有 avatarId（使用模板创建的）
      );
      
      let containerId;
      if (context === 'recite') {
        containerId = 'reciteAvatarSelector';
      } else if (context === 'promote') {
        containerId = 'promoteAvatarSelector';
      } else {
        console.warn('未知的上下文:', context);
        return;
      }
      
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('找不到容器:', containerId);
        return;
      }
      
      if (completedDigitalHumans.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 40px; grid-column: 1 / -1;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">👤</div>
            <div style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-primary);">暂无可用的数字人</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">请先创建并完成至少一个数字人</div>
            <button class="btn secondary" onclick="switchMenu('create')" style="margin-top: 16px; padding: 8px 16px;">
              ➕ 去创建数字人
            </button>
          </div>
        `;
        return;
      }
      
      // 渲染数字人卡片
      container.innerHTML = completedDigitalHumans.map(dh => {
        const isSelected = (context === 'recite' && selectedAvatarForRecite === dh.avatarId) ||
                          (context === 'promote' && selectedAvatarForPromote === dh.avatarId);
        
        const thumbnail = dh.thumbnail || (dh.videoUrl ? dh.videoUrl : '');
        const displayName = dh.name || '未命名数字人';
        
        return `
          <div class="avatar-template-item ${isSelected ? 'selected' : ''}" 
               onclick="selectMyDigitalHuman('${dh.avatarId}', '${context}', '${dh.id}')"
               style="cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 12px; border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; transition: all 0.2s;">
            ${thumbnail ? 
              `<img src="${thumbnail}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">` :
              `<div style="width: 100%; aspect-ratio: 1; background: var(--bg-primary); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem;">👤</div>`
            }
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${displayName}">
              ${displayName}
            </div>
            ${isSelected ? '<div style="text-align: center; margin-top: 4px; color: var(--primary); font-size: 0.75rem;">✓ 已选择</div>' : ''}
          </div>
        `;
      }).join('');
    }
    
    // 选择用户创建的数字人
    function selectMyDigitalHuman(avatarId, context, digitalHumanId) {
      // 清除之前的选中状态
      const containerId = context === 'recite' ? 'reciteAvatarSelector' : 'promoteAvatarSelector';
      const container = document.getElementById(containerId);
      if (container) {
        container.querySelectorAll('.avatar-template-item').forEach(item => {
          item.classList.remove('selected');
        });
      }
      
      // 设置新的选中状态
      if (context === 'recite') {
        selectedAvatarForRecite = avatarId;
      } else if (context === 'promote') {
        selectedAvatarForPromote = avatarId;
      }
      
      // 更新UI
      loadMyDigitalHumans(context);
      
      console.log('已选择用户创建的数字人:', { avatarId, context, digitalHumanId });
    }
    
    // ========== 诵读文案功能 ==========
    
    // 更新诵读文案字数统计
    function updateReciteCharCount() {
      const text = document.getElementById('reciteScript')?.value || '';
      const count = text.length;
      const countEl = document.getElementById('reciteCharCount');
      if (countEl) {
        countEl.textContent = count;
        countEl.style.color = count > 1000 ? 'var(--danger)' : 'var(--text-secondary)';
      }
    }
    
    // 预览诵读文案语音
    async function previewReciteScript() {
      const script = document.getElementById('reciteScript')?.value.trim();
      if (!script) {
        alert('请先输入文案内容');
        return;
      }
      alert('语音预览功能开发中...\n\n提示：您可以直接生成视频查看效果。');
    }
    
    // 创建诵读文案视频
    async function createReciteVideo() {
      const script = document.getElementById('reciteScript')?.value.trim();
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置 HeyGen API Key\n\n提示：请返回"创建数字人"页面，在步骤1中配置 API Key。');
        return;
      }
      
      if (!script) {
        alert('请输入文案内容');
        return;
      }
      
      if (script.length > 1000) {
        alert('文案内容过长，请控制在1000字以内');
        return;
      }
      
      // 检查是否选择了数字人
      if (!selectedAvatarForRecite) {
        alert('请先选择一个数字人形象');
        return;
      }
      
      showLoading(true, '正在生成诵读视频...');
      
      try {
        const voiceSelect = document.getElementById('reciteVoiceSelect');
        const voiceId = voiceSelect && voiceSelect.value ? voiceSelect.value : null;
        
        const response = await fetch(buildApiUrl('/api/heygen/video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            avatarId: selectedAvatarForRecite || null,
            text: script,
            voiceId: voiceId
          })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应');
        }
        
        if (!result.success) {
          showLoading(false);
          alert('❌ 创建失败：' + result.message);
          return;
        }
        
        const taskId = result.data?.video_id || result.data?.id || null;
        if (!taskId) {
          showLoading(false);
          alert('❌ 创建失败：未返回任务ID（video_id），无法查询状态。');
          return;
        }
        
        const workId = Date.now().toString();
        
        const work = {
          id: workId,
          type: 'recite',
          title: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
          script: script,
          platform: 'heygen',
          taskId: taskId,
          status: 'processing',
          progress: 0,
          videoUrl: null,
          avatarId: selectedAvatarForRecite,
          voiceId: voiceId,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(work);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        showLoading(false);
        alert('✅ 诵读视频任务已提交！\n\n任务正在后台处理中，您可以在"作品管理"中查看进度。');
        
        // 清空表单
        document.getElementById('reciteScript').value = '';
        updateReciteCharCount();
        
        // 开始轮询
        startReciteTaskPolling(workId, taskId, apiKey);
        loadReciteHistory();
        
      } catch (error) {
        console.error('创建诵读视频错误:', error);
        showLoading(false);
        alert('❌ 创建失败：' + error.message);
      }
    }
    
    // 诵读任务轮询
    function startReciteTaskPolling(workId, taskId, apiKey) {
      if (taskPollingIntervals.has(workId)) {
        clearInterval(taskPollingIntervals.get(workId));
      }
      
      let pollCount = 0;
      const maxPolls = 300;
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          taskPollingIntervals.delete(workId);
          updateReciteWorkStatus(workId, 'failed', 0, null, '任务超时');
          return;
        }
        
        try {
          const response = await fetch(`/api/heygen/task/${taskId}?apiKey=${encodeURIComponent(apiKey)}`);
          const contentType = response.headers.get('content-type') || '';
          let result;
          
          if (contentType.includes('application/json')) {
            result = await response.json();
          } else {
            return;
          }
          
          if (result.success) {
            const status = result.status;
            const progress = result.progress || 0;
            const videoUrl = result.videoUrl || result.data?.video_url;
            const error = result.error;
            
            updateReciteWorkStatus(workId, status, progress, videoUrl, error);
            
            if (status === 'completed' || status === 'failed') {
              clearInterval(pollInterval);
              taskPollingIntervals.delete(workId);
            }
          }
        } catch (error) {
          console.error('轮询诵读任务状态错误:', error);
        }
      }, 10000); // 每10秒查询一次
      
      taskPollingIntervals.set(workId, pollInterval);
    }
    
    // 更新诵读作品状态
    function updateReciteWorkStatus(workId, status, progress, videoUrl, error) {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const index = works.findIndex(w => w.id === workId);
      
      if (index !== -1) {
        works[index].status = status === 'completed' ? 'ready' : status;
        works[index].progress = progress;
        works[index].updateDate = new Date().toISOString();
        
        if (videoUrl) {
          works[index].videoUrl = videoUrl;
        }
        
        if (error) {
          works[index].error = error;
        }
        
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        if (document.getElementById('recitePanel') && !document.getElementById('recitePanel').classList.contains('hidden')) {
          loadReciteHistory();
        }
      }
    }
    
    // 加载诵读历史
    function loadReciteHistory() {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const reciteWorks = works.filter(w => w.type === 'recite');
      const container = document.getElementById('reciteHistoryList');
      
      if (!container) return;
      
      if (reciteWorks.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无诵读作品</div>';
        return;
      }
      
      container.innerHTML = reciteWorks.map(work => {
        const statusBadge = work.status === 'ready' 
          ? '<span style="background: var(--success); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">已完成</span>'
          : work.status === 'failed'
          ? '<span style="background: var(--danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">失败</span>'
          : '<span style="background: var(--warning); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">处理中 ' + (work.progress || 0) + '%</span>';
        
        return `
          <div class="history-item">
            <div class="history-header">
              <span class="history-avatar">📖</span>
              <div class="history-meta">
                ${statusBadge}
                <div class="history-date">${new Date(work.createDate).toLocaleString()}</div>
              </div>
            </div>
            <div class="history-script">${work.title}</div>
            <div class="history-actions">
              ${work.videoUrl ? `<button class="history-btn" onclick="playWork('${work.id}')">▶️ 播放</button>` : ''}
              ${work.videoUrl ? `<button class="history-btn" onclick="downloadWork('${work.id}')">📥 下载</button>` : ''}
              <button class="history-btn" onclick="deleteReciteWork('${work.id}')">🗑️ 删除</button>
              ${work.status === 'processing' ? `<button class="history-btn" onclick="refreshReciteWork('${work.id}')">🔄 刷新</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
    
    // 删除诵读作品
    function deleteReciteWork(id) {
      if (!confirm('确定要删除这个作品吗？')) return;
      let works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      works = works.filter(w => w.id !== id);
      localStorage.setItem('cn_dh_works', JSON.stringify(works));
      loadReciteHistory();
    }
    
    // 刷新诵读作品状态
    async function refreshReciteWork(id) {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const work = works.find(w => w.id === id);
      
      if (!work || !work.taskId) return;
      
      const apiKey = getHeyGenApiKey();
      if (!apiKey) return;
      
      try {
        const response = await fetch(`/api/heygen/task/${work.taskId}?apiKey=${encodeURIComponent(apiKey)}`);
        const result = await response.json();
        
        if (result.success) {
          updateReciteWorkStatus(id, result.status, result.progress, result.videoUrl, result.error);
          loadReciteHistory();
        }
      } catch (error) {
        console.error('刷新作品状态错误:', error);
      }
    }
    
    // ========== 卖货推送功能 ==========
    
    // 更新卖货推送字数统计
    function updatePromoteCharCount() {
      const text = document.getElementById('promoteProductDesc')?.value || '';
      const count = text.length;
      const countEl = document.getElementById('promoteCharCount');
      if (countEl) {
        countEl.textContent = count;
        countEl.style.color = count > 500 ? 'var(--danger)' : 'var(--text-secondary)';
      }
    }
    
    // 处理商品图片上传（卖货推送）
    let promoteProductImageBase64 = null;
    
    function handleProductImageUpload(input, context) {
      if (context !== 'promote') return;
      
      const file = input.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        promoteProductImageBase64 = reader.result;
        const preview = document.getElementById('promoteImagePreview');
        const previewImg = document.getElementById('promoteImagePreviewImg');
        
        if (preview && previewImg) {
          previewImg.src = promoteProductImageBase64;
          preview.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);
    }
    
    function handleProductImageDrop(e) {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const input = document.getElementById('promoteImageInput');
        if (input) {
          input.files = files;
          handleProductImageUpload(input, 'promote');
        }
      }
    }
    
    function removeProductImage(context) {
      if (context === 'promote') {
        promoteProductImageBase64 = null;
        const preview = document.getElementById('promoteImagePreview');
        if (preview) preview.style.display = 'none';
        const input = document.getElementById('promoteImageInput');
        if (input) input.value = '';
      }
    }
    
    // 创建卖货推送视频
    async function createPromoteVideo() {
      const productName = document.getElementById('promoteProductName')?.value.trim();
      const productDesc = document.getElementById('promoteProductDesc')?.value.trim();
      const apiKey = getHeyGenApiKey();
      
      if (!apiKey) {
        alert('请先配置 HeyGen API Key\n\n提示：请返回"创建数字人"页面，在步骤1中配置 API Key。');
        return;
      }
      
      if (!productName) {
        alert('请输入商品名称');
        return;
      }
      
      if (!productDesc) {
        alert('请输入商品描述');
        return;
      }
      
      if (productDesc.length > 500) {
        alert('商品描述过长，请控制在500字以内');
        return;
      }
      
      // 检查是否选择了数字人
      if (!selectedAvatarForPromote) {
        alert('请先选择一个数字人形象');
        return;
      }
      
      showLoading(true, '正在生成推广视频...');
      
      try {
        const voiceSelect = document.getElementById('promoteVoiceSelect');
        const voiceId = voiceSelect && voiceSelect.value ? voiceSelect.value : null;
        
        // 构建推广文案
        const script = `大家好，今天为大家推荐一款${productName}。${productDesc}。感兴趣的朋友不要错过！`;
        
        const response = await fetch(buildApiUrl('/api/heygen/video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            avatarId: selectedAvatarForPromote || null,
            text: script,
            voiceId: voiceId,
            imageUrl: promoteProductImageBase64, // 商品图片
            productName: productName,
            productDesc: productDesc
          })
        });
        
        const contentType = response.headers.get('content-type') || '';
        let result;
        
        if (contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.error('服务器返回非JSON响应:', text.substring(0, 200));
          throw new Error('服务器返回了非 JSON 格式的响应');
        }
        
        if (!result.success) {
          showLoading(false);
          alert('❌ 创建失败：' + result.message);
          return;
        }
        
        const taskId = result.data?.video_id || result.data?.id || null;
        if (!taskId) {
          showLoading(false);
          alert('❌ 创建失败：未返回任务ID（video_id），无法查询状态。');
          return;
        }
        
        const workId = Date.now().toString();
        
        const work = {
          id: workId,
          type: 'product',
          productName: productName,
          title: productName,
          script: script,
          platform: 'heygen',
          taskId: taskId,
          status: 'processing',
          progress: 0,
          videoUrl: null,
          avatarId: selectedAvatarForPromote,
          voiceId: voiceId,
          imageUrl: promoteProductImageBase64,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(work);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        showLoading(false);
        alert('✅ 推广视频任务已提交！\n\n任务正在后台处理中，您可以在"作品管理"中查看进度。');
        
        // 清空表单
        document.getElementById('promoteProductName').value = '';
        document.getElementById('promoteProductDesc').value = '';
        removeProductImage('promote');
        updatePromoteCharCount();
        
        // 开始轮询
        startPromoteTaskPolling(workId, taskId, apiKey);
        loadPromoteHistory();
        
      } catch (error) {
        console.error('创建推广视频错误:', error);
        showLoading(false);
        alert('❌ 创建失败：' + error.message);
      }
    }
    
    // 推广任务轮询
    function startPromoteTaskPolling(workId, taskId, apiKey) {
      if (taskPollingIntervals.has(workId)) {
        clearInterval(taskPollingIntervals.get(workId));
      }
      
      let pollCount = 0;
      const maxPolls = 300;
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          taskPollingIntervals.delete(workId);
          updatePromoteWorkStatus(workId, 'failed', 0, null, '任务超时');
          return;
        }
        
        try {
          const response = await fetch(`/api/heygen/task/${taskId}?apiKey=${encodeURIComponent(apiKey)}`);
          const contentType = response.headers.get('content-type') || '';
          let result;
          
          if (contentType.includes('application/json')) {
            result = await response.json();
          } else {
            return;
          }
          
          if (result.success) {
            const status = result.status;
            const progress = result.progress || 0;
            const videoUrl = result.videoUrl || result.data?.video_url;
            const error = result.error;
            
            updatePromoteWorkStatus(workId, status, progress, videoUrl, error);
            
            if (status === 'completed' || status === 'failed') {
              clearInterval(pollInterval);
              taskPollingIntervals.delete(workId);
            }
          }
        } catch (error) {
          console.error('轮询推广任务状态错误:', error);
        }
      }, 10000); // 每10秒查询一次
      
      taskPollingIntervals.set(workId, pollInterval);
    }
    
    // 更新推广作品状态
    function updatePromoteWorkStatus(workId, status, progress, videoUrl, error) {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const index = works.findIndex(w => w.id === workId);
      
      if (index !== -1) {
        works[index].status = status === 'completed' ? 'ready' : status;
        works[index].progress = progress;
        works[index].updateDate = new Date().toISOString();
        
        if (videoUrl) {
          works[index].videoUrl = videoUrl;
        }
        
        if (error) {
          works[index].error = error;
        }
        
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        if (document.getElementById('promotePanel') && !document.getElementById('promotePanel').classList.contains('hidden')) {
          loadPromoteHistory();
        }
      }
    }
    
    // 加载推广历史
    function loadPromoteHistory() {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const promoteWorks = works.filter(w => w.type === 'product');
      const container = document.getElementById('promoteHistoryList');
      
      if (!container) return;
      
      if (promoteWorks.length === 0) {
        container.innerHTML = '<div class="empty-history">暂无推广作品</div>';
        return;
      }
      
      container.innerHTML = promoteWorks.map(work => {
        const statusBadge = work.status === 'ready' 
          ? '<span style="background: var(--success); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">已完成</span>'
          : work.status === 'failed'
          ? '<span style="background: var(--danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">失败</span>'
          : '<span style="background: var(--warning); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">处理中 ' + (work.progress || 0) + '%</span>';
        
        return `
          <div class="history-item">
            <div class="history-header">
              <span class="history-avatar">🛒</span>
              <div class="history-meta">
                ${statusBadge}
                <div class="history-date">${new Date(work.createDate).toLocaleString()}</div>
              </div>
            </div>
            <div class="history-script">${work.productName || work.title}</div>
            <div class="history-actions">
              ${work.videoUrl ? `<button class="history-btn" onclick="playWork('${work.id}')">▶️ 播放</button>` : ''}
              ${work.videoUrl ? `<button class="history-btn" onclick="downloadWork('${work.id}')">📥 下载</button>` : ''}
              <button class="history-btn" onclick="deletePromoteWork('${work.id}')">🗑️ 删除</button>
              ${work.status === 'processing' ? `<button class="history-btn" onclick="refreshPromoteWork('${work.id}')">🔄 刷新</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
    
    // 删除推广作品
    function deletePromoteWork(id) {
      if (!confirm('确定要删除这个作品吗？')) return;
      let works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      works = works.filter(w => w.id !== id);
      localStorage.setItem('cn_dh_works', JSON.stringify(works));
      loadPromoteHistory();
    }
    
    // 刷新推广作品状态
    async function refreshPromoteWork(id) {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const work = works.find(w => w.id === id);
      
      if (!work || !work.taskId) return;
      
      const apiKey = getHeyGenApiKey();
      if (!apiKey) return;
      
      try {
        const response = await fetch(`/api/heygen/task/${work.taskId}?apiKey=${encodeURIComponent(apiKey)}`);
        const result = await response.json();
        
        if (result.success) {
          updatePromoteWorkStatus(id, result.status, result.progress, result.videoUrl, result.error);
          loadPromoteHistory();
        }
      } catch (error) {
        console.error('刷新作品状态错误:', error);
      }
    }
    
    // ========== 面板加载函数 ==========
    
    
    // 为不同上下文加载缓存的语音列表
    function loadCachedVoicesForContext(context) {
      try {
        const cachedVoices = localStorage.getItem('heygen_voices');
        if (cachedVoices) {
          const voices = JSON.parse(cachedVoices);
          let voiceSelectId;
          if (context === 'recite') {
            voiceSelectId = 'reciteVoiceSelect';
          } else if (context === 'promote') {
            voiceSelectId = 'promoteVoiceSelect';
          } else {
            return;
          }
          
          const voiceSelect = document.getElementById(voiceSelectId);
          if (voiceSelect && Array.isArray(voices) && voices.length > 0) {
            voiceSelect.innerHTML = '<option value="">默认语音（自动选择）</option>';
            
            voices.forEach(voice => {
              const option = document.createElement('option');
              option.value = voice.voice_id;
              let displayName = voice.name || voice.voice_id;
              if (voice.language) {
                displayName += ` (${voice.language})`;
              }
              if (voice.gender) {
                displayName += ` - ${voice.gender === 'female' ? '女声' : voice.gender === 'male' ? '男声' : voice.gender}`;
              }
              option.textContent = displayName;
              voiceSelect.appendChild(option);
            });
          }
        }
      } catch (error) {
        console.warn('加载缓存的语音列表失败:', error);
      }
    }
    
    // 初始化
    init();
  
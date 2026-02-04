/**
 * 数字人 - 主应用（依赖 core.js, config.js, nav.js, state.js, main.js）
 * 全局变量在 modules/state.js 中定义
 */
// loadRecitePanel、switchRecitePlatform、updateRecitePlatformUI、updateReciteCharCountYunwu、loadReciteAvatars 在 modules/recite.js
// reciteTtsVoiceList 在 state.js；TTS 音色列表、loadYunwuTTSVoices、previewReciteVoice、loadCachedVoicesForContext 在 modules/voices.js

// 加载卖货推送面板（仅云雾）
function loadPromotePanel() {
  if (typeof selectedPromotePlatform !== 'undefined') selectedPromotePlatform = 'yunwu';
  loadCachedVoicesForContext('promote');
  const promptInput = document.getElementById('promotePrompt');
  if (promptInput) {
    promptInput.addEventListener('input', updatePromotePromptCount);
    updatePromotePromptCount();
  }
  renderPromotePersonImages();
  renderPromoteProductImages();
  const yunwuSection = document.getElementById('promoteYunwuSection');
  if (yunwuSection) yunwuSection.style.display = 'block';
}

// 卖货推送仅云雾，保留空实现供兼容
function switchPromotePlatform(platform) {
  if (!platform || platform !== 'yunwu') return;
  if (typeof selectedPromotePlatform !== 'undefined') selectedPromotePlatform = 'yunwu';
  const yunwuSection = document.getElementById('promoteYunwuSection');
  if (yunwuSection) yunwuSection.style.display = 'block';
}

function updatePromotePlatformUI(platform) {
  if (platform !== 'yunwu') return;
  const yunwuSection = document.getElementById('promoteYunwuSection');
  if (yunwuSection) yunwuSection.style.display = 'block';
}

// 暴露函数到window对象，供HTML调用（确保在全局作用域）
if (typeof window !== 'undefined') {
  window.switchPromotePlatform = switchPromotePlatform;
  // recite: loadRecitePanel/switchRecitePlatform/updateRecitePlatformUI/updateReciteCharCountYunwu 由 modules/recite.js 暴露
  // ✅ 暴露新流程函数到全局
  window.switchReciteAudioMode = switchReciteAudioMode;
  window.handleReciteAudioUpload = handleReciteAudioUpload;
  window.previewReciteVoice = previewReciteVoice;
  window.showReciteAudioTemplates = showReciteAudioTemplates;
  window.hideReciteAudioTemplates = hideReciteAudioTemplates;
  window.selectReciteAudioTemplate = selectReciteAudioTemplate;
  window.clearReciteSelectedAudio = clearReciteSelectedAudio;
  window.handleReciteVideoUpload = handleReciteVideoUpload;
  window.clearReciteSelectedVideo = clearReciteSelectedVideo;
  window.showReciteVideoHistory = showReciteVideoHistory;
  window.showReciteAudioHistory = showReciteAudioHistory;
  window.openReciteSelectDigitalHumanModal = openReciteSelectDigitalHumanModal;
  window.closeReciteSelectDigitalHumanModal = closeReciteSelectDigitalHumanModal;
  window.openReciteTTSModal = openReciteTTSModal;
  window.closeReciteTTSModal = closeReciteTTSModal;
  window.toggleReciteSliderDropdown = toggleReciteSliderDropdown;
  window.initReciteBottomBarSliders = initReciteBottomBarSliders;
  window.reciteGenerateAudio = reciteGenerateAudio;
  window.reciteUseGeneratedAudio = reciteUseGeneratedAudio;
  window.reciteGenerateVideo = reciteGenerateVideo;
  window.initReciteVideoInputs = initReciteVideoInputs;
  window.selectMyDigitalHumanByElement = selectMyDigitalHumanByElement;
  window.loadPromotePanel = loadPromotePanel;
}
    
    // 初始化
    // 作品管理视图状态
    let dhWorksViewMode = localStorage.getItem('dh_works_view_mode') || 'list'; // 'tile' | 'list'
    let dhWorksShowFavorites = false;
    let dhWorksFilter = ''; // '' | 'digital' | 'works'
    
    function init() {
      loadConfigs();
      loadHistory();
      loadDigitalHumans();
      loadWorks();
      updateStepIndicator(1);
      
      // 初始化作品管理视图切换和收藏功能
      initWorksViewToggle();
      initWorksFilter();
      
      // 初始化时设置默认筛选（全部）
      const allFilterBtn = document.getElementById('dhWorksFilterAll');
      if (allFilterBtn) {
        allFilterBtn.classList.add('active');
      }
      
      // 绑定左侧菜单：点击切换中间栏（创建数字人 / 诵读文案 / 卖货推送）
      const nav = document.getElementById('dhNav');
      if (nav) {
        nav.querySelectorAll('.studio-nav-item').forEach(function (item) {
          item.addEventListener('click', function () {
            const menu = item.getAttribute('data-menu');
            if (!menu) return;
            document.querySelectorAll('.studio-nav-item').forEach(function (n) { n.classList.remove('active'); });
            item.classList.add('active');
            const createPanel = document.getElementById('createPanel');
            const recitePanel = document.getElementById('recitePanel');
            const promotePanel = document.getElementById('promotePanel');
            [createPanel, recitePanel, promotePanel].forEach(function (el) {
              if (el) el.classList.add('hidden');
            });
            if (menu === 'create' && createPanel) {
              createPanel.classList.remove('hidden');
            } else if (menu === 'recite' && recitePanel) {
              recitePanel.classList.remove('hidden');
              if (typeof window.loadRecitePanel === 'function') window.loadRecitePanel();
            } else if (menu === 'promote' && promotePanel) {
              promotePanel.classList.remove('hidden');
              if (typeof window.loadPromotePanel === 'function') window.loadPromotePanel();
            }
          });
        });
      }
      
      // ✅ 不再自动加载 avatar 模板，只有点击刷新按钮才会加载
      // 显示初始提示状态
      const container = document.getElementById('avatarTemplateGrid');
      const loadingState = document.getElementById('avatarLoadingState');
      if (container && loadingState) {
        loadingState.style.display = 'block';
        loadingState.innerHTML = `
          <div style="font-size: 2rem; margin-bottom: 12px;">👆</div>
          <div style="font-size: 0.9rem; margin-bottom: 8px;">点击右上角"刷新模板"按钮加载数字人模板</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.7;">请确保已配置并测试 HeyGen API Key</div>
        `;
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
    
    // ✅ 上传视频文件为URL（使用FormData，不再使用Base64）
    async function uploadVideoFile(file) {
      try {
        showLoading(true, '正在上传视频文件...');
        
        // 使用FormData上传文件
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(buildApiUrl('/api/upload-temp-asset'), {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        showLoading(false);
        
        if (result.success && result.url) {
          console.log('✅ 视频已上传为URL:', result.url);
          return result.url;
        } else {
          throw new Error(result.message || '上传失败');
        }
      } catch (error) {
        showLoading(false);
        console.error('视频上传失败:', error);
        throw error;
      }
    }

    async function handleVideoFile(file) {
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
      
      // ✅ 视频文件：上传为URL，不再使用Base64
      if (isVideo) {
        try {
          const uploadedUrl = await uploadVideoFile(file);
          selectedVideoUrl = uploadedUrl;
          console.log('视频文件已上传为URL:', uploadedUrl);
        } catch (error) {
          alert('视频上传失败：' + error.message + '\n\n将使用本地预览URL');
          // 如果上传失败，使用本地预览URL作为后备
          selectedVideoUrl = URL.createObjectURL(file);
        }
      } else {
        // 图片文件：继续使用本地预览URL
        selectedVideoUrl = URL.createObjectURL(file);
      }

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
          imagePreview.src = selectedVideoUrl;
          imagePreview.style.display = 'block';
        }
        if (durationEl) durationEl.textContent = '-';
      } else {
        if (imagePreview) imagePreview.style.display = 'none';
        videoPreview.style.display = 'block';
        videoPreview.src = selectedVideoUrl;
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
    
    // ✅ 上传音频文件为URL（不再使用Base64）
    async function uploadAudioFile(file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(buildApiUrl('/api/upload-temp-asset'), {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success && result.url) {
          console.log('✅ 音频已上传为URL:', result.url);
          return result.url;
        } else {
          throw new Error(result.message || '上传失败');
        }
      } catch (error) {
        console.error('音频上传失败:', error);
        throw error;
      }
    }
    
    // ✅ 上传图片文件为URL（不再使用Base64）
    async function uploadImageFile(file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(buildApiUrl('/api/upload-temp-asset'), {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success && result.url) {
          console.log('✅ 图片已上传为URL:', result.url);
          return result.url;
        } else {
          throw new Error(result.message || '上传失败');
        }
      } catch (error) {
        console.error('图片上传失败:', error);
        throw error;
      }
    }
    
    async function handleAudioFile(file) {
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
      
      // ✅ 直接上传为URL，不转换为Base64
      try {
        showLoading(true, '正在上传音频文件...');
        const audioUrl = await uploadAudioFile(file);
        
        // 存储URL而不是文件对象
        selectedAudioFile = file; // 保留文件对象用于预览
        reciteAudioBase64Yunwu = audioUrl; // 存储URL
        promoteAudioBase64Yunwu = audioUrl; // 存储URL
        
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
        
        showLoading(false);
        console.log('✅ 音频文件已上传为URL:', audioUrl);
      } catch (error) {
        showLoading(false);
        alert('❌ 音频上传失败：' + error.message);
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
        const modeEl = document.getElementById('videoModeSelect');
        const mode = (modeEl && modeEl.value) ? modeEl.value : 'std';
        await createYunwuDigitalHuman(name, desc, script, mode);
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
          headers: Object.assign({ 'Content-Type': 'application/json' }, (window.getAuthHeaders && window.getAuthHeaders()) || {}),
          body: JSON.stringify({
            avatarId: avatarId,
            text: script,
            voiceId: voiceId,
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
        // ✅ 确保thumbnail是URL格式（不再使用Base64）
        if (selectedTemplatePreviewImage) {
          // 如果是data URL，需要先上传为URL
          if (selectedTemplatePreviewImage.startsWith('data:')) {
            try {
              showLoading(true, '正在上传缩略图...');
              const response = await fetch(selectedTemplatePreviewImage);
              const blob = await response.blob();
              const file = new File([blob], 'template-thumbnail.png', { type: 'image/png' });
              thumbnail = await uploadImageFile(file);
            } catch (error) {
              console.error('缩略图上传失败:', error);
              thumbnail = selectedTemplatePreviewImage; // 如果上传失败，使用原始data URL
            }
          } else {
            thumbnail = selectedTemplatePreviewImage;
          }
        } else if (selectedVideoFile && extractedFrames.length > 0) {
          const selectedFrame = extractedFrames.find(f => f.id === selectedFrameId) || extractedFrames[0];
          if (selectedFrame && selectedFrame.dataUrl) {
            // 如果是data URL，需要先上传为URL
            try {
              showLoading(true, '正在上传缩略图...');
              const response = await fetch(selectedFrame.dataUrl);
              const blob = await response.blob();
              const file = new File([blob], 'frame-thumbnail.png', { type: 'image/png' });
              thumbnail = await uploadImageFile(file);
            } catch (error) {
              console.error('缩略图上传失败:', error);
              thumbnail = selectedFrame.dataUrl; // 如果上传失败，使用原始data URL
            }
          }
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

    // 云雾数字人创建（基于统一数字人创建接口），mode: std=标准模式 / pro=专家模式
    async function createYunwuDigitalHuman(name, desc, script, mode) {
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
        // ✅ 获取图片URL（直接上传为URL，不再使用Base64）
        let imageUrl = null;

        // 优先使用上传的视频文件中的帧
        if (extractedFrames && extractedFrames.length > 0) {
          const selectedFrame = extractedFrames.find(f => f.id === selectedFrameId) || extractedFrames[0];
          if (selectedFrame && selectedFrame.dataUrl) {
            // ✅ 将data URL转换为Blob，然后上传为URL
            try {
              showLoading(true, '正在上传图片...');
              const response = await fetch(selectedFrame.dataUrl);
              const blob = await response.blob();
              const file = new File([blob], 'frame.png', { type: 'image/png' });
              imageUrl = await uploadImageFile(file);
              console.log('✅ 图片已从视频帧提取并上传为URL:', imageUrl);
            } catch (error) {
              console.error('❌ 图片上传失败:', error);
              showLoading(false);
              alert('图片上传失败：' + error.message);
              return;
            }
          }
        }

        // 如果没有帧缩略图，尝试使用上传的图片文件
        if (!imageUrl && selectedVideoFile) {
          // 如果上传的是图片文件，直接上传为URL
          if (selectedVideoFile.type && selectedVideoFile.type.startsWith('image/')) {
            console.log('📷 开始上传图片文件，文件类型:', selectedVideoFile.type, '文件大小:', (selectedVideoFile.size / 1024).toFixed(2), 'KB');
            try {
              showLoading(true, '正在上传图片...');
              imageUrl = await uploadImageFile(selectedVideoFile);
              console.log('✅ 图片文件已上传为URL:', imageUrl);
            } catch (error) {
              console.error('❌ 图片文件上传失败:', error);
              showLoading(false);
              alert('图片上传失败：' + error.message);
              return;
            }
          }
        }

        // 如果还没有图片，尝试使用模板预览图
        if (!imageUrl && typeof selectedTemplatePreviewImage !== 'undefined' && selectedTemplatePreviewImage) {
          // ✅ 将模板预览图转换为Blob，然后上传为URL
          try {
            showLoading(true, '正在上传图片...');
            const response = await fetch(selectedTemplatePreviewImage);
            const blob = await response.blob();
            const file = new File([blob], 'template.png', { type: 'image/png' });
            imageUrl = await uploadImageFile(file);
            console.log('✅ 图片已从模板预览图提取并上传为URL:', imageUrl);
          } catch (error) {
            console.error('❌ 模板图片上传失败:', error);
            showLoading(false);
            alert('图片上传失败：' + error.message);
            return;
          }
        }

        if (!imageUrl) {
          console.error('❌ 图片验证失败: 未找到图片');
          showLoading(false);
          alert('请先在步骤2中上传一张数字人头像图片。\n\n提示：云雾数字人需要一张清晰的正面或半侧面人物照片。');
          return;
        }
        
        console.log('✅ 图片准备完成，URL:', imageUrl);

        // ✅ 处理音频文件（直接上传为URL，不再使用Base64）
        let audioFileUrl = null;
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
              showLoading(true, '正在上传音频文件...');
              audioFileUrl = await uploadAudioFile(audioFile);
              console.log('✅ 音频文件已上传为URL:', audioFileUrl);
            } catch (error) {
              console.error('音频文件上传失败:', error);
              showLoading(false);
              alert('音频文件上传失败：' + error.message);
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
        
        if (!audioFileUrl) {
          showLoading(false);
          alert('❌ 缺少必需参数：音频文件\n\n云雾数字人必须提供音频，请：\n1. 在步骤2中上传音频文件\n2. 或使用实时录制功能录制音频');
          return;
        }
        
        const videoMode = (mode === 'pro' || mode === 'std') ? mode : 'std';
        // 详细记录请求参数
        const requestPayload = {
          provider: 'yunwu',
          imageUrl,
          text: script || '数字人视频',
          prompt: script || '数字人视频生成',
          audioFile: audioFileUrl,
          name,
          description: desc,
          mode: videoMode
        };
        
        console.log('=== 发送创建请求 ===');
        console.log('请求参数摘要:', {
          provider: requestPayload.provider,
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
          headers: Object.assign({ 'Content-Type': 'application/json' }, (window.getAuthHeaders && window.getAuthHeaders()) || {}),
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
        // ✅ 保存缩略图URL（不再使用Base64）
        // imageUrl已经是URL格式，直接使用
        const thumb = imageUrl;

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
          thumbnail: thumb, // ✅ imageUrl已经是URL格式
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
        let url = buildApiUrl(`/api/digital-human/task/${provider}/${taskId}`);
        if (provider === 'yunwu' && altId && String(altId).trim() !== String(taskId)) {
          url += '?altId=' + encodeURIComponent(String(altId).trim());
        }
        return url;
      };
      const authHeaders = (window.getAuthHeaders && window.getAuthHeaders()) || {};
      
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
          const response = await fetch(taskUrl(), { headers: authHeaders });

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
      if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].includes(s)) return 'done';
      if (['fail', 'failed', 'error'].includes(s)) return 'failed';
      return 'processing';
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

    // 递归收集视频URL（参考AI创作工坊）
    // function collectTaskIdQueryVideoUrls(obj, out) {
    //   if (!obj || typeof obj !== 'object') return;
    //   if (Array.isArray(obj)) {
    //     obj.forEach(function (x) {
    //       if (typeof x === 'string' && /^https?:\/\//i.test(x) && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(x)) {
    //         out.push(x);
    //       } else if (x && typeof x === 'object' && x.url && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(x.url)) {
    //         out.push(x.url);
    //       } else if (x && typeof x === 'object') {
    //         collectTaskIdQueryVideoUrls(x, out);
    //       }
    //     });
    //     return;
    //   }
    //   const urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl', 'video_file', 'output_file'];
    //   urlKeys.forEach(function (k) {
    //     const v = obj[k];
    //     if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
    //       // 检查是否是视频URL
    //       if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(v)) {
    //         out.push(v);
    //       } else if (k === 'result_url' || k === 'url') {
    //         // result_url 和 url 可能是视频，先加入
    //         out.push(v);
    //       }
    //     } else if (Array.isArray(v)) {
    //       v.forEach(function (u) {
    //         if (typeof u === 'string' && /^https?:\/\//i.test(u) && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u)) {
    //           out.push(u);
    //         } else if (u && u.url && /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u.url)) {
    //           out.push(u.url);
    //         } else if (u && typeof u === 'object') {
    //           collectTaskIdQueryVideoUrls(u, out);
    //         }
    //       });
    //     } else if (v && typeof v === 'object') {
    //       collectTaskIdQueryVideoUrls(v, out);
    //     }
    //   });
    //   // 递归搜索所有字段
    //   Object.keys(obj).forEach(function (k) {
    //     if (k !== 'task_status' && k !== 'status' && k !== 'task_id' && k !== 'id' && k !== 'code' && k !== 'message') {
    //       collectTaskIdQueryVideoUrls(obj[k], out);
    //     }
    //   });
    // }
    
    // function renderTaskIdQueryResult(result) {
    //   const container = document.getElementById('taskIdQueryResult');
    //   if (!container) return;

    //   if (!result) {
    //     container.innerHTML = '';
    //     return;
    //   }

    //   const status = normalizeTaskStatus(result.status);
    //   const progress = result.progress || 0;
      
    //   // 改进视频URL提取（参考AI创作工坊，使用递归搜索）
    //   let videoUrl = result.videoUrl || 
    //                   result.data?.video_url || 
    //                   result.data?.url || 
    //                   result.data?.data?.video_url ||
    //                   result.data?.data?.url ||
    //                   result.data?.data?.task_result?.videos?.[0]?.url ||
    //                   result.data?.task_result?.videos?.[0]?.url ||
    //                   result.video_url ||
    //                   result.url ||
    //                   result.result_url ||
    //                   '';
      
    //   // 如果直接提取失败或不是视频URL，使用递归搜索
    //   if (!videoUrl || !/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(videoUrl)) {
    //     const videoUrls = [];
    //     collectTaskIdQueryVideoUrls(result, videoUrls);
    //     // 过滤出视频URL
    //     const filteredVideos = videoUrls.filter(url => /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(url));
    //     if (filteredVideos.length > 0) {
    //       videoUrl = filteredVideos[0];
    //     } else if (videoUrls.length > 0) {
    //       // 如果没有明确的视频扩展名，使用第一个URL（可能是result_url）
    //       videoUrl = videoUrls[0];
    //     }
    //   }
      
    //   const message = result.message || result.error || '';

    //   let html = `
    //     <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 12px;">
    //       <div style="display:flex; justify-content: space-between; gap: 12px; align-items:center;">
    //         <div style="font-weight: 700;">状态：${status}</div>
    //         <div style="color: var(--text-secondary); font-size: 0.9rem;">进度：${progress || 0}</div>
    //       </div>
    //   `;

    //   if (message && status !== 'completed') {
    //     html += `<div style="margin-top: 8px; color: var(--text-secondary); white-space: pre-wrap;">${escapeHtml(message)}</div>`;
    //   }
      
    //   // 显示原始数据（用于调试）
    //   if (status === 'completed' && !videoUrl && result.data) {
    //     html += `
    //       <div style="margin-top: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border: 1px solid var(--border);">
    //         <div style="font-weight: 700; margin-bottom: 8px; color: var(--warning);">⚠️ 任务已完成，但未找到视频URL</div>
    //         <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">请检查API响应数据，视频URL可能在其他字段中。</div>
    //         <details style="margin-top: 8px;">
    //           <summary style="cursor: pointer; color: var(--primary); font-size: 0.85rem;">查看原始响应数据</summary>
    //           <pre style="margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; overflow-x: auto; font-size: 0.75rem; max-height: 300px; overflow-y: auto;">${escapeHtml(JSON.stringify(result.data, null, 2))}</pre>
    //         </details>
    //       </div>
    //     `;
    //   }

    //   if (videoUrl) {
    //     html += `
    //       <div style="margin-top: 12px;">
    //         <div style="font-weight: 700; margin-bottom: 8px;">🎬 视频结果</div>
    //         <video controls style="width: 100%; border-radius: 12px; background: #000;" src="${escapeHtml(videoUrl)}"></video>
    //         <div style="margin-top: 8px; display:flex; gap: 10px; flex-wrap: wrap;">
    //           <a class="btn secondary" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener" style="text-decoration:none; padding: 10px 14px;">🔗 打开链接</a>
    //           <a class="btn primary" href="${escapeHtml(videoUrl)}" download style="text-decoration:none; padding: 10px 14px;">⬇️ 下载视频</a>
    //         </div>
    //         <div style="margin-top: 8px; color: var(--text-secondary); font-size: 0.85rem; word-break: break-all;">${escapeHtml(videoUrl)}</div>
    //       </div>
    //     `;
    //   }

    //   html += `</div>`;
    //   container.innerHTML = html;
    // }

    // function stopTaskIdQueryPolling() {
    //   try {
    //     const providerEl = document.getElementById('taskIdQueryProvider');
    //     const taskIdEl = document.getElementById('taskIdQueryInput');
    //     const provider = providerEl ? providerEl.value : 'yunwu';
    //     const taskId = taskIdEl ? taskIdEl.value.trim() : '';
    //     const key = `${taskIdQueryKeyPrefix}${provider}_${taskId || 'current'}`;
    //     if (taskPollingIntervals.has(key)) {
    //       clearInterval(taskPollingIntervals.get(key));
    //       taskPollingIntervals.delete(key);
    //     }
    //   } catch {}
    //   renderTaskIdQueryStatus('已停止查询', 'warning');
    // }

    // async function startTaskIdQueryPolling() {
    //   const providerEl = document.getElementById('taskIdQueryProvider');
    //   const taskIdEl = document.getElementById('taskIdQueryInput');
    //   const provider = providerEl ? providerEl.value : 'yunwu';
    //   const taskId = taskIdEl ? taskIdEl.value.trim() : '';

    //   if (!taskId) {
    //     renderTaskIdQueryStatus('请输入任务ID', 'error');
    //     return;
    //   }

    //   // 读取对应API Key
    //   const apiKey = provider === 'yunwu' ? getYunwuApiKey() : getHeyGenApiKey();
    //   if (!apiKey) {
    //     renderTaskIdQueryStatus(`未检测到 ${provider === 'yunwu' ? '云雾' : 'HeyGen'} API Key，请先在“创建数字人”页面配置并保存`, 'error');
    //     return;
    //   }

    //   const key = `${taskIdQueryKeyPrefix}${provider}_${taskId}`;
    //   // 如果已有轮询，先清除
    //   if (taskPollingIntervals.has(key)) {
    //     clearInterval(taskPollingIntervals.get(key));
    //     taskPollingIntervals.delete(key);
    //   }

    //   renderTaskIdQueryResult(null);
    //   renderTaskIdQueryStatus(`开始查询：${provider}/${taskId}（每10秒一次，最长10分钟）`, 'info');

    //   const pollIntervalMs = 10000;
    //   const maxPolls = 60; // 10分钟
    //   let pollCount = 0;

    //   const pollInterval = setInterval(async () => {
    //     pollCount++;

    //     if (pollCount > maxPolls) {
    //       clearInterval(pollInterval);
    //       taskPollingIntervals.delete(key);
    //       renderTaskIdQueryStatus('查询超时（10分钟仍未完成），已判定失败', 'error');
    //       renderTaskIdQueryResult({ success: false, status: 'failed', message: '查询超时（10分钟）' });
    //       return;
    //     }

    //     try {
    //       const resp = await fetch(buildApiUrl(`/api/digital-human/task/${provider}/${taskId}?apiKey=${encodeURIComponent(apiKey)}`));
    //       const contentType = resp.headers.get('content-type') || '';
    //       let result;
    //       if (contentType.includes('application/json')) {
    //         result = await resp.json();
    //       } else {
    //         const text = await resp.text();
    //         renderTaskIdQueryStatus(`服务器返回非JSON响应 (HTTP ${resp.status})`, 'error');
    //         renderTaskIdQueryResult({ success: false, status: 'failed', message: text.substring(0, 200) });
    //         return;
    //       }

    //       if (!result.success) {
    //         // 继续轮询，但展示最新错误
    //         renderTaskIdQueryStatus(`查询中（第${pollCount}/${maxPolls}次）：${result.message || '查询失败'}`, 'warning');
    //         renderTaskIdQueryResult({ ...result, status: 'processing' });
    //         return;
    //       }

    //       const status = normalizeTaskStatus(result.status);
    //       renderTaskIdQueryResult(result);
    //       renderTaskIdQueryStatus(`查询中（第${pollCount}/${maxPolls}次）：状态=${status}${result.progress ? `，进度=${result.progress}` : ''}`, 'info');

    //       if (status === 'completed') {
    //         clearInterval(pollInterval);
    //         taskPollingIntervals.delete(key);
    //         renderTaskIdQueryStatus('✅ 查询成功：任务已完成', 'success');
    //       } else if (status === 'failed') {
    //         clearInterval(pollInterval);
    //         taskPollingIntervals.delete(key);
    //         renderTaskIdQueryStatus('❌ 查询失败：任务失败', 'error');
    //       }
    //     } catch (e) {
    //       renderTaskIdQueryStatus('查询异常：' + (e && e.message ? e.message : String(e)), 'warning');
    //     }
    //   }, pollIntervalMs);
    //   taskPollingIntervals.set(key, pollInterval);
    // }

    // // 更新任务状态
    // function updateTaskStatus(digitalHumanId, status, progress, videoUrl, error) {
    //   const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
    //   const index = digitalHumans.findIndex(dh => dh.id === digitalHumanId);
      
    //   if (index !== -1) {
    //     const oldStatus = digitalHumans[index].status;
    //     digitalHumans[index].status = status;
    //     digitalHumans[index].progress = progress;
    //     digitalHumans[index].updateDate = new Date().toISOString();
        
    //     if (videoUrl) {
    //       digitalHumans[index].videoUrl = videoUrl;
    //     }
        
    //     // 保存错误信息（如果有）
    //     if (error) {
    //       digitalHumans[index].error = error;
    //     } else if (status === 'failed' && !digitalHumans[index].error) {
    //       // 如果状态是失败但没有错误信息，设置默认错误信息
    //       digitalHumans[index].error = '任务失败，原因未知';
    //     }
        
    //     localStorage.setItem('digital_humans', JSON.stringify(digitalHumans));
        
    //     // 如果正在查看数字人管理页面，刷新显示
    //     if (document.getElementById('managePanel') && !document.getElementById('managePanel').classList.contains('hidden')) {
    //       loadDigitalHumans();
    //     }
        
    //     // 记录状态变化
    //     if (oldStatus !== status) {
    //       console.log('任务状态更新:', { digitalHumanId, oldStatus, newStatus: status, error });
    //     }
    //   }
    // }
    
    // function resetCreateForm() {
    //   currentStep = 1;
    //   selectedAvatar = '👩‍💼';
    //   uploadedMaterials = [];
    //   recordedVideoBlob = null;
    //   recordedAudioBlob = null;
    //   selectedVideoFile = null;
    //   selectedVideoUrl = null;
    //   extractedFrames = [];
    //   selectedFrameId = null;
    //   selectedAvatarId = null;
    //   selectedTemplatePreviewVideo = null;
    //   selectedTemplatePreviewImage = null;
    //   selectedTemplateName = null;
    //   currentPlatform = 'heygen';
    //   document.getElementById('scriptInput').value = '';
    //   document.getElementById('digitalHumanName').value = '';
    //   document.getElementById('digitalHumanDesc').value = '';
    //   updateStepIndicator(1);
    //   goToStep(1);
      
    //   // 重置平台标签激活状态与 API 配置显示
    //   document.querySelectorAll('.platform-tab').forEach(tab => {
    //     const platform = tab.getAttribute('data-platform');
    //     if (platform === 'heygen') {
    //       tab.classList.add('active');
    //     } else {
    //       tab.classList.remove('active');
    //     }
    //   });
    //   document.querySelectorAll('.api-config').forEach(config => {
    //     config.classList.add('hidden');
    //   });
    //   const heygenConfig = document.getElementById('heygenConfig');
    //   if (heygenConfig) {
    //     heygenConfig.classList.remove('hidden');
    //   }
      
    //   // 清理视频预览
    //   removeUploadedVideo();
    //   hideTemplatePreview();
    // }
    
    // ========== 数字人管理 ==========
    
    function loadDigitalHumans() {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const container = document.getElementById('digitalHumanManageList');
      
      // 如果容器不存在，直接返回
      if (!container) {
        console.warn('找不到digitalHumanManageList容器，跳过加载数字人列表');
        return;
      }
      
      // 如果筛选为"全部"或"数字人"，数字人列表由loadWorks统一渲染，这里隐藏
      if (dhWorksFilter === '' || dhWorksFilter === 'digital') {
        container.style.display = 'none';
        return;
      }
      
      // 筛选为"作品"时，显示数字人列表（旧样式）
      container.style.display = '';
      
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
        <div class="history-item dh-card">
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
          <div class="history-actions dh-actions">
            ${dh.status === 'completed' || !dh.status || dh.status !== 'processing' ? `
              <button class="history-btn dh-icon-btn" onclick="previewDigitalHumanVideo('${dh.id}')">👁️ 预览</button>
              ${dh.videoUrl || dh.videoFile?.dataUrl ? `<button class="history-btn dh-icon-btn" onclick="downloadDigitalHumanVideo('${dh.id}')">⬇️ 下载</button>` : ''}
            ` : ''}
            ${dh.taskId ? `<button class="history-btn dh-icon-btn" onclick="requeryTaskStatus('${dh.id}')">🔎 重新查询</button>` : ''}
            ${dh.status === 'processing' && taskPollingIntervals.has(dh.id) ? `<button class="history-btn dh-icon-btn" onclick="stopTaskPollingForDigitalHuman('${dh.id}')" style="color: var(--warning);">⏹️ 停止</button>` : ''}
            ${dh.platform === 'heygen' && dh.status === 'processing' ? `<button class="history-btn dh-icon-btn" onclick="refreshTaskStatus('${dh.id}')">🔄 刷新</button>` : ''}
            ${dh.platform === 'yunwu' && dh.status === 'processing' ? `<button class="history-btn dh-icon-btn" onclick="refreshYunwuTaskStatus('${dh.id}')">🔄 刷新</button>` : ''}
            <button class="history-btn dh-icon-btn" onclick="deleteDigitalHuman('${dh.id}')">🗑️ 删除</button>
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
        const response = await fetch(buildApiUrl(`/api/digital-human/task/yunwu/${dh.taskId}`), {
          headers: (window.getAuthHeaders && window.getAuthHeaders()) || {}
        });
        
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
        const response = await fetch(buildApiUrl(`/api/heygen/task/${dh.taskId}`), {
          headers: (window.getAuthHeaders && window.getAuthHeaders()) || {}
        });
        
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
          headers: Object.assign({ 'Content-Type': 'application/json' }, (window.getAuthHeaders && window.getAuthHeaders()) || {}),
          body: JSON.stringify({
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
      if (typeof window.loadWorks === 'function') window.loadWorks();
    }
    
    // ========== 作品管理（已迁至 modules/works.js）==========

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
    
    // HeyGen/云雾 API 保存与测试已移至 modules/config.js，此处使用 window 上的 saveHeyGenConfig/saveYunwuConfig/testHeyGenApi/testYunwuApi
    
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
        let apiUrl = '/api/heygen/avatars';
        if (context === 'create') {
          apiUrl += '?resourceType=video';
        }
        
        const response = await fetch(buildApiUrl(apiUrl), {
          method: 'GET',
          headers: Object.assign({ 'Content-Type': 'application/json' }, (window.getAuthHeaders && window.getAuthHeaders()) || {})
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
        const response = await fetch(buildApiUrl('/api/heygen/voices'), {
          method: 'GET',
          headers: Object.assign({ 'Content-Type': 'application/json' }, (window.getAuthHeaders && window.getAuthHeaders()) || {})
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
    
    // showStatus 已由 modules/config.js 提供
    
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
      var url = (typeof window.DIGITAL_HUMAN_BACK_URL === 'string' && window.DIGITAL_HUMAN_BACK_URL) ||
        (document.body && document.body.getAttribute && document.body.getAttribute('data-back-url')) ||
        'page.html?page=my-digital-worker';
      window.location.href = url;
    }
    
    // ========== 诵读文案 / 卖货推送：数字人列表 ==========
    // loadReciteAvatars 已移至 modules/recite.js，内部调用 loadMyDigitalHumans('recite')
    
    // 加载用户自己创建的数字人列表（含 HeyGen 与 云雾已完成数字人）
    function loadMyDigitalHumans(context) {
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      
      // 获取当前选择的平台
      const currentPlatform = context === 'recite' ? selectedRecitePlatform : selectedPromotePlatform;
      
      // 过滤已完成且符合平台要求的数字人
      let completedDigitalHumans = digitalHumans.filter(dh => {
        if (dh.status !== 'completed') return false;
        if (dh.platform === 'heygen') return !!(dh.avatarId);
        if (dh.platform === 'yunwu') return !!(dh.thumbnail || dh.videoUrl);
        return false;
      });
      
      // 如果已选择平台，只显示该平台的数字人
      if (currentPlatform) {
        completedDigitalHumans = completedDigitalHumans.filter(dh => dh.platform === currentPlatform);
      }
      
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
        const platformHint = currentPlatform 
          ? (currentPlatform === 'yunwu' ? '云雾' : 'HeyGen')
          : '';
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-secondary); padding: 40px; grid-column: 1 / -1;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">👤</div>
            <div style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-primary);">暂无可用的${platformHint ? platformHint + '平台' : ''}数字人</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">
              ${currentPlatform ? `请先创建并完成至少一个${platformHint}数字人` : '请先选择平台并创建数字人'}
            </div>
            <button class="btn secondary" onclick="switchMenu('create')" style="margin-top: 16px; padding: 8px 16px;">
              ➕ 去创建数字人
            </button>
          </div>
        `;
        return;
      }
      
      const selectedId = context === 'recite' ? selectedReciteDigitalHumanId : selectedPromoteDigitalHumanId;
      container.innerHTML = completedDigitalHumans.map(dh => {
        const isSelected = selectedId === dh.id;
        const displayName = dh.name || '未命名数字人';
        const platformLabel = dh.platform === 'yunwu' ? '云雾' : 'HeyGen';
        const key = dh.platform === 'heygen' ? (dh.avatarId || dh.id) : dh.id;
        const safeKey = String(key).replace(/'/g, "\\'");
        const safeContext = String(context).replace(/'/g, "\\'");
        const safeDhId = String(dh.id).replace(/'/g, "\\'");
        const safePlatform = String(dh.platform).replace(/'/g, "\\'");
        
        // ✅ 仅显示URL格式的thumbnail，避免Base64导致431错误
        // 如果是URL格式的thumbnail，可以显示；如果是Base64，使用占位符
        let thumbnailUrl = null;
        if (dh.thumbnail) {
          // 检查是否是URL格式
          if (dh.thumbnail.startsWith('http://') || dh.thumbnail.startsWith('https://')) {
            thumbnailUrl = dh.thumbnail;
          }
          // Base64格式不显示，避免431错误
        }

        // ✅ 仅传递数字人ID，避免在HTML中嵌入大量数据导致431错误
        // 使用data属性存储ID，而不是在onclick中传递
        return `
          <div class="avatar-template-item ${isSelected ? 'selected' : ''}" 
               data-platform="${safePlatform}"
               data-key="${safeKey}"
               data-dh-id="${safeDhId}"
               data-context="${safeContext}"
               onclick="selectMyDigitalHumanByElement(this)"
               style="cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 12px; border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}; transition: all 0.2s;">
            ${thumbnailUrl ? 
              `<img src="${thumbnailUrl}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
              ''
            }
            <div style="width: 100%; aspect-ratio: 1; background: var(--bg-primary); border-radius: 8px; margin-bottom: 8px; display: ${thumbnailUrl ? 'none' : 'flex'}; align-items: center; justify-content: center; font-size: 2rem;">👤</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 8px;" title="${displayName}">${displayName}</div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); text-align: center; margin-top: 2px;">${platformLabel}</div>
            ${isSelected ? '<div style="text-align: center; margin-top: 4px; color: var(--primary); font-size: 0.75rem;">✓ 已选择</div>' : ''}
          </div>
        `;
      }).join('');
    }

    // ✅ 通过元素选择数字人（避免在onclick中传递大量数据）
    function selectMyDigitalHumanByElement(element) {
      const platform = element.dataset.platform;
      const avatarKey = element.dataset.key;
      const digitalHumanId = element.dataset.dhId;
      const context = element.dataset.context;
      
      selectMyDigitalHuman(platform, avatarKey, digitalHumanId, context);
    }
    
    function selectMyDigitalHuman(platform, avatarKey, digitalHumanId, context) {
      const containerId = context === 'recite' ? 'reciteAvatarSelector' : 'promoteAvatarSelector';
      const container = document.getElementById(containerId);
      if (container) {
        container.querySelectorAll('.avatar-template-item').forEach(item => item.classList.remove('selected'));
        // 标记选中的项
        const selectedItem = container.querySelector(`[data-dh-id="${digitalHumanId}"]`);
        if (selectedItem) {
          selectedItem.classList.add('selected');
        }
      }
      const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      const dh = platform === 'yunwu' && digitalHumanId ? digitalHumans.find(function(d) { return d.id === digitalHumanId; }) : null;
      const hasVideoUrl = !!(dh && dh.videoUrl);
      
      if (context === 'recite') {
        // 如果当前选择的平台与数字人平台不一致，自动切换平台
        if (selectedRecitePlatform && selectedRecitePlatform !== platform) {
          // 平台不匹配，自动切换
          switchRecitePlatform(platform);
        } else if (!selectedRecitePlatform) {
          // 如果还没有选择平台，设置为数字人的平台
          switchRecitePlatform(platform);
        }
        
        // 更新选择状态
        selectedRecitePlatform = platform;
        selectedAvatarForRecite = platform === 'heygen' ? avatarKey : null;
        selectedReciteDigitalHumanId = digitalHumanId;
        reciteAudioBase64Yunwu = null;
        
        // 更新平台UI（确保UI与选择一致）
        updateRecitePlatformUI(platform);
        
        // ✅ 如果是云雾平台且有视频，自动填充到步骤3（仅使用视频ID，避免传递长URL）
        if (platform === 'yunwu' && dh) {
          // 优先使用视频ID，避免传递长URL导致431错误
          const videoId = dh.videoId || null;
          const videoUrl = dh.videoUrl || null;
          
          reciteSelectedVideo = {
            id: videoId,
            url: videoUrl, // 保留URL用于后续API调用，但不显示在UI中
            name: dh.name || '已选择的数字人视频'
          };
          
          const videoIdInput = document.getElementById('reciteVideoIdInput');
          const videoUrlInput = document.getElementById('reciteVideoUrlInput');
          
          // ✅ 优先填充视频ID，避免在输入框中显示长URL
          if (videoId && videoIdInput) {
            videoIdInput.value = videoId;
            if (videoUrlInput) videoUrlInput.value = ''; // 清空URL输入框
          } else if (videoUrl && videoUrlInput) {
            // 如果没有ID，才使用URL（但截断显示）
            videoUrlInput.value = videoUrl;
            if (videoIdInput) videoIdInput.value = '';
          }
          
          updateReciteSelectedVideoUI();
        }
        
        // ✅ 不再需要更新音频上传区域（已改为自动生成）
      } else {
        // 如果当前选择的平台与数字人平台不一致，自动切换平台
        if (selectedPromotePlatform && selectedPromotePlatform !== platform) {
          // 平台不匹配，自动切换
          switchPromotePlatform(platform);
        } else if (!selectedPromotePlatform) {
          // 如果还没有选择平台，设置为数字人的平台
          switchPromotePlatform(platform);
        }
        
        // 更新选择状态
        selectedPromotePlatform = platform;
        // ✅ 已删除：不再需要选择数字人
        selectedPromoteDigitalHumanId = null;
        promoteAudioBase64Yunwu = null;
        
        // 更新平台UI（确保UI与选择一致）
        updatePromotePlatformUI(platform);
        
        // ✅ 已删除：不再需要音频上传区域
        if (statusEl) statusEl.style.display = 'none';
        const inp = document.getElementById('promoteYunwuAudioInput');
        if (inp) inp.value = '';
      }
      loadMyDigitalHumans(context);
    }
    
    if (typeof window !== 'undefined') {
      window.loadMyDigitalHumans = loadMyDigitalHumans;
    }
    
    // ✅ 已删除：handleReciteYunwuAudio - 不再需要手动上传音频，改为自动生成
    function handlePromoteYunwuAudio(e) {
      const f = e.target?.files?.[0];
      if (!f) { promoteAudioBase64Yunwu = null; return; }
      const reader = new FileReader();
      reader.onload = function() {
        let s = String(reader.result || '');
        if (s.indexOf('data:') === 0) { const i = s.indexOf(','); s = i >= 0 ? s.slice(i + 1) : ''; }
        promoteAudioBase64Yunwu = s.replace(/[\s\n\r]/g, '');
      };
      reader.readAsDataURL(f);
      var se = document.getElementById('promoteVideoSoundStatus');
      if (se) se.style.display = 'none';
    }

    function arrayBufferToBase64(buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }
    function audioBufferToWav(buffer) {
      var numCh = buffer.numberOfChannels;
      var sampleRate = buffer.sampleRate;
      var length = buffer.length * numCh * 2;
      var header = new ArrayBuffer(44);
      var v = new DataView(header);
      function w(str, offset) { for (var i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i)); }
      w('RIFF', 0);
      v.setUint32(4, 36 + length, true);
      w('WAVE', 8);
      w('fmt ', 12);
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, numCh, true);
      v.setUint32(24, sampleRate, true);
      v.setUint32(28, sampleRate * numCh * 2, true);
      v.setUint16(32, numCh * 2, true);
      v.setUint16(34, 16, true);
      w('data', 36);
      v.setUint32(40, length, true);
      var ch0 = buffer.getChannelData(0);
      var ch1 = numCh > 1 ? buffer.getChannelData(1) : null;
      var pcm = new Int16Array(buffer.length * numCh);
      for (var i = 0; i < buffer.length; i++) {
        pcm[i * numCh] = Math.max(-32768, Math.min(32767, ch0[i] * 32768)) | 0;
        if (ch1) pcm[i * numCh + 1] = Math.max(-32768, Math.min(32767, ch1[i] * 32768)) | 0;
      }
      var out = new Uint8Array(44 + pcm.byteLength);
      out.set(new Uint8Array(header), 0);
      out.set(new Uint8Array(pcm.buffer), 44);
      return out.buffer;
    }
    // ✅ extractAudioFromVideoUrl保留供卖货推送功能使用（诵读文案不再使用）
    function extractAudioFromVideoUrl(videoUrl) {
      return new Promise(function(resolve, reject) {
        if (!videoUrl || !(typeof buildApiUrl === 'function')) {
          reject(new Error('缺少视频地址或环境'));
          return;
        }
        var proxyUrl = buildApiUrl('/api/proxy-media?url=' + encodeURIComponent(videoUrl));
        var video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.muted = false;
        video.playsInline = true;
        video.src = proxyUrl;
        var chunks = [];
        var recorder;
        var timeoutId;
        
        video.onerror = function() { 
          if (timeoutId) clearTimeout(timeoutId);
          reject(new Error('视频加载失败，请检查地址或网络')); 
        };
        
        video.oncanplaythrough = function() {
          try {
            var stream = (video.captureStream && video.captureStream()) || (video.mozCaptureStream && video.mozCaptureStream());
            if (!stream) {
              reject(new Error('当前浏览器不支持从视频截取音轨'));
              return;
            }
            
            var audioTracks = stream.getAudioTracks();
            if (!audioTracks || audioTracks.length === 0) {
              reject(new Error('视频中没有音频轨道，无法提取音频'));
              return;
            }
            
            var supportedMimeTypes = [
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/mp4',
              'audio/ogg;codecs=opus',
              'audio/ogg',
              ''
            ];
            
            var mime = '';
            for (var i = 0; i < supportedMimeTypes.length; i++) {
              var testMime = supportedMimeTypes[i];
              if (!testMime || (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(testMime))) {
                mime = testMime;
                break;
              }
            }
            
            try {
              recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
            } catch (e) {
              try {
                recorder = new MediaRecorder(stream);
                mime = '';
              } catch (e2) {
                reject(new Error('无法创建MediaRecorder：' + (e2.message || e2.toString())));
                return;
              }
            }
            
            recorder.onerror = function(event) {
              if (timeoutId) clearTimeout(timeoutId);
              reject(new Error('MediaRecorder错误：' + (event.error ? event.error.message : '未知错误')));
            };
            
            recorder.ondataavailable = function(ev) { 
              if (ev.data && ev.data.size) chunks.push(ev.data); 
            };
            
            recorder.onstop = function() {
              if (timeoutId) clearTimeout(timeoutId);
              if (chunks.length === 0) {
                reject(new Error('未录制到音频数据'));
                return;
              }
              var blob = new Blob(chunks, { type: mime || 'audio/webm' });
              blob.arrayBuffer().then(function(buf) {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                return ctx.decodeAudioData(buf.slice(0));
              }).then(function(decoded) {
                var wav = audioBufferToWav(decoded);
                resolve(arrayBufferToBase64(wav));
              }).catch(function(e) {
                reject(e || new Error('解码音频失败'));
              });
            };
            
            try {
              recorder.start(100);
            } catch (startError) {
              reject(new Error('MediaRecorder启动失败：' + (startError.message || startError.toString())));
              return;
            }
            
            timeoutId = setTimeout(function() {
              if (recorder && recorder.state !== 'inactive') {
                try {
                  recorder.stop();
                } catch (e) {}
              }
              reject(new Error('提取音频超时（30秒）'));
            }, 30000);
            
            video.play().catch(function(playError) {
              if (timeoutId) clearTimeout(timeoutId);
              if (recorder && recorder.state !== 'inactive') {
                try {
                  recorder.stop();
                } catch (e) {}
              }
              reject(new Error('无法播放视频：' + (playError.message || playError.toString())));
            });
          } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            reject(new Error('提取音频时发生错误：' + (error.message || error.toString())));
          }
        };
        
        video.onended = function() {
          if (timeoutId) clearTimeout(timeoutId);
          if (recorder && recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch (e) {
              console.error('停止MediaRecorder失败:', e);
            }
          }
        };
        
        video.load();
      });
    }
    
    // ✅ 已删除：useReciteVideoSound - 不再需要手动提取音频，改为自动生成语音
    async function usePromoteVideoSound() {
      var list = JSON.parse(localStorage.getItem('digital_humans') || '[]');
      var dh = list.find(function(d) { return d.id === selectedPromoteDigitalHumanId; });
      if (!dh || !dh.videoUrl) {
        alert('当前数字人没有可用的原视频地址');
        return;
      }
      var btn = document.getElementById('promoteUseVideoSoundBtn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ 正在从视频提取声音...'; }
      try {
        var b64 = await extractAudioFromVideoUrl(dh.videoUrl);
        var cleanB64 = b64.replace(/[\s\n\r]/g, '');
        
        // ✅ 将提取的音频Base64转换为Blob，然后上传为URL
        showLoading(true, '正在上传音频...');
        const response = await fetch(b64);
        const blob = await response.blob();
        const file = new File([blob], 'extracted-audio.mp3', { type: 'audio/mpeg' });
        var audioUrl = await uploadAudioFile(file);
        promoteAudioBase64Yunwu = audioUrl; // 存储URL而不是Base64
        
        var inp = document.getElementById('promoteYunwuAudioInput');
        if (inp) inp.value = '';
        var statusEl = document.getElementById('promoteVideoSoundStatus');
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = '✓ 已使用原视频中的声音（已转换为URL）'; }
        if (btn) { btn.disabled = false; btn.textContent = '🎬 使用该数字人原视频中的声音'; }
        showLoading(false);
      } catch (err) {
        showLoading(false);
        if (btn) { btn.disabled = false; btn.textContent = '🎬 使用该数字人原视频中的声音'; }
        alert('提取失败：' + (err && err.message ? err.message : String(err)));
      }
    }

    // 大 base64 转临时 URL，供云雾接口传 URL 避免 431（云雾/可灵 image、sound_file 均支持 URL）
    // 根据官方文档：image 支持 URL/Base64，sound_file 也应支持 URL
    // ✅ 强制策略：所有Base64都转换为URL，避免431错误
    async function ensureYunwuAssetUrl(value, type) {
      if (!value) {
        throw new Error(`${type}内容为空`);
      }
      var s = String(value).trim();
      
      if (!s || s.length === 0) {
        throw new Error(`${type}内容为空`);
      }
      
      // 如果已经是URL，直接返回
      if (s.startsWith('http://') || s.startsWith('https://')) {
        console.log(`✅ ${type}已是URL格式，直接使用`);
        return s;
      }
      
      // ✅ 强制转换：所有Base64都转换为URL（避免431错误）
      // 不再设置阈值，因为即使小文件也可能导致请求体过大
      console.log(`⚠️ 检测到${type} Base64（${s.length}字符，约${(s.length * 3 / 4 / 1024).toFixed(2)}KB），正在转换为URL以避免431错误...`);
      
      try {
        var r = await fetch(buildApiUrl('/api/upload-temp-asset'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type === 'audio' ? 'audio' : 'image', content: s })
        });
        
        if (!r.ok) {
          const errorText = await r.text().catch(() => '未知错误');
          throw new Error(`上传失败 (HTTP ${r.status}): ${errorText.substring(0, 100)}`);
        }
        
        var j = await r.json().catch(function() { return { success: false, message: '响应解析失败' }; });
        
        if (j && j.success && j.url) {
          console.log(`✅ ${type}已转换为临时URL: ${j.url.substring(0, 50)}...`);
          return j.url;
        } else {
          const errorMsg = j.message || j.error || '上传失败';
          console.error(`❌ ${type}转换为URL失败:`, errorMsg);
          throw new Error(`${type}转换为URL失败: ${errorMsg}`);
        }
      } catch (e) { 
        console.error(`❌ upload-temp-asset failed for ${type}:`, e);
        // 重新抛出错误，让调用者知道转换失败
        throw e;
      }
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
      const provider = selectedRecitePlatform || 'heygen';
      let script = '';
      
      if (provider === 'heygen') {
        script = document.getElementById('reciteScript')?.value.trim() || '';
      } else {
        script = document.getElementById('reciteScriptYunwu')?.value.trim() || '';
      }
      
      if (!script) {
        alert('请先输入文案内容');
        return;
      }
      
      if (provider === 'yunwu') {
        alert('云雾平台使用音频文件生成视频，不支持文案预览。\n\n提示：您可以直接生成视频查看效果。');
      } else {
        alert('语音预览功能开发中...\n\n提示：您可以直接生成视频查看效果。');
      }
    }
    
    // ========== 新流程：选择音频 -> 选择视频 -> 生成视频 ==========
    
    // 全局变量：存储选择的音频和视频信息
    let reciteSelectedAudio = {
      type: null, // 'uploaded', 'synthesized'
      url: null,
      id: null,
      name: null,
      base64: null // 仅在localhost:3000时使用
    };
    
    let reciteSelectedVideo = {
      id: null,
      url: null,
      name: null
    };
    
    // reciteGeneratedAudioId / reciteAudioMode 已在 state.js 中定义
    
    // 切换音频模式（上传 / TTS 合成）
    function switchReciteAudioMode(mode) {
      if (mode !== 'upload' && mode !== 'synthesize') return;
      
      reciteAudioMode = mode;
      
      const synthesizeBtn = document.getElementById('reciteSwitchToSynthesizeBtn');
      const synthesizeMode = document.getElementById('reciteSynthesizeAudioMode');
      
      if (mode === 'upload') {
        if (synthesizeBtn) {
          synthesizeBtn.classList.remove('primary');
          synthesizeBtn.classList.add('secondary');
        }
        if (synthesizeMode) synthesizeMode.style.display = 'none';
      } else {
        if (synthesizeBtn) {
          synthesizeBtn.classList.remove('secondary');
          synthesizeBtn.classList.add('primary');
        }
        if (synthesizeMode) synthesizeMode.style.display = 'block';
      }
    }
    
    // 检测是否为本地测试环境
    function isLocalhost() {
      try {
        const hostname = window.location.hostname;
        const port = window.location.port;
        return hostname === 'localhost' && port === '3000';
      } catch (e) {
        return false;
      }
    }
    
    // 将文件转换为Base64
    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result;
          // 移除data:audio/xxx;base64,前缀，只保留纯base64
          const commaIndex = base64.indexOf(',');
          const pureBase64 = commaIndex >= 0 ? base64.substring(commaIndex + 1) : base64;
          resolve(pureBase64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    // 诵读文案：上传视频（双卡片之一）
    async function handleReciteVideoUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      
      if (!file.type.startsWith('video/')) {
        alert('请选择视频文件');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('视频文件大小不能超过100MB');
        return;
      }
      
      try {
        showLoading(true, '正在上传视频...');
        const uploadedUrl = await uploadVideoFile(file);
        reciteSelectedVideo = {
          id: null,
          url: uploadedUrl,
          name: file.name
        };
        const videoUrlInput = document.getElementById('reciteVideoUrlInput');
        if (videoUrlInput) videoUrlInput.value = uploadedUrl;
        const videoIdInput = document.getElementById('reciteVideoIdInput');
        if (videoIdInput) videoIdInput.value = '';
        updateReciteSelectedVideoUI();
      } catch (err) {
        alert('视频上传失败：' + (err.message || '未知错误'));
      } finally {
        showLoading(false);
      }
      event.target.value = '';
    }
    
    // 诵读文案：清除已选视频
    function clearReciteSelectedVideo() {
      reciteSelectedVideo = { id: null, url: null, name: null };
      const videoIdInput = document.getElementById('reciteVideoIdInput');
      const videoUrlInput = document.getElementById('reciteVideoUrlInput');
      const videoInput = document.getElementById('reciteVideoInput');
      if (videoIdInput) videoIdInput.value = '';
      if (videoUrlInput) videoUrlInput.value = '';
      if (videoInput) videoInput.value = '';
      updateReciteSelectedVideoUI();
    }
    
    // 诵读文案：历史创作（视频）
    function showReciteVideoHistory() {
      if (typeof window.showYunwuVideoHistory === 'function') {
        window.showYunwuVideoHistory();
      } else {
        alert('历史创作功能开发中...');
      }
    }
    
    // 诵读文案：历史创作（音频）
    function showReciteAudioHistory() {
      if (typeof window.showYunwuAudioHistory === 'function') {
        window.showYunwuAudioHistory();
      } else {
        alert('历史创作功能开发中...');
      }
    }
    
    // 诵读文案：选择数字人弹窗（内容固定于弹窗内，无步骤2）
    function openReciteSelectDigitalHumanModal() {
      var modal = document.getElementById('reciteSelectDigitalHumanModal');
      if (!modal) return;
      modal.classList.add('active');
      if (typeof window.loadReciteAvatars === 'function') {
        window.loadReciteAvatars();
      }
      modal.onclick = function (e) {
        if (e.target === modal) closeReciteSelectDigitalHumanModal();
      };
    }
    
    function closeReciteSelectDigitalHumanModal() {
      var modal = document.getElementById('reciteSelectDigitalHumanModal');
      if (modal) modal.classList.remove('active');
    }
    
    // 诵读文案：使用 TTS 合成音频弹窗
    function openReciteTTSModal() {
      var modal = document.getElementById('reciteTTSModal');
      if (!modal) return;
      var form = document.getElementById('reciteSynthesizeAudioMode');
      if (form) form.style.display = 'block';
      modal.classList.add('active');
      if (typeof window.loadYunwuTTSVoices === 'function') {
        window.loadYunwuTTSVoices();
      }
      modal.onclick = function (e) {
        if (e.target === modal) closeReciteTTSModal();
      };
    }
    
    function closeReciteTTSModal() {
      var modal = document.getElementById('reciteTTSModal');
      if (modal) modal.classList.remove('active');
    }
    
    // 诵读文案底部栏：下拉框滑动按钮（打开时移到 body + fixed 定位，避免被父级 overflow 裁剪）
    function toggleReciteSliderDropdown(id) {
      var dropdownId = id === 'reciteSoundVolume' ? 'reciteSoundVolumeDropdown' : 'reciteOriginalAudioVolumeDropdown';
      var btnId = id === 'reciteSoundVolume' ? 'reciteSoundVolumeBtn' : 'reciteOriginalAudioVolumeBtn';
      var dropdown = document.getElementById(dropdownId);
      var btn = document.getElementById(btnId);
      var otherId = id === 'reciteSoundVolume' ? 'reciteOriginalAudioVolumeDropdown' : 'reciteSoundVolumeDropdown';
      var otherDropdown = document.getElementById(otherId);
      if (!dropdown || !btn) return;
      if (otherDropdown && otherDropdown.classList.contains('open')) {
        closeReciteSliderDropdown(otherDropdown);
      }
      if (dropdown.classList.contains('open')) {
        closeReciteSliderDropdown(dropdown);
        return;
      }
      var rect = btn.getBoundingClientRect();
      dropdown._reciteOriginalParent = dropdown.parentNode;
      document.body.appendChild(dropdown);
      dropdown.style.position = 'fixed';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
      dropdown.style.right = 'auto';
      dropdown.style.top = 'auto';
      dropdown.style.minWidth = Math.max(rect.width, 160) + 'px';
      dropdown.style.zIndex = '9999';
      dropdown.classList.add('open');
    }
    
    function closeReciteSliderDropdown(dropdownEl) {
      if (!dropdownEl) return;
      dropdownEl.classList.remove('open');
      dropdownEl.style.position = '';
      dropdownEl.style.left = '';
      dropdownEl.style.bottom = '';
      dropdownEl.style.minWidth = '';
      dropdownEl.style.zIndex = '';
      if (dropdownEl._reciteOriginalParent) {
        dropdownEl._reciteOriginalParent.appendChild(dropdownEl);
        dropdownEl._reciteOriginalParent = null;
      }
    }
    
    var _reciteSliderDropdownCloseBound = false;
    function initReciteSliderDropdownClose() {
      if (_reciteSliderDropdownCloseBound) return;
      _reciteSliderDropdownCloseBound = true;
      document.addEventListener('click', function (e) {
        var dd1 = document.getElementById('reciteSoundVolumeDropdown');
        var dd2 = document.getElementById('reciteOriginalAudioVolumeDropdown');
        var btn1 = document.getElementById('reciteSoundVolumeBtn');
        var btn2 = document.getElementById('reciteOriginalAudioVolumeBtn');
        var inside = (dd1 && (dd1.contains(e.target) || (btn1 && btn1.contains(e.target)))) ||
          (dd2 && (dd2.contains(e.target) || (btn2 && btn2.contains(e.target))));
        if (!inside) {
          if (dd1) closeReciteSliderDropdown(dd1);
          if (dd2) closeReciteSliderDropdown(dd2);
        }
      });
    }
    
    function initReciteBottomBarSliders() {
      var soundSlider = document.getElementById('reciteSoundVolume');
      var soundValueEl = document.getElementById('reciteSoundVolumeValue');
      var originalSlider = document.getElementById('reciteOriginalAudioVolume');
      var originalValueEl = document.getElementById('reciteOriginalAudioVolumeValue');
      function updateSoundValue() {
        if (soundValueEl && soundSlider) soundValueEl.textContent = soundSlider.value;
      }
      function updateOriginalValue() {
        if (originalValueEl && originalSlider) originalValueEl.textContent = originalSlider.value;
      }
      if (soundSlider) {
        soundSlider.addEventListener('input', updateSoundValue);
        updateSoundValue();
      }
      if (originalSlider) {
        originalSlider.addEventListener('input', updateOriginalValue);
        updateOriginalValue();
      }
      initReciteSliderDropdownClose();
    }
    
    // 步骤1：上传音频
    async function handleReciteAudioUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      
      if (!file.type.startsWith('audio/')) {
        alert('请选择音频文件');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('音频文件大小不能超过5MB');
        return;
      }
      
      const isLocal = isLocalhost();
      
      showLoading(true, isLocal ? '正在处理音频（Base64）...' : '正在上传音频（URL）...');
      
      try {
        if (isLocal) {
          // 本地测试环境：使用纯Base64
          const base64 = await fileToBase64(file);
          reciteSelectedAudio = {
            type: 'uploaded',
            url: null,
            id: null,
            name: file.name,
            base64: base64
          };
          
          updateReciteSelectedAudioUI();
          showLoading(false);
          alert('✅ 音频已处理（Base64模式）！');
        } else {
          // 生产环境：使用URL
          const audioUrl = await uploadAudioFile(file);
          reciteSelectedAudio = {
            type: 'uploaded',
            url: audioUrl,
            id: null,
            name: file.name,
            base64: null
          };
          
          updateReciteSelectedAudioUI();
          showLoading(false);
          alert('✅ 音频上传成功（URL模式）！');
        }
      } catch (error) {
        showLoading(false);
        alert('❌ 处理失败：' + error.message);
      }
      
      event.target.value = '';
    }
    
    // 步骤1：显示音频模板列表
    function showReciteAudioTemplates() {
      const modal = document.getElementById('reciteAudioTemplatesModal');
      const list = document.getElementById('reciteAudioTemplatesList');
      
      if (!modal || !list) return;
      
      // 从server.js的TTS_VOICES_SEED获取模板列表（中文音色）
      const templates = [
        { name: '阳光少年', file: 'genshin_vindi2.mp3' },
        { name: '懂事小弟', file: 'zhinen_xuesheng.mp3' },
        { name: '运动少年', file: 'tiyuxi_xuedi.mp3' },
        { name: '青春少女', file: 'ai_shatang.mp3' },
        { name: '温柔小妹', file: 'genshin_klee2.mp3' },
        { name: '元气少女', file: 'genshin_kirara.mp3' },
        { name: '阳光男生', file: 'ai_kaiya.mp3' },
        { name: '幽默小哥', file: 'tiexin_nanyou.mp3' },
        { name: '文艺小哥', file: 'ai_chenjiahao_712.mp3' },
        { name: '甜美邻家', file: 'girlfriend_1_speech02.mp3' },
        { name: '温柔姐姐', file: 'chat1_female_new-3.mp3' },
        { name: '职场女青', file: 'girlfriend_2_speech02.mp3' },
        { name: '活泼男童', file: 'cartoon-boy-07.mp3' },
        { name: '俏皮女童', file: 'cartoon-girl-01.mp3' },
        { name: '稳重老爸', file: 'ai_huangyaoshi_712.mp3' },
        { name: '温柔妈妈', file: 'you_pingjing.mp3' },
        { name: '严肃上司', file: 'ai_laoguowang_712.mp3' },
        { name: '优雅贵妇', file: 'chengshu_jiejie.mp3' }
      ];
      
      list.innerHTML = templates.map(t => `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; cursor: pointer; border: 1px solid var(--border);" 
             onclick="selectReciteAudioTemplate('${t.file}', '${t.name}')">
          <div style="font-weight: 600; margin-bottom: 4px;">${t.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${t.file}</div>
        </div>
      `).join('');
      
      modal.style.display = 'block';
    }
    
    // 步骤1：隐藏音频模板列表
    function hideReciteAudioTemplates() {
      const modal = document.getElementById('reciteAudioTemplatesModal');
      if (modal) modal.style.display = 'none';
    }
    
    // 步骤1：选择音频模板
    async function selectReciteAudioTemplate(fileName, templateName) {
      const audioUrl = buildApiUrl(`/tts-demos/${encodeURIComponent(fileName)}`);
      
      reciteSelectedAudio = {
        type: 'template',
        url: audioUrl,
        id: null,
        name: templateName + ' (' + fileName + ')'
      };
      
      updateReciteSelectedAudioUI();
      hideReciteAudioTemplates();
    }
    
    // 更新步骤1选择的音频UI；预览显示在上传框内
    function updateReciteSelectedAudioUI() {
      const defaultEl = document.getElementById('reciteAudioCardDefault');
      const info = document.getElementById('reciteSelectedAudioInfo');
      const name = document.getElementById('reciteSelectedAudioName');
      const preview = document.getElementById('reciteSelectedAudioPreview');
      
      if (!info || !name || !preview) return;
      
      if (reciteSelectedAudio.type && (reciteSelectedAudio.url || reciteSelectedAudio.id || reciteSelectedAudio.base64)) {
        name.textContent = reciteSelectedAudio.name || '已选择音频';
        if (reciteSelectedAudio.id) {
          // 优先显示音频ID
          name.textContent += ` (音频ID: ${reciteSelectedAudio.id})`;
        }
        if (reciteSelectedAudio.url) {
          preview.src = reciteSelectedAudio.url;
          preview.style.display = 'block';
        } else if (reciteSelectedAudio.base64) {
          // Base64模式：构造data URL
          preview.src = 'data:audio/mpeg;base64,' + reciteSelectedAudio.base64;
          preview.style.display = 'block';
        } else if (reciteSelectedAudio.id) {
          // 如果有ID但没有URL，不显示预览
          preview.style.display = 'none';
        }
        if (defaultEl) defaultEl.style.display = 'none';
        info.style.display = 'flex';
      } else {
        if (defaultEl) defaultEl.style.display = '';
        info.style.display = 'none';
      }
    }
    
    // 清除步骤1选择的音频
    function clearReciteSelectedAudio() {
      reciteSelectedAudio = { type: null, url: null, id: null, name: null, base64: null };
      updateReciteSelectedAudioUI();
    }
    
    // ✅ 规范化任务状态（参考AI创作工坊）
    function normalizeReciteTaskStatus(s) {
      const t = (s || '').toString().toLowerCase();
      if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
      if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
      return 'processing';
    }
    
    // ✅ 收集音频URL（参考AI创作工坊）
    function collectReciteAudioUrls(obj, out) {
      if (!obj || typeof obj !== 'object') return;
      const urlKeys = ['audio', 'url', 'audios', 'audio_url', 'output_audio', 'result_url', 'output_url', 'audioUrl', 'url_mp3', 'url_wav'];
      urlKeys.forEach(function (k) {
        const v = obj[k];
        if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
        else if (Array.isArray(v)) v.forEach(function (u) {
          if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
          else if (u && u.url) out.push(u.url);
          else if (u && u.url_mp3) out.push(u.url_mp3);
          else if (u && u.url_wav) out.push(u.url_wav);
        });
      });
      Object.keys(obj).forEach(function (k) {
        collectReciteAudioUrls(obj[k], out);
      });
    }
    
    // ✅ 轮询TTS任务状态（参考AI创作工坊）
    function pollReciteTtsTask(taskId, apiKey, setProgress, resolve, reject, pollCount) {
      pollCount = pollCount || 0;
      const maxPolls = 240; // 最多轮询240次（约10分钟）
      
      if (pollCount >= maxPolls) {
        reject(new Error('任务超时（约 10 分钟仍未返回资源），请稍后重试'));
        return;
      }
      
      const url = buildApiUrl(`/api/yunwu/audio/tts/${encodeURIComponent(taskId)}`);
      
      fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          // 检查API错误
          if (data && data.success === false && data.message) {
            reject(new Error(data.message));
            return;
          }
          
          // 解析响应数据
          const inner = (data && data.data && data.data.data) || data.data || data;
          const statusRaw = (inner && inner.task_status) ||
            (inner && inner.status) ||
            (inner && inner.state) ||
            (data && data.data && data.data.task_status) ||
            (data && data.data && data.data.status) ||
            (data && data.data && data.data.state) ||
            (data && data.task_status) ||
            (data && data.status) ||
            (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
            '';
          
          const status = normalizeReciteTaskStatus(statusRaw);
          
          // 解析任务结果
          const result = (inner && inner.task_result) ||
            (data && data.data && data.data.task_result) ||
            (data && data.data && data.data.result) ||
            (data && data.data && data.data) ||
            (data && data.result) ||
            (data && data.data) ||
            {};
          
          // 收集音频URL
          const audios = [];
          if (result.audios && Array.isArray(result.audios)) {
            result.audios.forEach(function (a) {
              if (a && typeof a.url_mp3 === 'string' && a.url_mp3.trim()) audios.push(a.url_mp3.trim());
              if (a && typeof a.url_wav === 'string' && a.url_wav.trim()) audios.push(a.url_wav.trim());
              if (a && typeof a.url === 'string' && a.url.trim()) audios.push(a.url.trim());
            });
          }
          if (!audios.length && (result.audio || result.audioUrl || result.audio_url)) {
            const a = result.audio || result.audioUrl || result.audio_url;
            if (typeof a === 'string') audios.push(a);
            else if (a && a.url) audios.push(a.url);
          }
          if (!audios.length && result.url) {
            const url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(url)) audios.push(url);
          }
          if (!audios.length && data && data.data) {
            const d = data.data.data || data.data;
            if (d && d.audio_url && typeof d.audio_url === 'string') audios.push(d.audio_url);
            if (d && d.url && typeof d.url === 'string' && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(d.url)) audios.push(d.url);
            if (d && d.audio && typeof d.audio === 'string') audios.push(d.audio);
          }
          if (!audios.length) collectReciteAudioUrls(data, audios);
          const uniqueAudios = [...new Set(audios.filter(Boolean))];
          
          // 获取音频ID
          const audioId = (result && result.audio_id) ||
            (result && result.audios && result.audios[0] && result.audios[0].id) ||
            (data && data.data && data.data.audio_id) ||
            (inner && inner.task_result && inner.task_result.audios && inner.task_result.audios[0] && inner.task_result.audios[0].id) ||
            (data && data.data && data.data.task_result && data.data.task_result.audios && data.data.task_result.audios[0] && data.data.task_result.audios[0].id) ||
            (data && data.audio_id) ||
            '';
          
          // 任务完成且有音频
          if (status === 'done' && uniqueAudios.length > 0) {
            resolve({ audioUrl: uniqueAudios[0], audioId: audioId, raw: data });
            return;
          }
          
          // 任务完成但无音频URL（继续轮询等待）
          const hasAudiosArray = result.audios && Array.isArray(result.audios) && result.audios.length > 0;
          if (status === 'done' && !uniqueAudios.length && hasAudiosArray) {
            const progressText = '状态已完成，等待音频生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
            if (typeof setProgress === 'function') setProgress(progressText);
            setTimeout(function () { pollReciteTtsTask(taskId, apiKey, setProgress, resolve, reject, pollCount + 1); }, 2500);
            return;
          }
          
          // 任务完成但无音频URL（继续轮询）
          if (status === 'done' && !uniqueAudios.length) {
            const progressText = '状态已完成，等待音频生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
            if (typeof setProgress === 'function') setProgress(progressText);
            setTimeout(function () { pollReciteTtsTask(taskId, apiKey, setProgress, resolve, reject, pollCount + 1); }, 2500);
            return;
          }
          
          // 任务失败
          if (status === 'failed') {
            reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
            return;
          }
          
          // 任务处理中，继续轮询
          const progressText = '轮询中，状态=' + (statusRaw || '处理中') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
          if (typeof setProgress === 'function') setProgress(progressText);
          setTimeout(function () { pollReciteTtsTask(taskId, apiKey, setProgress, resolve, reject, pollCount + 1); }, 2500);
        })
        .catch(reject);
    }
    
    // 步骤1：生成音频（TTS）
    async function reciteGenerateAudio() {
      const script = document.getElementById('reciteScriptYunwu')?.value.trim() || '';
      if (!script) {
        alert('请输入文案内容');
        return;
      }
      
      if (script.length > 1000) {
        alert('文案内容过长，请控制在1000字以内');
        return;
      }
      
      const voiceSelect = document.getElementById('reciteYunwuVoiceSelect');
      const languageSelect = document.getElementById('reciteYunwuVoiceLanguage');
      const speedInput = document.getElementById('reciteYunwuVoiceSpeed');
      
      const voiceId = voiceSelect?.value || 'genshin_vindi2';
      const voiceLanguage = languageSelect?.value || 'zh';
      let voiceSpeed = parseFloat(speedInput?.value || '1.0');
      
      // 验证语速范围
      if (isNaN(voiceSpeed) || voiceSpeed < 0.5 || voiceSpeed > 2.0) {
        voiceSpeed = 1.0;
      }
      
      const apiKey = (typeof getYunwuApiKey === 'function' ? getYunwuApiKey() : null) || '';
      if (!apiKey) {
        alert('请先登录，由管理员在后台为您分配云雾 API Key 后即可使用');
        return;
      }
      
      showLoading(true, '正在提交语音合成任务...');
      
      try {
        // 提交TTS任务
        const ttsResponse = await fetch(buildApiUrl('/api/yunwu/audio/tts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            text: script,
            voice_id: voiceId,
            voice_language: voiceLanguage,
            voice_speed: voiceSpeed
          })
        });
        
        // 解析响应（参考AI创作工坊的处理方式）
        let ttsResult;
        try {
          const responseText = await ttsResponse.text();
          ttsResult = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          ttsResult = null;
        }
        
        // 检查HTTP错误
        if (!ttsResponse.ok) {
          let msg = (ttsResult && (ttsResult.message || ttsResult.error || (ttsResult.error && ttsResult.error.message))) || 
                    ('HTTP ' + ttsResponse.status);
          const lowerMsg = (msg || '').toString().toLowerCase();
          if (lowerMsg.indexOf('invalid token') !== -1) {
            msg = '登录状态已失效或云雾 API Key 无效。\n\n请重新登录系统，或联系管理员在「API Key 配置」中为您分配有效的云雾 Key。';
          }
          showLoading(false);
          alert('❌ 语音合成失败：' + msg);
          return;
        }
        
        if (!ttsResult) {
          showLoading(false);
          alert('❌ 语音合成失败：响应解析失败');
          return;
        }
        
        // 获取任务ID（参考AI创作工坊）
        const taskId = (ttsResult && ttsResult.data && (ttsResult.data.id || ttsResult.data.task_id || ttsResult.data.request_id)) ||
          (ttsResult && ttsResult.id) || 
          (ttsResult && ttsResult.task_id) || 
          (ttsResult && ttsResult.request_id) ||
          (ttsResult && ttsResult.data && ttsResult.data.request_id);
        
        // 检查是否直接返回了音频URL或ID
        const directAudioUrl = ttsResult.data?.url || ttsResult.data?.audio_url || null;
        const directAudioId = ttsResult.data?.audio_id || ttsResult.data?.id || null;
        
        let finalAudioUrl = directAudioUrl;
        let finalAudioId = directAudioId;
        
        // 如果需要轮询（有任务ID但没有直接返回音频）
        if (taskId && !finalAudioUrl && !finalAudioId) {
          showLoading(true, '任务已创建，轮询中: ' + taskId + ' …');
          
          const setProgress = function (txt) {
            showLoading(true, txt);
          };
          
          try {
            const pollResult = await new Promise(function (resolve, reject) {
              pollReciteTtsTask(taskId, apiKey, setProgress, resolve, reject, 0);
            });
            
            finalAudioUrl = pollResult.audioUrl || null;
            finalAudioId = pollResult.audioId || null;
          } catch (pollError) {
            showLoading(false);
            alert('❌ 轮询失败：' + (pollError.message || pollError.toString()));
            return;
          }
        } else if (!taskId && !finalAudioUrl && !finalAudioId) {
          // 既没有任务ID也没有音频URL/ID
          let errMsg = (ttsResult && (ttsResult.message || ttsResult.error || (ttsResult.error && ttsResult.error.message))) || 
                       '未返回任务 ID 或音频资源，请检查 API 响应';
          const lowerErr = (errMsg || '').toString().toLowerCase();
          if (lowerErr.indexOf('invalid token') !== -1) {
            errMsg = '登录状态已失效或云雾 API Key 无效。\n\n请重新登录系统，或联系管理员在「API Key 配置」中为您分配有效的云雾 Key。';
          }
          showLoading(false);
          alert('❌ 语音合成失败：' + errMsg);
          return;
        }
        
        if (!finalAudioUrl && !finalAudioId) {
          showLoading(false);
          alert('❌ 未获取到音频URL或ID');
          return;
        }
        
        // 显示生成的音频
        const info = document.getElementById('reciteGeneratedAudioInfo');
        const preview = document.getElementById('reciteGeneratedAudioPreview');
        const idDisplay = document.getElementById('reciteGeneratedAudioIdDisplay');
        const idText = document.getElementById('reciteGeneratedAudioIdText');
        const idInput = document.getElementById('reciteAudioIdInput');
        const useBtn = document.getElementById('reciteUseGeneratedAudioBtn');
        
        // 保存音频ID
        reciteGeneratedAudioId = finalAudioId || null;
        
        // 显示音频ID在按钮右侧
        if (idDisplay && idText) {
          if (finalAudioId) {
            idText.textContent = finalAudioId;
            idDisplay.style.display = 'block';
            // 同时更新输入框
            if (idInput) {
              idInput.value = finalAudioId;
            }
          } else {
            idDisplay.style.display = 'none';
          }
        }
        
        // 显示音频预览和使用按钮
        if (info && preview && useBtn) {
          if (finalAudioUrl) {
            preview.src = finalAudioUrl;
            info.style.display = 'block';
            useBtn.style.display = 'block';
          } else if (finalAudioId) {
            // 只有ID没有URL时，也显示使用按钮
            info.style.display = 'none';
            useBtn.style.display = 'block';
          }
        }
        
        // ✅ 保存到作品管理
        const audioWorkId = Date.now().toString();
        const audioWork = {
          id: audioWorkId,
          type: 'tts', // 语音合成类型
          title: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
          script: script,
          platform: 'yunwu',
          taskId: taskId || null,
          status: 'completed',
          progress: 100,
          audioUrl: finalAudioUrl || null,
          audioId: finalAudioId || null,
          videoUrl: null,
          videoId: null,
          voiceId: voiceId,
          voiceLanguage: voiceLanguage,
          voiceSpeed: voiceSpeed,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(audioWork);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        // 如果作品管理面板已打开，刷新列表
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
        
        showLoading(false);
        if (finalAudioId) {
          alert('✅ 音频生成成功！音频ID: ' + finalAudioId + '\n\n请试听后决定是否使用此音频，或直接使用音频ID进行对口型。\n\n音频已自动保存到「作品管理」中。');
        } else {
          alert('✅ 音频生成成功！请试听后决定是否使用此音频。\n\n音频已自动保存到「作品管理」中。');
        }
      } catch (error) {
        showLoading(false);
        alert('❌ 生成失败：' + (error.message || error.toString()));
      }
    }
    
    // 步骤1：使用合成的音频
    function reciteUseGeneratedAudio() {
      const preview = document.getElementById('reciteGeneratedAudioPreview');
      
      if (!reciteGeneratedAudioId && (!preview || !preview.src)) {
        alert('❌ 未找到可用的音频ID或URL');
        return;
      }
      
      reciteSelectedAudio = {
        type: 'synthesized',
        url: preview ? (preview.src || null) : null,
        id: reciteGeneratedAudioId,
        name: 'AI合成的音频',
        base64: null
      };
      
      updateReciteSelectedAudioUI();
      alert('✅ 已选择合成的音频（音频ID: ' + (reciteGeneratedAudioId || '未知') + '）！');
    }
    
    // ✅ 使用输入的音频ID
    function reciteUseAudioId() {
      const idInput = document.getElementById('reciteAudioIdInput');
      if (!idInput) return;
      
      const audioId = idInput.value.trim();
      if (!audioId) {
        alert('❌ 请输入音频ID');
        return;
      }
      
      // 验证音频ID格式（通常是数字或字符串）
      if (audioId.length < 1) {
        alert('❌ 音频ID格式不正确');
        return;
      }
      
      reciteSelectedAudio = {
        type: 'id',
        url: null,
        id: audioId,
        name: '手动输入的音频ID',
        base64: null
      };
      
      // 同时更新全局变量
      reciteGeneratedAudioId = audioId;
      
      updateReciteSelectedAudioUI();
      alert('✅ 已选择音频ID: ' + audioId + '\n\n可直接进行对口型操作。');
    }
    
    // 暴露函数到window
    window.reciteUseAudioId = reciteUseAudioId;
    
    // 步骤3：更新选择的视频UI（仅显示ID，避免显示长URL）；预览显示在上传框内
    function updateReciteSelectedVideoUI() {
      const defaultEl = document.getElementById('reciteVideoCardDefault');
      const info = document.getElementById('reciteSelectedVideoInfo');
      const name = document.getElementById('reciteSelectedVideoName');
      const preview = document.getElementById('reciteSelectedVideoPreview');
      
      if (!info || !name || !preview) return;
      
      if (reciteSelectedVideo.id || reciteSelectedVideo.url) {
        // ✅ 优先显示视频ID，避免显示长URL导致431错误
        if (reciteSelectedVideo.id) {
          name.textContent = reciteSelectedVideo.name || `视频ID: ${reciteSelectedVideo.id}`;
        } else if (reciteSelectedVideo.url) {
          // 如果有URL但没有ID，只显示简短提示，不显示完整URL
          name.textContent = reciteSelectedVideo.name || '已选择视频（URL格式）';
        } else {
          name.textContent = reciteSelectedVideo.name || '已选择视频';
        }
        
        // 预览视频（如果有URL）
        if (reciteSelectedVideo.url && (reciteSelectedVideo.url.startsWith('http://') || reciteSelectedVideo.url.startsWith('https://'))) {
          preview.src = reciteSelectedVideo.url;
          preview.style.display = 'block';
        } else {
          preview.style.display = 'none';
        }
        
        if (defaultEl) defaultEl.style.display = 'none';
        info.style.display = 'flex';
      } else {
        if (defaultEl) defaultEl.style.display = '';
        info.style.display = 'none';
      }
    }
    
    // 监听视频输入变化
    function initReciteVideoInputs() {
      const videoIdInput = document.getElementById('reciteVideoIdInput');
      const videoUrlInput = document.getElementById('reciteVideoUrlInput');
      
      if (videoIdInput) {
        videoIdInput.addEventListener('blur', function() {
          const value = this.value.trim();
          if (value) {
            reciteSelectedVideo.id = value;
            reciteSelectedVideo.url = null;
            reciteSelectedVideo.name = `视频ID: ${value}`;
            updateReciteSelectedVideoUI();
          }
        });
      }
      
      if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', function() {
          const value = this.value.trim();
          if (value && (value.startsWith('http://') || value.startsWith('https://'))) {
            reciteSelectedVideo.id = null;
            reciteSelectedVideo.url = value;
            reciteSelectedVideo.name = `视频URL: ${value.substring(0, 50)}...`;
            updateReciteSelectedVideoUI();
          }
        });
      }
    }
    
    // ✅ 轮询人脸识别任务状态（参考AI创作工坊）
    function pollReciteIdentifyFaceTask(taskId, apiKey, setProgress, resolve, reject, pollCount) {
      pollCount = pollCount || 0;
      const maxPolls = 120; // 最多轮询120次（约5分钟）
      
      if (pollCount >= maxPolls) {
        reject(new Error('人脸识别任务超时（约 5 分钟仍未返回结果），请稍后重试'));
        return;
      }
      
      const url = buildApiUrl(`/api/yunwu/videos/identify-face/${encodeURIComponent(taskId)}`);
      
      fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          // 检查API错误
          if (data && data.success === false && data.message) {
            reject(new Error(data.message));
            return;
          }
          
          // 解析响应数据（参考AI创作工坊）
          const inner = (data && data.data && data.data.data) || data.data || data;
          const statusRaw = (inner && inner.task_status) ||
            (inner && inner.status) ||
            (inner && inner.state) ||
            (data && data.data && data.data.task_status) ||
            (data && data.data && data.data.status) ||
            (data && data.data && data.data.state) ||
            (data && data.task_status) ||
            (data && data.status) ||
            (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
            '';
          
          const status = normalizeReciteTaskStatus(statusRaw);
          
          // 解析任务结果
          const result = (inner && inner.task_result) ||
            (data && data.data && data.data.task_result) ||
            (data && data.data && data.data.result) ||
            (data && data.data && data.data) ||
            (data && data.result) ||
            (data && data.data) ||
            {};
          
          // 获取session_id和face_data
          const sessionId = (result && result.session_id) ||
            (inner && inner.session_id) ||
            (data && data.data && data.data.session_id) ||
            (data && data.session_id) ||
            '';
          
          const faceData = (result && result.face_data) ||
            (result && result.faces) ||
            (inner && inner.face_data) ||
            (inner && inner.faces) ||
            (data && data.data && data.data.face_data) ||
            (data && data.data && data.data.faces) ||
            (data && data.face_data) ||
            (data && data.faces) ||
            [];
          
          const faces = Array.isArray(faceData) ? faceData : (faceData && typeof faceData === 'object' ? [faceData] : []);
          
          // 任务完成且有session_id
          if (status === 'done' && sessionId) {
            const faceId = faces.length > 0 ? (faces[0].face_id != null ? String(faces[0].face_id) : '-1') : '-1';
            resolve({ sessionId: sessionId, faces: faces, faceId: faceId, raw: data });
            return;
          }
          
          // 任务完成但无session_id（继续轮询等待）
          if (status === 'done' && !sessionId) {
            const progressText = '状态已完成，等待人脸识别结果，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
            if (typeof setProgress === 'function') setProgress(progressText);
            setTimeout(function () { pollReciteIdentifyFaceTask(taskId, apiKey, setProgress, resolve, reject, pollCount + 1); }, 2500);
            return;
          }
          
          // 任务失败
          if (status === 'failed') {
            reject(new Error((result.message || result.error || data.message || data.error || '人脸识别任务失败') + ''));
            return;
          }
          
          // 任务处理中，继续轮询
          const progressText = '轮询中，状态=' + (statusRaw || '处理中') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
          if (typeof setProgress === 'function') setProgress(progressText);
          setTimeout(function () { pollReciteIdentifyFaceTask(taskId, apiKey, setProgress, resolve, reject, pollCount + 1); }, 2500);
        })
        .catch(reject);
    }
    
    // ✅ 收集视频URL（参考AI创作工坊）
    function collectReciteVideoUrls(obj, out) {
      if (!obj || typeof obj !== 'object') return;
      const urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl'];
      urlKeys.forEach(function (k) {
        const v = obj[k];
        if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
        else if (Array.isArray(v)) v.forEach(function (u) {
          if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
          else if (u && u.url) out.push(u.url);
        });
      });
      Object.keys(obj).forEach(function (k) {
        collectReciteVideoUrls(obj[k], out);
      });
    }
    
    // ✅ 轮询对口型任务状态（完全按照AI创作工坊的逻辑）
    function pollReciteLipSyncTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
      pollCount = pollCount || 0;
      const maxPolls = 240; // 最多轮询240次（约10分钟）
      
      if (pollCount >= maxPolls) {
        reject(new Error('轮询超时（已轮询 ' + maxPolls + ' 次，约 ' + Math.round(maxPolls * 2.5 / 60) + ' 分钟），请稍后在「作品管理」中重新查询'));
        return;
      }
      
      const url = buildApiUrl('/api/yunwu/videos/advanced-lip-sync/' + encodeURIComponent(taskId));
      
      fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          // 检查API错误（改进错误处理，检查更多错误字段）
          if (data && data.success === false) {
            const errorMsg = data.message || 
                            data.error || 
                            (data.error && data.error.message) ||
                            data.data?.message ||
                            data.data?.error ||
                            (data.data && data.data.error && data.data.error.message) ||
                            '未知错误';
            reject(new Error(errorMsg));
            return;
          }
          
          // 解析状态（完全按照AI创作工坊的逻辑）
          const statusRaw = (data && data.data && data.data.task_status) ||
            (data && data.task_status) ||
            (data && data.data && data.data.status) ||
            (data && data.status) ||
            (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
            '';
          
          const status = normalizeReciteTaskStatus(statusRaw);
          
          // 解析任务结果（完全按照AI创作工坊的逻辑）
          const result = (data && data.data && data.data.task_result) ||
            (data && data.data && data.data.result) ||
            (data && data.result) ||
            (data && data.data) ||
            {};
          
          // 检查任务结果中的错误信息（在解析状态之前）
          if (status === 'failed' || statusRaw.toLowerCase().includes('fail') || statusRaw.toLowerCase().includes('error')) {
            const errorMsg = (result && (result.message || result.error || (result.error && result.error.message))) ||
                            (data && (data.message || data.error || (data.error && data.error.message))) ||
                            (data && data.data && (data.data.message || data.data.error || (data.data.error && data.data.error.message))) ||
                            statusRaw ||
                            '任务失败';
            reject(new Error(errorMsg));
            return;
          }
          
          // 收集视频URL（完全按照AI创作工坊的逻辑）
          let videos = [];
          if (result.video || result.videoUrl || result.video_url) {
            const v = result.video || result.videoUrl || result.video_url;
            if (typeof v === 'string') videos.push(v);
            else if (v && v.url) videos.push(v.url);
          }
          if (!videos.length && result.url) {
            const url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
          }
          if (!videos.length) collectReciteVideoUrls(data, videos);
          videos = [...new Set(videos.filter(Boolean))];
          
          // 获取视频ID（完全按照AI创作工坊的逻辑）
          const videoId = (result && result.video_id) ||
            (data && data.data && data.data.video_id) ||
            (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
            (data && data.video_id) ||
            '';
          
          // 任务完成且有视频（完全按照AI创作工坊的逻辑）
          if (status === 'done' && videos.length > 0) {
            resolve({ videos: videos, raw: data, videoId: videoId });
            return;
          }
          
          // 任务完成但无视频URL（继续轮询等待，完全按照AI创作工坊的逻辑）
          if (status === 'done' && !videos.length) {
            const progressText = '任务状态已完成，但视频链接尚未生成，继续轮询中…（' + (pollCount + 1) + '/' + maxPolls + '）';
            if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
            // 更新作品状态（如果workId存在）
            if (workId) {
              const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
              const work = works.find(function (w) { return w.id === workId; });
              if (work) {
                const n = ((work.progress) || 0) + 1;
                work.progress = n;
                work.status = 'processing';
                work.updateDate = new Date().toISOString();
                localStorage.setItem('cn_dh_works', JSON.stringify(works));
                // 刷新作品列表
                if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
                  loadWorks();
                }
              }
            }
            setTimeout(function () { pollReciteLipSyncTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
            return;
          }
          
          // 任务失败（完全按照AI创作工坊的逻辑，改进错误信息提取）
          if (status === 'failed') {
            const errorMsg = (result && (result.message || result.error || (result.error && result.error.message))) ||
                            (data && (data.message || data.error || (data.error && data.error.message))) ||
                            (data && data.data && (data.data.message || data.data.error || (data.data.error && data.data.error.message))) ||
                            (data && data.data && data.data.task_result && (data.data.task_result.message || data.data.task_result.error)) ||
                            statusRaw ||
                            '任务失败';
            reject(new Error(errorMsg));
            return;
          }
          
          // 任务处理中，继续轮询（完全按照AI创作工坊的逻辑）
          let progressText = '轮询中，状态=' + (statusRaw || '处理中');
          if (videos.length > 0) {
            progressText += '（已检测到 ' + videos.length + ' 个视频链接，等待最终确认）';
          }
          progressText += '（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          
          // 更新作品状态（如果workId存在）
          if (workId) {
            const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
            const work = works.find(function (w) { return w.id === workId; });
            if (work) {
              const n = ((work.progress) || 0) + 1;
              work.progress = n;
              work.status = 'processing';
              work.updateDate = new Date().toISOString();
              localStorage.setItem('cn_dh_works', JSON.stringify(works));
              // 刷新作品列表
              if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
                loadWorks();
              }
            }
          }
          
          setTimeout(function () { pollReciteLipSyncTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
        })
        .catch(reject);
    }
    
    // 步骤3：生成视频（对口型）
    async function reciteGenerateVideo() {
      // 检查音频（优先使用reciteSelectedAudio，其次使用reciteGeneratedAudioId）
      const audioId = reciteSelectedAudio.id || reciteGeneratedAudioId;
      const audioUrl = reciteSelectedAudio.url;
      const audioBase64 = reciteSelectedAudio.base64;
      
      if (!audioUrl && !audioId && !audioBase64) {
        alert('请先完成步骤1：选择音频或输入音频ID');
        return;
      }
      
      // 检查视频
      if (!reciteSelectedVideo.id && !reciteSelectedVideo.url) {
        alert('请先完成步骤2：选择视频');
        return;
      }
      
      const apiKey = (typeof getYunwuApiKey === 'function' ? getYunwuApiKey() : null) || '';
      if (!apiKey) {
        alert('请先配置云雾 API Key');
        return;
      }
      
      showLoading(true, '正在识别人脸...');
      
      try {
        // 先识别人脸（参考AI创作工坊）
        const identifyResponse = await fetch(buildApiUrl('/api/yunwu/videos/identify-face'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            video_url: reciteSelectedVideo.url || undefined,
            video_id: reciteSelectedVideo.id || undefined
          })
        });
        
        // 解析响应（参考AI创作工坊）
        let identifyResult;
        try {
          const responseText = await identifyResponse.text();
          identifyResult = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          identifyResult = null;
        }
        
        // 检查HTTP错误
        if (!identifyResponse.ok) {
          const msg = (identifyResult && (identifyResult.message || identifyResult.error || (identifyResult.error && identifyResult.error.message))) || 
                      ('HTTP ' + identifyResponse.status);
          showLoading(false);
          alert('❌ 人脸识别失败：' + msg);
          return;
        }
        
        if (!identifyResult) {
          showLoading(false);
          alert('❌ 人脸识别失败：响应解析失败');
          return;
        }
        
        // 检查API错误
        if (identifyResult.success === false) {
          const msg = identifyResult.message || '未知错误';
          if (/not found by id|video not found|视频.*未找到/i.test(String(msg))) {
            showLoading(false);
            alert('❌ 人脸识别未找到该视频。请使用「视频资源 ID」或视频 URL，不要使用任务 ID（task_id）。若该 ID 来自可灵任务，请到作品管理中找到对应任务，使用完成后返回的「视频链接」再试。');
            return;
          }
          showLoading(false);
          alert('❌ 人脸识别失败：' + msg);
          return;
        }
        
        // 解析响应数据（参考AI创作工坊）
        const inner = (identifyResult && identifyResult.data && identifyResult.data.data) || 
                      (identifyResult && identifyResult.data) || 
                      identifyResult;
        
        // 检查是否返回了任务ID（需要轮询）
        const identifyTaskId = (identifyResult && identifyResult.data && (identifyResult.data.id || identifyResult.data.task_id || identifyResult.data.request_id)) ||
          (identifyResult && identifyResult.id) || 
          (identifyResult && identifyResult.task_id) || 
          (identifyResult && identifyResult.request_id) ||
          (identifyResult && identifyResult.data && identifyResult.data.request_id);
        
        // 检查是否直接返回了session_id
        let sessionId = (inner && inner.session_id) ||
          (identifyResult && identifyResult.data && identifyResult.data.session_id) ||
          (identifyResult && identifyResult.session_id) ||
          '';
        
        let faceData = (inner && inner.face_data) || 
          (inner && inner.faces) ||
          (identifyResult && identifyResult.data && identifyResult.data.face_data) || 
          (identifyResult && identifyResult.data && identifyResult.data.faces) ||
          (identifyResult && identifyResult.face_data) || 
          (identifyResult && identifyResult.faces) ||
          [];
        
        let faceId = '-1';
        
        // 如果需要轮询（有任务ID但没有session_id）
        if (identifyTaskId && !sessionId) {
          showLoading(true, '任务已创建，轮询中: ' + identifyTaskId + ' …');
          
          const setProgress = function (txt) {
            showLoading(true, txt);
          };
          
          try {
            const pollResult = await new Promise(function (resolve, reject) {
              pollReciteIdentifyFaceTask(identifyTaskId, apiKey, setProgress, resolve, reject, 0);
            });
            
            sessionId = pollResult.sessionId || '';
            faceData = pollResult.faces || [];
            faceId = pollResult.faceId || '-1';
          } catch (pollError) {
            showLoading(false);
            alert('❌ 人脸识别轮询失败：' + (pollError.message || pollError.toString()));
            return;
          }
        } else if (!sessionId) {
          // 既没有任务ID也没有session_id
          const msg = (identifyResult && (identifyResult.message || identifyResult.error || (identifyResult.error && identifyResult.error.message))) || 
                     '未返回会话ID';
          if (/not found by id|video not found|视频.*未找到/i.test(String(msg))) {
            showLoading(false);
            alert('❌ 人脸识别未找到该视频。请使用「视频资源 ID」或视频 URL，不要使用任务 ID（task_id）。若该 ID 来自可灵任务，请到作品管理中找到对应任务，使用完成后返回的「视频链接」再试。');
            return;
          }
          showLoading(false);
          alert('❌ 人脸识别失败：' + msg);
          return;
        }
        
        // 解析face_id
        const faces = Array.isArray(faceData) ? faceData : (faceData && typeof faceData === 'object' ? [faceData] : []);
        if (faces.length > 0 && faceId === '-1') {
          faceId = faces[0].face_id != null ? String(faces[0].face_id) : '-1';
        }
        
        showLoading(true, '正在生成对口型视频...');
        
        // 构建对口型请求（按照API文档规范）
        // 优先使用音频ID（合成音频或手动输入），其次使用URL，最后使用Base64（仅本地测试）
        const finalAudioId = reciteSelectedAudio.id || reciteGeneratedAudioId;
        const finalAudioUrl = reciteSelectedAudio.url;
        const finalAudioBase64 = reciteSelectedAudio.base64;
        
        // 获取用户配置的对口型参数（按照API文档要求，所有参数必须是整数）
        const soundStartTime = parseInt(document.getElementById('reciteSoundStartTime')?.value || '0', 10);
        const soundEndTime = parseInt(document.getElementById('reciteSoundEndTime')?.value || '5000', 10);
        const soundInsertTime = parseInt(document.getElementById('reciteSoundInsertTime')?.value || '1000', 10);
        const soundVolume = parseFloat(document.getElementById('reciteSoundVolume')?.value || '1') || 1;
        const originalAudioVolume = parseFloat(document.getElementById('reciteOriginalAudioVolume')?.value || '1') || 1;
        
        // 验证参数范围（按照API文档）
        if (soundStartTime < 0) {
          showLoading(false);
          alert('❌ 音频裁剪起点时间不能小于0');
          return;
        }
        if (soundEndTime < soundStartTime + 2000) {
          showLoading(false);
          alert('❌ 音频裁剪终点时间必须至少比起点时间大2000ms（2秒）');
          return;
        }
        if (soundVolume < 0 || soundVolume > 2) {
          showLoading(false);
          alert('❌ 音频音量大小必须在 [0, 2] 范围内');
          return;
        }
        if (originalAudioVolume < 0 || originalAudioVolume > 2) {
          showLoading(false);
          alert('❌ 原始视频音量大小必须在 [0, 2] 范围内');
          return;
        }
        
        const lipsyncBody = {
          apiKey: apiKey,
          session_id: sessionId,
          face_choose: [{
            face_id: faceId,
            sound_start_time: soundStartTime,
            sound_end_time: soundEndTime,
            sound_insert_time: soundInsertTime,
            sound_volume: soundVolume,
            original_audio_volume: originalAudioVolume
          }]
        };
        
        // 添加音频参数（audio_id和sound_file二选一，不能同时为空，也不能同时有值）
        if (finalAudioId) {
          lipsyncBody.face_choose[0].audio_id = finalAudioId;
          // 确保sound_file不存在
          delete lipsyncBody.face_choose[0].sound_file;
        } else if (finalAudioUrl) {
          lipsyncBody.face_choose[0].sound_file = finalAudioUrl;
          // 确保audio_id不存在
          delete lipsyncBody.face_choose[0].audio_id;
        } else if (finalAudioBase64) {
          // 云雾 API 要求纯 base64，不要 data:audio/xxx;base64, 前缀
          var pureBase64 = finalAudioBase64;
          if (typeof pureBase64 === 'string' && pureBase64.indexOf(',') >= 0 && /^data:/.test(pureBase64)) {
            pureBase64 = pureBase64.replace(/^data:[^;]+;base64,/, '');
          }
          lipsyncBody.face_choose[0].sound_file = pureBase64;
          // 确保audio_id不存在
          delete lipsyncBody.face_choose[0].audio_id;
        } else {
          showLoading(false);
          alert('❌ 未找到有效的音频数据（需要audio_id或sound_file）');
          return;
        }
        
        // 提交对口型任务（参考AI创作工坊）
        const lipsyncResponse = await fetch(buildApiUrl('/api/yunwu/videos/advanced-lip-sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lipsyncBody)
        });
        
        // 解析响应（参考AI创作工坊）
        let lipsyncResult;
        try {
          const responseText = await lipsyncResponse.text();
          lipsyncResult = responseText ? JSON.parse(responseText) : null;
        } catch (e) {
          lipsyncResult = null;
        }
        
        // 检查HTTP错误
        if (!lipsyncResponse.ok) {
          const msg = (lipsyncResult && (lipsyncResult.message || lipsyncResult.error || (lipsyncResult.error && lipsyncResult.error.message))) || 
                      ('HTTP ' + lipsyncResponse.status);
          showLoading(false);
          alert('❌ 对口型任务创建失败：' + msg);
          return;
        }
        
        if (!lipsyncResult) {
          showLoading(false);
          alert('❌ 对口型任务创建失败：响应解析失败');
          return;
        }
        
        // 检查API错误
        if (lipsyncResult.success === false) {
          showLoading(false);
          alert('❌ 对口型任务创建失败：' + (lipsyncResult.message || '未知错误'));
          return;
        }
        
        // 获取任务ID（参考AI创作工坊）
        const taskId = (lipsyncResult && lipsyncResult.data && (lipsyncResult.data.id || lipsyncResult.data.task_id || lipsyncResult.data.request_id)) ||
          (lipsyncResult && lipsyncResult.id) || 
          (lipsyncResult && lipsyncResult.task_id) || 
          (lipsyncResult && lipsyncResult.request_id) ||
          (lipsyncResult && lipsyncResult.data && lipsyncResult.data.request_id);
        
        if (!taskId) {
          const errMsg = (lipsyncResult && (lipsyncResult.message || lipsyncResult.error || (lipsyncResult.error && lipsyncResult.error.message))) || 
                         '未返回任务 ID，请检查 API 响应';
          showLoading(false);
          alert('❌ 对口型任务创建失败：' + errMsg);
          return;
        }
        
        // 保存作品记录
        const workId = Date.now().toString();
        const script = document.getElementById('reciteScriptYunwu')?.value.trim() || '';
        const work = {
          id: workId,
          type: 'recite',
          title: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
          script: script,
          platform: 'yunwu',
          taskId: taskId,
          status: 'processing',
          progress: 0,
          videoUrl: null,
          audioId: finalAudioId || null,
          audioUrl: finalAudioUrl || null,
          videoId: reciteSelectedVideo.id,
          videoUrl: reciteSelectedVideo.url,
          sessionId: sessionId,
          faceId: faceId,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };
        
        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(work);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        
        // ✅ 立即关闭加载状态，开始后台轮询
        showLoading(false);
        
        // 刷新作品列表
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
        
        alert(`✅ 诵读视频任务已提交！\n\n任务ID: ${taskId}\n\n系统将在后台自动轮询任务状态，请到「作品管理」查看进度与结果。`);
        
        // 开始后台轮询（完全按照AI创作工坊的逻辑）
        const setProgress = function (txt, statusRaw) {
          // 后台轮询，不显示加载状态，只更新作品状态
          const updatedWorks = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
          const workIndex = updatedWorks.findIndex(w => w.id === workId);
          if (workIndex >= 0) {
            updatedWorks[workIndex].progressStatus = txt || '处理中';
            updatedWorks[workIndex].updateDate = new Date().toISOString();
            localStorage.setItem('cn_dh_works', JSON.stringify(updatedWorks));
            // 如果作品管理面板打开，刷新显示
            if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
              loadWorks();
            }
          }
        };
        
        try {
          const pollResult = await new Promise(function (resolve, reject) {
            pollReciteLipSyncTask(taskId, apiKey, workId, setProgress, resolve, reject, 0);
          });
          
          // 更新作品记录（完全按照AI创作工坊的逻辑）
          const videos = pollResult.videos || [];
          work.videoUrl = videos.length > 0 ? videos[0] : null;
          work.videoId = pollResult.videoId || null;
          work.status = 'completed';
          work.updateDate = new Date().toISOString();
          
          const updatedWorks = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
          const workIndex = updatedWorks.findIndex(w => w.id === workId);
          if (workIndex >= 0) {
            updatedWorks[workIndex] = work;
            localStorage.setItem('cn_dh_works', JSON.stringify(updatedWorks));
          }
          
          showLoading(false);
          alert(`✅ 诵读视频生成成功！\n\n视频URL: ${work.videoUrl || '无'}\n\n请到「作品管理」查看结果。`);
          
          // 刷新作品列表
          if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
            loadWorks();
          }
        } catch (pollError) {
          // 更新作品记录为失败（完全按照AI创作工坊的逻辑）
          work.status = 'failed';
          work.updateDate = new Date().toISOString();
          const updatedWorks = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
          const workIndex = updatedWorks.findIndex(w => w.id === workId);
          if (workIndex >= 0) {
            updatedWorks[workIndex] = work;
            localStorage.setItem('cn_dh_works', JSON.stringify(updatedWorks));
          }
          
          showLoading(false);
          alert('❌ 对口型轮询失败：' + (pollError.message || pollError.toString()) + '\n\n任务ID: ' + taskId + '\n\n请稍后在「作品管理」中重新查询。');
          
          // 刷新作品列表
          if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
            loadWorks();
          }
        }
      } catch (error) {
        showLoading(false);
        alert('❌ 生成失败：' + error.message);
      }
    }
    
    // ✅ 保留HeyGen的createReciteVideo函数
    async function createReciteVideo() {
      const provider = selectedRecitePlatform || 'heygen';
      
      if (!selectedReciteDigitalHumanId && !selectedAvatarForRecite) {
        alert('请先选择一个数字人形象');
        return;
      }

      // 根据平台获取文案内容
      let script = '';
      if (provider === 'heygen') {
        script = document.getElementById('reciteScript')?.value.trim() || '';
        if (!script) {
          alert('请输入文案内容');
          return;
        }
        if (script.length > 1000) {
          alert('文案内容过长，请控制在1000字以内');
          return;
        }
      } else {
        // 云雾平台：文案为必填
        script = document.getElementById('reciteScriptYunwu')?.value.trim() || '';
        if (!script) {
          alert('请输入文案内容');
          return;
        }
        if (script.length > 1000) {
          alert('文案内容过长，请控制在1000字以内');
          return;
        }
      }
      let apiKey, requestBody;

      // ========== 云雾API处理（重构为三步流程） ==========
      if (provider === 'yunwu') {
        apiKey = (typeof getYunwuApiKey === 'function' ? getYunwuApiKey() : null) || '';
        if (!apiKey) {
          alert('请先配置云雾 API Key');
          return;
        }
        
        // 获取音色选择
        const voiceSelect = document.getElementById('reciteYunwuVoiceSelect');
        const voiceId = voiceSelect?.value || 'genshin_vindi2';
        const voiceLanguage = 'zh'; // 默认中文
        
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        const dh = digitalHumans.find(d => d.id === selectedReciteDigitalHumanId);
        if (!dh) {
          alert('未找到该数字人');
          return;
        }
        
        // 检查数字人是否有视频URL（用于人脸识别）
        if (!dh.videoUrl) {
          alert('该数字人没有视频URL，无法进行对口型处理。请确保数字人已创建完成并拥有视频。');
          return;
        }

        showLoading(true, '🔄 步骤1/3：正在生成语音...');
        
        try {
          // ========== 步骤1：语音合成 ==========
          console.log('=== 步骤1：语音合成 ===');
          const ttsResponse = await fetch(buildApiUrl('/api/yunwu/audio/tts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: apiKey,
              text: script,
              voice_id: voiceId,
              voice_language: voiceLanguage,
              voice_speed: 1.0
            })
          });
          
          const ttsResult = await ttsResponse.json();
          if (!ttsResult.success || !ttsResult.data) {
            let msg = ttsResult.message || '未知错误';
            const lower = (msg || '').toString().toLowerCase();
            if (lower.indexOf('invalid token') !== -1) {
              msg = '登录状态已失效或云雾 API Key 无效。\n\n请重新登录系统，或联系管理员在「API Key 配置」中为您分配有效的云雾 Key。';
            }
            showLoading(false);
            alert('❌ 语音合成失败：' + msg);
            return;
          }
          
          // ✅ 获取音频URL或ID（TTS API可能返回任务ID，需要轮询获取音频）
          // 检查是否直接返回音频URL/ID，还是返回任务ID需要轮询
          const directAudioUrl = ttsResult.data?.url || ttsResult.data?.audio_url || ttsResult.data?.audioUrl || null;
          const directAudioId = ttsResult.data?.audio_id || ttsResult.data?.id || null;
          const ttsTaskId = ttsResult.data?.task_id || ttsResult.data?.id || ttsResult.taskId || null;
          
          let audioUrl = directAudioUrl;
          let audioId = directAudioId;
          
          // 如果返回的是任务ID，需要轮询获取音频URL/ID
          if (!audioUrl && !audioId && ttsTaskId) {
            console.log('⚠️ TTS返回任务ID，需要轮询获取音频...');
            showLoading(true, '🔄 步骤1/3：正在等待语音生成...');
            
            try {
              // 轮询TTS任务状态
              const maxTtsPolls = 60; // 最多轮询60次（约2.5分钟）
              let ttsPollCount = 0;
              
              while (ttsPollCount < maxTtsPolls) {
                await new Promise(resolve => setTimeout(resolve, 2500)); // 等待2.5秒
                ttsPollCount++;
                
                const ttsStatusResponse = await fetch(buildApiUrl(`/api/yunwu/audio/tts/${ttsTaskId}`), {
                  method: 'GET',
                  headers: {
                    'X-API-Key': apiKey,
                    'Content-Type': 'application/json'
                  }
                });
                
                const ttsStatusResult = await ttsStatusResponse.json();
                const status = ttsStatusResult.data?.task_status || ttsStatusResult.data?.status || '';
                
                if (['succeed', 'succeeded', 'success', 'completed', 'done'].includes(status.toLowerCase())) {
                  // 任务完成，提取音频URL/ID
                  const result = ttsStatusResult.data?.task_result || ttsStatusResult.data?.result || ttsStatusResult.data || {};
                  audioUrl = result.url || result.audio_url || result.audioUrl || 
                            (result.audios && result.audios[0] && result.audios[0].url) ||
                            null;
                  audioId = result.audio_id || result.id ||
                           (result.audios && result.audios[0] && result.audios[0].id) ||
                           null;
                  
                  if (audioUrl || audioId) {
                    console.log('✅ TTS任务完成，音频URL:', audioUrl, '音频ID:', audioId);
                    break;
                  }
                } else if (['failed', 'error', 'failure'].includes(status.toLowerCase())) {
                  showLoading(false);
                  alert('❌ 语音合成任务失败：' + (ttsStatusResult.message || '未知错误'));
                  return;
                }
                
                // 继续轮询
                showLoading(true, `🔄 步骤1/3：正在等待语音生成... (${ttsPollCount}/${maxTtsPolls})`);
              }
              
              if (!audioUrl && !audioId) {
                showLoading(false);
                alert('❌ 语音合成超时，请稍后重试');
                return;
              }
            } catch (ttsPollError) {
              showLoading(false);
              alert('❌ 查询语音合成状态失败：' + ttsPollError.message);
              return;
            }
          }
          
          if (!audioUrl && !audioId) {
            showLoading(false);
            alert('❌ 语音合成未返回音频URL或ID');
            return;
          }
          
          console.log('✅ 语音合成成功，音频URL:', audioUrl, '音频ID:', audioId);
          
          // ========== 步骤2：人脸识别 ==========
          showLoading(true, '🔄 步骤2/3：正在识别人脸...');
          console.log('=== 步骤2：人脸识别 ===');
          
          const identifyResponse = await fetch(buildApiUrl('/api/yunwu/videos/identify-face'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: apiKey,
              video_url: dh.videoUrl
            })
          });
          
          const identifyResult = await identifyResponse.json();
          if (!identifyResult.success || !identifyResult.data) {
            showLoading(false);
            alert('❌ 人脸识别失败：' + (identifyResult.message || '未知错误'));
            return;
          }
          
          const sessionId = identifyResult.data.session_id || identifyResult.data.data?.session_id || null;
          const faceData = identifyResult.data.face_data || identifyResult.data.data?.face_data || identifyResult.data.faces || [];
          const faceId = faceData.length > 0 ? (faceData[0].face_id || '-1') : '-1';
          
          if (!sessionId) {
            showLoading(false);
            alert('❌ 人脸识别未返回会话ID');
            return;
          }
          
          console.log('✅ 人脸识别成功，会话ID:', sessionId, '人脸ID:', faceId);
          
          // ========== 步骤3：对口型 ==========
          showLoading(true, '🔄 步骤3/3：正在生成对口型视频...');
          console.log('=== 步骤3：对口型 ===');
          
          // 获取用户配置的对口型参数（按照API文档要求，所有参数必须是整数）
          const soundStartTime = parseInt(document.getElementById('reciteSoundStartTime')?.value || '0', 10);
          const soundEndTime = parseInt(document.getElementById('reciteSoundEndTime')?.value || '5000', 10);
          const soundInsertTime = parseInt(document.getElementById('reciteSoundInsertTime')?.value || '1000', 10);
          const soundVolume = parseFloat(document.getElementById('reciteSoundVolume')?.value || '1') || 1;
          const originalAudioVolume = parseFloat(document.getElementById('reciteOriginalAudioVolume')?.value || '1') || 1;
          
          // 验证参数范围（按照API文档）
          if (soundStartTime < 0) {
            showLoading(false);
            alert('❌ 音频裁剪起点时间不能小于0');
            return;
          }
          if (soundEndTime < soundStartTime + 2000) {
            showLoading(false);
            alert('❌ 音频裁剪终点时间必须至少比起点时间大2000ms（2秒）');
            return;
          }
          if (soundVolume < 0 || soundVolume > 2) {
            showLoading(false);
            alert('❌ 音频音量大小必须在 [0, 2] 范围内');
            return;
          }
          if (originalAudioVolume < 0 || originalAudioVolume > 2) {
            showLoading(false);
            alert('❌ 原始视频音量大小必须在 [0, 2] 范围内');
            return;
          }
          
          const lipsyncBody = {
            apiKey: apiKey,
            session_id: sessionId,
            face_choose: [{
              face_id: faceId,
              sound_start_time: soundStartTime,
              sound_end_time: soundEndTime,
              sound_insert_time: soundInsertTime,
              sound_volume: soundVolume,
              original_audio_volume: originalAudioVolume
            }]
          };
          
          // 使用音频ID或URL（audio_id和sound_file二选一）
          if (audioId) {
            lipsyncBody.face_choose[0].audio_id = audioId;
            // 确保sound_file不存在
            delete lipsyncBody.face_choose[0].sound_file;
          } else if (audioUrl) {
            lipsyncBody.face_choose[0].sound_file = audioUrl;
            // 确保audio_id不存在
            delete lipsyncBody.face_choose[0].audio_id;
          } else {
            showLoading(false);
            alert('❌ 无法获取音频ID或URL（需要audio_id或sound_file）');
            return;
          }
          
          const lipsyncResponse = await fetch(buildApiUrl('/api/yunwu/videos/advanced-lip-sync'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lipsyncBody)
          });
          
          const lipsyncResult = await lipsyncResponse.json();
          if (!lipsyncResult.success) {
            showLoading(false);
            alert('❌ 对口型任务创建失败：' + (lipsyncResult.message || '未知错误'));
            return;
          }
          
          // 提取任务ID
          const taskId = lipsyncResult.data?.id || 
                         lipsyncResult.data?.task_id || 
                         lipsyncResult.data?.request_id ||
                         lipsyncResult.id ||
                         lipsyncResult.task_id ||
                         null;
          
          if (!taskId) {
            showLoading(false);
            alert('❌ 对口型任务创建成功但未返回任务ID');
            return;
          }
          
          console.log('✅ 对口型任务已创建，任务ID:', taskId);
          
          // 保存作品记录
          const workId = Date.now().toString();
          const work = {
            id: workId,
            type: 'recite',
            title: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
            script: script,
            platform: 'yunwu',
            taskId: taskId,
            status: 'processing',
            progress: 0,
            videoUrl: null,
            voiceId: voiceId,
            voiceLanguage: voiceLanguage,
            audioUrl: audioUrl,
            audioId: audioId,
            sessionId: sessionId,
            faceId: faceId,
            createDate: new Date().toISOString(),
            updateDate: new Date().toISOString()
          };

          const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
          works.unshift(work);
          if (works.length > 100) works.length = 100;
          localStorage.setItem('cn_dh_works', JSON.stringify(works));

          showLoading(false);
          alert(`✅ 诵读视频任务已提交！\n\n任务ID: ${taskId}\n\n系统已完成：\n1️⃣ 语音合成 ✓\n2️⃣ 人脸识别 ✓\n3️⃣ 对口型任务已创建 ✓\n\n请到「作品管理」查看进度与结果。`);

          // 清空表单
          const scriptEl = document.getElementById('reciteScriptYunwu');
          if (scriptEl) {
            scriptEl.value = '';
            updateReciteCharCountYunwu();
          }

          // 开始轮询任务状态
          startReciteTaskPolling(workId, taskId, apiKey, 'yunwu');
          
          // 如果作品管理面板已打开，刷新列表
          if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
            loadWorks();
          }
          
          return; // 云雾平台流程已完成，直接返回
        } catch (err) {
          console.error('创建诵读视频错误:', err);
          showLoading(false);
          alert('❌ 创建失败：' + err.message);
          return;
        }
      }
      // ========== HeyGen处理 ==========
      else {
        apiKey = getHeyGenApiKey();
        if (!apiKey) {
          alert('请先配置 HeyGen API Key');
          return;
        }

        if (!selectedAvatarForRecite) {
          alert('请先选择一个数字人形象');
          return;
        }

        const voiceSelect = document.getElementById('reciteVoiceSelect');
        const voiceId = voiceSelect && voiceSelect.value ? voiceSelect.value : null;

        requestBody = {
          provider: 'heygen',
          type: 'recite',
          apiKey: apiKey,
          avatarId: selectedAvatarForRecite,
          text: script,
          voiceId: voiceId
        };

        showLoading(true, '正在通过HeyGen生成诵读视频...');
      }

      // ========== 统一调用接口 ==========
      try {
        const response = await fetch(buildApiUrl('/api/digital-human/content-video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
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
          alert('❌ 创建失败：' + (result.message || '未知错误'));
          return;
        }

        const taskId = result.taskId || result.id;
        if (!taskId) {
          showLoading(false);
          alert('❌ 创建失败：未返回任务ID，无法查询状态。');
          return;
        }

        // 保存作品记录
        const workId = Date.now().toString();
        const work = {
          id: workId,
          type: 'recite',
          title: script.substring(0, 50) + (script.length > 50 ? '...' : ''),
          script: script,
          platform: provider,
          taskId: taskId,
          status: result.status || 'processing',
          progress: 0,
          videoUrl: null,
          avatarId: provider === 'heygen' ? selectedAvatarForRecite : null,
          voiceId: provider === 'heygen' ? requestBody.voiceId : null,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };

        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(work);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));

        showLoading(false);
        alert(`✅ ${provider === 'yunwu' ? '云雾' : 'HeyGen'}诵读视频已提交！\n\n任务正在后台处理中，请到「作品管理」查看进度与结果。`);

        // 清空表单
        if (provider === 'heygen') {
          const scriptEl = document.getElementById('reciteScript');
          if (scriptEl) {
            scriptEl.value = '';
            updateReciteCharCount();
          }
        } else {
          const scriptEl = document.getElementById('reciteScriptYunwu');
          if (scriptEl) {
            scriptEl.value = '';
            updateReciteCharCountYunwu();
          }
          // ✅ 不再需要清理音频相关状态（已改为自动生成）
        }

        // 开始轮询任务状态
        startReciteTaskPolling(workId, taskId, apiKey, provider);
        
        // 如果作品管理面板已打开，刷新列表
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
      } catch (error) {
        console.error('创建诵读视频错误:', error);
        showLoading(false);
        alert('❌ 创建失败：' + error.message);
      }
    }
    
    function startReciteTaskPolling(workId, taskId, apiKey, platform) {
      platform = platform || 'heygen';
      if (taskPollingIntervals.has(workId)) {
        const ex = taskPollingIntervals.get(workId);
        if (ex) clearInterval(ex);
        taskPollingIntervals.delete(workId);
      }
      let pollCount = 0;
      const maxPolls = 300;
      
      const taskUrl = () => {
        if (platform === 'yunwu') {
          return buildApiUrl(`/api/yunwu/videos/advanced-lip-sync/${taskId}`);
        }
        return buildApiUrl(`/api/digital-human/task/${platform}/${taskId}`);
      };
      const authHeaders = (window.getAuthHeaders && window.getAuthHeaders()) || {};
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          taskPollingIntervals.delete(workId);
          updateReciteWorkStatus(workId, 'failed', 0, null, '任务超时');
          return;
        }
        try {
          const response = await fetch(taskUrl(), { headers: authHeaders });
          const contentType = response.headers.get('content-type') || '';
          let result;
          
          if (contentType.includes('application/json')) {
            result = await response.json();
          } else {
            return;
          }
          
          if (result.success || result.data) {
            let status, progress, videoUrl, error;
            
            if (platform === 'yunwu') {
              // 对口型任务响应格式
              const data = result.data || result;
              const statusRaw = data.task_status || data.status || data.data?.task_status || '';
              status = ['succeed', 'succeeded', 'success', 'completed', 'done'].includes(statusRaw.toLowerCase()) 
                ? 'completed' 
                : ['failed', 'error', 'failure'].includes(statusRaw.toLowerCase())
                ? 'failed'
                : 'processing';
              
              progress = data.progress || (status === 'completed' ? 100 : 0);
              
              // 提取视频URL
              const taskResult = data.task_result || data.result || data.data?.task_result || {};
              videoUrl = taskResult.video || taskResult.video_url || taskResult.url || 
                        data.video || data.video_url || data.url ||
                        null;
              
              error = data.error || data.message || null;
            } else {
              // HeyGen任务响应格式
              status = result.status;
              progress = result.progress || 0;
              videoUrl = result.videoUrl || result.data?.video_url;
              error = result.error;
            }
            
            updateReciteWorkStatus(workId, status, progress, videoUrl, error);
            
            if (status === 'completed' || status === 'failed') {
              clearInterval(pollInterval);
              taskPollingIntervals.delete(workId);
            }
          }
        } catch (error) {
          console.error('轮询诵读任务状态错误:', error);
        }
      }, 2500); // 每2.5秒查询一次（对口型任务可能需要更频繁的查询）
      
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
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
      }
    }
    
    // 加载诵读历史（已迁移至作品管理，此处保留空实现避免报错）
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
        const response = await fetch(buildApiUrl(`/api/heygen/task/${work.taskId}`), {
          headers: (window.getAuthHeaders && window.getAuthHeaders()) || {}
        });
        const result = await response.json();
        
        if (result.success) {
          updateReciteWorkStatus(id, result.status, result.progress, result.videoUrl, result.error);
          loadReciteHistory();
        }
      } catch (error) {
        console.error('刷新作品状态错误:', error);
      }
    }
    
    // ========== 卖货推送功能（多图参考生视频） ==========
    
    // 人物图片列表（最少1张）
    // promotePersonImages / promoteProductImages 已在 state.js 中定义
    
    // 更新提示词字数统计
    function updatePromotePromptCount() {
      const text = document.getElementById('promotePrompt')?.value || '';
      const count = text.length;
      const countEl = document.getElementById('promotePromptCount');
      if (countEl) {
        countEl.textContent = count;
        countEl.style.color = count > 2500 ? 'var(--danger)' : 'var(--text-secondary)';
      }
    }
    
    // 更新商品描述字数统计（HeyGen）
    function updatePromoteCharCount() {
      const text = document.getElementById('promoteProductDesc')?.value || '';
      const count = text.length;
      const countEl = document.getElementById('promoteCharCount');
      if (countEl) {
        countEl.textContent = count;
        countEl.style.color = count > 500 ? 'var(--danger)' : 'var(--text-secondary)';
      }
    }
    
    // 添加人物图片（只能上传1张）
    function addPromotePersonImage() {
      if (promotePersonImages.length >= 1) {
        alert('人物图片只能上传1张，请先删除现有图片');
        return;
      }
      const input = document.getElementById('promotePersonImageInput');
      if (input) input.click();
    }
    
    // 添加物品图片
    function addPromoteProductImage() {
      if (promoteProductImages.length >= 3) {
        alert('最多只能上传3张物品图片');
        return;
      }
      const input = document.getElementById('promoteProductImageInput');
      if (input) input.click();
    }
    
    // 处理人物图片上传（只能上传1张）
    async function handlePromotePersonImageUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      
      // 如果已经有图片，先删除
      if (promotePersonImages.length >= 1) {
        const existingImg = promotePersonImages[0];
        if (existingImg.previewUrl) {
          URL.revokeObjectURL(existingImg.previewUrl);
        }
        promotePersonImages = [];
      }
      
      if (!file.type.startsWith('image/')) {
        alert(`文件 ${file.name} 不是图片格式`);
        event.target.value = '';
        return;
      }
      
      const isLocal = isLocalhost();
      
      try {
        showLoading(true, `正在处理人物图片: ${file.name}...`);
        
        let imageUrl = null;
        let imageBase64 = null;
        
        if (isLocal) {
          // 本地测试：使用Base64（保留完整data URL格式）
          const reader = new FileReader();
          imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => {
              // 保留完整的data URL格式，包含MIME类型信息
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } else {
          // 生产环境：上传为URL
          imageUrl = await uploadImageFile(file);
        }
        
        promotePersonImages.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: imageUrl,
          base64: imageBase64,
          mimeType: file.type, // 保存MIME类型
          previewUrl: URL.createObjectURL(file)
        });
        
        showLoading(false);
      } catch (error) {
        showLoading(false);
        alert(`人物图片 ${file.name} 处理失败：` + error.message);
      }
      
      event.target.value = '';
      renderPromotePersonImages();
    }
    
    // 处理物品图片上传
    async function handlePromoteProductImageUpload(event) {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;
      
      if (promoteProductImages.length + files.length > 3) {
        alert('最多只能上传3张物品图片');
        return;
      }
      
      const isLocal = isLocalhost();
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          alert(`文件 ${file.name} 不是图片格式`);
          continue;
        }
        
        try {
          showLoading(true, `正在处理物品图片: ${file.name}...`);
          
          let imageUrl = null;
          let imageBase64 = null;
          
          if (isLocal) {
            // 本地测试：使用Base64（保留完整data URL格式）
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve, reject) => {
              reader.onload = () => {
                // 保留完整的data URL格式，包含MIME类型信息
                resolve(reader.result);
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } else {
            // 生产环境：上传为URL
            imageUrl = await uploadImageFile(file);
          }
          
          promoteProductImages.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: imageUrl,
            base64: imageBase64,
            mimeType: file.type, // 保存MIME类型
            previewUrl: URL.createObjectURL(file)
          });
          
          showLoading(false);
        } catch (error) {
          showLoading(false);
          alert(`物品图片 ${file.name} 处理失败：` + error.message);
        }
      }
      
      event.target.value = '';
      renderPromoteProductImages();
    }
    
    // 渲染人物图片列表（只能显示1张）
    function renderPromotePersonImages() {
      const container = document.getElementById('promotePersonImagesList');
      const addBtn = document.getElementById('promoteAddPersonImageBtn');
      if (!container) return;
      
      if (addBtn) {
        addBtn.style.display = promotePersonImages.length >= 1 ? 'none' : 'block';
        addBtn.textContent = promotePersonImages.length >= 1 ? '已上传人物图片' : '➕ 上传人物图片';
      }
      
      if (promotePersonImages.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-secondary);">请上传1张人物图片（必填）</div>';
        return;
      }
      
      container.innerHTML = promotePersonImages.map(img => `
        <div style="position: relative; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg-secondary);">
          <img src="${img.previewUrl}" style="width: 100%; height: 120px; object-fit: cover;" alt="${img.name}">
          <div style="padding: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.name}</div>
            <button type="button" class="btn secondary" onclick="removePromotePersonImage('${img.id}')" style="width: 100%; padding: 4px 8px; font-size: 0.75rem;">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
    }
    
    // 渲染物品图片列表
    function renderPromoteProductImages() {
      const container = document.getElementById('promoteProductImagesList');
      const addBtn = document.getElementById('promoteAddProductImageBtn');
      if (!container) return;
      
      if (addBtn) {
        addBtn.style.display = promoteProductImages.length >= 3 ? 'none' : 'block';
      }
      
      if (promoteProductImages.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-secondary);">暂无物品图片（可选）</div>';
        return;
      }
      
      container.innerHTML = promoteProductImages.map(img => `
        <div style="position: relative; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg-secondary);">
          <img src="${img.previewUrl}" style="width: 100%; height: 120px; object-fit: cover;" alt="${img.name}">
          <div style="padding: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${img.name}</div>
            <button type="button" class="btn secondary" onclick="removePromoteProductImage('${img.id}')" style="width: 100%; padding: 4px 8px; font-size: 0.75rem;">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
    }
    
    // 删除人物图片
    function removePromotePersonImage(id) {
      const img = promotePersonImages.find(i => i.id === id);
      if (img && img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      promotePersonImages = promotePersonImages.filter(i => i.id !== id);
      renderPromotePersonImages();
    }
    
    // 删除物品图片
    function removePromoteProductImage(id) {
      const img = promoteProductImages.find(i => i.id === id);
      if (img && img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      promoteProductImages = promoteProductImages.filter(i => i.id !== id);
      renderPromoteProductImages();
    }
    
    // 暴露函数到window
    window.addPromotePersonImage = addPromotePersonImage;
    window.addPromoteProductImage = addPromoteProductImage;
    window.handlePromotePersonImageUpload = handlePromotePersonImageUpload;
    window.handlePromoteProductImageUpload = handlePromoteProductImageUpload;
    window.removePromotePersonImage = removePromotePersonImage;
    window.removePromoteProductImage = removePromoteProductImage;
    
    // 轮询多图参考生视频任务
    function pollPromoteMultiImage2VideoTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount) {
      pollCount = pollCount || 0;
      const maxPolls = 240; // 10分钟超时
      
      if (pollCount > maxPolls) {
        reject(new Error('任务超时（10分钟仍未完成），已判定失败'));
        return;
      }
      
      const url = buildApiUrl(`/api/yunwu/videos/multi-image2video/${encodeURIComponent(taskId)}`);
      
      fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.success === false && data.message) {
            reject(new Error(data.message));
            return;
          }
          
          // 提取状态
          const statusRaw = (data && data.data && data.data.task_status) ||
            (data && data.task_status) ||
            (data && data.data && data.data.status) ||
            (data && data.status) ||
            (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
            '';
          
          const status = normalizeTaskStatus(statusRaw);
          const result = (data && data.data && data.data.task_result) ||
            (data && data.data && data.data.result) ||
            (data && data.result) ||
            (data && data.data) ||
            {};
          
          // 收集视频URL
          let videos = [];
          if (result.video || result.videoUrl || result.video_url) {
            const v = result.video || result.videoUrl || result.video_url;
            if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
            else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
          }
          if (result.videos && Array.isArray(result.videos)) {
            result.videos.forEach(v => {
              if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
              else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
            });
          }
          if (!videos.length && result.url) {
            const url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
          }
          if (!videos.length && data && data.data && data.data.video) {
            const v = data.data.video;
            if (typeof v === 'string' && /\.(mp4|webm|mov|avi)$/i.test(v)) videos.push(v);
            else if (v && v.url && /\.(mp4|webm|mov|avi)$/i.test(v.url)) videos.push(v.url);
          }
          // 递归收集视频URL
          if (!videos.length) {
            collectReciteVideoUrls(data, videos);
          }
          videos = [...new Set(videos.filter(Boolean))];
          
          const videoId = (result && result.video_id) ||
            (data && data.data && data.data.video_id) ||
            (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
            (data && data.video_id) ||
            '';
          
          if (status === 'done' && videos.length > 0) {
            resolve({ videos: videos, raw: data, videoId: videoId });
            return;
          }
          
          if (status === 'failed') {
            const errMsg = (result.message || result.error || data.message || data.error || '任务失败') + '';
            reject(new Error(errMsg));
            return;
          }
          
          if (status === 'done' && !videos.length) {
            const progressText = '状态已完成，等待视频生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
            if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              const pw = (window.MediaStudio.getWorks() || []).find(w => w.id === workId);
              const n = ((pw && pw.progress) || 0) + 1;
              window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '等待资源' });
            }
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
            setTimeout(() => { pollPromoteMultiImage2VideoTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
            return;
          }
          
          const progressText = '轮询中，状态=' + (statusRaw || '处理中') + (videos.length > 0 ? '，已检测到视频链接' : '') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            const pw = (window.MediaStudio.getWorks() || []).find(w => w.id === workId);
            const n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(() => { pollPromoteMultiImage2VideoTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1); }, 2500);
        })
        .catch(reject);
    }
    
    // 创建卖货推送视频（仅云雾）
    async function createPromoteVideo() {
      const provider = selectedPromotePlatform || 'yunwu';
      
      // ========== 云雾API处理（多图参考生视频） ==========
      if (provider === 'yunwu') {
        // 验证人物图片（必须1张）
        if (promotePersonImages.length !== 1) {
          alert('请上传1张人物图片（必填）');
          return;
        }
        
        // 验证提示词
        const prompt = document.getElementById('promotePrompt')?.value.trim() || '';
        if (!prompt) {
          alert('请输入正向提示词');
          return;
        }
        if (prompt.length > 2500) {
          alert('提示词过长，不能超过2500个字符');
          return;
        }
        
        // 获取参数
        const negativePrompt = document.getElementById('promoteNegativePrompt')?.value.trim() || '';
        const mode = document.getElementById('promoteMode')?.value || 'std';
        const duration = document.getElementById('promoteDuration')?.value || '5';
        const aspectRatio = document.getElementById('promoteAspectRatio')?.value || '';
        
        const apiKey = (typeof getYunwuApiKey === 'function' ? getYunwuApiKey() : null) || '';
        if (!apiKey) {
          alert('请先配置云雾 API Key');
          return;
        }
        
        const isLocal = isLocalhost();
        
        // 合并图片列表（人物图片 + 物品图片，最多4张）
        const allImages = [...promotePersonImages, ...promoteProductImages].slice(0, 4);
        const imageList = [];
        
        showLoading(true, '正在准备图片数据...');
        
        try {
          for (const img of allImages) {
            let imageValue = null;
            
            if (isLocal) {
              // 本地测试：使用纯Base64（API不接受data URL格式）
              if (img.base64) {
                // 提取纯Base64字符串（移除data URL前缀和空白字符）
                let pureBase64 = '';
                if (img.base64.startsWith('data:')) {
                  // 如果是data URL格式，提取base64部分
                  const commaIndex = img.base64.indexOf(',');
                  pureBase64 = commaIndex >= 0 ? img.base64.substring(commaIndex + 1) : img.base64;
                } else {
                  // 如果已经是纯Base64，直接使用
                  pureBase64 = img.base64;
                }
                
                // 移除所有空白字符
                pureBase64 = pureBase64.replace(/[\s\n\r]/g, '');
                
                // 验证Base64格式
                if (!/^[A-Za-z0-9+/=]+$/.test(pureBase64)) {
                  console.error('无效的Base64格式:', img.name);
                  showLoading(false);
                  alert(`图片 ${img.name} 的Base64格式无效，请重新上传`);
                  return;
                }
                
                // API期望纯Base64字符串，不包含data URL前缀
                imageValue = pureBase64;
              }
            } else {
              // 生产环境：使用URL
              if (img.url) {
                imageValue = img.url;
              } else if (img.base64) {
                // 如果没有URL但有Base64，上传为URL
                try {
                  // 检测图片类型
                  let mimeType = 'image/jpeg';
                  if (img.name) {
                    const ext = img.name.toLowerCase().split('.').pop();
                    if (ext === 'png') mimeType = 'image/png';
                    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                    else if (ext === 'webp') mimeType = 'image/webp';
                  }
                  
                  const base64Data = img.base64.startsWith('data:') ? img.base64.split(',')[1] : img.base64.replace(/[\s\n\r]/g, '');
                  const binaryString = atob(base64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: mimeType });
                  const file = new File([blob], img.name || 'image.jpg', { type: mimeType });
                  imageValue = await uploadImageFile(file);
                } catch (err) {
                  console.error('图片上传失败:', err);
                  showLoading(false);
                  alert(`图片 ${img.name} 上传失败：` + err.message);
                  return;
                }
              }
            }
            
            if (imageValue) {
              imageList.push({ image: imageValue });
            } else {
              console.warn('图片处理失败，跳过:', img.name);
            }
          }
          
          if (imageList.length === 0) {
            showLoading(false);
            alert('图片处理失败，请重新上传');
            return;
          }
          
          // 构建请求体
          const requestBody = {
            model_name: 'kling-v1-6',
            image_list: imageList,
            prompt: prompt,
            mode: mode,
            duration: duration
          };
          
          if (negativePrompt) {
            requestBody.negative_prompt = negativePrompt;
          }
          if (aspectRatio) {
            requestBody.aspect_ratio = aspectRatio;
          }
          
          showLoading(true, '正在提交多图参考生视频任务...');
          
          // 调用API
          const response = await fetch(buildApiUrl('/api/yunwu/videos/multi-image2video'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
            body: JSON.stringify(requestBody)
          });
          
          const result = await response.json();
          
          if (!response.ok || (result.success === false)) {
            showLoading(false);
            alert('❌ 任务创建失败：' + (result.message || result.error || '未知错误'));
            return;
          }
          
          // 获取任务ID
          const taskId = (result && result.data && (result.data.id || result.data.task_id || result.data.request_id)) ||
            (result && result.id) ||
            (result && result.task_id) ||
            (result && result.request_id) ||
            (result && result.data && result.data.request_id);
          
          if (!taskId) {
            showLoading(false);
            alert('❌ 任务创建失败：未返回任务ID');
            return;
          }
          
          // 保存作品记录
          const workId = Date.now().toString();
          const work = {
            id: workId,
            type: 'product',
            title: prompt.substring(0, 50) || '多图参考生视频',
            prompt: prompt,
            negativePrompt: negativePrompt,
            mode: mode,
            duration: duration,
            aspectRatio: aspectRatio,
            platform: 'yunwu',
            taskId: taskId,
            status: 'processing',
            progress: 0,
            progressStatus: '已提交',
            createdAt: new Date().toISOString()
          };
          
          // 保存到localStorage
          const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
          works.unshift(work);
          localStorage.setItem('cn_dh_works', JSON.stringify(works));
          
          // 立即关闭加载状态，开始后台轮询
          showLoading(false);
          
          // 开始轮询
          new Promise((resolve, reject) => {
            pollPromoteMultiImage2VideoTask(taskId, apiKey, workId, (progressText, statusRaw) => {
              // 更新作品状态
              const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
              const w = works.find(w => w.id === workId);
              if (w) {
                w.progressStatus = statusRaw || progressText;
                localStorage.setItem('cn_dh_works', JSON.stringify(works));
                if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
                  loadWorks();
                }
              }
            }, resolve, reject, 0);
          })
            .then(pollResult => {
              // 任务完成，更新作品
              const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
              const w = works.find(w => w.id === workId);
              if (w && pollResult.videos && pollResult.videos.length > 0) {
                w.videoUrl = pollResult.videos[0];
                w.videoId = pollResult.videoId || '';
                w.status = 'completed';
                w.progressStatus = '已完成';
                localStorage.setItem('cn_dh_works', JSON.stringify(works));
                
                // 刷新作品列表
                if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
                  loadWorks();
                }
                
                alert('✅ 视频生成成功！可在「作品管理」中查看。');
              }
            })
            .catch(err => {
              // 任务失败，更新作品
              const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
              const w = works.find(w => w.id === workId);
              if (w) {
                w.status = 'failed';
                w.progressStatus = err.message || '失败';
                localStorage.setItem('cn_dh_works', JSON.stringify(works));
                
                // 刷新作品列表
                if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
                  loadWorks();
                }
                
                alert('❌ 视频生成失败：' + err.message);
              }
            });
        } catch (error) {
          showLoading(false);
          alert('❌ 生成失败：' + error.message);
        }
        return;
      }
      
      // ========== HeyGen处理（保持原有逻辑） ==========
      const productName = document.getElementById('promoteProductName')?.value.trim();
      const productDesc = document.getElementById('promoteProductDesc')?.value.trim();
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
      // ✅ 已删除：不再需要选择数字人

      const script = `大家好，今天为大家推荐一款${productName}。${productDesc}。感兴趣的朋友不要错过！`;
      let apiKey, requestBody;

      apiKey = getHeyGenApiKey();
      if (!apiKey) {
        alert('请先配置 HeyGen API Key');
        return;
      }

      // ✅ 已删除：不再需要选择数字人，HeyGen卖货推送功能已禁用，请使用云雾平台的多图参考生视频功能
      alert('HeyGen平台的卖货推送功能已禁用。\n\n请切换到「云雾数字人」平台，使用多图参考生视频功能创建推广视频。');
      return;

      const voiceSelect = document.getElementById('promoteVoiceSelect');
      const voiceId = voiceSelect && voiceSelect.value ? voiceSelect.value : null;

      requestBody = {
        provider: 'heygen',
        type: 'promote',
        apiKey: apiKey,
        avatarId: null, // 已删除选择数字人功能
        text: script,
        voiceId: voiceId,
        productName: productName
      };

      showLoading(true, '正在通过HeyGen生成推广视频...');

      // ========== 统一调用接口 ==========
      try {
        const response = await fetch(buildApiUrl('/api/digital-human/content-video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
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
          alert('❌ 创建失败：' + (result.message || '未知错误'));
          return;
        }

        const taskId = result.taskId || result.id;
        if (!taskId) {
          showLoading(false);
          alert('❌ 创建失败：未返回任务ID，无法查询状态。');
          return;
        }

        // 保存作品记录
        const workId = Date.now().toString();
        const work = {
          id: workId,
          type: 'product',
          productName: productName,
          title: productName,
          script: script,
          platform: provider,
          taskId: taskId,
          status: result.status || 'processing',
          progress: 0,
          videoUrl: null,
          avatarId: provider === 'heygen' ? selectedAvatarForPromote : null,
          voiceId: provider === 'heygen' ? requestBody.voiceId : null,
          imageUrl: promoteProductImageUrl || null,
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        };

        const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
        works.unshift(work);
        if (works.length > 100) works.length = 100;
        localStorage.setItem('cn_dh_works', JSON.stringify(works));

        showLoading(false);
        alert(`✅ ${provider === 'yunwu' ? '云雾' : 'HeyGen'}推广视频已提交！\n\n任务正在后台处理中，请到「作品管理」查看进度与结果。`);

        // 清空表单
        document.getElementById('promoteProductName').value = '';
        document.getElementById('promoteProductDesc').value = '';
        removeProductImage('promote');
        updatePromoteCharCount();
        
        if (provider === 'yunwu') {
          promoteAudioBase64Yunwu = null;
          const inp = document.getElementById('promoteYunwuAudioInput');
          if (inp) inp.value = '';
          const ps = document.getElementById('promoteVideoSoundStatus');
          if (ps) ps.style.display = 'none';
        }

        // 开始轮询任务状态
        startPromoteTaskPolling(workId, taskId, apiKey, provider);
        
        // 如果作品管理面板已打开，刷新列表
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
      } catch (error) {
        console.error('创建推广视频错误:', error);
        showLoading(false);
        alert('❌ 创建失败：' + error.message);
      }
    }

    function startPromoteTaskPolling(workId, taskId, apiKey, platform) {
      platform = platform || 'heygen';
      if (taskPollingIntervals.has(workId)) {
        const ex = taskPollingIntervals.get(workId);
        if (ex) clearInterval(ex);
        taskPollingIntervals.delete(workId);
      }
      let pollCount = 0;
      const maxPolls = 300;
      const taskUrl = () => buildApiUrl(`/api/digital-human/task/${platform}/${taskId}`);
      const authHeaders = (window.getAuthHeaders && window.getAuthHeaders()) || {};
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          taskPollingIntervals.delete(workId);
          updatePromoteWorkStatus(workId, 'failed', 0, null, '任务超时');
          return;
        }
        try {
          const response = await fetch(taskUrl(), { headers: authHeaders });
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
        if (document.getElementById('worksPanel') && !document.getElementById('worksPanel').classList.contains('hidden')) {
          loadWorks();
        }
      }
    }
    
    // 加载推广历史（已迁移至作品管理，此处保留空实现避免报错）
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
        const response = await fetch(buildApiUrl(`/api/heygen/task/${work.taskId}`), {
          headers: (window.getAuthHeaders && window.getAuthHeaders()) || {}
        });
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
    // loadCachedVoicesForContext 在 modules/voices.js
  
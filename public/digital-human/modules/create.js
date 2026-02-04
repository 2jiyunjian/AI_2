/**
 * 数字人 - 创建模块：创建数字人流程
 * 依赖：core.js, config.js, state.js
 */
(function () {
  'use strict';

  // 步骤管理
  function goToStep(step) {
    if (step > currentStep && !validateCurrentStep()) {
      return;
    }
    
    currentStep = step;
    updateStepIndicator(step);
    
    document.querySelectorAll('.step-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const stepEl = document.getElementById(`step${step}Content`);
    if (stepEl) stepEl.classList.add('active');
    
    if (step === 1) {
      document.querySelectorAll('.api-config').forEach(config => {
        config.classList.add('hidden');
      });
      const configEl = document.getElementById(currentPlatform + 'Config');
      if (configEl) configEl.classList.remove('hidden');
    }
    
    if (step === 2) {
      if (typeof window.updateStep2ForPlatform === 'function') {
        window.updateStep2ForPlatform();
      }
    }
    
    if (step === 3) {
      if (typeof window.updateStep3ForPlatform === 'function') {
        window.updateStep3ForPlatform();
      }
      if (typeof window.updateStep3VideoPreview === 'function') {
        window.updateStep3VideoPreview();
      }
    }
    
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
      if (currentPlatform === 'heygen') {
        const apiKey = window.getHeyGenApiKey();
        if (!apiKey) {
          alert('请先配置并测试 HeyGen API 连接\n\n提示：请填写 HeyGen API Key 并点击"保存配置"按钮。');
          return false;
        }
      } else if (currentPlatform === 'yunwu') {
        const apiKey = window.getYunwuApiKey();
        if (!apiKey) {
          alert('请先配置并测试 云雾 API 连接\n\n提示：请填写 云雾 API Key 并点击"保存配置"按钮。');
          return false;
        }
      }
    } else if (currentStep === 2) {
      if (currentAvatarMode === 'template') {
        if (!selectedAvatarId || selectedAvatarId === 'default' || selectedAvatarId === 'default_avatar_id') {
          alert('❌ 请先选择一个数字人模板\n\n根据HeyGen API要求，必须选择一个有效的数字人模板才能继续。\n\n请从模板列表中选择一个数字人形象。');
          return false;
        }
      } else if (currentAvatarMode === 'upload') {
        if (!selectedVideoFile) {
          alert('请先上传视频或图片文件');
          return false;
        }
        if (currentPlatform === 'heygen' && !selectedAudioFile) {
          alert('请先上传音频文件\n\n提示：HeyGen 上传参考文件时需要同时上传视频和音频。');
          return false;
        }
        if (currentPlatform === 'yunwu' && !selectedAudioFile) {
          alert('请先上传音频文件\n\n提示：可灵数字人接口要求必须提供音频。支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
          return false;
        }
      } else if (currentAvatarMode === 'record') {
        if (!recordedVideoBlob) {
          alert('请先录制视频');
          return false;
        }
        if (!recordedAudioBlob) {
          alert('请先录制音频\n\n提示：实时录制时需要同时录制视频和音频。');
          return false;
        }
      } else {
        alert('请先选择一种形象选择方式（模板、上传或录制）');
        return false;
      }
    } else if (currentStep === 3) {
      const name = document.getElementById('digitalHumanName')?.value.trim();
      if (!name) {
        alert('请输入数字人名称');
        return false;
      }
      const script = document.getElementById('scriptInput')?.value.trim();
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

  function switchAvatarMode(mode) {
    currentAvatarMode = mode;
    
    const templateBtn = document.getElementById('avatarModeTemplate');
    const uploadBtn = document.getElementById('avatarModeUpload');
    const recordBtn = document.getElementById('avatarModeRecord');
    const templateSection = document.getElementById('templateSelectionSection');
    const uploadSection = document.getElementById('uploadReferenceSection');
    const recordSection = document.getElementById('recordSection');
    const voiceSelectionSection = document.getElementById('voiceSelectionSection');
    
    if (templateBtn && uploadBtn && recordBtn) {
      templateBtn.classList.remove('active');
      uploadBtn.classList.remove('active');
      recordBtn.classList.remove('active');
      
      if (mode === 'template') {
        templateBtn.classList.add('active');
        if (templateSection) templateSection.style.display = 'block';
        if (uploadSection) uploadSection.style.display = 'none';
        if (recordSection) recordSection.style.display = 'none';
        if (voiceSelectionSection) voiceSelectionSection.style.display = 'block';
        if (typeof window.clearUploadedFiles === 'function') window.clearUploadedFiles();
        if (typeof window.clearRecordedFiles === 'function') window.clearRecordedFiles();
      } else if (mode === 'upload') {
        uploadBtn.classList.add('active');
        if (templateSection) templateSection.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'block';
        if (recordSection) recordSection.style.display = 'none';
        if (voiceSelectionSection) voiceSelectionSection.style.display = 'none';
        if (typeof window.clearTemplateSelection === 'function') window.clearTemplateSelection();
        if (typeof window.clearRecordedFiles === 'function') window.clearRecordedFiles();
      } else if (mode === 'record') {
        recordBtn.classList.add('active');
        if (templateSection) templateSection.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
        if (recordSection) recordSection.style.display = 'block';
        if (voiceSelectionSection) voiceSelectionSection.style.display = 'none';
        if (typeof window.clearTemplateSelection === 'function') window.clearTemplateSelection();
        if (typeof window.clearUploadedFiles === 'function') window.clearUploadedFiles();
      }
    }
  }

  function updateCharCount() {
    const text = document.getElementById('scriptInput')?.value || '';
    const count = text.length;
    const countEl = document.getElementById('charCount');
    
    if (countEl) {
      countEl.textContent = `${count} / 500 字`;
      countEl.className = 'char-count-inline';
      if (count > 500) countEl.classList.add('error');
      else if (count > 400) countEl.classList.add('warning');
    }
  }

  function updateSliderValue(type) {
    const slider = document.getElementById(type + 'Slider');
    const valueEl = document.getElementById(type + 'Value');
    if (slider && valueEl) {
      valueEl.textContent = slider.value;
    }
  }

  // 平台切换（创建数字人）
  function switchCreatePlatform(platform) {
    currentPlatform = platform;
    
    // 更新顶部按钮状态
    document.querySelectorAll('.platform-tab-top').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.getElementById('createPlatform' + (platform === 'heygen' ? 'HeyGen' : 'Yunwu'));
    if (activeBtn) activeBtn.classList.add('active');
    
    // 切换内容显示
    const heygenContent = document.getElementById('createHeyGenContent');
    const yunwuContent = document.getElementById('createYunwuContent');
    
    if (heygenContent && yunwuContent) {
      if (platform === 'heygen') {
        heygenContent.style.display = 'block';
        yunwuContent.style.display = 'none';
      } else {
        heygenContent.style.display = 'none';
        yunwuContent.style.display = 'block';
      }
    }
    
    // 底部栏：HeyGen 显示音频格式，云雾显示生成视频模式
    const formatSelect = document.getElementById('formatSelect');
    const videoModeSelect = document.getElementById('videoModeSelect');
    if (formatSelect && videoModeSelect) {
      if (platform === 'heygen') {
        formatSelect.style.display = '';
        videoModeSelect.style.display = 'none';
      } else {
        formatSelect.style.display = 'none';
        videoModeSelect.style.display = '';
      }
    }
  }

  // 底部栏生成按钮处理
  function handleBottomBarGenerate() {
    if (currentPlatform === 'heygen') {
      if (typeof window.createDigitalHuman === 'function') {
        window.createDigitalHuman();
      }
    } else if (currentPlatform === 'yunwu') {
      if (typeof window.createYunwuDigitalHumanFromUI === 'function') {
        window.createYunwuDigitalHumanFromUI();
      }
    }
  }

  // 平台切换（图生视频）
  function switchImageCreatePlatform(platform) {
    currentPlatform = platform;
    
    // 更新按钮状态（图生视频）
    const imageContent = document.getElementById('imageToVideoContent');
    if (imageContent && imageContent.style.display !== 'none') {
      document.querySelectorAll('#imageToVideoContent .platform-select-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.getElementById('imageCreatePlatform' + (platform === 'heygen' ? 'HeyGen' : 'Yunwu'));
      if (activeBtn) activeBtn.classList.add('active');
      
      // 切换内容显示
      const heygenContent = document.getElementById('imageCreateHeyGenContent');
      const yunwuContent = document.getElementById('imageCreateYunwuContent');
      
      if (heygenContent && yunwuContent) {
        if (platform === 'heygen') {
          heygenContent.style.display = 'block';
          yunwuContent.style.display = 'none';
        } else {
          heygenContent.style.display = 'none';
          yunwuContent.style.display = 'block';
        }
      }
    }
  }

  // 云雾平台视频上传
  function handleYunwuVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    selectedVideoFile = file;
    selectedVideoUrl = URL.createObjectURL(file);
    
    const preview = document.getElementById('yunwuVideoPreview');
    const previewElement = document.getElementById('yunwuVideoPreviewElement');
    
    if (preview && previewElement) {
      previewElement.src = selectedVideoUrl;
      preview.style.display = 'block';
    }
  }

  // 云雾平台音频上传
  function handleYunwuAudioUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    selectedAudioFile = file;
    
    const preview = document.getElementById('yunwuAudioPreview');
    const previewElement = document.getElementById('yunwuAudioPreviewElement');
    
    if (preview && previewElement) {
      previewElement.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }
  }

  // 删除云雾视频
  function removeYunwuVideo() {
    selectedVideoFile = null;
    if (selectedVideoUrl) {
      URL.revokeObjectURL(selectedVideoUrl);
      selectedVideoUrl = null;
    }
    
    const preview = document.getElementById('yunwuVideoPreview');
    const input = document.getElementById('yunwuVideoInput');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  // 删除云雾音频
  function removeYunwuAudio() {
    selectedAudioFile = null;
    
    const preview = document.getElementById('yunwuAudioPreview');
    const input = document.getElementById('yunwuAudioInput');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  // 显示云雾视频历史
  function showYunwuVideoHistory() {
    // TODO: 实现历史视频选择功能
    alert('历史创作功能开发中...');
  }

  // 显示云雾音频历史
  function showYunwuAudioHistory() {
    // TODO: 实现历史音频选择功能
    alert('历史创作功能开发中...');
  }

  // 更新云雾文案字数
  function updateYunwuCharCount() {
    const text = document.getElementById('yunwuScriptInput')?.value || '';
    const count = text.length;
    const countEl = document.getElementById('yunwuCharCount');
    
    if (countEl) {
      countEl.textContent = `${count} / 500 字`;
      countEl.className = 'char-count-inline';
      if (count > 500) countEl.classList.add('error');
      else if (count > 400) countEl.classList.add('warning');
    }
  }

  // 从UI创建云雾数字人
  async function createYunwuDigitalHumanFromUI() {
    const name = prompt('请输入数字人名称：', '未命名数字人');
    if (!name) return;
    
    const script = document.getElementById('yunwuScriptInput')?.value.trim() || '';
    const modeEl = document.getElementById('videoModeSelect');
    const mode = (modeEl && modeEl.value) ? modeEl.value : 'std';
    
    if (!selectedVideoFile) {
      alert('请先上传视频文件');
      return;
    }
    
    if (!selectedAudioFile) {
      alert('请先上传音频文件\n\n提示：可灵数字人接口要求必须提供音频。支持 .mp3/.wav/.m4a/.aac，2~60秒，≤5MB。');
      return;
    }
    
    if (typeof window.createYunwuDigitalHuman === 'function') {
      await window.createYunwuDigitalHuman(name, '', script, mode);
    } else {
      alert('创建函数未找到，请检查代码');
    }
  }

  // 暴露函数到全局
  window.goToStep = goToStep;
  window.updateStepIndicator = updateStepIndicator;
  window.validateCurrentStep = validateCurrentStep;
  window.switchAvatarMode = switchAvatarMode;
  window.updateCharCount = updateCharCount;
  window.updateSliderValue = updateSliderValue;
  // 图生视频 - 文件上传处理
  let imageSelectedVideoFile = null;
  let imageSelectedVideoUrl = null;
  let imageSelectedAudioFile = null;
  let imageSelectedImageFile = null;

  function handleImageFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      imageSelectedImageFile = file;
      imageSelectedVideoFile = null;
    } else if (file.type.startsWith('video/')) {
      imageSelectedVideoFile = file;
      imageSelectedImageFile = null;
    }
    
    imageSelectedVideoUrl = URL.createObjectURL(file);
    
    const preview = document.getElementById('imagePreviewSection');
    const videoPreview = document.getElementById('imageUploadedVideoPreview');
    const imagePreview = document.getElementById('imageUploadedImagePreview');
    
    if (preview) {
      if (file.type.startsWith('video/') && videoPreview) {
        videoPreview.src = imageSelectedVideoUrl;
        videoPreview.style.display = 'block';
        imagePreview.style.display = 'none';
      } else if (file.type.startsWith('image/') && imagePreview) {
        imagePreview.src = imageSelectedVideoUrl;
        imagePreview.style.display = 'block';
        videoPreview.style.display = 'none';
      }
      preview.style.display = 'block';
    }
  }

  function handleImageDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const input = document.getElementById('imageUploadFile');
      if (input) {
        input.files = files;
        handleImageFileUpload(input);
      }
    }
  }

  function handleImageDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.add('dragover');
  }

  function handleImageDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.remove('dragover');
  }

  function handleImageAudioFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    imageSelectedAudioFile = file;
    
    const preview = document.getElementById('imageAudioPreviewSection');
    const audioPreview = document.getElementById('imageUploadedAudioPreview');
    
    if (preview && audioPreview) {
      audioPreview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }
  }

  function handleImageAudioDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const input = document.getElementById('imageUploadAudioFile');
      if (input) {
        input.files = files;
        handleImageAudioFileUpload(input);
      }
    }
  }

  function handleImageAudioDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.add('dragover');
  }

  function handleImageAudioDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (target) target.classList.remove('dragover');
  }

  function removeImageUpload() {
    imageSelectedVideoFile = null;
    imageSelectedImageFile = null;
    if (imageSelectedVideoUrl) {
      URL.revokeObjectURL(imageSelectedVideoUrl);
      imageSelectedVideoUrl = null;
    }
    
    const preview = document.getElementById('imagePreviewSection');
    const input = document.getElementById('imageUploadFile');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  function removeImageAudioUpload() {
    imageSelectedAudioFile = null;
    
    const preview = document.getElementById('imageAudioPreviewSection');
    const input = document.getElementById('imageUploadAudioFile');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  function updateImageCharCount() {
    const text = document.getElementById('imageScriptInput')?.value || '';
    const count = text.length;
    const countEl = document.getElementById('imageCharCount');
    
    if (countEl) {
      countEl.textContent = `${count} / 500 字`;
      countEl.className = 'char-count';
      
      if (count > 500) {
        countEl.classList.add('error');
      } else if (count > 400) {
        countEl.classList.add('warning');
      }
    }
  }

  // 图生视频 - 云雾平台文件上传
  function handleImageYunwuVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    imageSelectedVideoFile = file;
    imageSelectedVideoUrl = URL.createObjectURL(file);
    
    const preview = document.getElementById('imageYunwuVideoPreview');
    const previewElement = document.getElementById('imageYunwuVideoPreviewElement');
    
    if (preview && previewElement) {
      previewElement.src = imageSelectedVideoUrl;
      preview.style.display = 'block';
    }
  }

  function handleImageYunwuAudioUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    imageSelectedAudioFile = file;
    
    const preview = document.getElementById('imageYunwuAudioPreview');
    const previewElement = document.getElementById('imageYunwuAudioPreviewElement');
    
    if (preview && previewElement) {
      previewElement.src = URL.createObjectURL(file);
      preview.style.display = 'block';
    }
  }

  function removeImageYunwuVideo() {
    imageSelectedVideoFile = null;
    if (imageSelectedVideoUrl) {
      URL.revokeObjectURL(imageSelectedVideoUrl);
      imageSelectedVideoUrl = null;
    }
    
    const preview = document.getElementById('imageYunwuVideoPreview');
    const input = document.getElementById('imageYunwuVideoInput');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  function removeImageYunwuAudio() {
    imageSelectedAudioFile = null;
    
    const preview = document.getElementById('imageYunwuAudioPreview');
    const input = document.getElementById('imageYunwuAudioInput');
    if (preview) preview.style.display = 'none';
    if (input) input.value = '';
  }

  function updateImageYunwuCharCount() {
    const text = document.getElementById('imageYunwuScriptInput')?.value || '';
    const count = text.length;
    const countEl = document.getElementById('imageYunwuCharCount');
    
    if (countEl) {
      countEl.textContent = `${count} / 500 字`;
      countEl.className = 'char-count';
      
      if (count > 500) {
        countEl.classList.add('error');
      } else if (count > 400) {
        countEl.classList.add('warning');
      }
    }
  }

  // 创建图生视频数字人
  async function createImageToVideoDigitalHuman() {
    if (!imageSelectedVideoFile && !imageSelectedImageFile) {
      alert('请先上传视频或图片文件');
      return;
    }
    
    if (!imageSelectedAudioFile) {
      alert('请先上传音频文件');
      return;
    }
    
    const name = prompt('请输入数字人名称：', '未命名数字人');
    if (!name) return;
    
    const script = document.getElementById('imageScriptInput')?.value.trim() || '';
    
    // 使用现有的创建函数，但需要适配图生视频的逻辑
    if (currentPlatform === 'heygen') {
      // 临时设置文件变量，以便createDigitalHuman使用
      selectedVideoFile = imageSelectedVideoFile || imageSelectedImageFile;
      selectedAudioFile = imageSelectedAudioFile;
      selectedVideoUrl = imageSelectedVideoUrl;
      
      if (typeof window.createDigitalHuman === 'function') {
        await window.createDigitalHuman();
      }
    } else {
      alert('图生视频功能目前仅支持HeyGen平台');
    }
  }

  async function createImageYunwuDigitalHumanFromUI() {
    if (!imageSelectedVideoFile) {
      alert('请先上传视频文件');
      return;
    }
    
    if (!imageSelectedAudioFile) {
      alert('请先上传音频文件');
      return;
    }
    
    const name = prompt('请输入数字人名称：', '未命名数字人');
    if (!name) return;
    
    const script = document.getElementById('imageYunwuScriptInput')?.value.trim() || '';
    const modeEl = document.getElementById('videoModeSelect');
    const mode = (modeEl && modeEl.value) ? modeEl.value : 'std';
    
    // 临时设置文件变量
    selectedVideoFile = imageSelectedVideoFile;
    selectedAudioFile = imageSelectedAudioFile;
    selectedVideoUrl = imageSelectedVideoUrl;
    
    if (typeof window.createYunwuDigitalHuman === 'function') {
      await window.createYunwuDigitalHuman(name, '', script, mode);
    }
  }

  // 诵读文案底部栏生成按钮处理（仅云雾）
  function handleReciteBottomBarGenerate() {
    if (typeof window.reciteGenerateVideo === 'function') {
      window.reciteGenerateVideo();
    }
  }

  // 卖货推送底部栏生成按钮处理
  function handlePromoteBottomBarGenerate() {
    if (typeof window.createPromoteVideo === 'function') {
      window.createPromoteVideo();
    }
  }

  window.switchCreatePlatform = switchCreatePlatform;
  window.switchImageCreatePlatform = switchImageCreatePlatform;
  window.handleYunwuVideoUpload = handleYunwuVideoUpload;
  window.handleImageFileUpload = handleImageFileUpload;
  window.handleImageDrop = handleImageDrop;
  window.handleImageDragOver = handleImageDragOver;
  window.handleImageDragLeave = handleImageDragLeave;
  window.handleImageAudioFileUpload = handleImageAudioFileUpload;
  window.handleReciteBottomBarGenerate = handleReciteBottomBarGenerate;
  window.handlePromoteBottomBarGenerate = handlePromoteBottomBarGenerate;
  window.handleImageAudioDrop = handleImageAudioDrop;
  window.handleImageAudioDragOver = handleImageAudioDragOver;
  window.handleImageAudioDragLeave = handleImageAudioDragLeave;
  window.removeImageUpload = removeImageUpload;
  window.removeImageAudioUpload = removeImageAudioUpload;
  window.updateImageCharCount = updateImageCharCount;
  window.handleImageYunwuVideoUpload = handleImageYunwuVideoUpload;
  window.handleImageYunwuAudioUpload = handleImageYunwuAudioUpload;
  window.removeImageYunwuVideo = removeImageYunwuVideo;
  window.removeImageYunwuAudio = removeImageYunwuAudio;
  window.updateImageYunwuCharCount = updateImageYunwuCharCount;
  window.createImageToVideoDigitalHuman = createImageToVideoDigitalHuman;
  window.createImageYunwuDigitalHumanFromUI = createImageYunwuDigitalHumanFromUI;
  window.handleYunwuAudioUpload = handleYunwuAudioUpload;
  window.removeYunwuVideo = removeYunwuVideo;
  window.removeYunwuAudio = removeYunwuAudio;
  window.showYunwuVideoHistory = showYunwuVideoHistory;
  window.showYunwuAudioHistory = showYunwuAudioHistory;
  window.updateYunwuCharCount = updateYunwuCharCount;
  window.createYunwuDigitalHumanFromUI = createYunwuDigitalHumanFromUI;
  window.handleBottomBarGenerate = handleBottomBarGenerate;
})();

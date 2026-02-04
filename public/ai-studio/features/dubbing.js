/**
 * AI创作工坊 - 配音（独立文件）
 * 集成语音合成、文生音效、视频生音效功能
 * 参考生成图像的聊天界面样式
 */
(function () {
  var id = 'dubbing';
  var name = '生成音频';
  var icon = '🔊';
  
  var TEXT2AUDIO_PATH = '/kling/v1/audio/text-to-audio';
  var TTS_PATH = '/api/yunwu/audio/tts/';
  var VIDEO2AUDIO_PATH = '/api/yunwu/audio/video-to-audio/';
  
  // 功能模式：tts（语音合成）、text2audio（文生音效）、video2audio（视频生音效）
  var AUDIO_MODES = [
    { value: 'tts', label: '语音合成' },
    { value: 'text2audio', label: '文生音效' },
    { value: 'video2audio', label: '视频生音效' }
  ];
  var currentAudioMode = 'tts';
  
  // 当前设置
  var currentSettings = {
    // TTS 设置
    voiceId: 'genshin_vindi2',
    voiceLanguage: 'zh',
    voiceSpeed: 1.0,
    // 文生音效设置
    duration: 5.0,
    // 视频生音效设置
    soundEffectPrompt: '',
    bgmPrompt: '',
    asmrMode: false
  };
  
  // TTS 音色列表
  var ttsVoiceList = [];
  
  // 推荐音效列表（用于文生音效）
  var RECOMMENDED_SOUND_EFFECTS = [
    { name: '清噪声', prompt: '清噪声' },
    { name: '婴儿咕噜声', prompt: '婴儿咕噜声' },
    { name: '丛林夜晚诡异声', prompt: '丛林夜晚诡异声' },
    { name: '惊恐尖叫声', prompt: '惊恐尖叫声' },
    { name: '无线鼠标点击声', prompt: '无线鼠标点击声' },
    { name: '打字速度技巧', prompt: '打字速度技巧' }
  ];

  function getPanel() {
    return [
      '<div class="t2i-container">',
      '  <div class="t2i-header-bar">',
      '    <div class="t2i-header-title">生成音频</div>',
      '  </div>',
      '  <div class="t2i-mode-tabs">',
      '    <button type="button" class="t2i-mode-tab active" data-mode="tts" id="dub-mode-tab-tts">语音合成</button>',
      '    <button type="button" class="t2i-mode-tab" data-mode="text2audio" id="dub-mode-tab-text2audio">文生音效</button>',
      '    <button type="button" class="t2i-mode-tab" data-mode="video2audio" id="dub-mode-tab-video2audio">视频生音效</button>',
      '  </div>',
      '  <div class="t2i-input-area">',
      '    <div class="t2i-input-box">',
      '      <!-- 视频生音效：视频上传卡片 -->',
      '      <div class="dub-video-upload-section" id="dub-video-upload-section" style="display:none;">',
      '        <div class="dub-video-card" id="dub-video-card">',
      '          <div class="dub-video-card-content">',
      '            <div class="dub-video-icon">',
      '              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
      '                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>',
      '                <polyline points="2 8 12 14 22 8"></polyline>',
      '              </svg>',
      '              <span class="dub-video-plus">+</span>',
      '            </div>',
      '            <div class="dub-video-main-text">请添加一段视频</div>',
      '            <div class="dub-video-sub-text">历史创作</div>',
      '          </div>',
      '          <div class="dub-video-preview" id="dub-video-preview" style="display:none;"></div>',
      '        </div>',
      '        <input type="file" id="dub-video-file" accept="video/mp4,video/mov" style="display:none;">',
      '        <input type="text" id="dub-video-input" class="dub-video-url-input" placeholder="或输入视频 URL 或视频ID" style="display:none;">',
      '      </div>',
      '      <!-- 文生音效：大输入框 -->',
      '      <div class="dub-text2audio-section" id="dub-text2audio-section" style="display:none;">',
      '        <div class="dub-large-input-wrapper">',
      '          <textarea id="dub-prompt-text2audio" class="dub-large-input" placeholder="请输入音效创意描述" maxlength="2000"></textarea>',
      '        </div>',
      '        <div class="dub-recommended-sounds">',
      '          <div class="dub-recommended-title">推荐音效:</div>',
      '          <div class="dub-recommended-grid" id="dub-recommended-grid"></div>',
      '        </div>',
      '      </div>',
      '      <!-- 语音合成：文本输入 -->',
      '      <div class="dub-tts-section" id="dub-tts-section">',
      '        <div class="t2i-prompt-row">',
      '          <textarea id="dub-prompt" class="t2i-prompt-input" placeholder="输入要朗读的文本，支持中文、英文等多语种，不能超过2000字符" maxlength="2000"></textarea>',
      '        </div>',
      '        <!-- 试听列表：音色选择（在输入框下方） -->',
      '        <div class="dub-voice-list-section" id="dub-voice-list-section" style="display:none;">',
      '          <div class="dub-voice-list-title">试听列表</div>',
      '          <div class="dub-voice-list-grid" id="dub-voice-list-grid"></div>',
      '        </div>',
      '      </div>',
      '      <!-- 视频生音效：音效和配乐输入 -->',
      '      <div class="dub-audio-prompts-section" id="dub-audio-prompts-section" style="display:none;">',
      '        <div class="dub-audio-prompt-row">',
      '          <button type="button" class="dub-prompt-type-btn" id="dub-sound-effect-btn">',
      '            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>',
      '              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
      '            </svg>',
      '            <span>音效</span>',
      '          </button>',
      '          <input type="text" id="dub-sound-effect-input" class="dub-prompt-input" placeholder="[可选]输入音效描述,例如:木船吱呀声" maxlength="500">',
      '        </div>',
      '        <div class="dub-audio-prompt-row">',
      '          <button type="button" class="dub-prompt-type-btn" id="dub-bgm-btn">',
      '            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '              <path d="M9 18V5l12-2v13"></path>',
      '              <circle cx="6" cy="18" r="3"></circle>',
      '              <circle cx="18" cy="16" r="3"></circle>',
      '            </svg>',
      '            <span>配乐</span>',
      '          </button>',
      '          <input type="text" id="dub-bgm-input" class="dub-prompt-input" placeholder="[可选]输入配乐描述,例如:悠远长笛旋律" maxlength="500">',
      '        </div>',
      '        <div class="dub-asmr-row">',
      '          <label class="dub-asmr-label">',
      '            <input type="checkbox" id="dub-asmr-mode" class="dub-asmr-checkbox">',
      '            <span class="dub-asmr-text">开启 ASMR 模式</span>',
      '          </label>',
      '          <span class="dub-asmr-hint">增强细节音效，适合高沉浸场景</span>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="t2i-footer-bar">',
      '    <div class="t2i-footer-controls">',
      '      <button type="button" class="dub-speed-btn" id="dub-speed-btn" style="display:none;">',
      '        <span>语速</span>',
      '        <span id="dub-speed-value">1.0</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <div class="dub-speed-dropdown" id="dub-speed-dropdown" style="display:none;">',
      '        <div class="dub-speed-dropdown-content">',
      '          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">',
      '            <span style="font-size:0.85rem;color:var(--text-secondary);min-width:60px;">语速</span>',
      '            <span id="dub-speed-dropdown-value" style="font-size:0.9rem;color:var(--primary);font-weight:600;min-width:40px;text-align:center;">1.0</span>',
      '          </div>',
      '          <input type="range" id="dub-speed-slider" class="dub-speed-slider" min="0.5" max="2.0" step="0.1" value="1.0">',
      '        </div>',
      '      </div>',
      '      <button type="button" class="dub-duration-btn" id="dub-duration-btn" style="display:none;">',
      '        <span>时长</span>',
      '        <span id="dub-duration-slider-value">5.0</span>',
      '        <span class="dub-duration-slider-unit">秒</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '      <div class="dub-duration-dropdown" id="dub-duration-dropdown" style="display:none;">',
      '        <div class="dub-duration-dropdown-content">',
      '          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">',
      '            <span style="font-size:0.85rem;color:var(--text-secondary);min-width:60px;">时长</span>',
      '            <span id="dub-duration-dropdown-value" style="font-size:0.9rem;color:var(--primary);font-weight:600;min-width:40px;text-align:center;">5.0</span>',
      '            <span style="font-size:0.85rem;color:var(--muted);">秒</span>',
      '          </div>',
      '          <input type="range" id="dub-duration-slider" class="dub-duration-slider" min="3.0" max="10.0" step="0.1" value="5.0">',
      '        </div>',
      '      </div>',
      '      <button type="button" class="t2i-footer-btn" id="dub-voice-lang-btn" style="display:none;">',
      '        <span id="dub-voice-lang-text">zh</span>',
      '        <span class="t2i-dropdown-arrow">▼</span>',
      '      </button>',
      '    </div>',
      '    <button type="button" class="t2i-generate-btn" id="dub-submit">生成</button>',
      '  </div>',
      '</div>',
      '<div class="t2i-mode-dropdown" id="dub-mode-dropdown" style="display:none;"></div>',
      '<div class="t2i-voice-lang-dropdown" id="dub-voice-lang-dropdown" style="display:none;"></div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectAudioUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    var urlKeys = ['audio', 'url', 'audios', 'audio_url', 'output_audio', 'result_url', 'output_url', 'audioUrl', 'url_mp3', 'url_wav'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(v)) out.push(v);
      } else if (Array.isArray(v)) {
        v.forEach(function (u) {
          if (typeof u === 'string' && /^https?:\/\//i.test(u) && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u)) out.push(u);
          else if (u && typeof u === 'object') {
            if (u.url_mp3 && typeof u.url_mp3 === 'string') out.push(u.url_mp3);
            if (u.url_wav && typeof u.url_wav === 'string') out.push(u.url_wav);
            if (u.url && typeof u.url === 'string' && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u.url)) out.push(u.url);
          }
        });
      } else if (v && typeof v === 'object' && v.url) {
        if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(v.url)) out.push(v.url);
      }
    });
    Object.keys(obj).forEach(function (k) {
      if (k !== 'task_status' && k !== 'status' && k !== 'task_id' && k !== 'id') {
      collectAudioUrls(obj[k], out);
      }
    });
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount, queryPath) {
    pollCount = pollCount || 0;
    queryPath = queryPath || VIDEO2AUDIO_PATH;
    var maxPolls = 240;
    if (pollCount >= maxPolls) {
      reject(new Error('任务超时（约 10 分钟仍未返回资源），请稍后在「作品管理」中重新查询'));
      return;
    }
    var url = apiOrigin() + queryPath.replace(/\/+$/, '') + '/' + encodeURIComponent(taskId);
    var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders);
    fetch(url, {
      method: 'GET',
      headers: headers,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success === false && data.message) {
          reject(new Error(data.message));
          return;
        }
        var inner = (data && data.data && data.data.data) || data.data || data;
        var statusRaw = (inner && inner.task_status) ||
          (inner && inner.status) ||
          (inner && inner.state) ||
          (data && data.data && data.data.task_status) ||
          (data && data.data && data.data.status) ||
          (data && data.data && data.data.state) ||
          (data && data.task_status) ||
          (data && data.status) ||
          (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
          '';
        var status = normalizeTaskStatus(statusRaw);
        var result = (inner && inner.task_result) ||
          (data && data.data && data.data.task_result) ||
          (data && data.data && data.data.result) ||
          (data && data.data && data.data) ||
          (data && data.result) ||
          (data && data.data) ||
          {};
        var audios = [];
        if (result.audios && Array.isArray(result.audios)) {
          result.audios.forEach(function (a) {
            if (a && typeof a.url_mp3 === 'string' && a.url_mp3.trim()) audios.push(a.url_mp3.trim());
            if (a && typeof a.url_wav === 'string' && a.url_wav.trim()) audios.push(a.url_wav.trim());
            if (a && typeof a.url === 'string' && a.url.trim()) audios.push(a.url.trim());
          });
        }
        if (!audios.length && (result.audio || result.audioUrl || result.audio_url)) {
          var a = result.audio || result.audioUrl || result.audio_url;
          if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
        }
        if (!audios.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(url)) audios.push(url);
        }
        if (!audios.length && data && data.data) {
          var d = data.data.data || data.data;
          if (d && d.audio_url && typeof d.audio_url === 'string') audios.push(d.audio_url);
          if (d && d.url && typeof d.url === 'string' && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(d.url)) audios.push(d.url);
          if (d && d.audio && typeof d.audio === 'string') audios.push(d.audio);
        }
        if (!audios.length) collectAudioUrls(data, audios);
        audios = [...new Set(audios.filter(Boolean))];

        var audioId = (result && result.audio_id) ||
          (result && result.audios && result.audios[0] && result.audios[0].id) ||
          (data && data.data && data.data.audio_id) ||
          (inner && inner.task_result && inner.task_result.audios && inner.task_result.audios[0] && inner.task_result.audios[0].id) ||
          (data && data.data && data.data.task_result && data.data.task_result.audios && data.data.task_result.audios[0] && data.data.task_result.audios[0].id) ||
          (data && data.audio_id) ||
          '';

        if (status === 'done' && audios.length > 0) {
          // 任务完成且有资源，立即更新作品状态
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: 'ready',
              audios: audios,
              resultUrl: audios[0],
              audioId: audioId,
              progress: 100,
              progressStatus: '已完成'
            };
            window.MediaStudio.updateWork(workId, updates);
            if (window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          }
          resolve({ audios: audios, raw: data, audioId: audioId });
          return;
        }
        var hasAudiosArray = result.audios && Array.isArray(result.audios) && result.audios.length > 0;
        if (status === 'done' && !audios.length && hasAudiosArray) {
          resolve({ audios: [], raw: data, audioId: audioId, succeedNoUrl: true });
          return;
        }
        if (status === 'done' && !audios.length) {
          var progressText = '状态已完成，等待音频生成，继续轮询…（' + (pollCount + 1) + '/' + maxPolls + '）';
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '等待资源' });
          }
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1, queryPath); }, 2500);
          return;
        }
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        var progressText = '轮询中，状态=' + (statusRaw || '处理中') + (pollCount > 0 ? '（' + (pollCount + 1) + '/' + maxPolls + '）' : '');
        if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
          var n = ((pw && pw.progress) || 0) + 1;
          window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
        }
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject, pollCount + 1, queryPath); }, 2500);
      })
      .catch(reject);
  }


  // 上传视频文件到服务器（使用FormData）
  function uploadVideoFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || !file.type.startsWith('video/')) {
        reject(new Error('请选择视频文件（.mp4/.mov）'));
        return;
      }
      // 视频文件大小限制可以设置得更大一些，比如100MB
      if (file.size > 100 * 1024 * 1024) {
        reject(new Error('视频文件过大，请选择 ≤100MB 的视频'));
        return;
      }
      var formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'video');
      fetch(apiOrigin() + '/api/upload-temp-asset', {
        method: 'POST',
        body: formData,
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success && data.url) {
            var url = data.url;
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost) {
              // 本地地址警告可以忽略，因为服务器会处理
            }
            resolve(url);
          } else {
            reject(new Error(data && data.message ? data.message : '上传失败'));
          }
        })
        .catch(reject);
    });
  }

  function init(container) {
    if (!container) return;
    
    var modeTabTts = document.getElementById('dub-mode-tab-tts');
    var modeTabText2audio = document.getElementById('dub-mode-tab-text2audio');
    var modeTabVideo2audio = document.getElementById('dub-mode-tab-video2audio');
    var speedBtn = document.getElementById('dub-speed-btn');
    var speedDropdown = document.getElementById('dub-speed-dropdown');
    var speedSlider = document.getElementById('dub-speed-slider');
    var speedValue = document.getElementById('dub-speed-value');
    var durationBtn = document.getElementById('dub-duration-btn');
    var durationDropdown = document.getElementById('dub-duration-dropdown');
    var durationSlider = document.getElementById('dub-duration-slider');
    var durationSliderValue = document.getElementById('dub-duration-slider-value');
    var voiceLangBtn = document.getElementById('dub-voice-lang-btn');
    var voiceLangText = document.getElementById('dub-voice-lang-text');
    var voiceLangDropdown = document.getElementById('dub-voice-lang-dropdown');
    var voiceListSection = document.getElementById('dub-voice-list-section');
    var voiceListGrid = document.getElementById('dub-voice-list-grid');
    var generateBtn = document.getElementById('dub-submit');
    var promptInput = document.getElementById('dub-prompt');
    var promptText2audio = document.getElementById('dub-prompt-text2audio');
    var videoUploadSection = document.getElementById('dub-video-upload-section');
    var videoCard = document.getElementById('dub-video-card');
    var videoPreview = document.getElementById('dub-video-preview');
    var videoFileInput = document.getElementById('dub-video-file');
    var videoInput = document.getElementById('dub-video-input');
    var ttsSection = document.getElementById('dub-tts-section');
    var text2audioSection = document.getElementById('dub-text2audio-section');
    var audioPromptsSection = document.getElementById('dub-audio-prompts-section');
    var soundEffectInput = document.getElementById('dub-sound-effect-input');
    var bgmInput = document.getElementById('dub-bgm-input');
    var asmrCheckbox = document.getElementById('dub-asmr-mode');
    var recommendedGrid = document.getElementById('dub-recommended-grid');
    
    var currentVideoUrl = '';
    var currentVideoId = '';
    var currentVideoFile = null;
    
    // 初始化功能模式标签页
    if (modeTabTts && modeTabText2audio && modeTabVideo2audio) {
      modeTabTts.classList.remove('active');
      modeTabText2audio.classList.remove('active');
      modeTabVideo2audio.classList.remove('active');
      if (currentAudioMode === 'tts') {
        modeTabTts.classList.add('active');
      } else if (currentAudioMode === 'text2audio') {
        modeTabText2audio.classList.add('active');
      } else {
        modeTabVideo2audio.classList.add('active');
      }
      
      modeTabTts.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentAudioMode = 'tts';
        modeTabTts.classList.add('active');
        modeTabText2audio.classList.remove('active');
        modeTabVideo2audio.classList.remove('active');
        switchAudioMode('tts');
      });
      
      modeTabText2audio.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentAudioMode = 'text2audio';
        modeTabTts.classList.remove('active');
        modeTabText2audio.classList.add('active');
        modeTabVideo2audio.classList.remove('active');
        switchAudioMode('text2audio');
      });
      
      modeTabVideo2audio.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        currentAudioMode = 'video2audio';
        modeTabTts.classList.remove('active');
        modeTabText2audio.classList.remove('active');
        modeTabVideo2audio.classList.add('active');
        switchAudioMode('video2audio');
      });
    }
    
    // 切换音频模式
    function switchAudioMode(mode) {
      // 隐藏所有区域
      if (ttsSection) ttsSection.style.display = 'none';
      if (text2audioSection) text2audioSection.style.display = 'none';
      if (videoUploadSection) videoUploadSection.style.display = 'none';
      if (audioPromptsSection) audioPromptsSection.style.display = 'none';
      
      if (mode === 'tts') {
        // 语音合成：显示文本输入和试听列表
        if (ttsSection) ttsSection.style.display = 'block';
        if (voiceListSection) voiceListSection.style.display = 'block';
        // 显示语速按钮和音色语种按钮
        if (speedBtn) speedBtn.style.display = 'flex';
        if (speedDropdown) speedDropdown.style.display = 'none';
        if (voiceLangBtn) voiceLangBtn.style.display = 'flex';
        // 初始化试听列表
        initVoiceList();
      } else {
        // 其他模式隐藏试听列表和设置按钮
        if (voiceListSection) voiceListSection.style.display = 'none';
        if (speedBtn) speedBtn.style.display = 'none';
        if (speedDropdown) speedDropdown.style.display = 'none';
        if (voiceLangBtn) voiceLangBtn.style.display = 'none';
      }
      
      if (mode === 'text2audio') {
        // 文生音效：显示大输入框和推荐音效
        if (text2audioSection) text2audioSection.style.display = 'block';
        // 显示底部栏的时长按钮
        if (durationBtn) durationBtn.style.display = 'flex';
        if (durationDropdown) durationDropdown.style.display = 'none';
        // 初始化推荐音效网格
        initRecommendedSounds();
        // 初始化时长滑动条
        initDurationSliderForText2Audio();
      } else {
        // 其他模式隐藏时长选择器
        if (durationBtn) durationBtn.style.display = 'none';
        if (durationDropdown) durationDropdown.style.display = 'none';
      }
      
      if (mode === 'video2audio') {
        // 视频生音效：显示视频上传卡片和音效/配乐输入
        if (videoUploadSection) videoUploadSection.style.display = 'block';
        if (audioPromptsSection) audioPromptsSection.style.display = 'block';
      }
      
      // 更新底部按钮文本
      updateFooterButtons();
    }
    
    // 初始化试听列表（音色网格）
    function initVoiceList() {
      if (!voiceListGrid || ttsVoiceList.length === 0) return;
      
      var html = ttsVoiceList.map(function(voice) {
        var isSelected = voice.id === currentSettings.voiceId;
        var selectedClass = isSelected ? 'dub-voice-item-selected' : '';
        return '<div class="dub-voice-item ' + selectedClass + '" data-voice-id="' + String(voice.id).replace(/"/g, '&quot;') + '">' +
          '<div class="dub-voice-item-icon">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M11 5L6 9H2v6h4l5 4V5z"></path>' +
          '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>' +
          '</svg>' +
          '</div>' +
          '<div class="dub-voice-item-info">' +
          '<div class="dub-voice-item-name">' + String(voice.name || voice.id).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
          '<div class="dub-voice-item-id">' + String(voice.id).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
          '</div>' +
          '<button type="button" class="dub-voice-preview-btn" data-voice-id="' + String(voice.id).replace(/"/g, '&quot;') + '" title="试听">▶</button>' +
          '</div>';
      }).join('');
      
      voiceListGrid.innerHTML = html;
      
      // 绑定音色选择事件
      voiceListGrid.querySelectorAll('.dub-voice-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          if (e.target.closest('.dub-voice-preview-btn')) return;
          var voiceId = item.getAttribute('data-voice-id');
          currentSettings.voiceId = voiceId;
          
          // 更新选中状态
          voiceListGrid.querySelectorAll('.dub-voice-item').forEach(function(v) {
            v.classList.remove('dub-voice-item-selected');
          });
          item.classList.add('dub-voice-item-selected');
          
          // 更新语种（如果音色有指定语种）
          var voice = ttsVoiceList.find(function(v) { return v.id === voiceId; });
          if (voice && voice.language && voiceLangDropdown) {
            currentSettings.voiceLanguage = voice.language;
            updateFooterButtons();
            updateVoiceLangDropdown();
          }
        });
      });
      
      // 绑定试听按钮事件
      voiceListGrid.querySelectorAll('.dub-voice-preview-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var voiceId = btn.getAttribute('data-voice-id');
          previewVoiceById(voiceId);
        });
      });
    }
    
    // 试听指定音色
    function previewVoiceById(voiceId) {
      var voice = ttsVoiceList.find(function(v) { return v.id === voiceId; });
      if (!voice) return;
      
      var url = voice.exampleUrl ? (voice.exampleUrl + '').trim() : '';
      if (!url) {
        alert('该音色暂无试听（无官方样例链接）');
        return;
      }
      
      // 停止之前的试听
      if (window._dubPreviewAudio) {
        try {
          window._dubPreviewAudio.pause();
          window._dubPreviewAudio = null;
        } catch (e) {}
      }
      
      // 更新按钮状态
      var btn = voiceListGrid.querySelector('.dub-voice-preview-btn[data-voice-id="' + voiceId + '"]');
      if (btn) btn.textContent = '⏸';
      
      // 创建音频并播放
      var audio = new Audio(url);
      window._dubPreviewAudio = audio;
      
      audio.addEventListener('ended', function() {
        if (btn) btn.textContent = '▶';
        window._dubPreviewAudio = null;
      });
      
      audio.addEventListener('error', function() {
        if (btn) btn.textContent = '▶';
        alert('试听加载失败');
        window._dubPreviewAudio = null;
      });
      
      audio.play().catch(function(err) {
        if (btn) btn.textContent = '▶';
        alert('试听播放失败');
        window._dubPreviewAudio = null;
      });
    }
    
    // 更新底部按钮文本和滑块值
    function updateFooterButtons() {
      if (currentAudioMode === 'tts') {
        if (speedValue) speedValue.textContent = currentSettings.voiceSpeed.toFixed(1);
        if (speedSlider) speedSlider.value = currentSettings.voiceSpeed;
        if (voiceLangText) {
          var langLabel = currentSettings.voiceLanguage === 'zh' ? '中文' : 
                         currentSettings.voiceLanguage === 'en' ? '英文' :
                         currentSettings.voiceLanguage === 'ja' ? '日文' :
                         currentSettings.voiceLanguage === 'ko' ? '韩文' : currentSettings.voiceLanguage;
          voiceLangText.textContent = langLabel;
        }
      } else if (currentAudioMode === 'text2audio') {
        if (durationSliderValue) durationSliderValue.textContent = currentSettings.duration.toFixed(1);
        if (durationSlider) durationSlider.value = currentSettings.duration;
      }
    }
    
    // 初始化语速按钮和下拉框
    var speedSliderInitialized = false;
    function initSpeedSlider() {
      if (!speedSlider || !speedValue || !speedBtn || !speedDropdown) return;
      
      // 设置初始值
      speedSlider.value = currentSettings.voiceSpeed;
      speedValue.textContent = currentSettings.voiceSpeed.toFixed(1);
      
      // 只绑定一次事件监听器，避免重复绑定
      if (!speedSliderInitialized) {
        // 滑块事件
        speedSlider.addEventListener('input', function() {
          currentSettings.voiceSpeed = parseFloat(this.value);
          speedValue.textContent = currentSettings.voiceSpeed.toFixed(1);
        });
        
        // 设置下拉框样式
        speedDropdown.style.position = 'fixed';
        speedDropdown.style.zIndex = '1000';
        
        // 按钮点击事件
        speedBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rect = speedBtn.getBoundingClientRect();
          var computedDisplay = window.getComputedStyle(speedDropdown).display;
          var isVisible = computedDisplay === 'block';
          
          // 关闭其他下拉框
          if (durationDropdown) durationDropdown.style.display = 'none';
          if (voiceLangDropdown) voiceLangDropdown.style.display = 'none';
          
          if (isVisible) {
            speedDropdown.style.display = 'none';
            // 移除箭头旋转
            var arrow = speedBtn.querySelector('.t2i-dropdown-arrow');
            if (arrow) arrow.style.transform = '';
          } else {
            speedDropdown.style.display = 'block';
            speedDropdown.style.visibility = 'hidden';
            var dropdownHeight = speedDropdown.offsetHeight || 80;
            speedDropdown.style.visibility = 'visible';
            
            speedDropdown.style.left = rect.left + 'px';
            var topPosition = rect.top - dropdownHeight - 8;
            if (topPosition < 0) {
              speedDropdown.style.top = (rect.bottom + 8) + 'px';
            } else {
              speedDropdown.style.top = topPosition + 'px';
            }
            // 箭头旋转
            var arrow = speedBtn.querySelector('.t2i-dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
          }
        });
        
        speedSliderInitialized = true;
      }
    }
    
    // 初始化时长滑块（保留用于兼容，但实际使用 initDurationSliderForText2Audio）
    function initDurationSlider() {
      // 这个函数已不再使用，实际初始化在 initDurationSliderForText2Audio 中
      // 保留此函数以避免调用错误，但不执行任何操作
      return;
    }
    
    // 初始化文生音效的时长按钮和下拉框
    var durationSliderInitialized = false;
    function initDurationSliderForText2Audio() {
      if (!durationSlider || !durationSliderValue || !durationBtn || !durationDropdown) return;
      
      // 设置初始值
      durationSlider.value = currentSettings.duration;
      durationSliderValue.textContent = currentSettings.duration.toFixed(1);
      var durationDropdownValue = document.getElementById('dub-duration-dropdown-value');
      if (durationDropdownValue) {
        durationDropdownValue.textContent = currentSettings.duration.toFixed(1);
      }
      
      // 只绑定一次事件监听器，避免重复绑定
      if (!durationSliderInitialized) {
        // 滑块事件
        var durationDropdownValue = document.getElementById('dub-duration-dropdown-value');
        durationSlider.addEventListener('input', function() {
          currentSettings.duration = parseFloat(this.value);
          durationSliderValue.textContent = currentSettings.duration.toFixed(1);
          if (durationDropdownValue) {
            durationDropdownValue.textContent = currentSettings.duration.toFixed(1);
          }
        });
        
        // 设置下拉框样式
        durationDropdown.style.position = 'fixed';
        durationDropdown.style.zIndex = '1000';
        
        // 按钮点击事件
        durationBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var rect = durationBtn.getBoundingClientRect();
          var computedDisplay = window.getComputedStyle(durationDropdown).display;
          var isVisible = computedDisplay === 'block';
          
          // 关闭其他所有下拉框
          closeAllDropdowns(durationDropdown);
          
          if (isVisible) {
            durationDropdown.style.display = 'none';
            // 移除箭头旋转
            var arrow = durationBtn.querySelector('.t2i-dropdown-arrow');
            if (arrow) arrow.style.transform = '';
          } else {
            durationDropdown.style.display = 'block';
            durationDropdown.style.visibility = 'hidden';
            var dropdownHeight = durationDropdown.offsetHeight || 80;
            durationDropdown.style.visibility = 'visible';
            
            durationDropdown.style.left = rect.left + 'px';
            var topPosition = rect.top - dropdownHeight - 8;
            if (topPosition < 0) {
              durationDropdown.style.top = (rect.bottom + 8) + 'px';
            } else {
              durationDropdown.style.top = topPosition + 'px';
            }
            // 箭头旋转
            var arrow = durationBtn.querySelector('.t2i-dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
          }
        });
        
        durationSliderInitialized = true;
      }
    }
    
    // 初始化音色语种下拉框
    function initVoiceLangDropdown() {
      if (!voiceLangDropdown || !voiceLangBtn) return;
      
      updateVoiceLangDropdown();
      
      voiceLangDropdown.style.display = 'none';
      voiceLangDropdown.style.position = 'fixed';
      voiceLangDropdown.style.zIndex = '1000';
      
      voiceLangBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var currentDisplay = voiceLangDropdown.style.display;
        var isVisible = currentDisplay === 'block' || window.getComputedStyle(voiceLangDropdown).display === 'block';
        
        // 关闭其他所有下拉框
        closeAllDropdowns(voiceLangDropdown);
        
        if (isVisible) {
          voiceLangDropdown.style.display = 'none';
        } else {
          var rect = voiceLangBtn.getBoundingClientRect();
          voiceLangDropdown.style.display = 'block';
          voiceLangDropdown.style.visibility = 'hidden';
          var dropdownHeight = voiceLangDropdown.offsetHeight || 100;
          voiceLangDropdown.style.visibility = 'visible';
          voiceLangDropdown.style.left = rect.left + 'px';
          var topPosition = rect.top - dropdownHeight - 4;
          if (topPosition < 0) {
            voiceLangDropdown.style.top = (rect.bottom + 4) + 'px';
          } else {
            voiceLangDropdown.style.top = topPosition + 'px';
          }
        }
      });
    }
    
    // 更新音色语种下拉框内容
    function updateVoiceLangDropdown() {
      if (!voiceLangDropdown) return;
      
      var langs = [
        { value: 'zh', label: '中文' },
        { value: 'en', label: '英文' },
        { value: 'ja', label: '日文' },
        { value: 'ko', label: '韩文' }
      ];
      
      var langHtml = langs.map(function(l) {
        var active = l.value === currentSettings.voiceLanguage ? 'active' : '';
        return '<div class="t2i-model-dropdown-item ' + active + '" data-lang="' + l.value + '">' + l.label + '</div>';
      }).join('');
      voiceLangDropdown.innerHTML = langHtml;
      
      voiceLangDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var lang = item.getAttribute('data-lang');
          currentSettings.voiceLanguage = lang;
          voiceLangDropdown.querySelectorAll('.t2i-model-dropdown-item').forEach(function(i) {
            i.classList.remove('active');
          });
          item.classList.add('active');
          voiceLangDropdown.style.display = 'none';
          updateFooterButtons();
        });
      });
    }
    
    // 初始化推荐音效网格
    function initRecommendedSounds() {
      if (!recommendedGrid) return;
      
      var html = RECOMMENDED_SOUND_EFFECTS.map(function(effect) {
        return '<div class="dub-recommended-item" data-prompt="' + String(effect.prompt).replace(/"/g, '&quot;') + '">' +
          '<div class="dub-recommended-icon">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +
          '<path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2"></path>' +
          '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2"></path>' +
          '</svg>' +
          '</div>' +
          '<span class="dub-recommended-name">' + String(effect.name).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>' +
          '</div>';
      }).join('');
      
      recommendedGrid.innerHTML = html;
      
      // 绑定点击事件
      recommendedGrid.querySelectorAll('.dub-recommended-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var prompt = item.getAttribute('data-prompt');
          if (promptText2audio && prompt) {
            promptText2audio.value = prompt;
            promptText2audio.focus();
          }
        });
      });
    }
    
    
    // 添加视频预览（覆盖卡片内容）
    function addVideoPreview(videoUrl, videoId, file) {
      if (!videoCard || !videoPreview) return;
      
      var cardContent = videoCard.querySelector('.dub-video-card-content');
      if (cardContent) cardContent.style.display = 'none';
      
      var previewUrl = '';
      if (file) {
        previewUrl = URL.createObjectURL(file);
      } else if (videoUrl) {
        previewUrl = videoUrl;
      }
      
      videoPreview.style.display = 'block';
      if (previewUrl && /\.(mp4|webm|mov)$/i.test(previewUrl)) {
        videoPreview.innerHTML = '<video src="' + previewUrl.replace(/"/g, '&quot;') + '" class="dub-video-preview-video" muted playsinline></video><span class="dub-video-remove-btn">×</span>';
      } else {
        var previewText = videoId ? '视频ID: ' + videoId : (videoUrl ? '视频URL: ' + videoUrl.substring(0, 30) + '...' : '视频文件');
        videoPreview.innerHTML = '<div class="dub-video-preview-text">' + previewText + '</div><span class="dub-video-remove-btn">×</span>';
      }
      
      var removeBtn = videoPreview.querySelector('.dub-video-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeVideoPreview();
        });
      }
      
      if (previewUrl && previewUrl.startsWith('blob:')) {
        var videoEl = videoPreview.querySelector('video');
        if (videoEl) {
          videoEl.onload = function() {
            URL.revokeObjectURL(previewUrl);
          };
        }
      }
    }
    
    // 移除视频预览（恢复卡片内容）
    function removeVideoPreview() {
      if (videoCard && videoPreview) {
        var cardContent = videoCard.querySelector('.dub-video-card-content');
        if (cardContent) cardContent.style.display = 'flex';
        videoPreview.style.display = 'none';
        videoPreview.innerHTML = '';
      }
      currentVideoUrl = '';
      currentVideoId = '';
      currentVideoFile = null;
      if (videoFileInput) videoFileInput.value = '';
      if (videoInput) videoInput.value = '';
    }
    
    // 历史创作选择功能：打开视频选择模态框
    function openHistoryVideoSelector(callback) {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var videoWorks = works.filter(function(w) {
        return w.videos && w.videos.length > 0 && (w.type === 'text2video' || w.type === 'img2video' || w.type === 'lipsync');
      });
      
      if (videoWorks.length === 0) {
        alert('暂无历史视频作品');
        return;
      }
      
      // 创建模态框
      var modal = document.createElement('div');
      modal.className = 'dub-history-modal-overlay';
      modal.innerHTML = [
        '<div class="dub-history-modal-content">',
        '  <div class="dub-history-modal-header">',
        '    <h3>选择历史视频</h3>',
        '    <button type="button" class="dub-history-modal-close">×</button>',
        '  </div>',
        '  <div class="dub-history-modal-body" id="dub-history-modal-body">',
        '  </div>',
        '</div>'
      ].join('');
      
      var modalBody = modal.querySelector('#dub-history-modal-body');
      var videosHtml = '';
      
      videoWorks.forEach(function(work) {
        if (work.videos && work.videos.length > 0) {
          work.videos.forEach(function(videoUrl) {
            videosHtml += '<div class="dub-history-video-item" data-url="' + String(videoUrl).replace(/"/g, '&quot;') + '">' +
              '<video src="' + String(videoUrl).replace(/"/g, '&quot;') + '" muted playsinline preload="metadata"></video>' +
              '</div>';
          });
        }
      });
      
      modalBody.innerHTML = videosHtml || '<div style="padding: 40px; text-align: center; color: var(--muted);">暂无视频</div>';
      
      // 绑定视频选择事件
      modalBody.querySelectorAll('.dub-history-video-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var url = item.getAttribute('data-url');
          if (callback && url) {
            callback(url);
          }
          document.body.removeChild(modal);
        });
      });
      
      // 关闭按钮
      var closeBtn = modal.querySelector('.dub-history-modal-close');
      closeBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
      });
      
      // 点击背景关闭
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      });
      
      document.body.appendChild(modal);
    }
    
    // 视频卡片点击事件
    if (videoCard && videoFileInput) {
      videoCard.addEventListener('click', function(e) {
        if (e.target.closest('.dub-video-remove-btn')) return;
        if (e.target.closest('.dub-video-preview')) return;
        if (e.target.closest('.dub-video-sub-text')) return; // 历史创作文本单独处理
        videoFileInput.click();
      });
      
      // 历史创作文本点击
      var historyText = videoCard.querySelector('.dub-video-sub-text');
      if (historyText) {
        historyText.style.cursor = 'pointer';
        historyText.style.color = 'var(--primary)';
        historyText.addEventListener('click', function(e) {
          e.stopPropagation();
          openHistoryVideoSelector(function(url) {
            currentVideoUrl = url;
            if (videoInput) videoInput.value = url;
            addVideoPreview(url, '', null);
          });
        });
      }
      
      videoFileInput.addEventListener('change', function(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentVideoFile = file;
        addVideoPreview('', '', file);
        videoFileInput.value = '';
        
        // 上传视频文件到服务器
        uploadVideoFile(file)
          .then(function(url) {
            currentVideoUrl = url;
            currentVideoId = '';
            currentVideoFile = null;
            if (videoInput) videoInput.value = url;
            addVideoPreview(url, '', null);
          })
          .catch(function(err) {
            currentVideoFile = null;
            removeVideoPreview();
            alert('视频上传失败：' + (err.message || String(err)));
          });
      });
    }
    
    // 视频URL输入框事件（可选输入）
    if (videoInput) {
      videoInput.addEventListener('blur', function() {
        var val = this.value.trim();
        if (val) {
          var isId = /^\d+$/.test(val);
          if (isId) {
            currentVideoId = val;
            currentVideoUrl = '';
            addVideoPreview('', val, null);
          } else if (/^https?:\/\//i.test(val)) {
            currentVideoUrl = val;
            currentVideoId = '';
            addVideoPreview(val, '', null);
          }
        } else {
          removeVideoPreview();
        }
      });
    }
    
    // 点击外部关闭下拉框
    setTimeout(function() {
      document.addEventListener('click', function(e) {
        if (voiceLangDropdown && voiceLangBtn && !voiceLangBtn.contains(e.target) && !voiceLangDropdown.contains(e.target)) {
          voiceLangDropdown.style.display = 'none';
        }
        if (speedDropdown && speedBtn && !speedBtn.contains(e.target) && !speedDropdown.contains(e.target)) {
          speedDropdown.style.display = 'none';
          var speedArrow = speedBtn.querySelector('.t2i-dropdown-arrow');
          if (speedArrow) speedArrow.style.transform = '';
        }
        if (durationDropdown && durationBtn && !durationBtn.contains(e.target) && !durationDropdown.contains(e.target)) {
          durationDropdown.style.display = 'none';
          var durationArrow = durationBtn.querySelector('.t2i-dropdown-arrow');
          if (durationArrow) durationArrow.style.transform = '';
        }
      });
    }, 100);
    
    // 初始化语速按钮和音色语种下拉框
    initSpeedSlider();
    initVoiceLangDropdown();
    // 时长按钮在 switchAudioMode('text2audio') 时通过 initDurationSliderForText2Audio() 初始化
    
    // 初始化时更新按钮显示
    updateFooterButtons();
    
    // 加载 TTS 音色列表
    function loadTtsVoices() {
      fetch(apiOrigin() + '/api/tts/voices', { method: 'GET', headers: { 'Content-Type': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var list = (data && data.data && data.data.ttsList) || (data && data.ttsList) || [];
          if (!Array.isArray(list)) list = [];
          ttsVoiceList = [];
          list.forEach(function (v) {
            var id = (v && (v.voice_id || v.speakerId || v.id || v.voiceId)) || '';
            var name = (v && (v.name || v.voice_name || v.label)) || id || '未知';
            var lang = (v && (v.language || v.voice_language || v.lang)) || '';
            var exampleUrl = (v && (v.exampleUrl || v.example_url || v.preview_url || v.sample_url)) || '';
            if (id) {
              ttsVoiceList.push({ id: id, name: name, language: lang, exampleUrl: exampleUrl });
            }
          });
          if (ttsVoiceList.length === 0) {
            ttsVoiceList = [{ id: 'genshin_vindi2', name: '阳光少年', language: 'zh', exampleUrl: '' }];
          }
          // 初始化试听列表
          if (currentAudioMode === 'tts') {
            initVoiceList();
          }
        })
        .catch(function () {
          ttsVoiceList = [{ id: 'genshin_vindi2', name: '阳光少年', language: 'zh', exampleUrl: '' }];
          // 初始化试听列表
          if (currentAudioMode === 'tts') {
            initVoiceList();
          }
        });
    }
    
    // 初始切换模式
    switchAudioMode(currentAudioMode);
    
    // 如果初始模式是文生音效，确保时长滑动条已初始化
    if (currentAudioMode === 'text2audio') {
      initDurationSliderForText2Audio();
    }
    
    // 加载 TTS 音色列表（如果是语音合成模式）
    if (currentAudioMode === 'tts') {
      loadTtsVoices();
    }
    
    // 同步音效和配乐输入框的值到设置
    if (soundEffectInput) {
      soundEffectInput.addEventListener('input', function() {
        currentSettings.soundEffectPrompt = this.value.trim();
      });
      if (currentSettings.soundEffectPrompt) {
        soundEffectInput.value = currentSettings.soundEffectPrompt;
      }
    }
    if (bgmInput) {
      bgmInput.addEventListener('input', function() {
        currentSettings.bgmPrompt = this.value.trim();
      });
      if (currentSettings.bgmPrompt) {
        bgmInput.value = currentSettings.bgmPrompt;
      }
    }
    // ASMR模式开关
    if (asmrCheckbox) {
      asmrCheckbox.addEventListener('change', function() {
        currentSettings.asmrMode = this.checked;
      });
      asmrCheckbox.checked = currentSettings.asmrMode;
    }
    
    // 提交视频生音效请求
    function submitVideo2Audio(videoInputValue, apiKey, soundEffectPrompt, bgmPrompt) {
      soundEffectPrompt = soundEffectPrompt || (soundEffectInput ? soundEffectInput.value.trim() : '') || '';
      bgmPrompt = bgmPrompt || (bgmInput ? bgmInput.value.trim() : '') || '';
      
      // 更新设置
      if (soundEffectPrompt) currentSettings.soundEffectPrompt = soundEffectPrompt;
      if (bgmPrompt) currentSettings.bgmPrompt = bgmPrompt;

      var body = {};
      if (/^\d+$/.test(videoInputValue)) {
        body.video_id = videoInputValue;
      } else {
        body.video_url = videoInputValue;
      }
      if (soundEffectPrompt) body.sound_effect_prompt = soundEffectPrompt;
      if (bgmPrompt) body.bgm_prompt = bgmPrompt;
      body.asmr_mode = currentSettings.asmrMode;
      
      generateBtn.disabled = true;
      
      // 立即创建作品记录，显示"处理中"状态
      var workId = null;
      var workType = 'dubbing';
      var promptText = '';
      if (soundEffectPrompt) promptText += '音效：' + soundEffectPrompt + ' ';
      if (bgmPrompt) promptText += '配乐：' + bgmPrompt;
      if (window.MediaStudio && window.MediaStudio.addWork) {
        workId = window.MediaStudio.addWork({
          type: workType,
          status: 'processing',
          taskId: null, // 临时为null，等待API返回
          prompt: promptText || '视频生音效',
          title: promptText || '视频生音效',
          images: [],
          videos: [],
          audios: [],
          referenceVideos: videoInputValue ? [videoInputValue] : [],
          progress: 0,
          progressStatus: '正在提交请求...'
        });
        
        // 刷新作品列表显示
        if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
          window.MediaStudio.refreshWorksList();
        }
      }
      
      var authHeadersV2A = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
      fetch(apiOrigin() + '/api/yunwu/audio/video-to-audio', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersV2A),
        body: JSON.stringify(body),
      })
          .then(function(r) {
        if (!r.ok) {
              return r.text().then(function(t) {
            var errMsg = '请求失败 ' + r.status + (r.status === 404 ? '（接口未找到，请确认服务已重启）' : '') + ': ' + (t ? t.substring(0, 150).replace(/\s+/g, ' ') : '');
            
            // 更新作品状态为失败
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, {
                status: 'failed',
                progressStatus: errMsg
              });
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                window.MediaStudio.refreshWorksList();
              }
            }
            
            throw new Error(errMsg);
          });
        }
        return r.json();
      })
          .then(function(data) {
        var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
          (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
          (data && data.data && data.data.request_id);
        if (!taskId) {
              var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
              generateBtn.disabled = false;
              
              // 更新作品状态为失败
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                window.MediaStudio.updateWork(workId, {
                  status: 'failed',
                  progressStatus: errMsg
                });
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                  window.MediaStudio.refreshWorksList();
                }
              }
              
          return Promise.reject(new Error(errMsg));
        }
            taskId = String(taskId);
        
        // 更新作品记录的taskId
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          window.MediaStudio.updateWork(workId, {
            taskId: taskId,
            progressStatus: '任务已提交，等待处理...'
          });
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
            window.MediaStudio.refreshWorksList();
          }
        }
            
            var setProgress = function(txt) {
              // 进度更新（已移除聊天显示）
            };
            
            return new Promise(function(resolve, reject) {
          pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0, VIDEO2AUDIO_PATH);
        });
      })
          .then(function(result) {
        var audios = (result && result.audios) || [];
            if (audios.length === 0) {
              generateBtn.disabled = false;
              return;
            }
            
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          var updates = {
                status: 'ready',
            audios: audios,
            progress: null,
            progressStatus: null
          };
          if (audios.length) updates.resultUrl = audios[0];
              if (result.audioId) updates.audioId = result.audioId;
          window.MediaStudio.updateWork(workId, updates);
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        }
            
            generateBtn.disabled = false;
          })
          .catch(function(err) {
        if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
          window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
        }
            generateBtn.disabled = false;
      });
    }
    
    // 生成按钮点击事件
    if (generateBtn) {
      generateBtn.addEventListener('click', function() {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        alert('请先登录，由管理员在后台分配云雾 API Key 后即可使用');
        return;
      }

        var prompt = '';
        if (currentAudioMode === 'tts') {
          prompt = getVal('dub-prompt', '').trim();
        } else if (currentAudioMode === 'text2audio') {
          prompt = promptText2audio ? promptText2audio.value.trim() : '';
        }
        
        if (currentAudioMode === 'tts') {
          // 语音合成
        if (!prompt) {
            alert('请输入要朗读的文本');
          return;
        }
          if (prompt.length > 2000) {
            alert('文本不能超过2000个字符');
            return;
          }
          
          var body = {
            text: prompt,
            voice_id: currentSettings.voiceId,
            voice_language: currentSettings.voiceLanguage,
            voice_speed: currentSettings.voiceSpeed
          };
          
          generateBtn.disabled = true;
        
        // 立即创建作品记录，显示"处理中"状态
        var workId = null;
        if (window.MediaStudio && window.MediaStudio.addWork) {
          workId = window.MediaStudio.addWork({
            type: 'tts',
            status: 'processing',
            taskId: null, // 临时为null，等待API返回
            prompt: prompt,
            title: prompt.toString().slice(0, 80),
            images: [],
            videos: [],
            audios: [],
            progress: 0,
            progressStatus: '正在提交请求...'
          });
          
          // 刷新作品列表显示
          if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
            window.MediaStudio.refreshWorksList();
          }
        }
        
          var authHeadersTts = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
          fetch(apiOrigin() + '/api/yunwu/audio/tts', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeadersTts),
          body: JSON.stringify(body),
        })
            .then(function(r) {
              return r.text().then(function(t) {
              var data = null;
              try { data = t ? JSON.parse(t) : null; } catch (e) {}
              if (!r.ok) {
                var msg = (data && (data.message || data.error || (data.error && data.error.message))) || t || ('HTTP ' + r.status);
                  if (r.status === 400 && data && (data.message || data.data)) {
                  msg = (data.message || '') + (data.data && typeof data.data === 'object' ? ' ' + JSON.stringify(data.data) : '');
                }
                
                // 更新作品状态为失败
                if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                  window.MediaStudio.updateWork(workId, {
                    status: 'failed',
                    progressStatus: msg || ('请求失败 ' + r.status)
                  });
                  if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                    window.MediaStudio.refreshWorksList();
                  }
                }
                
                throw new Error(msg || ('请求失败 ' + r.status));
              }
              return data != null ? data : {};
            });
          })
            .then(function(data) {
            var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id)) ||
              (data && data.id) || (data && data.task_id) || (data && data.request_id) ||
              (data && data.data && data.data.request_id);
            if (!taskId) {
                var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
                generateBtn.disabled = false;
                
                // 更新作品状态为失败
                if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                  window.MediaStudio.updateWork(workId, {
                    status: 'failed',
                    progressStatus: errMsg
                  });
                  if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                    window.MediaStudio.refreshWorksList();
                  }
                }
                
              return Promise.reject(new Error(errMsg));
            }
              taskId = String(taskId);
            
            // 更新作品记录的taskId
            if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, {
                taskId: taskId,
                progressStatus: '任务已提交，等待处理...'
              });
              if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                window.MediaStudio.refreshWorksList();
              }
            }
              
              var setProgress = function(txt) {
                // 进度更新（已移除聊天显示）
              };
              
              return new Promise(function(resolve, reject) {
                pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0, TTS_PATH);
            });
          })
            .then(function(result) {
              var audios = (result && result.audios) || [];
              if (audios.length === 0) {
                generateBtn.disabled = false;
        return;
      }

              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                var updates = {
                  status: 'ready',
                  audios: audios,
                  progress: null,
                  progressStatus: null
                };
                if (audios.length) updates.resultUrl = audios[0];
                if (result.audioId) updates.audioId = result.audioId;
                window.MediaStudio.updateWork(workId, updates);
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
              }
              
              generateBtn.disabled = false;
            })
            .catch(function(err) {
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
              }
              generateBtn.disabled = false;
            });
        } else if (currentAudioMode === 'text2audio') {
          // 文生音效
          if (!prompt) {
            alert('请输入音效描述');
            return;
          }
          if (prompt.length > 2000) {
            alert('音效描述不能超过2000个字符');
            return;
          }
          
          // 验证duration范围：3.0-10.0秒，支持小数点后一位
          var duration = Math.round(currentSettings.duration * 10) / 10;
          if (duration < 3.0 || duration > 10.0) {
            alert('音频时长必须在3.0秒至10.0秒之间');
            return;
          }
          
          var body = {
            prompt: prompt,
            duration: duration.toFixed(1) // 转换为字符串，保留一位小数
          };
          
          // 可选参数：external_task_id 和 callback_url
          // 如果需要，可以从设置或其他地方获取
          
          generateBtn.disabled = true;
          
          // 立即创建作品记录，显示"处理中"状态
          var workId = null;
          if (window.MediaStudio && window.MediaStudio.addWork) {
            workId = window.MediaStudio.addWork({
              type: 'text2audio',
              status: 'processing',
              taskId: null, // 临时为null，等待API返回
              prompt: prompt,
              title: prompt.toString().slice(0, 80),
              images: [],
              videos: [],
              audios: [],
              progress: 0,
              progressStatus: '正在提交请求...'
            });
            
            // 刷新作品列表显示
            if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
              window.MediaStudio.refreshWorksList();
            }
          }
          
          var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
          fetch(apiOrigin() + TEXT2AUDIO_PATH, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
            body: JSON.stringify(body),
          })
            .then(function(r) {
              if (!r.ok) {
                return r.json().then(function(errData) {
                  throw new Error(errData.message || errData.error || '请求失败：' + r.status);
                }).catch(function() {
                  throw new Error('请求失败：' + r.status);
                });
              }
              return r.json();
            })
            .then(function(data) {
              // 根据Kling API响应格式解析taskId
              var taskId = (data && data.data && (data.data.id || data.data.task_id || data.data.request_id || data.data.taskId)) ||
                (data && data.id) || (data && data.task_id) || (data && data.request_id) || (data && data.taskId) ||
                (data && data.data && data.data.request_id);
              
              if (!taskId) {
                var errMsg = (data && (data.message || data.error || (data.error && data.error.message))) ? 
                  (data.message || data.error || (data.error && data.error.message)) : '未返回任务 ID';
                // 错误已通过作品状态更新显示
                generateBtn.disabled = false;
                
                // 更新作品状态为失败
                if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                  window.MediaStudio.updateWork(workId, {
                    status: 'failed',
                    progressStatus: errMsg
                  });
                  if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                    window.MediaStudio.refreshWorksList();
                  }
                }
                
                return Promise.reject(new Error(errMsg));
              }
              taskId = String(taskId);
              
              // 更新作品记录的taskId
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                window.MediaStudio.updateWork(workId, {
                  taskId: taskId,
                  progressStatus: '任务已提交，等待处理...'
                });
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
                  window.MediaStudio.refreshWorksList();
                }
              }
              
              var setProgress = function(txt) {
                // 进度更新（已移除聊天显示）
              };
              
              return new Promise(function(resolve, reject) {
                pollTask(taskId, apiKey, workId, setProgress, resolve, reject, 0, TEXT2AUDIO_PATH);
              });
            })
            .then(function(result) {
              var audios = (result && result.audios) || [];
              if (audios.length === 0) {
                generateBtn.disabled = false;
                return;
              }
              
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                var updates = {
                  status: 'ready',
                  audios: audios,
                  progress: null,
                  progressStatus: null
                };
                if (audios.length) updates.resultUrl = audios[0];
                if (result.audioId) updates.audioId = result.audioId;
                window.MediaStudio.updateWork(workId, updates);
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
              }
              
              generateBtn.disabled = false;
            })
            .catch(function(err) {
              if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
                window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
                if (window.MediaStudio && window.MediaStudio.refreshWorksList) window.MediaStudio.refreshWorksList();
              }
              generateBtn.disabled = false;
            });
        } else {
          // 视频生音效
          var videoInputValue = (videoInput ? videoInput.value.trim() : '') || currentVideoUrl || currentVideoId || '';
          
          // 如果有上传的视频文件，先上传获取URL
          if (currentVideoFile) {
            generateBtn.disabled = true;
            uploadVideoFile(currentVideoFile)
              .then(function(url) {
                currentVideoUrl = url;
                currentVideoId = '';
                currentVideoFile = null;
                // 更新输入框
                if (videoInput) videoInput.value = url;
                // 继续提交API请求
                submitVideo2Audio(url, apiKey);
              })
              .catch(function(err) {
                currentVideoFile = null;
                alert('视频上传失败：' + (err.message || String(err)));
                generateBtn.disabled = false;
              });
            return;
          }
          
          if (!videoInputValue) {
            alert('请上传视频文件或输入视频 URL 或视频ID');
            return;
          }
          
          // 获取音效和配乐描述
          var soundEffectPrompt = soundEffectInput ? soundEffectInput.value.trim() : '';
          var bgmPrompt = bgmInput ? bgmInput.value.trim() : '';
          
          submitVideo2Audio(videoInputValue, apiKey, soundEffectPrompt, bgmPrompt);
        }
      });
    }
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();

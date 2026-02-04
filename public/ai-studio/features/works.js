/**
 * AI创作工坊 - 作品管理（优化布局版本）
 */
(function () {
  var id = 'works';
  var name = '作品管理';
  var icon = '📁';
  var workPollingIntervals = {};
  /** 当前分类筛选：'' | 'image' | 'video' | 'audio'（收藏不再作为分类，移至右侧按钮） */
  var currentFilterType = '';
  /** 当前视图：'grid' 平铺视图 | 'list' 列表视图 */
  var currentViewMode = 'list';
  /** 是否正在查看「收藏」列表（点击右侧收藏按钮进入，平铺展示所有收藏资源） */
  var showFavoritesView = false;
  var FAVORITES_STORAGE_KEY = 'media_studio_works_favorites';
  /** 按资源收藏：存 "workId|resourceUrl" 列表，列表视图中下载/收藏只针对悬停的那一个资源 */
  var FAVORITES_RESOURCE_KEY = 'media_studio_works_favorites_resources';
  function getFavoriteIds() {
    try {
      var raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function setFavoriteIds(ids) {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {}
  }
  function getFavoriteResourceKeys() {
    try {
      var raw = localStorage.getItem(FAVORITES_RESOURCE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function setFavoriteResourceKeys(keys) {
    try {
      localStorage.setItem(FAVORITES_RESOURCE_KEY, JSON.stringify(keys));
    } catch (e) {}
  }
  function resourceKey(workId, resourceUrl) {
    return (workId || '') + '|' + (resourceUrl || '');
  }
  function isFavoriteResource(workId, resourceUrl) {
    return getFavoriteResourceKeys().indexOf(resourceKey(workId, resourceUrl)) >= 0;
  }
  function toggleFavoriteResource(workId, resourceUrl) {
    var keys = getFavoriteResourceKeys();
    var k = resourceKey(workId, resourceUrl);
    var i = keys.indexOf(k);
    if (i >= 0) keys.splice(i, 1);
    else keys.push(k);
    setFavoriteResourceKeys(keys);
  }
  function toggleFavorite(workId) {
    var ids = getFavoriteIds();
    var i = ids.indexOf(workId);
    if (i >= 0) ids.splice(i, 1);
    else ids.push(workId);
    setFavoriteIds(ids);
  }
  function isFavorite(workId) {
    return getFavoriteIds().indexOf(workId) >= 0;
  }
  /** 该作品是否至少有一个资源被收藏（用于「收藏」筛选） */
  function hasAnyResourceFavorited(w) {
    var keys = getFavoriteResourceKeys();
    var id = w.id || '';
    var urls = [].concat(w.images || [], w.videos || [], w.audios || []);
    for (var u = 0; u < urls.length; u++) {
      if (keys.indexOf(id + '|' + (urls[u] || '')) >= 0) return true;
    }
    return false;
  }
  /** 卡片左上角功能名：文生图、单图参考、多图参考、文生视频、图生视频、对口型、视频生音效等 */
  var TYPE_NAMES = {
    text2img: '文生图',
    img2img: '单图参考',
    'multi-img': '多图参考',
    editimg: '多图参考',
    text2video: '文生视频',
    img2video: '图生视频',
    lipsync: '对口型',
    text2audio: '文生音效',
    tts: '语音合成',
    dubbing: '视频生音效'
  };
  
  // 下载管理器
  var downloadManager = {
    downloadFile: function(url, fileName, onProgress) {
      return new Promise((resolve, reject) => {
        try {
          if (!url) throw new Error('缺少下载链接');

          // data: / blob: 直接下载（无需 fetch）
          if (/^(data:|blob:)/i.test(url)) {
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'download.file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            resolve();
            return;
          }

          fetch(url)
            .then(response => {
              if (!response.ok) throw new Error('下载失败');
              return response.blob().then(blob => ({ blob, response }));
            })
            .then(({ blob, response }) => {
              let finalName = fileName || this.getFileNameFromUrl(url);
              // 如果文件名没有后缀，尝试用 Content-Type 推断
              if (!/\.[a-z0-9]{2,5}$/i.test(finalName)) {
                const ct = (response.headers && response.headers.get && response.headers.get('content-type')) || blob.type || '';
                const ext = this.getExtFromContentType(ct);
                if (ext) finalName = finalName + ext;
              }

              const downloadUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = finalName || 'download.file';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(downloadUrl);
              resolve();
            })
            .catch(reject);
        } catch (e) {
          reject(e);
        }
      });
    },
    
    getExtFromContentType: function(contentType) {
      const ct = String(contentType || '').toLowerCase();
      if (!ct) return '';
      if (ct.includes('image/png')) return '.png';
      if (ct.includes('image/jpeg')) return '.jpg';
      if (ct.includes('image/webp')) return '.webp';
      if (ct.includes('image/gif')) return '.gif';
      if (ct.includes('video/mp4')) return '.mp4';
      if (ct.includes('video/webm')) return '.webm';
      if (ct.includes('audio/mpeg')) return '.mp3';
      if (ct.includes('audio/wav')) return '.wav';
      if (ct.includes('application/json')) return '.json';
      if (ct.includes('text/plain')) return '.txt';
      return '';
    },

    sanitizeFileName: function(name) {
      return String(name || 'download')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120) || 'download';
    },

    getFileNameFromUrl: function(url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        const extension = filename.includes('.') ? '' : '.file';
        return filename || 'download' + extension;
      } catch {
        return 'download.file';
      }
    }
  };

  function getPanel() {
    return [
      // 主容器（样式在 media-studio.css 中定义）
      '<div class="works-container">',
      '  <div class="works-header">',
      '    <h2 class="panel-title">🎨 作品管理</h2>',
      '    <div class="works-header-right">',
      '      <button type="button" class="works-favorite-btn" id="works-show-favorites" title="查看收藏">☆ 收藏</button>',
      '      <div class="works-view-toggle">',
      '        <button type="button" class="works-view-btn" id="works-view-grid" data-view="grid" title="平铺视图">平铺</button>',
      '        <button type="button" class="works-view-btn active" id="works-view-list" data-view="list" title="列表视图">列表</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="works-filter-row">',
      '    <button type="button" class="works-filter-btn active" data-filter="" id="works-filter-all">全部</button>',
      '    <button type="button" class="works-filter-btn" data-filter="image" id="works-filter-image">图片</button>',
      '    <button type="button" class="works-filter-btn" data-filter="video" id="works-filter-video">视频</button>',
      '    <button type="button" class="works-filter-btn" data-filter="audio" id="works-filter-audio">音频</button>',
      '  </div>',
      '',
      // 作品列表
      '<div class="works-grid" id="worksList">加载中...</div>',
      '<div class="works-empty" id="worksEmpty" style="display:none;">',
      '  <div style="font-size: 3rem; margin-bottom: 20px;">📁</div>',
      '  <div style="font-size: 1.1rem; margin-bottom: 10px;">暂无作品</div>',
      '  <div style="font-size: 0.9rem;">请在生成图像、图生视频等功能中生成作品</div>',
      '</div>',
      '',
      '  <div class="work-preview-overlay" id="workPreviewOverlay">',
      '    <button type="button" class="work-preview-close" id="workPreviewClose" aria-label="关闭">&times;</button>',
      '    <div class="work-preview-inner" id="workPreviewInner"></div>',
      '  </div>',
      '  <div class="modal-overlay" id="workTitleModal">',
      '    <div class="modal-content" style="max-width: 480px;">',
      '      <div class="modal-header">',
      '        <h3 class="modal-title">完整介绍</h3>',
      '        <button class="modal-close" id="closeWorkTitleModal" aria-label="关闭">&times;</button>',
      '      </div>',
      '      <div class="modal-body" id="workTitleModalBody" style="white-space: pre-wrap; word-break: break-word; max-height: 60vh; overflow-y: auto;"></div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  // 辅助函数
  function isProcessing(w) {
    return w.status === 'processing' || (w.taskId && (!w.images || !w.images.length) && (!w.videos || !w.videos.length) && (!w.audios || !w.audios.length) && w.status !== 'failed');
  }

  /** 作品按资源类型归类：image / video / audio，用于筛选 */
  function getWorkResourceType(w) {
    var t = (w && w.type) ? String(w.type).toLowerCase() : '';
    if (t === 'text2img' || t === 'editimg' || t === 'img2img' || t === 'multi-img') return 'image';
    if (t === 'text2video' || t === 'img2video' || t === 'lipsync') return 'video';
    if (t === 'dubbing' || t === 'text2audio' || t === 'tts') return 'audio';
    if (w && w.images && w.images.length) return 'image';
    if (w && w.videos && w.videos.length) return 'video';
    if (w && w.audios && w.audios.length) return 'audio';
    return 'image';
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  // 按任务类型获取查询路径（与 server 端 /api/yunwu 一致）
  function getTaskQueryPath(type) {
    var pathMap = {
      text2img: '/api/yunwu/images/generations/',
      editimg: '/api/yunwu/images/generations/',
      img2img: '/api/yunwu/images/generations/',
      'multi-img': '/api/yunwu/images/generations/',
      img2video: '/api/yunwu/videos/image2video/',
      lipsync: '/api/yunwu/videos/advanced-lip-sync/',
      text2audio: '/api/yunwu/audio/text-to-audio/',
      tts: '/api/yunwu/audio/tts/',
      dubbing: '/api/yunwu/audio/video-to-audio/'
    };
    return pathMap[type] || '/api/yunwu/images/generations/';
  }
  
  // 从新的API响应格式中提取图片资源
  function extractImagesFromNewFormat(data) {
    var images = [];
    
    // 处理新的API格式：data 可能是数组（任务列表）或单个任务对象
    if (data && Array.isArray(data)) {
      // 任务列表格式：data是数组，每个元素是一个任务
      data.forEach(function(task) {
        if (task && task.task_result && task.task_result.images && Array.isArray(task.task_result.images)) {
          task.task_result.images.forEach(function(img) {
            if (img && img.url && typeof img.url === 'string') {
              images.push(img.url);
            }
          });
        }
      });
    } else if (data && !Array.isArray(data)) {
      // 单个任务对象格式
      if (data.task_result && data.task_result.images && Array.isArray(data.task_result.images)) {
        data.task_result.images.forEach(function(img) {
          if (img && img.url && typeof img.url === 'string') {
            images.push(img.url);
          }
        });
      }
    }
    
    return images;
  }

  // 校验 API 返回的资源类型是否与用户选择的类型一致（选错类型则拒绝）
  function resultMatchesType(result, selectedType) {
    // 判断 result_url 的类型（根据URL扩展名或实际资源数组）
    var resultUrlType = null; // 'image', 'video', 'audio', null
    if (result.result_url && typeof result.result_url === 'string') {
      var url = result.result_url.toLowerCase();
      if (/\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url)) resultUrlType = 'image';
      else if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(url)) resultUrlType = 'video';
      else if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(url)) resultUrlType = 'audio';
      // 如果没有扩展名，根据实际资源数组推断
      else if (result.images && result.images.length) resultUrlType = 'image';
      else if (result.videos && result.videos.length) resultUrlType = 'video';
      else if (result.audios && result.audios.length) resultUrlType = 'audio';
    }
    
    var hasImages = (result.images && result.images.length) || result.image_url || (resultUrlType === 'image' && result.result_url);
    var hasVideos = (result.videos && result.videos.length) || result.video_url || result.video || (resultUrlType === 'video' && result.result_url);
    var hasAudios = (result.audios && result.audios.length) || result.audio_url || (resultUrlType === 'audio' && result.result_url);
    
    if (!hasImages && !hasVideos && !hasAudios) return true; // 处理中/无资源时暂不校验
    var expectImage = selectedType === 'text2img' || selectedType === 'editimg';
    var expectVideo = selectedType === 'img2video' || selectedType === 'lipsync';
    var expectAudio = selectedType === 'text2audio' || selectedType === 'tts' || selectedType === 'dubbing';
    if (expectImage && hasImages && !hasVideos && !hasAudios) return true;
    if (expectVideo && hasVideos && !hasImages && !hasAudios) return true;
    if (expectAudio && hasAudios && !hasImages && !hasVideos) return true;
    if (expectImage && (hasVideos || hasAudios)) return false;
    if (expectVideo && (hasImages || hasAudios)) return false;
    if (expectAudio && (hasImages || hasVideos)) return false;
    return true;
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'completed';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectUrls(obj, images, videos, audios) {
    if (!obj || typeof obj !== 'object') return;
    if (typeof obj === 'string' && /^https?:\/\//i.test(obj)) {
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(obj)) images.push(obj);
      else if (/\.(mp4|webm|mov|avi)$/i.test(obj)) videos.push(obj);
      else if (/\.(mp3|wav|m4a|aac)$/i.test(obj)) audios.push(obj);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(function (item) { collectUrls(item, images, videos, audios); });
      return;
    }
    Object.keys(obj).forEach(function (k) {
      collectUrls(obj[k], images, videos, audios);
    });
  }

  // 根据官方文档「根据任务ID查询任务状态」：GET {path}/{taskId}，由本机 server 代理到云雾
  function queryTaskStatus(taskId, type) {
    return new Promise(function (resolve, reject) {
      try {
        var base = apiOrigin();
        var apiKey = window.MediaStudio.getYunwuApiKey();
        if (!apiKey || !String(apiKey).trim()) {
          reject(new Error('请先登录，由管理员在后台分配 API Key 后即可使用'));
          return;
        }
        var path = getTaskQueryPath(type);
        var url = base.replace(/\/+$/, '') + path + encodeURIComponent(taskId);
        var currentTaskId = String(taskId); // 保存taskId用于后续匹配
        var authHeaders = (window.MediaStudio && window.MediaStudio.getAuthHeaders && window.MediaStudio.getAuthHeaders()) || {};
        fetch(url, {
          method: 'GET',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders)
        })
          .then(function (response) {
            if (!response.ok) throw new Error('请求失败: ' + response.status + ' ' + response.statusText);
            return response.json();
          })
          .then(function (data) {
            if (data && data.success === false && data.message) {
              reject(new Error(data.message));
              return;
            }
            
            // 处理新的API格式：data.data可能是数组（任务列表）或单个任务对象
            var taskData = null;
            if (data && data.data) {
              if (Array.isArray(data.data) && data.data.length > 0) {
                // 任务列表格式：找到匹配taskId的任务
                taskData = data.data.find(function(task) {
                  return task && (task.task_id === currentTaskId || String(task.task_id) === currentTaskId);
                }) || data.data[0]; // 如果找不到，使用第一个
              } else if (data.data.task_id || data.data.task_status) {
                // 单个任务格式
                taskData = data.data;
              }
            }
            
            var inner = taskData || (data && data.data && data.data.data) || data.data || data;
            var statusRaw = (inner && inner.task_status) ||
              (inner && inner.status) ||
              (inner && inner.state) ||
              (taskData && taskData.task_status) ||
              (data && data.data && data.data.task_status) ||
              (data && data.data && data.data.status) ||
              (data && data.data && data.data.state) ||
              (data && data.task_status) ||
              (data && data.status) ||
              (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
              '';
            var status = normalizeTaskStatus(statusRaw);
            var result = (inner && inner.task_result) ||
              (taskData && taskData.task_result) ||
              (data && data.data && data.data.task_result) ||
              (data && data.data && data.data.result) ||
              (data && data.data && data.data) ||
              (data && data.result) ||
              (data && data.data) ||
              {};
            // 如果 result 为空对象，尝试从 taskData 或 data.data 直接获取
            if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
              if (taskData && taskData.task_result) {
                result = taskData.task_result;
              } else if (data && data.data && typeof data.data === 'object') {
                result = data.data;
              }
            }
            var images = [];
            var videos = [];
            var audios = [];
            
            // 优先处理新的API格式（task_result.images数组，每个元素有index和url）
            // 优先从taskData中提取
            if (taskData && taskData.task_result && taskData.task_result.images && Array.isArray(taskData.task_result.images)) {
              taskData.task_result.images.forEach(function(img) {
                if (img && img.url && typeof img.url === 'string') {
                  images.push(img.url);
                }
              });
            }
            
            // 如果taskData中没有，尝试从data.data提取
            if (!images.length) {
              var newFormatImages = extractImagesFromNewFormat(data.data || data);
              if (newFormatImages.length > 0) {
                images = newFormatImages;
              }
            }
            
            // 兼容旧格式：result.images可能是字符串数组或对象数组
            if (!images.length && result.images && Array.isArray(result.images)) {
              result.images.forEach(function (x) {
                if (typeof x === 'string') {
                  images.push(x);
                } else if (x && x.url) {
                  images.push(x.url);
                }
              });
            }
            if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
            if (result.video || result.videoUrl || result.video_url) {
              var v = result.video || result.videoUrl || result.video_url;
              if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
            }
            if (result.videos && Array.isArray(result.videos)) {
              result.videos.forEach(function (v) {
                if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
              });
            }
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
            if (result.url) {
              var u = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
              if (u) {
                if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u)) videos.push(u);
                else if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u)) audios.push(u);
                else images.push(u);
              }
            }
            // 处理 result_url（图片生成API可能返回此字段）
            if (result.result_url && typeof result.result_url === 'string') {
              var u = result.result_url;
              if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u)) videos.push(u);
              else if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u)) audios.push(u);
              else images.push(u); // 默认当作图片（图片生成API的主要输出）
            }
            // 也检查 data.data.result_url（某些API可能在此层级）
            if (!images.length && !videos.length && !audios.length && data && data.data) {
              var d = (data.data && data.data.data) || data.data;
              if (d && d.result_url && typeof d.result_url === 'string') {
                var u = d.result_url;
                if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(u)) videos.push(u);
                else if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(u)) audios.push(u);
                else images.push(u);
              }
            }
            if (!audios.length && data && data.data) {
              var d = (data.data && data.data.data) || data.data;
              if (d && d.audio_url && typeof d.audio_url === 'string') audios.push(d.audio_url);
              if (d && d.url && typeof d.url === 'string' && /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(d.url)) audios.push(d.url);
              if (d && d.audio && typeof d.audio === 'string') audios.push(d.audio);
            }
            if (!images.length && !videos.length && !audios.length) collectUrls(data, images, videos, audios);
            images = [...new Set(images.filter(Boolean))];
            videos = [...new Set(videos.filter(Boolean))];
            audios = [...new Set(audios.filter(Boolean))];
            // 优先使用 result.result_url，如果没有则从解析的资源中选择
            var resultUrl = (result && result.result_url) || (videos[0] || audios[0] || images[0]) || '';
            var videoId = (inner && inner.video_id) ||
              (result && result.video_id) ||
              (data && data.data && data.data.video_id) ||
              (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
              (data && data.data && data.data.data && data.data.data.video_id) ||
              (result && result.videos && result.videos[0] && result.videos[0].id) ||
              '';
            var audioId = (inner && inner.audio_id) ||
              (result && result.audio_id) ||
              (data && data.data && data.data.audio_id) ||
              (data && data.data && data.data.task_result && data.data.task_result.audio_id) ||
              (result && result.audios && result.audios[0] && result.audios[0].id) ||
              '';
            if (typeof videoId !== 'string') videoId = videoId ? String(videoId) : '';
            if (typeof audioId !== 'string') audioId = audioId ? String(audioId) : '';
            var out = {
              status: status,
              progress: status === 'completed' ? 100 : (status === 'failed' ? 0 : 50),
              progressStatus: statusRaw || (status === 'completed' ? '已完成' : status === 'failed' ? '失败' : '处理中'),
              result_url: resultUrl,
              image_url: images[0] || '',
              video_url: videos[0] || '',
              audio_url: audios[0] || '',
              images: images,
              videos: videos,
              audios: audios,
              video_id: videoId,
              audio_id: audioId
            };
            if (status === 'failed' && data) {
              if (data.refunded != null) out.refunded = data.refunded;
              if (data.balance != null) out.balance = data.balance;
            }
            resolve(out);
          })
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  // 刷新单个作品状态
  window.refreshWorkStatusGrid = function(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var work = works.find(function(w) { return w.id === workId; });
    
    if (!work) {
      alert('找不到该作品');
      return;
    }
    
    if (!work.taskId) {
      alert('该作品没有任务ID');
      return;
    }
    
    // 显示加载状态
    var btn = document.querySelector('[onclick="window.refreshWorkStatusGrid(\'' + workId + '\')"]');
    if (btn) {
      btn.innerHTML = '⏳';
      btn.disabled = true;
    }
    
    queryTaskStatus(work.taskId, work.type)
      .then(function(result) {
        var hasResources = (result.audios && result.audios.length) || result.audio_url || (result.images && result.images.length) || result.image_url || (result.videos && result.videos.length) || result.video_url || result.result_url;
        var completed = result.status === 'completed' || result.status === 'ready';
        var status = result.status;
        if (completed && hasResources) status = 'ready';
        else if (completed) status = 'completed';
        var updates = {
          status: status,
          progress: result.progress != null ? result.progress : (completed ? 100 : 50),
          progressStatus: result.status === 'completed' || result.status === 'ready' ? '已完成' : (result.status === 'failed' ? '失败' : (result.progressStatus || result.status_text || result.message || '处理中'))
        };
        if (result.result_url) updates.resultUrl = result.result_url;
        if (result.image_url) updates.images = [result.image_url];
        if (result.video_url) updates.videos = [result.video_url];
        if (result.audio_url) updates.audios = [result.audio_url];
        if (result.images && result.images.length) updates.images = result.images;
        if (result.videos && result.videos.length) updates.videos = result.videos;
        if (result.audios && result.audios.length) updates.audios = result.audios;
        if (result.video_id) updates.videoId = result.video_id;
        if (result.audio_id) updates.audioId = result.audio_id;
        window.MediaStudio.updateWork(workId, updates);
        
        // 重新渲染列表
        renderList('');
        
        // 显示成功消息
        if (result.status === 'completed' || !result.status) {
          alert('✅ 任务已完成！');
        } else if (result.status === 'failed') {
          if (result.refunded != null) {
            if (window.MediaStudio && typeof window.MediaStudio.refreshBalance === 'function') window.MediaStudio.refreshBalance();
            alert('❌ 任务失败，已退款 \u26a1 ' + (Number(result.refunded)).toFixed(2));
          } else {
            alert('❌ 任务失败: ' + (result.error_message || result.error || '未知错误'));
          }
        } else {
          alert('🔄 状态已更新: ' + (result.status_text || result.status || '处理中'));
        }
      })
      .catch(function(error) {
        console.error('刷新状态失败:', error);
        
        // 提供手动更新选项
        if (confirm('API查询失败: ' + error.message + '\n\n是否手动标记为已完成？')) {
          var updates = {
            status: 'completed',
            progress: 100,
            progressStatus: '手动标记完成'
          };
          window.MediaStudio.updateWork(workId, updates);
          renderList('');
          alert('已手动标记为完成');
        }
      })
      .finally(function() {
        if (btn) {
          btn.innerHTML = '🔄';
          btn.disabled = false;
        }
      });
  };

  // 自动轮询处理中的任务
  function startPollingWork(workId) {
    if (workPollingIntervals[workId]) {
      clearInterval(workPollingIntervals[workId]);
    }
    
    workPollingIntervals[workId] = setInterval(function() {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var work = works.find(function(w) { return w.id === workId; });
      
      if (!work || !work.taskId || work.status === 'completed' || work.status === 'failed') {
        clearInterval(workPollingIntervals[workId]);
        delete workPollingIntervals[workId];
        return;
      }
      
      queryTaskStatus(work.taskId, work.type)
        .then(function(result) {
          var updates = {
            status: result.status || 'completed',
            progress: result.progress || 100,
            progressStatus: result.status_text || result.message || '已完成'
          };
          
          if (result.result_url) {
            updates.resultUrl = result.result_url;
          }
          if (result.image_url) {
            updates.images = [result.image_url];
          }
          if (result.video_url) {
            updates.videos = [result.video_url];
          }
          if (result.audio_url) {
            updates.audios = [result.audio_url];
          }
          
          if (result.images && result.images.length) {
            updates.images = result.images;
          }
          if (result.videos && result.videos.length) {
            updates.videos = result.videos;
          }
          if (result.audios && result.audios.length) {
            updates.audios = result.audios;
          }
          
          window.MediaStudio.updateWork(workId, updates);
          
          // 如果任务失败且已退款，刷新余额并提示
          if (result.status === 'failed' && result.refunded != null) {
            if (window.MediaStudio && typeof window.MediaStudio.refreshBalance === 'function') window.MediaStudio.refreshBalance();
            alert('❌ 任务失败，已退款 \u26a1 ' + (Number(result.refunded)).toFixed(2));
          }
          
          // 如果任务完成或失败，停止轮询
          if (result.status === 'completed' || result.status === 'failed' || !result.status) {
            clearInterval(workPollingIntervals[workId]);
            delete workPollingIntervals[workId];
          }
          
          // 更新UI
          if (window.MediaStudio.currentId === id) {
            renderList('');
          }
        })
        .catch(function(error) {
          console.error('轮询失败:', error);
          // 发生错误时停止轮询
          clearInterval(workPollingIntervals[workId]);
          delete workPollingIntervals[workId];
        });
    }, 10000); // 每10秒轮询一次
  }

  // 更新收藏按钮与筛选/视图控件的显示（收藏视图时隐藏筛选行与平铺/列表切换）
  function updateFavoritesUI() {
    var favBtn = document.getElementById('works-show-favorites');
    var filterRow = document.querySelector('.works-filter-row');
    var viewToggle = document.querySelector('.works-view-toggle');
    if (favBtn) {
      favBtn.textContent = showFavoritesView ? '★ 收藏' : '☆ 收藏';
      favBtn.classList.toggle('active', showFavoritesView);
      favBtn.title = showFavoritesView ? '返回作品列表' : '查看收藏';
    }
    if (filterRow) filterRow.style.display = showFavoritesView ? 'none' : '';
    if (viewToggle) viewToggle.style.display = showFavoritesView ? 'none' : '';
  }

  // 渲染列表/平铺
  function renderList(filterType) {
    var listEl = document.getElementById('worksList');
    var emptyEl = document.getElementById('worksEmpty');
    if (!listEl) return;
    if (filterType !== undefined) currentFilterType = filterType;
    
    updateFavoritesUI();
    
    // 收藏视图：仅展示所有已收藏资源，平铺
    if (showFavoritesView) {
      var keys = getFavoriteResourceKeys();
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var favoriteItems = [];
      keys.forEach(function (key) {
        var idx = key.indexOf('|');
        var workId = idx >= 0 ? key.slice(0, idx) : key;
        var resourceUrl = idx >= 0 ? key.slice(idx + 1) : '';
        var w = works.find(function (x) { return x.id === workId; });
        if (!w || !resourceUrl) return;
        var kind = (w.images && w.images.indexOf(resourceUrl) >= 0) ? 'image' : (w.videos && w.videos.indexOf(resourceUrl) >= 0) ? 'video' : 'audio';
        favoriteItems.push({ work: w, resourceUrl: resourceUrl, kind: kind });
      });
      if (favoriteItems.length === 0) {
        listEl.style.display = 'none';
        if (emptyEl) {
          emptyEl.style.display = 'block';
          emptyEl.innerHTML = '<div style="font-size: 3rem; margin-bottom: 20px;">☆</div>' +
            '<div style="font-size: 1.1rem; margin-bottom: 10px;">暂无收藏资源</div>' +
            '<div style="font-size: 0.9rem;">在作品上点击 ☆ 可收藏单个资源</div>';
        }
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      listEl.style.display = 'grid';
      listEl.className = 'works-grid works-grid-tile';
      listEl.setAttribute('data-view', 'grid');
      var tiles = [];
      favoriteItems.forEach(function (item) {
        var w = item.work;
        var url = item.resourceUrl;
        var kind = item.kind;
        var safeWorkId = String(w.id || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var safeUrl = String(url).replace(/"/g, '&quot;').replace(/</g, '&lt;');
        var durationText = (w.videos && w.videos.length) ? '5s' : (w.audios && w.audios.length) ? '10s' : '';
        var fav = true;
        var mediaHtml = '';
        if (kind === 'image') {
          mediaHtml = '<img src="' + safeUrl + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.className+=&quot; work-tile-media-error&quot;">';
        } else if (kind === 'video') {
          mediaHtml = '<video src="' + safeUrl + '" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.onerror=null;this.className+=&quot; work-tile-media-error&quot;"></video>';
        } else {
          mediaHtml = '<div class="work-tile-media-placeholder">🎵</div>';
        }
        var favClass = ' work-tile-fav-on';
        tiles.push('<div class="work-tile-card" data-id="' + safeWorkId + '" data-url="' + safeUrl + '">' +
          '<div class="work-tile-media">' + mediaHtml +
          '<span class="work-tile-label">收藏</span>' +
          (durationText ? '<span class="work-tile-duration">' + durationText + '</span>' : '') +
          '<span class="work-tile-preview-tag">预览</span>' +
          '<div class="work-tile-hover-actions">' +
          '<button type="button" class="work-tile-action-btn work-tile-download" title="下载" data-work-id="' + safeWorkId + '" data-url="' + safeUrl + '">⬇</button>' +
          '<button type="button" class="work-tile-action-btn work-tile-favorite' + favClass + '" title="取消收藏" data-work-id="' + safeWorkId + '" data-resource-url="' + safeUrl + '">★</button>' +
          '</div></div></div>');
      });
      listEl.innerHTML = tiles.join('');
      listEl.querySelectorAll('.work-tile-card').forEach(function (card) {
        var workId = card.getAttribute('data-id');
        var resourceUrl = card.getAttribute('data-url');
        card.querySelector('.work-tile-media') && card.querySelector('.work-tile-media').addEventListener('click', function (e) {
          if (e.target.closest('.work-tile-hover-actions')) return;
          if (workId && window.openPreviewModal) window.openPreviewModal(workId, resourceUrl);
        });
        card.querySelectorAll('.work-tile-download').forEach(function (btn) {
          btn.addEventListener('click', function (e) { e.stopPropagation(); var u = btn.getAttribute('data-url'); if (u && window.downloadWorkResource) window.downloadWorkResource(u, ''); });
        });
        card.querySelectorAll('.work-tile-favorite').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var id = btn.getAttribute('data-work-id');
            var u = btn.getAttribute('data-resource-url');
            if (id != null && u != null && window.toggleWorkResourceFavorite) window.toggleWorkResourceFavorite(id, u);
          });
        });
      });
      return;
    }
    
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var filtered = currentFilterType
      ? works.filter(function (w) { return getWorkResourceType(w) === currentFilterType; })
      : works;
    
    if (filtered.length === 0) {
      listEl.style.display = 'none';
      if (emptyEl) { 
        emptyEl.style.display = 'block';
        var filterTypeName = currentFilterType === 'image' ? '图片' : (currentFilterType === 'video' ? '视频' : (currentFilterType === 'audio' ? '音频' : ''));
        emptyEl.innerHTML = works.length ? 
          '<div style="font-size: 3rem; margin-bottom: 20px;">🔍</div>' +
          '<div style="font-size: 1.1rem; margin-bottom: 10px;">暂无' + filterTypeName + '作品</div>' +
          '<div style="font-size: 0.9rem;">请尝试其他筛选条件</div>' :
          '<div style="font-size: 3rem; margin-bottom: 20px;">📁</div>' +
          '<div style="font-size: 1.1rem; margin-bottom: 10px;">暂无作品</div>' +
          '<div style="font-size: 0.9rem;">请在图片生成、图生视频等功能中生成作品</div>';
      }
      return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.style.display = currentViewMode === 'grid' ? 'grid' : 'flex';
    listEl.className = currentViewMode === 'grid' ? 'works-grid works-grid-tile' : 'works-grid';
    listEl.setAttribute('data-view', currentViewMode);
    
    if (currentViewMode === 'grid') {
      var tiles = [];
      filtered.forEach(function (w) {
        var safeWorkId = String(w.id || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        var durationText = (w.videos && w.videos.length) ? '5s' : (w.audios && w.audios.length) ? '10s' : '';
        var tileCountForWork = 0;
        var pushTile = function (url, kind) {
          if (!url) return;
          tileCountForWork++;
          var safeUrl = String(url).replace(/"/g, '&quot;').replace(/</g, '&lt;');
          var isImg = kind === 'image';
          var isVid = kind === 'video';
          var fav = isFavoriteResource(w.id, url);
          var mediaHtml = '';
          if (isImg) {
            mediaHtml = '<img src="' + safeUrl + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.className+=&quot; work-tile-media-error&quot;">';
          } else if (isVid) {
            mediaHtml = '<video src="' + safeUrl + '" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.onerror=null;this.className+=&quot; work-tile-media-error&quot;"></video>';
          } else {
            mediaHtml = '<div class="work-tile-media-placeholder">🎵</div>';
          }
          var favClass = fav ? ' work-tile-fav-on' : '';
          tiles.push('<div class="work-tile-card" data-id="' + safeWorkId + '" data-url="' + safeUrl + '">' +
            '<div class="work-tile-media">' + mediaHtml +
            '<span class="work-tile-label">AI生成</span>' +
            (durationText ? '<span class="work-tile-duration">' + durationText + '</span>' : '') +
            '<span class="work-tile-preview-tag">预览</span>' +
            '<div class="work-tile-hover-actions">' +
            '<button type="button" class="work-tile-action-btn work-tile-download" title="下载" data-work-id="' + safeWorkId + '" data-url="' + safeUrl + '">⬇</button>' +
            '<button type="button" class="work-tile-action-btn work-tile-favorite' + favClass + '" title="' + (fav ? '取消收藏' : '收藏') + '" data-work-id="' + safeWorkId + '" data-resource-url="' + safeUrl + '">' + (fav ? '★' : '☆') + '</button>' +
            '</div></div></div>');
        };
        if (w.images && w.images.length) {
          w.images.forEach(function (u) { pushTile(u, 'image'); });
        }
        if (w.videos && w.videos.length) {
          w.videos.forEach(function (u) { pushTile(u, 'video'); });
        }
        if (w.audios && w.audios.length) {
          w.audios.forEach(function (u) { pushTile(u, 'audio'); });
        }
        if (tileCountForWork === 0) {
          var mainUrl = w.resultUrl || (w.images && w.images[0]) || (w.videos && w.videos[0]) || (w.audios && w.audios[0]);
          if (mainUrl) pushTile(mainUrl, getWorkResourceType(w));
        }
      });
      listEl.innerHTML = tiles.join('');
      listEl.querySelectorAll('.work-tile-card').forEach(function (card) {
        var workId = card.getAttribute('data-id');
        var resourceUrl = card.getAttribute('data-url');
        card.querySelector('.work-tile-media') && card.querySelector('.work-tile-media').addEventListener('click', function (e) {
          if (e.target.closest('.work-tile-hover-actions')) return;
          if (workId && window.openPreviewModal) window.openPreviewModal(workId, resourceUrl);
        });
        card.querySelectorAll('.work-tile-download').forEach(function (btn) {
          btn.addEventListener('click', function (e) { e.stopPropagation(); var url = btn.getAttribute('data-url'); if (url && window.downloadWorkResource) window.downloadWorkResource(url, ''); });
        });
        card.querySelectorAll('.work-tile-favorite').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var id = btn.getAttribute('data-work-id');
            var url = btn.getAttribute('data-resource-url');
            if (id != null && url != null && window.toggleWorkResourceFavorite) window.toggleWorkResourceFavorite(id, url);
            renderList();
          });
        });
      });
      return;
    }
    
    function formatLocalDate(isoStr) {
      if (!isoStr) return '';
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return (isoStr || '').slice(0, 19).replace('T', ' ');
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
    listEl.innerHTML = filtered.map(function (w) {
      var typeName = TYPE_NAMES[w.type] || w.type || '作品';
      var date = formatLocalDate(w.createdAt);
      var processing = isProcessing(w);
      // HTML 属性用：转义供 data-id、title 等，避免出现 '"> 等字符
      var safeWorkId = String(w.id || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // onclick 等内联 JS 用：只做 JS 字符串转义（单引号、反斜杠），避免 HTML 实体解码后破坏 JS 导致页面上出现 '"> 等
      var jsSafeWorkId = String(w.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var safeTypeNameAttr = String(typeName).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // 缩略图：优先用已获取资源 URL；按来源或扩展名判断类型（无扩展名时按 w.images/videos/audios）
      var thumbHtml = '';
      var mainUrl = w.resultUrl || (w.images && w.images[0]) || (w.videos && w.videos[0]) || (w.audios && w.audios[0]);
      var fromImages = mainUrl && w.images && w.images.length && (w.images[0] === mainUrl || w.images.indexOf(mainUrl) >= 0);
      var fromVideos = mainUrl && w.videos && w.videos.length && (w.videos[0] === mainUrl || w.videos.indexOf(mainUrl) >= 0);
      var fromAudios = mainUrl && w.audios && w.audios.length && (w.audios[0] === mainUrl || w.audios.indexOf(mainUrl) >= 0);
      var isImageUrl = mainUrl && (/\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(mainUrl) || fromImages || (mainUrl === w.resultUrl && w.images && w.images.length));
      var isVideoUrl = mainUrl && (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(mainUrl) || fromVideos || (mainUrl === w.resultUrl && w.videos && w.videos.length));
      var isAudioUrl = mainUrl && (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(mainUrl) || fromAudios || (mainUrl === w.resultUrl && w.audios && w.audios.length));
      // 无扩展名且未匹配来源时，按任务类型推断：生成图像/多图参考生图用图，图生视频/对口型用视频，配音用音频
      if (mainUrl && !isImageUrl && !isVideoUrl && !isAudioUrl) {
        if (w.type === 'text2img' || w.type === 'editimg') isImageUrl = true;
        else if (w.type === 'img2video' || w.type === 'lipsync') isVideoUrl = true;
        else if (w.type === 'dubbing' || w.type === 'text2audio') isAudioUrl = true;
        else isImageUrl = true; // 默认尝试按图片加载
      }
      var hasPreview = mainUrl && (isImageUrl || isVideoUrl || isAudioUrl);
      var safeUrl = mainUrl ? String(mainUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';
      if (mainUrl) {
        if (isImageUrl) {
          thumbHtml = '<img src="' + safeUrl + '" class="work-thumb-grid" alt="' + safeTypeNameAttr + '" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML=\'<div class=&quot;work-thumb-placeholder-grid&quot;>🖼️</div>\'">';
        } else if (isVideoUrl) {
          thumbHtml = '<video src="' + safeUrl + '" class="work-thumb-grid" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML=\'<div class=&quot;work-thumb-placeholder-grid&quot;>🎬</div>\'"></video>';
        } else if (isAudioUrl) {
          thumbHtml = '<div class="work-thumb-placeholder-grid">🎵</div>';
        }
      }
      if (!thumbHtml) {
        thumbHtml = '<div class="work-thumb-placeholder-grid">' +
          (processing ? '⏳' : typeName.charAt(0)) + '</div>';
      }
      if (hasPreview) {
        thumbHtml = '<div class="work-card-preview-inner" data-work-id="' + safeWorkId + '" title="点击预览资源">' + thumbHtml + '</div>';
      }
      
      // 状态徽章（title 内动态内容需转义，避免出现 '">）
      var statusHtml = '';
      if (processing) {
        var n = (w.progress || 0);
        var st = (w.progressStatus || '处理中');
        var safeSt = String(st).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        statusHtml = '<span class="work-status-grid status-processing" title="' + safeSt + '">处理中 (' + n + '%)</span>';
      } else if (w.status === 'failed') {
        statusHtml = '<span class="work-status-grid status-failed">失败</span>';
      } else if (w.status === 'completed' || w.status === 'ready' || !w.status) {
        statusHtml = '<span class="work-status-grid status-success">已完成</span>';
      }
      
      // 标题：若为「任务ID: xxx」则用类型+作品，避免与下方任务ID重复
      var rawTitle = (w.title || w.prompt || '').toString().trim();
      if (!rawTitle || /^任务ID\s*[:：]/.test(rawTitle)) {
        rawTitle = typeName + ' 作品';
      }
      var title = (rawTitle || typeName + ' ' + date || '未命名').slice(0, 100);
      
      // 任务ID / 视频ID / 音频ID（可点击复制）
      var taskIdHtml = '';
      if (w.taskId) {
        taskIdHtml = '<div class="work-taskid-grid">任务ID: <span title="点击复制" data-id="' + (w.taskId || '').replace(/"/g, '&quot;') + '">' + (w.taskId || '').replace(/</g, '&lt;') + '</span></div>';
      }
      if (w.videoId) {
        taskIdHtml += '<div class="work-taskid-grid">视频ID: <span title="点击复制，可用于对口型人脸识别" data-id="' + (w.videoId || '').replace(/"/g, '&quot;') + '">' + (w.videoId || '').replace(/</g, '&lt;') + '</span></div>';
      }
      if (w.audioId) {
        taskIdHtml += '<div class="work-taskid-grid">音频ID: <span title="点击复制" data-id="' + (w.audioId || '').replace(/"/g, '&quot;') + '">' + (w.audioId || '').replace(/</g, '&lt;') + '</span></div>';
      }
      
      // 已上传/参考资源：合并 referenceImages/Videos/Audios 与 inputImage/inputVideo/inputAudio，便于图生图、图生视频、视频生音效等重新编辑时显示
      var referenceImages = [].concat(w.referenceImages || []);
      var referenceVideos = [].concat(w.referenceVideos || []);
      var referenceAudios = [].concat(w.referenceAudios || []);
      if (w.inputImage && referenceImages.indexOf(w.inputImage) === -1) referenceImages.unshift(w.inputImage);
      if (w.inputVideo && referenceVideos.indexOf(w.inputVideo) === -1) referenceVideos.unshift(w.inputVideo);
      if (w.inputAudio && referenceAudios.indexOf(w.inputAudio) === -1) referenceAudios.unshift(w.inputAudio);
      
      // 提取模型名
      var modelName = w.model_name || w.model || '';
      
      // 提取分辨率/质量
      var quality = '';
      if (w.resolution) {
        quality = w.resolution;
      } else if (w.quality) {
        quality = w.quality;
      } else if (w.videos && w.videos.length > 0) {
        // 视频默认质量
        quality = '1080p';
      }
      
      // 获取功能图标
      var functionIcon = '';
      if (w.type === 'text2img' || w.type === 'editimg' || w.type === 'img2img' || w.type === 'multi-img') {
        functionIcon = '🖼️'; // 图片图标
      } else if (w.type === 'img2video' || w.type === 'text2video' || w.type === 'lipsync') {
        functionIcon = '🎬'; // 视频图标（胶片卷轴）
      } else if (w.type === 'dubbing' || w.type === 'text2audio' || w.type === 'tts') {
        functionIcon = '🎵'; // 音频图标
      } else {
        functionIcon = '📄'; // 默认图标
      }
      
      // 构建左上角信息：功能图标 + 功能名 | 参考资源（缩略图+标签） 模型名（标签） 质量（标签）
      // 功能名和后面的内容用 "|" 分隔，后面的标签之间用空格分隔
      var safeTypeName = String(typeName).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      var functionNameHtml = '<span class="work-function-name"><span class="work-function-icon">' + functionIcon + '</span>' + safeTypeName + '</span>';
      
      // 后面的标签（参考资源、模型名、质量）
      var tagsAfterSeparator = [];
      
      // 参考资源（显示为缩略图 + 标签）
      if (referenceImages.length > 0) {
        var refImgPreviewId = 'work-ref-preview-' + String(w.id || '').replace(/[^a-zA-Z0-9_-]/g, '-');
        var refImgUrl = referenceImages[0];
        var safeRefImgUrl = String(refImgUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;');
        tagsAfterSeparator.push('<span class="work-ref-resource-wrapper" data-ref-preview-id="' + refImgPreviewId + '">' +
          '<img src="' + safeRefImgUrl + '" class="work-ref-thumb" alt="参考图" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display=&quot;none&quot;">' +
          '<span class="work-ref-label">参考图</span>' +
          '</span>');
      }
      if (referenceVideos.length > 0) {
        var refVideoUrl = referenceVideos[0];
        var safeRefVideoUrl = String(refVideoUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;');
        tagsAfterSeparator.push('<span class="work-ref-resource-wrapper">' +
          '<video src="' + safeRefVideoUrl + '" class="work-ref-thumb" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.style.display=&quot;none&quot;"></video>' +
          '<span class="work-ref-label">参考视频</span>' +
          '</span>');
      }
      if (referenceAudios.length > 0) {
        tagsAfterSeparator.push('<span class="work-ref-resource-wrapper">' +
          '<span class="work-ref-thumb work-ref-audio-icon">🎵</span>' +
          '<span class="work-ref-label">参考音频</span>' +
          '</span>');
      }
      
      // 模型名（深灰色圆角矩形标签）
      if (modelName) {
        var safeModelName = String(modelName).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        tagsAfterSeparator.push('<span class="work-info-tag work-model-tag">' + safeModelName + '</span>');
      }
      
      // 质量（深灰色圆角矩形标签）
      if (quality) {
        var safeQuality = String(quality).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        tagsAfterSeparator.push('<span class="work-info-tag work-quality-tag">' + safeQuality + '</span>');
      }
      
      // 资源类型（图片/视频/音频）放入标签栏，与功能名、质量等同一行
      var resourceTypeLabel = getWorkResourceType(w);
      var typeLabelText = resourceTypeLabel === 'image' ? '图片' : (resourceTypeLabel === 'video' ? '视频' : '音频');
      var typeTagHtml = '<span class="work-info-tag work-card-type-tag work-card-type-' + resourceTypeLabel + '">' + typeLabelText + '</span>';
      var topLeftHtml = functionNameHtml + '<span class="work-info-separator">|</span>' + typeTagHtml;
      if (tagsAfterSeparator.length > 0) {
        topLeftHtml += ' ' + tagsAfterSeparator.join(' ');
      }
      
      // 参考图悬停预览HTML
      var refPreviewHtml = '';
      if (referenceImages.length > 0) {
        var refImgPreviewId = 'work-ref-preview-' + String(w.id || '').replace(/[^a-zA-Z0-9_-]/g, '-');
        refPreviewHtml = '<div class="work-ref-preview" id="' + refImgPreviewId + '" style="display:none;">';
        referenceImages.forEach(function(refImg) {
          var safeRefImg = String(refImg).replace(/"/g, '&quot;').replace(/</g, '&lt;');
          refPreviewHtml += '<img src="' + safeRefImg + '" alt="参考图" referrerpolicy="no-referrer" loading="lazy">';
        });
        refPreviewHtml += '</div>';
      }
      
      // 主要下载链接
      var downloadUrl = w.resultUrl || (w.videos && w.videos[0]) || 
                       (w.audios && w.audios[0]) || (w.images && w.images[0]) || '';
      
      // 渲染输出资源行：同一任务的所有资源（图片、视频、音频）在一行显示
      var resourcesHtml = '';
      var hasResources = false;
      
      // 图片资源
      if (w.images && w.images.length > 0) {
        hasResources = true;
        w.images.forEach(function(imgUrl) {
          var safeImgUrl = String(imgUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;');
          var favCls = isFavoriteResource(w.id, imgUrl) ? ' work-resource-fav-on' : '';
          resourcesHtml += '<div class="work-resource-item">' +
            '<div class="work-resource-image work-resource-with-actions" data-work-id="' + safeWorkId + '" data-resource-url="' + safeImgUrl + '" title="点击预览">' +
            '<img src="' + safeImgUrl + '" alt="图片" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);&quot;>🖼️</div>\'">' +
            '<div class="work-resource-hover-actions"><button type="button" class="work-resource-download" title="下载" data-url="' + safeImgUrl + '">⬇</button><button type="button" class="work-resource-favorite' + favCls + '" title="收藏" data-work-id="' + safeWorkId + '" data-resource-url="' + safeImgUrl + '">' + (isFavoriteResource(w.id, imgUrl) ? '★' : '☆') + '</button></div>' +
            '</div>' +
            '</div>';
        });
      }
      
      // 视频资源
      if (w.videos && w.videos.length > 0) {
        hasResources = true;
        w.videos.forEach(function(videoUrl) {
          var safeVideoUrl = String(videoUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;');
          var favCls = isFavoriteResource(w.id, videoUrl) ? ' work-resource-fav-on' : '';
          resourcesHtml += '<div class="work-resource-item">' +
            '<div class="work-resource-video work-resource-with-actions" data-work-id="' + safeWorkId + '" data-resource-url="' + safeVideoUrl + '" title="点击预览">' +
            '<video src="' + safeVideoUrl + '" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);&quot;>🎬</div>\'"></video>' +
            '<div class="work-resource-hover-actions"><button type="button" class="work-resource-download" title="下载" data-url="' + safeVideoUrl + '">⬇</button><button type="button" class="work-resource-favorite' + favCls + '" title="收藏" data-work-id="' + safeWorkId + '" data-resource-url="' + safeVideoUrl + '">' + (isFavoriteResource(w.id, videoUrl) ? '★' : '☆') + '</button></div>' +
            '</div>' +
            '</div>';
        });
      }
      
      // 音频资源（使用特殊播放器格式）
      if (w.audios && w.audios.length > 0) {
        hasResources = true;
        w.audios.forEach(function(audioUrl, index) {
          var safeAudioUrl = String(audioUrl).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/'/g, '&#39;');
          var jsSafeAudioUrl = String(audioUrl).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var audioId = 'work-audio-' + String(w.id).replace(/'/g, '-').replace(/"/g, '-') + '-' + index;
          var favCls = isFavoriteResource(w.id, audioUrl) ? ' work-resource-fav-on' : '';
          resourcesHtml += '<div class="work-resource-item">' +
            '<div class="work-resource-audio work-resource-with-actions" data-work-id="' + safeWorkId + '" data-resource-url="' + safeAudioUrl + '">' +
            '<div class="work-resource-hover-actions"><button type="button" class="work-resource-download" title="下载" data-url="' + safeAudioUrl + '">⬇</button><button type="button" class="work-resource-favorite' + favCls + '" title="收藏" data-work-id="' + safeWorkId + '" data-resource-url="' + safeAudioUrl + '">' + (isFavoriteResource(w.id, audioUrl) ? '★' : '☆') + '</button></div>' +
            '<div class="work-audio-icon">' +
            '<div class="work-audio-arm"></div>' +
            '</div>' +
            '<button type="button" class="work-audio-play-btn" onclick="window.toggleAudioPlay(\'' + audioId + '\', \'' + jsSafeAudioUrl + '\', this)" title="播放/暂停"></button>' +
            '<div class="work-audio-waveform" id="' + audioId + '-waveform">' +
            Array(20).fill(0).map(function() {
              var height = Math.random() * 60 + 20;
              return '<div class="work-audio-waveform-bar" style="height: ' + height + '%;"></div>';
            }).join('') +
            '</div>' +
            '<div class="work-audio-time">' +
            '<span class="work-audio-time-current" id="' + audioId + '-current">00:00</span>' +
            '<span class="work-audio-time-separator">/</span>' +
            '<span class="work-audio-time-total" id="' + audioId + '-total">00:00</span>' +
            '</div>' +
            '<audio id="' + audioId + '" src="' + safeAudioUrl + '" preload="metadata" style="display:none;"></audio>' +
            '</div>' +
            '</div>';
        });
      }
      
      // 如果没有资源，显示占位符
      if (!hasResources && processing) {
        resourcesHtml = '<div class="work-resource-item" style="padding: 20px; color: var(--muted);">⏳ 处理中...</div>';
      } else if (!hasResources) {
        resourcesHtml = '<div class="work-resource-item" style="padding: 20px; color: var(--muted);">暂无资源</div>';
      }
      
      // 输入的文本（正向提示词、负向提示词）
      var promptText = (w.prompt || '').toString().trim();
      var negativeText = (w.negativePrompt || '').toString().trim();
      function esc(s) { return (s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;').replace(/"/g, '&quot;'); }
      
      /* 布局：顶部信息栏（含功能名 + 图片/视频/音频标签 + 其他标签）+ 输入文本 + 输出资源 */
      return '<div class="work-card-grid" data-id="' + safeWorkId + '">' +
        '<div class="work-card-body">' +
        '<div class="work-card-header">' +
        '<div class="work-card-header-left">' + topLeftHtml + refPreviewHtml + '</div>' +
        '<div class="work-card-header-right">' +
        '<button type="button" class="work-btn-header" onclick="window.reeditWork(\'' + jsSafeWorkId + '\')" title="编辑">✏️</button>' +
        '<button type="button" class="work-btn-header" onclick="window.regenerateWork(\'' + jsSafeWorkId + '\')" title="重新生成">⚡</button>' +
        '<button type="button" class="work-btn-header" onclick="window.reloadWork(\'' + jsSafeWorkId + '\')" title="重新加载">🔄</button>' +
        '<button type="button" class="work-btn-header" onclick="window.deleteWorkGrid(\'' + jsSafeWorkId + '\')" title="删除作品">🗑️</button>' +
        '</div>' +
        '</div>' +
        (promptText ? '<div class="work-prompt-text">' + esc(promptText) + '</div>' : '') +
        (negativeText ? '<div class="work-negative-prompt-text">负向：' + esc(negativeText) + '</div>' : '') +
        '<div class="work-resources-row">' + resourcesHtml + '</div>' +
        '</div></div>';
    }).join('');
    
    // 复制任务ID / 视频ID / 音频ID
    listEl.querySelectorAll('.work-taskid-grid span[data-id]').forEach(function (el) {
      el.addEventListener('click', function () {
        var idValue = el.getAttribute('data-id');
        if (!idValue) return;
        navigator.clipboard.writeText(idValue).then(function() {
          var original = el.textContent;
          el.textContent = '已复制!';
          el.style.color = 'var(--success)';
          setTimeout(function() {
            el.textContent = original;
            el.style.color = '';
          }, 1500);
        });
      });
    });
    // 资源点击预览（图片、视频），点击悬停按钮不触发预览
    listEl.querySelectorAll('.work-resource-image, .work-resource-video').forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('.work-resource-hover-actions')) return;
        var workId = el.getAttribute('data-work-id');
        var resourceUrl = el.getAttribute('data-resource-url');
        if (workId && resourceUrl) {
          var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
          var w = works.find(function (x) { return x.id === workId; });
          if (w) {
            var originalResultUrl = w.resultUrl;
            w.resultUrl = resourceUrl;
            window.openPreviewModal(workId);
            w.resultUrl = originalResultUrl;
          }
        }
      });
    });
    // 列表视图：下载、收藏按钮
    listEl.querySelectorAll('.work-resource-download').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); var url = btn.getAttribute('data-url'); if (url && window.downloadWorkResource) window.downloadWorkResource(url, ''); });
    });
    listEl.querySelectorAll('.work-resource-favorite').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var workId = btn.getAttribute('data-work-id');
        var resourceUrl = btn.getAttribute('data-resource-url');
        if (workId != null && resourceUrl != null && window.toggleWorkResourceFavorite) window.toggleWorkResourceFavorite(workId, resourceUrl);
      });
    });
    
    // 参考资源悬停预览
    listEl.querySelectorAll('.work-ref-resource-wrapper[data-ref-preview-id]').forEach(function (el) {
      var previewId = el.getAttribute('data-ref-preview-id');
      var preview = document.getElementById(previewId);
      if (!preview) return;
      
      el.addEventListener('mouseenter', function () {
        if (preview) {
          preview.style.display = 'block';
        }
      });
      el.addEventListener('mouseleave', function () {
        setTimeout(function() {
          if (preview && !preview.matches(':hover')) {
            preview.style.display = 'none';
          }
        }, 100);
      });
      
      if (preview) {
        preview.addEventListener('mouseenter', function () {
          preview.style.display = 'block';
        });
        preview.addEventListener('mouseleave', function () {
          preview.style.display = 'none';
        });
      }
    });
    // 标题点击查看完整介绍
    listEl.querySelectorAll('.work-title-grid.js-show-full-desc').forEach(function (el) {
      el.addEventListener('click', function () {
        var full = el.getAttribute('data-full-desc') || '';
        var body = document.getElementById('workTitleModalBody');
        var overlay = document.getElementById('workTitleModal');
        if (body) body.textContent = full || '（无介绍）';
        if (overlay) overlay.classList.add('active');
      });
    });
  }

  // 预览弹窗：workId 必填；resourceUrl 可选，不传则用该作品的主资源
  window.openPreviewModal = function (workId, resourceUrl) {
    var mainUrl = resourceUrl;
    if (!mainUrl) {
      var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      var w = works.find(function (x) { return x.id === workId; });
      if (!w) return;
      mainUrl = w.resultUrl || (w.images && w.images[0]) || (w.videos && w.videos[0]) || (w.audios && w.audios[0]);
    }
    if (!mainUrl) return;
    var inner = document.getElementById('workPreviewInner');
    var overlay = document.getElementById('workPreviewOverlay');
    if (!inner || !overlay) return;
    inner.innerHTML = '';
    var isImg = /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(mainUrl);
    var isVid = /\.(mp4|webm|mov|avi)(\?|#|$)/i.test(mainUrl);
    var isAud = /\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(mainUrl);
    if (isImg) {
      inner.innerHTML = '<img src="' + mainUrl + '" alt="预览">';
    } else if (isVid) {
      inner.innerHTML = '<video src="' + mainUrl + '" controls playsinline></video>';
    } else if (isAud) {
      inner.innerHTML = '<div class="work-preview-audio"><audio src="' + mainUrl + '" controls></audio></div>';
    } else {
      inner.innerHTML = '<a href="' + mainUrl + '" target="_blank" rel="noopener">打开链接</a>';
    }
    overlay.classList.add('active');
  };

  window.closePreviewModal = function () {
    var overlay = document.getElementById('workPreviewOverlay');
    var inner = document.getElementById('workPreviewInner');
    if (overlay) overlay.classList.remove('active');
    if (inner) {
      var v = inner.querySelector('video');
      if (v) v.pause();
    }
  };
  
  // 下载函数
  window.downloadWorkGrid = function(workId, url, btnEl) {
    if (!url) {
      alert('暂无可下载资源');
      return;
    }

    var list = (window.MediaStudio && window.MediaStudio.getWorks && window.MediaStudio.getWorks()) || [];
    var w = list.find(function (it) { return it && it.id === workId; }) || null;
    var typeName = (w && (TYPE_NAMES[w.type] || w.type)) || 'work';
    var baseTitle = (w && (w.title || w.prompt)) ? String(w.title || w.prompt) : typeName;
    var safeTitle = downloadManager.sanitizeFileName(baseTitle);

    var extMatch = String(url).match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i);
    var fileName = safeTitle + (extMatch ? ('.' + extMatch[1].toLowerCase()) : '');
    if (!fileName || fileName === '.file') fileName = downloadManager.getFileNameFromUrl(url);

    const originalText = (btnEl && btnEl.textContent) || '下载';
    if (btnEl) {
      btnEl.innerHTML = '⏳ 下载中...';
      btnEl.disabled = true;
    }
    
    downloadManager.downloadFile(url, fileName)
      .then(() => {
        alert('下载完成: ' + fileName);
      })
      .catch(err => {
        console.error('下载失败:', err);
        alert('下载失败，尝试直接打开...');
        window.open(url, '_blank');
      })
      .finally(() => {
        if (btnEl) {
          btnEl.innerHTML = originalText;
          btnEl.disabled = false;
        }
      });
  };
  
  // 删除函数
  window.deleteWorkGrid = function(workId) {
    if (!confirm('确定要删除这个作品吗？此操作不可撤销。')) return;
    
    var list = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var next = list.filter(function (w) { return w.id !== workId; });
    if (workPollingIntervals[workId]) {
      clearTimeout(workPollingIntervals[workId]);
      delete workPollingIntervals[workId];
    }
    try { 
      localStorage.setItem('media_studio_works', JSON.stringify(next));
      if (window.MediaStudio && window.MediaStudio.syncWorksToServer) window.MediaStudio.syncWorksToServer();
      renderList('');
    } catch (e) {}
  };
  
  // 重新加载：根据任务ID查询任务状态并更新资源
  window.reloadWork = function(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var work = works.find(function(w) { return w.id === workId; });
    
    if (!work) {
      alert('找不到该作品');
      return;
    }
    
    if (!work.taskId) {
      alert('该作品没有任务ID，无法重新加载');
      return;
    }
    
    // 显示加载状态（转义单引号以匹配HTML）
    var safeWorkIdForSelector = String(workId).replace(/'/g, "\\'");
    var btn = document.querySelector('[onclick="window.reloadWork(\'' + safeWorkIdForSelector + '\')"]');
    var originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⏳';
      btn.disabled = true;
    }
    
    // 处理查询结果的内部函数
    function handleQueryResult(result) {
      var hasResources = (result.audios && result.audios.length) || result.audio_url || 
                        (result.images && result.images.length) || result.image_url || 
                        (result.videos && result.videos.length) || result.video_url || 
                        result.result_url;
      var completed = result.status === 'completed' || result.status === 'ready';
      var status = result.status;
      if (completed && hasResources) status = 'ready';
      else if (completed) status = 'completed';
      
      var updates = {
        status: status,
        progress: result.progress != null ? result.progress : (completed ? 100 : 50),
        progressStatus: result.status === 'completed' || result.status === 'ready' ? '已完成' : 
                      (result.status === 'failed' ? '失败' : (result.progressStatus || result.status_text || result.message || '处理中'))
      };
      
      // 更新资源URL
      if (result.result_url) updates.resultUrl = result.result_url;
      if (result.images && result.images.length) {
        updates.images = result.images;
      } else if (result.image_url) {
        updates.images = [result.image_url];
      }
      if (result.videos && result.videos.length) {
        updates.videos = result.videos;
      } else if (result.video_url) {
        updates.videos = [result.video_url];
      }
      if (result.audios && result.audios.length) {
        updates.audios = result.audios;
      } else if (result.audio_url) {
        updates.audios = [result.audio_url];
      }
      
      // 更新ID
      if (result.video_id) updates.videoId = result.video_id;
      if (result.audio_id) updates.audioId = result.audio_id;
      
      // 更新作品
      if (window.MediaStudio && window.MediaStudio.updateWork) {
        window.MediaStudio.updateWork(workId, updates);
      }
      
      // 重新渲染列表
      if (window.MediaStudio && window.MediaStudio.refreshWorksList) {
        window.MediaStudio.refreshWorksList();
      } else {
        renderList('');
      }
      
      // 如果任务失败，显示错误提示（若已退款则提示退款）
      if (result.status === 'failed') {
        if (result.refunded != null) {
          if (window.MediaStudio && typeof window.MediaStudio.refreshBalance === 'function') window.MediaStudio.refreshBalance();
          alert('❌ 任务失败，已退款 \u26a1 ' + (Number(result.refunded)).toFixed(2));
        } else {
          alert('❌ 任务失败: ' + (result.progressStatus || '未知错误'));
        }
      }
    }
    
    queryTaskStatus(work.taskId, work.type)
      .then(handleQueryResult)
      .catch(function(error) {
        console.error('重新加载失败:', error);
        alert('重新加载失败: ' + error.message);
      })
      .finally(function() {
        if (btn) {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }
      });
  };
  
  window.downloadWorkResource = function(url, fileName) {
    if (!url) return;
    var name = (fileName && String(fileName).trim()) || downloadManager.getFileNameFromUrl(url);
    downloadManager.downloadFile(url, downloadManager.sanitizeFileName(name)).catch(function(e) { alert('下载失败: ' + (e && e.message)); });
  };
  window.toggleWorkFavorite = function(workId) {
    toggleFavorite(workId);
    renderList(currentFilterType);
  };
  /** 列表/平铺视图中：仅对当前悬停的那一个资源做收藏，不对整张卡片 */
  window.toggleWorkResourceFavorite = function(workId, resourceUrl) {
    toggleFavoriteResource(workId, resourceUrl);
    renderList(currentFilterType);
  };
  
  function init(container) {
    if (!container) return;
    
    // 收藏按钮（右侧）：点击进入/退出收藏视图，平铺展示所有收藏资源
    var showFavoritesBtn = document.getElementById('works-show-favorites');
    if (showFavoritesBtn) {
      showFavoritesBtn.addEventListener('click', function() {
        showFavoritesView = !showFavoritesView;
        updateFavoritesUI();
        renderList();
      });
    }
    
    // 视图切换：平铺 / 列表
    document.querySelectorAll('.works-view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var view = btn.getAttribute('data-view');
        if (!view) return;
        currentViewMode = view;
        document.querySelectorAll('.works-view-btn').forEach(function(b) { b.classList.toggle('active', b.getAttribute('data-view') === view); });
        renderList(currentFilterType);
      });
    });
    
    // 分类筛选按钮（点击选择，非下拉；收藏已移至右侧，不再作为分类）
    document.querySelectorAll('.works-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filter = btn.getAttribute('data-filter') || '';
        currentFilterType = filter;
        document.querySelectorAll('.works-filter-btn').forEach(function(b) { b.classList.toggle('active', (b.getAttribute('data-filter') || '') === filter); });
        renderList(currentFilterType);
      });
    });
    
    // 预览弹窗关闭
    var previewClose = document.getElementById('workPreviewClose');
    var previewOverlay = document.getElementById('workPreviewOverlay');
    if (previewClose) previewClose.addEventListener('click', window.closePreviewModal);
    if (previewOverlay) {
      previewOverlay.addEventListener('click', function(e) {
        if (e.target === previewOverlay) window.closePreviewModal();
      });
    }
    
    // 完整介绍弹窗关闭
    function closeWorkTitleModal() {
      var overlay = document.getElementById('workTitleModal');
      if (overlay) overlay.classList.remove('active');
    }
    var titleModalClose = document.getElementById('closeWorkTitleModal');
    var titleModalOverlay = document.getElementById('workTitleModal');
    if (titleModalClose) titleModalClose.addEventListener('click', closeWorkTitleModal);
    if (titleModalOverlay) {
      titleModalOverlay.addEventListener('click', function(e) {
        if (e.target === titleModalOverlay) closeWorkTitleModal();
      });
    }
    
    var filterSelect = document.getElementById('works-filter-type');
    if (filterSelect) {
      filterSelect.addEventListener('change', function () {
        var v = (filterSelect.value || '').trim();
        renderList(v);
      });
    }
    // 初始渲染（不自动轮询 API，用户点击「刷新状态」或「通过任务ID搜索」才会请求）
    renderList('');
    // 供其他功能在轮询时调用：若当前在作品管理则刷新列表，使「处理中」进度实时显示
    if (window.MediaStudio) {
      window.MediaStudio.refreshWorksList = function () {
        function doRefresh() {
          var worksListEl = document.getElementById('worksList');
          if (worksListEl) {
            renderList(currentFilterType);
            return;
          }
          var worksPanel = document.getElementById('studioWorksPanel');
          if (worksPanel) {
            var inner = worksPanel.querySelector('.studio-works-panel-inner');
            if (inner && window.MediaStudio.features && window.MediaStudio.features.works) {
              inner.innerHTML = typeof window.MediaStudio.features.works.getPanel === 'function' ?
                window.MediaStudio.features.works.getPanel() : '';
              if (typeof window.MediaStudio.features.works.init === 'function') {
                window.MediaStudio.features.works.init(inner);
              }
            }
          }
        }
        doRefresh();
        // 轮询获得资源后可能在同一 tick 内更新了 localStorage，延迟再刷一次确保前端拿到最新数据并重绘
        setTimeout(doRefresh, 0);
        setTimeout(doRefresh, 80);
      };
    }
  }
  
  // 注册到主应用
  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { 
      name: name, 
      icon: icon, 
      getPanel: getPanel, 
      init: init 
    });
  }
  
  // 音频播放控制函数
  window.audioPlayers = window.audioPlayers || {};
  
  // 格式化时间
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    var minutes = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return (minutes < 10 ? '0' : '') + minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }
  
  // 初始化音频时长显示
  window.initAudioDuration = function(audioId, audioUrl) {
    var audio = document.getElementById(audioId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = audioId;
      audio.src = audioUrl;
      audio.preload = 'metadata';
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    
    var totalEl = document.getElementById(audioId + '-total');
    if (totalEl && totalEl.textContent === '00:00') {
      if (audio.readyState >= 1) {
        // 如果已经加载了元数据
        totalEl.textContent = formatTime(audio.duration);
      } else {
        // 等待加载元数据
        audio.addEventListener('loadedmetadata', function() {
          totalEl.textContent = formatTime(audio.duration);
        }, { once: true });
      }
    }
  };
  
  window.toggleAudioPlay = function(audioId, audioUrl, btnEl) {
    var audio = document.getElementById(audioId);
    if (!audio) {
      // 如果audio元素不存在，创建它
      audio = document.createElement('audio');
      audio.id = audioId;
      audio.src = audioUrl;
      audio.preload = 'metadata';
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    
    var isPlaying = !audio.paused;
    
    // 停止所有其他音频
    Object.keys(window.audioPlayers).forEach(function(id) {
      if (id !== audioId && window.audioPlayers[id]) {
        var otherAudio = window.audioPlayers[id].audio;
        var otherBtn = window.audioPlayers[id].btn;
        if (otherAudio && !otherAudio.paused) {
          otherAudio.pause();
          otherAudio.currentTime = 0;
        }
        if (otherBtn) {
          otherBtn.classList.remove('playing');
        }
      }
    });
    
    if (isPlaying) {
      // 暂停
      audio.pause();
      btnEl.classList.remove('playing');
      delete window.audioPlayers[audioId];
    } else {
      // 播放
      // 确保总时长已加载
      var totalEl = document.getElementById(audioId + '-total');
      if (totalEl && totalEl.textContent === '00:00') {
        if (audio.readyState >= 1) {
          totalEl.textContent = formatTime(audio.duration);
        } else {
          audio.addEventListener('loadedmetadata', function() {
            totalEl.textContent = formatTime(audio.duration);
          }, { once: true });
        }
      }
      
      audio.play().then(function() {
        btnEl.classList.add('playing');
        window.audioPlayers[audioId] = { audio: audio, btn: btnEl };
        
        // 更新当前时间
        var updateTime = function() {
          var currentEl = document.getElementById(audioId + '-current');
          if (currentEl) {
            currentEl.textContent = formatTime(audio.currentTime);
          }
        };
        
        audio.addEventListener('timeupdate', updateTime);
        
        // 播放结束
        audio.addEventListener('ended', function() {
          btnEl.classList.remove('playing');
          delete window.audioPlayers[audioId];
          var currentEl = document.getElementById(audioId + '-current');
          if (currentEl) currentEl.textContent = '00:00';
          audio.removeEventListener('timeupdate', updateTime);
        }, { once: true });
      }).catch(function(err) {
        console.error('播放失败:', err);
        alert('音频播放失败，请检查网络连接');
      });
    }
  };
  
  
  // 等待目标功能页面的 DOM 就绪后再执行回调（避免切换后尚未渲染就填充导致失败）
  function getFeatureReadySelector(featureId) {
    if (featureId === 'text2img') return '#t2i-prompt';
    if (featureId === 'text2video') return '#t2v-prompt';
    if (featureId === 'lipsync') return '#lip-video-card';
    if (featureId === 'dubbing') return '#dub-prompt';
    return null;
  }
  function waitForFeatureReady(featureId, maxWaitMs, callback) {
    var selector = getFeatureReadySelector(featureId);
    if (!selector) {
      setTimeout(function() { callback(); }, 300);
      return;
    }
    var start = Date.now();
    function check() {
      if (document.querySelector(selector)) {
        callback();
        return;
      }
      if (Date.now() - start >= maxWaitMs) {
        callback();
        return;
      }
      setTimeout(check, 50);
    }
    setTimeout(check, 80);
  }

  // 重新生成：切换到对应功能页面，使用相同参数重新生成
  window.regenerateWork = function(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var work = works.find(function(w) { return w.id === workId; });
    if (!work) {
      alert('找不到该作品');
      return;
    }
    
    // 根据作品类型切换到对应功能页面（文生图/单图参考/多图参考 → 图片生成，文生视频/图生视频 → 生成视频）
    var featureId = null;
    if (work.type === 'text2img' || work.type === 'editimg' || work.type === 'img2img' || work.type === 'multi-img') {
      featureId = 'text2img';
    } else if (work.type === 'img2video' || work.type === 'text2video') {
      featureId = 'text2video';
    } else if (work.type === 'lipsync') {
      featureId = 'lipsync';
    } else if (work.type === 'text2audio' || work.type === 'tts' || work.type === 'dubbing') {
      featureId = 'dubbing';
    }
    
    if (!featureId) {
      alert('该作品类型暂不支持重新生成');
      return;
    }
    
    // 先切换到对应功能页面
    if (window.MediaStudio && window.MediaStudio.switchFeature) {
      window.MediaStudio.switchFeature(featureId);
    } else if (window.switchFeature) {
      window.switchFeature(featureId);
    }
    
    // 等目标页面 DOM 就绪后再填充参数
    waitForFeatureReady(featureId, 2500, function() {
      fillWorkParams(work, featureId, true);
    });
  };
  
  // 重新编辑：切换到对应功能页面，填充之前的参数供用户编辑
  window.reeditWork = function(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var work = works.find(function(w) { return w.id === workId; });
    if (!work) {
      alert('找不到该作品');
      return;
    }
    
    // 根据作品类型切换到对应功能页面
    var featureId = null;
    if (work.type === 'text2img' || work.type === 'editimg' || work.type === 'img2img' || work.type === 'multi-img') {
      featureId = 'text2img';
    } else if (work.type === 'img2video' || work.type === 'text2video') {
      featureId = 'text2video';
    } else if (work.type === 'lipsync') {
      featureId = 'lipsync';
    } else if (work.type === 'text2audio' || work.type === 'tts' || work.type === 'dubbing') {
      featureId = 'dubbing';
    }
    
    if (!featureId) {
      alert('该作品类型暂不支持重新编辑');
      return;
    }
    
    // 先切换到对应功能页面
    if (window.MediaStudio && window.MediaStudio.switchFeature) {
      window.MediaStudio.switchFeature(featureId);
    } else if (window.switchFeature) {
      window.switchFeature(featureId);
    }
    
    // 等目标页面 DOM 就绪后再填充参数
    waitForFeatureReady(featureId, 2500, function() {
      fillWorkParams(work, featureId, false);
    });
  };
  
  // 填充作品参数到功能页面
  function fillWorkParams(work, featureId, autoSubmit) {
    try {
      if (featureId === 'text2img') {
        // 填充图片生成参数
        var promptInput = document.getElementById('t2i-prompt');
        var negativeInput = document.getElementById('t2i-negative');
        var modelBtn = document.getElementById('t2i-header-model-btn');
        
        if (promptInput && work.prompt) {
          promptInput.value = work.prompt;
        }
        if (negativeInput && work.negativePrompt) {
          negativeInput.value = work.negativePrompt;
        }
        
        // 如果有图片或参考图，切换到对应的模式（多图参考 / 单图参考 / 文生图）
        if ((work.images && work.images.length > 0 && (work.type === 'editimg' || work.type === 'multi-img'))) {
          var multiImgTab = document.getElementById('t2i-mode-tab-multi-img');
          if (multiImgTab) {
            multiImgTab.click();
          }
        } else if ((work.referenceImages && work.referenceImages.length > 0) || (work.type === 'img2img') || (work.images && work.images.length === 1 && work.type !== 'text2img')) {
          var img2imgTab = document.getElementById('t2i-mode-tab-img2img');
          if (img2imgTab) {
            img2imgTab.click();
            var refImg = (work.referenceImages && work.referenceImages[0]) || (work.images && work.images[0]);
            if (refImg && window.MediaStudio.fillImg2imgReference) {
              setTimeout(function () { window.MediaStudio.fillImg2imgReference(refImg); }, 150);
            }
          }
        }
        
        // 自动提交（重新生成）
        if (autoSubmit) {
          setTimeout(function() {
            var generateBtn = document.querySelector('.t2i-generate-btn');
            if (generateBtn && !generateBtn.disabled) {
              generateBtn.click();
            }
          }, 1000);
        }
      } else if (featureId === 'text2video') {
        // 填充视频生成参数（文生视频 / 图生视频）
        var promptInput = document.querySelector('#t2v-prompt, .t2v-prompt-input');
        if (promptInput && work.prompt) {
          promptInput.value = work.prompt;
        }
        var refImg = (work.referenceImages && work.referenceImages[0]) || work.inputImage;
        if (refImg && work.type === 'img2video') {
          // 切换到图生视频并回填参考图
          var img2videoTab = document.getElementById('t2v-mode-tab-img2video');
          if (img2videoTab && !img2videoTab.classList.contains('active')) {
            img2videoTab.click();
          }
          if (window.MediaStudio.fillImg2videoReference) {
            setTimeout(function() { window.MediaStudio.fillImg2videoReference(refImg); }, 200);
          }
        }
        // 自动提交（重新生成）
        if (autoSubmit) {
          setTimeout(function() {
            var generateBtn = document.querySelector('.t2v-generate-btn, .t2i-generate-btn');
            if (generateBtn && !generateBtn.disabled) {
              generateBtn.click();
            }
          }, 1000);
        }
      } else if (featureId === 'lipsync') {
        // 填充对口型参数
        var videoInput = document.getElementById('lip-video-input');
        if (!videoInput) videoInput = document.querySelector('#lip-video-input, .lip-input-hidden');
        if (videoInput && work.videos && work.videos[0]) {
          videoInput.value = work.videos[0];
        }
        
        // 自动提交（重新生成）
        if (autoSubmit) {
          setTimeout(function() {
            var generateBtn = document.querySelector('.lipsync-generate-btn, .t2i-generate-btn');
            if (generateBtn && !generateBtn.disabled) {
              generateBtn.click();
            }
          }, 1000);
        }
      } else if (featureId === 'dubbing') {
        // 填充音频生成参数（含视频生音效的已上传视频）
        var promptInput = document.getElementById('dub-prompt');
        if (!promptInput) promptInput = document.getElementById('dub-prompt-text2audio');
        if (promptInput && work.prompt) {
          promptInput.value = work.prompt;
        }
        var refVideo = (work.referenceVideos && work.referenceVideos[0]) || work.inputVideo;
        if (refVideo && (work.type === 'dubbing')) {
          var dubVideoInput = document.getElementById('dub-video-input');
          if (dubVideoInput) dubVideoInput.value = refVideo;
        }
        // 自动提交（重新生成）
        if (autoSubmit) {
          setTimeout(function() {
            var generateBtn = document.querySelector('.dubbing-generate-btn, .t2i-generate-btn');
            if (generateBtn && !generateBtn.disabled) {
              generateBtn.click();
            }
          }, 1000);
        }
      }
    } catch (e) {
      console.error('填充参数失败:', e);
      if (!autoSubmit) {
        alert('已切换到对应功能页面，请手动填写参数');
      }
    }
  }
  
  // 导出必要函数
  window.refreshWorkStatus = window.refreshWorkStatusGrid;
  window.deleteWork = window.deleteWorkGrid;
  window.downloadWork = window.downloadWorkGrid;
})();
/**
 * AI创作工坊 - 图生视频（独立文件）
 * 对接云雾可灵图生视频 API
 */
(function () {
  var id = 'img2video';
  var name = '图生视频';
  var icon = '🎬';
  var MODELS = ['kling-v1', 'kling-v1-5', 'kling-v1-6', 'kling-v2-master', 'kling-v2-1', 'kling-v2-1-master', 'kling-v2-5-turbo', 'kling-v2-6'];
  var MODES = ['std', 'pro'];
  var DURATIONS = ['5', '10'];

  function getPanel() {
    var modelOpts = MODELS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var modeOpts = MODES.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var durationOpts = DURATIONS.map(function (d) { return '<option value="' + d + '">' + d + '秒</option>'; }).join('');
    return [
      '<h2 class="panel-title">图生视频 · 可灵 Kling 视频生成</h2>',
      '<div class="form-row">',
      '  <label>模型 <span class="required">*</span></label>',
      '  <select id="i2v-model">' + modelOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>参考图像 <span class="required">*</span></label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="i2v-image" placeholder="输入图片 URL 或 Base64 编码，或上传本地图片">',
      '    <input type="file" id="i2v-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="i2v-upload-btn" style="margin-left:8px;margin-top:0;">上传图片</button>',
      '  </div>',
      '  <div id="i2v-image-preview" style="margin-top:8px;display:none;">',
      '    <img id="i2v-preview-img" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--border);" alt="预览">',
      '    <button type="button" class="btn-secondary" id="i2v-remove-preview" style="margin-left:8px;font-size:0.85rem;">移除</button>',
      '  </div>',
      '  <p class="hint">支持输入图片 URL（优先）或 Base64 编码（备选），或上传本地图片（.jpg/.jpeg/.png，≤10MB）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>尾帧控制图像（可选）</label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="i2v-image-tail" placeholder="输入图片 URL 或 Base64 编码，或上传本地图片">',
      '    <input type="file" id="i2v-image-tail-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="i2v-upload-tail-btn" style="margin-left:8px;margin-top:0;">上传图片</button>',
      '  </div>',
      '</div>',
      '<div class="form-row">',
      '  <label>正向提示词（可选，不能超过2500字符）</label>',
      '  <textarea id="i2v-prompt" placeholder="描述视频内容，不能超过2500字符" maxlength="2500"></textarea>',
      '  <p class="hint">用&lt;&lt;&lt;voice_1&gt;&gt;&gt;来指定音色，序号同voice_list参数所引用音色的排列顺序</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>负向提示词（可选）</label>',
      '  <textarea id="i2v-negative" placeholder="不想要的元素" maxlength="2500"></textarea>',
      '</div>',
      '<div class="form-row">',
      '  <label>生成模式 <span class="required">*</span></label>',
      '  <select id="i2v-mode">' + modeOpts + '</select>',
      '  <p class="hint">std：标准模式（性价比高）；pro：专家模式（高品质）</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>视频时长 <span class="required">*</span></label>',
      '  <select id="i2v-duration">' + durationOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>CFG Scale（kling-v2.x模型不支持）</label>',
      '  <input type="number" id="i2v-cfg-scale" min="0" max="10" step="0.1" value="0.5" placeholder="0.5">',
      '  <p class="hint">值越大，模型自由度越小，与用户输入的提示词相关性越强</p>',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="i2v-submit">生成视频</button>',
      '</div>',
      '<div class="result-area" id="i2v-result">生成结果将显示在此处</div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function setResult(html, isContent) {
    var el = document.getElementById('i2v-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function uploadImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('请选择图片文件（.jpg/.jpeg/.png）'));
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('图片文件过大，请选择 ≤10MB 的图片'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var base64 = e.target.result;
        var isDataUrl = base64.startsWith('data:');
        var raw = isDataUrl ? base64.substring(base64.indexOf(',') + 1) : base64;
        fetch(apiOrigin() + '/api/upload-temp-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'image', content: raw }),
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.success && data.url) {
              var url = data.url;
              var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
              if (isLocalhost) {
                setResult('<span class="msg-warning">⚠️ 检测到本地地址（' + url + '），云雾 API 可能无法访问。请配置 DEPLOY_URL 环境变量以使用公网地址。</span>', true);
              }
              resolve(url);
            } else {
              reject(new Error(data && data.message ? data.message : '上传失败'));
            }
          })
          .catch(reject);
      };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(file);
    });
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function collectVideoUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (x) {
        if (typeof x === 'string' && /^https?:\/\//i.test(x)) out.push(x);
        else if (x && typeof x === 'object' && x.url) out.push(x.url);
      });
      return;
    }
    var urlKeys = ['video', 'url', 'videos', 'video_url', 'output_video', 'result_url', 'output_url', 'videoUrl'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectVideoUrls(obj[k], out);
    });
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject) {
    var url = apiOrigin() + '/api/yunwu/videos/image2video/' + encodeURIComponent(taskId);
    fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success === false && data.message) {
          reject(new Error(data.message));
          return;
        }
        var statusRaw = (data && data.data && data.data.task_status) ||
          (data && data.task_status) ||
          (data && data.data && data.data.status) ||
          (data && data.status) ||
          (data && data.data && data.data.task_result && data.data.task_result.task_status) ||
          '';
        var status = normalizeTaskStatus(statusRaw);
        var result = (data && data.data && data.data.task_result) ||
          (data && data.data && data.data.result) ||
          (data && data.result) ||
          (data && data.data) ||
          {};
        var videos = [];
        if (result.video || result.videoUrl || result.video_url) {
          var v = result.video || result.videoUrl || result.video_url;
          if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
        }
        if (!videos.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
        }
        if (!videos.length) collectVideoUrls(data, videos);
        videos = [...new Set(videos.filter(Boolean))];

        var videoId = (result && result.video_id) ||
          (data && data.data && data.data.video_id) ||
          (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
          (data && data.video_id) ||
          '';
        if (status === 'done' && videos.length > 0) {
          resolve({ videos: videos, raw: data, videoId: videoId });
          return;
        }
        if (status === 'done' && !videos.length) {
          resolve({ videos: [], raw: data, videoId: videoId });
          return;
        }
        if (status === 'failed') {
          reject(new Error((result.message || result.error || data.message || data.error || '任务失败') + ''));
          return;
        }
        if (status === 'processing') {
          var progressText = '轮询中，状态=' + (statusRaw || '处理中');
          if (typeof setProgress === 'function') setProgress(progressText, statusRaw);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var pw = (window.MediaStudio.getWorks() || []).find(function (w) { return w.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
          }
          setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject); }, 2500);
          return;
        }
        setTimeout(function () { pollTask(taskId, apiKey, workId, setProgress, resolve, reject); }, 2500);
      })
      .catch(reject);
  }

  function init(container) {
    if (!container) return;
    var btn = document.getElementById('i2v-submit');
    if (!btn) return;
    var uploadBtn = document.getElementById('i2v-upload-btn');
    var fileInput = document.getElementById('i2v-image-file');
    var imageInput = document.getElementById('i2v-image');
    var previewDiv = document.getElementById('i2v-image-preview');
    var previewImg = document.getElementById('i2v-preview-img');
    var removeBtn = document.getElementById('i2v-remove-preview');
    var currentImageUrl = '';
    var currentImageBase64 = '';
    var currentImageFile = null;

    var uploadTailBtn = document.getElementById('i2v-upload-tail-btn');
    var fileTailInput = document.getElementById('i2v-image-tail-file');
    var imageTailInput = document.getElementById('i2v-image-tail');
    var currentImageTailUrl = '';
    var currentImageTailBase64 = '';

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        currentImageFile = file;
        uploadBtn.disabled = true;
        uploadBtn.textContent = '上传中...';
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          currentImageBase64 = base64;
          uploadImageFile(file)
            .then(function (url) {
              currentImageUrl = url;
              currentImageBase64 = '';
              if (imageInput) imageInput.value = url;
              if (previewImg) {
                var blobUrl = URL.createObjectURL(file);
                previewImg.src = blobUrl;
                previewImg.onload = function () { URL.revokeObjectURL(blobUrl); };
              }
              if (previewDiv) previewDiv.style.display = 'block';
              uploadBtn.disabled = false;
              uploadBtn.textContent = '上传图片';
              fileInput.value = '';
              setResult('<span class="msg-success">✓ 图片已上传并转换为URL</span>', true);
            })
            .catch(function (err) {
              currentImageUrl = '';
              if (imageInput) imageInput.value = '';
              if (previewImg) {
                var blobUrl = URL.createObjectURL(file);
                previewImg.src = blobUrl;
                previewImg.onload = function () { URL.revokeObjectURL(blobUrl); };
              }
              if (previewDiv) previewDiv.style.display = 'block';
              uploadBtn.disabled = false;
              uploadBtn.textContent = '上传图片';
              fileInput.value = '';
              setResult('<span class="msg-warning">⚠️ 上传失败，将使用Base64编码：' + (err.message || '上传失败').replace(/\n/g, '<br>') + '</span>', true);
            });
        };
        reader.onerror = function () {
          setResult('<span class="msg-error">✗ 读取文件失败</span>', true);
          uploadBtn.disabled = false;
          uploadBtn.textContent = '上传图片';
          fileInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        currentImageUrl = '';
        currentImageBase64 = '';
        currentImageFile = null;
        if (imageInput) imageInput.value = '';
        if (previewDiv) previewDiv.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (fileInput) fileInput.value = '';
      });
    }
    if (imageInput) {
      imageInput.addEventListener('blur', function () {
        var url = imageInput.value.trim();
        if (url) {
          var isBase64 = /^data:image\//i.test(url) || (!/^https?:\/\//i.test(url) && url.length > 100);
          if (isBase64) {
            currentImageBase64 = url;
            currentImageUrl = '';
            if (previewDiv) {
              previewDiv.style.display = 'block';
              if (previewImg) previewImg.src = url;
            }
            setResult('<span class="msg-warning">⚠️ 检测到Base64编码，将作为备选方案。建议上传图片获取URL以获得更好的兼容性。</span>', true);
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost) {
              setResult('<span class="msg-warning">⚠️ 检测到本地地址（' + url + '），云雾 API 可能无法访问。将尝试使用Base64编码作为备选。</span>', true);
            }
            currentImageUrl = url;
            currentImageBase64 = '';
            if (previewDiv) {
              previewDiv.style.display = 'block';
              if (previewImg) previewImg.src = url;
            }
          }
        } else {
          currentImageUrl = '';
          currentImageBase64 = '';
          if (previewDiv) previewDiv.style.display = 'none';
        }
      });
    }

    if (uploadTailBtn && fileTailInput) {
      uploadTailBtn.addEventListener('click', function () { fileTailInput.click(); });
      fileTailInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        uploadTailBtn.disabled = true;
        uploadTailBtn.textContent = '上传中...';
        var reader = new FileReader();
        reader.onload = function (e) {
          var base64 = e.target.result;
          currentImageTailBase64 = base64;
          uploadImageFile(file)
            .then(function (url) {
              currentImageTailUrl = url;
              currentImageTailBase64 = '';
              if (imageTailInput) imageTailInput.value = url;
              uploadTailBtn.disabled = false;
              uploadTailBtn.textContent = '上传图片';
              fileTailInput.value = '';
            })
            .catch(function (err) {
              currentImageTailUrl = '';
              if (imageTailInput) imageTailInput.value = '';
              uploadTailBtn.disabled = false;
              uploadTailBtn.textContent = '上传图片';
              fileTailInput.value = '';
              setResult('<span class="msg-warning">⚠️ 尾帧图片上传失败，将使用Base64编码：' + (err.message || '上传失败').replace(/\n/g, '<br>') + '</span>', true);
            });
        };
        reader.onerror = function () {
          uploadTailBtn.disabled = false;
          uploadTailBtn.textContent = '上传图片';
          fileTailInput.value = '';
        };
        reader.readAsDataURL(file);
      });
    }
    if (imageTailInput) {
      imageTailInput.addEventListener('blur', function () {
        var url = imageTailInput.value.trim();
        if (url) {
          var isBase64 = /^data:image\//i.test(url) || (!/^https?:\/\//i.test(url) && url.length > 100);
          if (isBase64) {
            currentImageTailBase64 = url;
            currentImageTailUrl = '';
          } else {
            var isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url);
            if (isLocalhost && currentImageTailBase64) {
              currentImageTailBase64 = currentImageTailBase64;
            } else {
              currentImageTailUrl = url;
              currentImageTailBase64 = '';
            }
          }
        } else {
          currentImageTailUrl = '';
          currentImageTailBase64 = '';
        }
      });
    }

    btn.addEventListener('click', function () {
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!apiKey) {
        setResult('<span class="msg-warning">请先在「设置」中配置并保存云雾 API Key</span>', true);
        return;
      }
      var model = getVal('i2v-model', 'kling-v1');
      var mode = getVal('i2v-mode', 'std');
      var duration = getVal('i2v-duration', '5');
      var imageInputValue = getVal('i2v-image', '') || currentImageUrl || '';
      var finalImage = '';
      
      function extractBase64(str) {
        if (!str || typeof str !== 'string') return '';
        if (str.startsWith('data:')) {
          var commaIdx = str.indexOf(',');
          if (commaIdx >= 0) str = str.substring(commaIdx + 1);
        }
        str = str.replace(/[\s\n\r]/g, '');
        if (!/^[A-Za-z0-9+/=]+$/.test(str)) {
          return null;
        }
        return str;
      }

      if (imageInputValue || currentImageUrl || currentImageBase64) {
        var isBase64Input = /^data:image\//i.test(imageInputValue) || (!/^https?:\/\//i.test(imageInputValue) && imageInputValue.length > 100);
        var hasValidUrl = currentImageUrl || (imageInputValue && /^https?:\/\//i.test(imageInputValue) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(imageInputValue));
        var hasLocalhostUrl = (currentImageUrl || imageInputValue) && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(currentImageUrl || imageInputValue);
        
        if (hasValidUrl) {
          finalImage = currentImageUrl || imageInputValue;
        } else if (hasLocalhostUrl && currentImageBase64) {
          var base64Str = extractBase64(currentImageBase64);
          if (!base64Str) {
            setResult('<span class="msg-error">✗ Base64格式无效，请重新上传图片</span>', true);
            return;
          }
          finalImage = base64Str;
          setResult('<span class="msg-warning">⚠️ 检测到本地地址，已自动切换为Base64编码</span>', true);
        } else if (isBase64Input || currentImageBase64) {
          var base64Str = extractBase64(currentImageBase64 || imageInputValue);
          if (!base64Str) {
            setResult('<span class="msg-error">✗ Base64格式无效，请重新上传图片或输入有效的Base64字符串</span>', true);
            return;
          }
          finalImage = base64Str;
        } else if (hasLocalhostUrl) {
          finalImage = currentImageUrl || imageInputValue;
          var confirmMsg = '⚠️ 检测到本地地址（' + finalImage + '），云雾 API 可能无法访问。\n\n建议：\n1. 配置 DEPLOY_URL 环境变量以使用公网地址\n2. 或上传图片使用Base64编码\n\n是否仍要继续？';
          if (!confirm(confirmMsg)) {
            return;
          }
        } else {
          finalImage = imageInputValue;
        }
      }
      
      if (!finalImage) {
        setResult('<span class="msg-warning">请上传或输入参考图像</span>', true);
        return;
      }

      var imageTailInputValue = getVal('i2v-image-tail', '') || currentImageTailUrl || '';
      var finalImageTail = '';
      if (imageTailInputValue || currentImageTailUrl || currentImageTailBase64) {
        var isBase64Tail = /^data:image\//i.test(imageTailInputValue) || (!/^https?:\/\//i.test(imageTailInputValue) && imageTailInputValue.length > 100);
        var hasValidTailUrl = currentImageTailUrl || (imageTailInputValue && /^https?:\/\//i.test(imageTailInputValue) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(imageTailInputValue));
        var hasLocalhostTailUrl = (currentImageTailUrl || imageTailInputValue) && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(currentImageTailUrl || imageTailInputValue);
        
        if (hasValidTailUrl) {
          finalImageTail = currentImageTailUrl || imageTailInputValue;
        } else if (hasLocalhostTailUrl && currentImageTailBase64) {
          var base64Str = extractBase64(currentImageTailBase64);
          if (!base64Str) {
            setResult('<span class="msg-error">✗ 尾帧图片Base64格式无效，请重新上传</span>', true);
            return;
          }
          finalImageTail = base64Str;
        } else if (isBase64Tail || currentImageTailBase64) {
          var base64Str = extractBase64(currentImageTailBase64 || imageTailInputValue);
          if (!base64Str) {
            setResult('<span class="msg-error">✗ 尾帧图片Base64格式无效，请重新上传或输入有效的Base64字符串</span>', true);
            return;
          }
          finalImageTail = base64Str;
        } else if (hasLocalhostTailUrl) {
          finalImageTail = currentImageTailUrl || imageTailInputValue;
        } else {
          finalImageTail = imageTailInputValue;
        }
      }

      var body = {
        apiKey: apiKey,
        model_name: model,
        image: finalImage,
        mode: mode,
        duration: parseInt(duration, 10)
      };
      if (finalImageTail) body.image_tail = finalImageTail;
      if (getVal('i2v-prompt', '')) body.prompt = getVal('i2v-prompt', '');
      if (getVal('i2v-negative', '')) body.negative_prompt = getVal('i2v-negative', '');
      var cfgScale = parseFloat(getVal('i2v-cfg-scale', '0.5'), 10);
      if (!isNaN(cfgScale) && !model.startsWith('kling-v2')) body.cfg_scale = cfgScale;

      setResult('正在提交任务…', true);
      btn.disabled = true;
      var workId = null;
      fetch(apiOrigin() + '/api/yunwu/videos/image2video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && !data.success && data.message) {
            setResult('<span class="msg-error">✗ ' + (data.message || '请求失败').replace(/\n/g, '<br>') + '</span>', true);
            btn.disabled = false;
            return Promise.reject(new Error(data.message));
          }
          var taskId = (data && data.data && (data.data.id || data.data.task_id)) || (data && data.id) || (data && data.task_id);
          if (!taskId) {
            setResult('<span class="msg-error">✗ 未返回任务 ID</span><pre>' + JSON.stringify(data || {}, null, 2) + '</pre>', true);
            btn.disabled = false;
            return Promise.reject(new Error('未返回任务 ID'));
          }
          if (window.MediaStudio && window.MediaStudio.addWork) {
            workId = window.MediaStudio.addWork({
              type: 'img2video',
              status: 'processing',
              taskId: taskId,
              title: (getVal('i2v-prompt', '') || '图生视频').toString().slice(0, 80),
              images: [],
              videos: [],
              audios: [],
              model_name: model,
            });
          }
          setResult('任务已创建，轮询中: ' + taskId + ' …', true);
          var setProgress = function (txt) { setResult(txt, true); };
          return new Promise(function (resolve, reject) {
            pollTask(taskId, apiKey, workId, setProgress, resolve, reject);
          });
        })
        .then(function (result) {
          var videos = (result && result.videos) || [];
          var raw = result && result.raw;
          var videoId = (result && result.videoId) || '';
          if (!videos.length && raw) {
            collectVideoUrls(raw, videos);
            videos = [...new Set(videos.filter(Boolean))];
          }
          if (!videoId && raw) {
            videoId = (raw && raw.data && raw.data.video_id) ||
              (raw && raw.data && raw.data.task_result && raw.data.task_result.video_id) ||
              (raw && raw.video_id) ||
              '';
          }
          var hasResources = videos.length > 0;
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: hasResources ? 'ready' : 'failed',
              videos: videos,
              progress: null,
              progressStatus: null
            };
            if (videos.length) updates.resultUrl = videos[0];
            if (videoId) updates.videoId = videoId;
            window.MediaStudio.updateWork(workId, updates);
          }
          if (!hasResources) {
            var msg = '<span class="msg-warning">任务完成但未解析到视频链接。</span>';
            if (raw) {
              msg += '<br><details style="margin-top:12px"><summary style="cursor:pointer">点击展开「查询任务」原始响应（便于排查字段）</summary><pre style="max-height:240px;overflow:auto;font-size:11px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;margin-top:8px">' + JSON.stringify(raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>';
            }
            setResult(msg, true);
            btn.disabled = false;
            return;
          }
          var html = '<span class="msg-success">✓ 生成完成</span><br>';
          videos.forEach(function (u, i) {
            html += '<div class="t2i-out"><video src="' + (u || '').replace(/"/g, '&quot;') + '" controls style="max-width:100%;border-radius:8px;"></video><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开视频</a></div>';
          });
          setResult(html, true);
          btn.disabled = false;
        })
        .catch(function (err) {
          setResult('<span class="msg-error">✗ ' + (err.message || String(err)).replace(/\n/g, '<br>') + '</span>', true);
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            window.MediaStudio.updateWork(workId, { status: 'failed', error: (err && err.message) || String(err), progress: null, progressStatus: null });
          }
          btn.disabled = false;
        });
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();

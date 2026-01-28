/**
 * AI创作工坊 - 文生图（独立文件）
 * 对接云雾可灵图像生成 API，参考图像仅支持图片 URL
 */
(function () {
  var id = 'text2img';
  var name = '文生图';
  var icon = '🖼️';
  var MODELS = ['kling-v1', 'kling-v1-5', 'kling-v2', 'kling-v2-new', 'kling-v2-1'];
  var RESOLUTIONS = ['1k', '2k'];
  var RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9'];
  var REF_TYPES = ['', 'subject', 'face'];

  function getPanel() {
    var modelOpts = MODELS.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
    var resOpts = RESOLUTIONS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
    var ratioOpts = RATIOS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join('');
    var refOpts = '<option value="">不使用</option><option value="subject">subject（角色特征参考）</option><option value="face">face（人物长相参考）</option>';
    return [
      '<h2 class="panel-title">文生图 · 可灵 Kling 图像生成</h2>',
      '<div class="form-row">',
      '  <label>模型 <span class="required">*</span></label>',
      '  <select id="t2i-model">' + modelOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>正向提示词 <span class="required">*</span></label>',
      '  <textarea id="t2i-prompt" placeholder="描述你想要的画面，不能超过2500字符" maxlength="2500"></textarea>',
      '</div>',
      '<div class="form-row">',
      '  <label>负向提示词（可选）</label>',
      '  <textarea id="t2i-negative" placeholder="不想要的元素，不能超过2500字符" maxlength="2500"></textarea>',
      '</div>',
      '<div class="form-row">',
      '  <label>参考图像（可选）</label>',
      '  <div class="t2i-image-input-wrap">',
      '    <input type="text" id="t2i-image" placeholder="输入图片 URL 或 Base64 编码，或上传本地图片">',
      '    <input type="file" id="t2i-image-file" accept="image/jpeg,image/jpg,image/png" style="display:none;">',
      '    <button type="button" class="btn-secondary" id="t2i-upload-btn" style="margin-left:8px;margin-top:0;">上传图片</button>',
      '  </div>',
      '  <div id="t2i-image-preview" style="margin-top:8px;display:none;">',
      '    <img id="t2i-preview-img" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid var(--border);" alt="预览">',
      '    <button type="button" class="btn-secondary" id="t2i-remove-preview" style="margin-left:8px;font-size:0.85rem;">移除</button>',
      '  </div>',
      '  <p class="hint">支持输入图片 URL（优先）或 Base64 编码（备选），或上传本地图片（.jpg/.jpeg/.png，≤10MB）。上传失败时自动使用Base64编码。使用 kling-v1-5 且填写参考图时，下方「图片参考类型」必选</p>',
      '</div>',
      '<div class="form-row">',
      '  <label>图片参考类型（有参考图时选填）</label>',
      '  <select id="t2i-image-ref">' + refOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>参考强度 image_fidelity（0~1，有参考图时有效）</label>',
      '  <input type="number" id="t2i-img-fidelity" min="0" max="1" step="0.1" value="0.5" placeholder="0.5">',
      '</div>',
      '<div class="form-row">',
      '  <label>面部参考强度 human_fidelity（0~1，仅 subject 时有效）</label>',
      '  <input type="number" id="t2i-human-fidelity" min="0" max="1" step="0.01" value="0.45" placeholder="0.45">',
      '</div>',
      '<div class="form-row">',
      '  <label>清晰度 resolution</label>',
      '  <select id="t2i-resolution">' + resOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>画面比例 aspect_ratio</label>',
      '  <select id="t2i-aspect">' + ratioOpts + '</select>',
      '</div>',
      '<div class="form-row">',
      '  <label>生成数量 n（1~9）</label>',
      '  <input type="number" id="t2i-n" min="1" max="9" value="1">',
      '</div>',
      '<div class="form-row">',
      '  <button type="button" class="btn-primary" id="t2i-submit">生成图片</button>',
      '</div>',
      '<div class="result-area" id="t2i-result">生成结果将显示在此处</div>'
    ].join('\n');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
  }

  function setResult(html, isContent) {
    var el = document.getElementById('t2i-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function getVal(id, def) {
    var el = document.getElementById(id);
    if (!el) return def;
    var v = el.value != null ? String(el.value).trim() : '';
    return v === '' ? def : v;
  }

  function collectImageUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(function (x) {
        if (typeof x === 'string' && /^https?:\/\//i.test(x)) out.push(x);
        else if (x && typeof x === 'object' && x.url) out.push(x.url);
      });
      return;
    }
    if (typeof obj === 'string' && /^https?:\/\//i.test(obj)) {
      out.push(obj);
      return;
    }
    var urlKeys = ['image', 'url', 'images', 'image_url', 'output_image', 'result_url', 'output_url', 'img_url'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectImageUrls(obj[k], out);
    });
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function pollTask(taskId, apiKey, workId, setProgress, resolve, reject) {
    var url = apiOrigin() + '/api/yunwu/images/generations/' + encodeURIComponent(taskId);
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
        var images = [];
        var videos = [];
        var audios = [];
        if (result.images && Array.isArray(result.images)) {
          result.images.forEach(function (x) {
            if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
          });
        }
        if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
        if (!images.length && result.url) {
          var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
          if (url) {
            if (/\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
            else images.push(url);
          }
        }
        if (result.video || result.videoUrl || result.video_url) {
          var v = result.video || result.videoUrl || result.video_url;
          if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
        }
        if (result.audio || result.audioUrl || result.audio_url) {
          var a = result.audio || result.audioUrl || result.audio_url;
          if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
        }
        if (!images.length && !videos.length && !audios.length) {
          collectImageUrls(data, images);
          var allUrls = [];
          collectImageUrls(data, allUrls);
          allUrls.forEach(function (u) {
            if (/\.(mp4|webm|mov|avi)$/i.test(u)) videos.push(u);
            else if (/\.(mp3|wav|m4a|aac)$/i.test(u)) audios.push(u);
            else if (!images.includes(u)) images.push(u);
          });
        }
        images = [...new Set(images.filter(Boolean))];
        videos = [...new Set(videos.filter(Boolean))];
        audios = [...new Set(audios.filter(Boolean))];

        if (status === 'done' && (images.length > 0 || videos.length > 0 || audios.length > 0)) {
          resolve({ images: images, videos: videos, audios: audios, raw: data });
          return;
        }
        if (status === 'done' && !images.length && !videos.length && !audios.length) {
          resolve({ images: [], videos: [], audios: [], raw: data });
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

  function init(container) {
    if (!container) return;
    var btn = document.getElementById('t2i-submit');
    if (!btn) return;
    var uploadBtn = document.getElementById('t2i-upload-btn');
    var fileInput = document.getElementById('t2i-image-file');
    var imageInput = document.getElementById('t2i-image');
    var previewDiv = document.getElementById('t2i-image-preview');
    var previewImg = document.getElementById('t2i-preview-img');
    var removeBtn = document.getElementById('t2i-remove-preview');
    var currentImageUrl = '';
    var currentImageBase64 = '';
    var currentImageFile = null;

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
              currentImageBase64 = ''; // 有URL了就不需要Base64
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
          currentImageFile = null;
          currentImageBase64 = '';
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
            currentImageBase64 = ''; // 有URL了就不需要Base64
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
      imageInput.addEventListener('input', function () {
        var url = imageInput.value.trim();
        if (!url && previewDiv) previewDiv.style.display = 'none';
      });
    }
    btn.addEventListener('click', function () {
      var prompt = getVal('t2i-prompt', '');
      var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
      if (!prompt) {
        setResult('<span class="msg-warning">请填写正向提示词</span>', true);
        return;
      }
      if (!apiKey) {
        setResult('<span class="msg-warning">请先在「设置」中配置并保存云雾 API Key</span>', true);
        return;
      }
      var model = getVal('t2i-model', 'kling-v1');
      var imageInputValue = getVal('t2i-image', '') || '';
      var imageRef = getVal('t2i-image-ref', '');
      var finalImage = '';
      
      if (imageInputValue || currentImageUrl || currentImageBase64) {
        var isBase64Input = /^data:image\//i.test(imageInputValue) || (!/^https?:\/\//i.test(imageInputValue) && imageInputValue.length > 100);
        var hasValidUrl = currentImageUrl || (imageInputValue && /^https?:\/\//i.test(imageInputValue) && !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(imageInputValue));
        var hasLocalhostUrl = (currentImageUrl || imageInputValue) && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(currentImageUrl || imageInputValue);
        
        if (hasValidUrl) {
          finalImage = currentImageUrl || imageInputValue;
        } else if (hasLocalhostUrl && currentImageBase64) {
          finalImage = currentImageBase64;
          setResult('<span class="msg-warning">⚠️ 检测到本地地址，已自动切换为Base64编码</span>', true);
        } else if (isBase64Input || currentImageBase64) {
          finalImage = currentImageBase64 || imageInputValue;
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
      
      if (finalImage && model === 'kling-v1-5' && !imageRef) {
        setResult('<span class="msg-warning">使用 kling-v1-5 且填写参考图时，请选择「图片参考类型」</span>', true);
        return;
      }
      
      var body = {
        apiKey: apiKey,
        model_name: model,
        prompt: prompt,
        n: Math.min(9, Math.max(1, parseInt(getVal('t2i-n', '1'), 10) || 1)),
      };
      if (getVal('t2i-negative', '')) body.negative_prompt = getVal('t2i-negative', '');
      if (finalImage) {
        body.image = finalImage;
        if (imageRef) body.image_reference = imageRef;
        var fid = parseFloat(getVal('t2i-img-fidelity', '0.5'), 10);
        if (!isNaN(fid)) body.image_fidelity = fid;
        if (imageRef === 'subject') {
          var hf = parseFloat(getVal('t2i-human-fidelity', '0.45'), 10);
          if (!isNaN(hf)) body.human_fidelity = hf;
        }
      }
      body.resolution = getVal('t2i-resolution', '1k');
      body.aspect_ratio = getVal('t2i-aspect', '1:1');

      setResult('正在提交任务…', true);
      btn.disabled = true;
      var workId = null;
      fetch(apiOrigin() + '/api/yunwu/images/generations', {
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
              type: 'text2img',
              status: 'processing',
              taskId: taskId,
              prompt: prompt,
              title: (prompt || '').toString().slice(0, 80),
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
          var urls = (result && result.images) || [];
          var videos = (result && result.videos) || [];
          var audios = (result && result.audios) || [];
          var raw = result && result.raw;
          if (!urls.length && !videos.length && !audios.length && raw) {
            var extra = [];
            collectImageUrls(raw, extra);
            urls = [...new Set(extra.filter(Boolean))];
          }
          var hasResources = urls.length > 0 || videos.length > 0 || audios.length > 0;
          if (workId && window.MediaStudio && window.MediaStudio.updateWork) {
            var updates = {
              status: hasResources ? 'ready' : 'failed',
              images: urls,
              videos: videos,
              audios: audios,
              progress: null,
              progressStatus: null
            };
            if (videos.length) updates.resultUrl = videos[0];
            else if (audios.length) updates.resultUrl = audios[0];
            else if (urls.length) updates.resultUrl = urls[0];
            window.MediaStudio.updateWork(workId, updates);
          }
          if (!hasResources) {
            var msg = '<span class="msg-warning">任务完成但未解析到资源链接（图片/视频/音频）。</span>';
            if (raw) {
              msg += '<br><details style="margin-top:12px"><summary style="cursor:pointer">点击展开「查询任务」原始响应（便于排查字段）</summary><pre style="max-height:240px;overflow:auto;font-size:11px;white-space:pre-wrap;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;margin-top:8px">' + JSON.stringify(raw, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></details>';
            }
            setResult(msg, true);
            btn.disabled = false;
            return;
          }
          var html = '<span class="msg-success">✓ 生成完成</span><br>';
          urls.forEach(function (u, i) {
            html += '<div class="t2i-out"><img src="' + (u || '').replace(/"/g, '&quot;') + '" alt="结果' + (i + 1) + '" style="max-width:100%;border-radius:8px;"><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开大图</a></div>';
          });
          videos.forEach(function (u, i) {
            html += '<div class="t2i-out"><video src="' + (u || '').replace(/"/g, '&quot;') + '" controls style="max-width:100%;border-radius:8px;"></video><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开视频</a></div>';
          });
          audios.forEach(function (u, i) {
            html += '<div class="t2i-out"><audio src="' + (u || '').replace(/"/g, '&quot;') + '" controls style="max-width:100%;"></audio><a href="' + (u || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">打开音频</a></div>';
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

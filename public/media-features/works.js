/**
 * AI创作工坊 - 作品管理（独立文件）
 * 存放并展示所有功能的生成作品
 */
(function () {
  var id = 'works';
  var name = '作品管理';
  var icon = '📁';
  var _refreshTimer = null;
  var TYPE_NAMES = { text2img: '文生图', img2video: '图生视频', lipsync: '对口型', dubbing: '配音', editimg: '改图' };

  function getPanel() {
    return [
      '<h2 class="panel-title">作品管理 · 所有生成结果</h2>',
      '<div class="form-row">',
      '  <label>筛选</label>',
      '  <select id="works-filter" class="ms-select">',
      '    <option value="">全部类型</option>',
      '    <option value="text2img">文生图</option>',
      '    <option value="img2video">图生视频</option>',
      '    <option value="lipsync">对口型</option>',
      '    <option value="dubbing">配音</option>',
      '    <option value="editimg">改图</option>',
      '  </select>',
      '  <button type="button" class="btn-secondary" id="works-get-by-taskid" style="margin-left:12px;">根据任务ID获取资源</button>',
      '</div>',
      '<div class="works-list" id="worksList">加载中…</div>',
      '<div class="works-empty" id="worksEmpty" style="display:none;">暂无作品，请先在文生图、图生视频等功能中生成</div>'
    ].join('\n');
  }

  function isProcessing(w) {
    return w.status === 'processing' || (w.taskId && (!w.images || !w.images.length) && (!w.videos || !w.videos.length) && (!w.audios || !w.audios.length) && w.status !== 'failed');
  }

  function apiOrigin() {
    var o = (typeof window !== 'undefined' && window.location && window.location.origin) || '';
    return o.replace(/\/+$/, '') || (window.location.protocol + '//' + (window.location.hostname || 'localhost') + (window.location.port ? ':' + window.location.port : ''));
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

  function collectVideoUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
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

  function collectAudioUrls(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    var urlKeys = ['audio', 'url', 'audios', 'audio_url', 'output_audio', 'result_url', 'output_url', 'audioUrl'];
    urlKeys.forEach(function (k) {
      var v = obj[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) out.push(v);
      else if (Array.isArray(v)) v.forEach(function (u) {
        if (typeof u === 'string' && /^https?:\/\//i.test(u)) out.push(u);
        else if (u && u.url) out.push(u.url);
      });
    });
    Object.keys(obj).forEach(function (k) {
      collectAudioUrls(obj[k], out);
    });
  }

  function normalizeTaskStatus(s) {
    var t = (s || '').toString().toLowerCase();
    if (['succeed', 'succeeded', 'success', 'completed', 'done', 'finish', 'finished'].indexOf(t) >= 0) return 'done';
    if (['fail', 'failed', 'error'].indexOf(t) >= 0) return 'failed';
    return 'processing';
  }

  function getApiPathByType(type) {
    if (type === 'text2img') return '/api/yunwu/images/generations/';
    if (type === 'img2video') return '/api/yunwu/videos/image2video/';
    if (type === 'lipsync') return '/api/yunwu/videos/advanced-lip-sync/';
    if (type === 'dubbing') return '/api/yunwu/audio/video-to-audio/';
    return '/api/yunwu/images/generations/';
  }

  function refreshWorkStatus(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var w = works.find(function (x) { return x.id === workId; });
    if (!w || !w.taskId) {
      alert('无法刷新：缺少任务ID');
      return;
    }
    var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
    if (!apiKey) {
      alert('请先在「设置」中配置并保存云雾 API Key');
      return;
    }
    var apiPath = getApiPathByType(w.type);
    var url = apiOrigin() + apiPath + encodeURIComponent(w.taskId);
    fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success === false && data.message) {
          alert('刷新失败：' + data.message);
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
        if (w.type === 'text2img') {
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach(function (x) {
              if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
            });
          }
          if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
          if (!images.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && !/\.(mp4|webm|mov|avi|mp3|wav|m4a|aac)$/i.test(url)) images.push(url);
          }
          if (!images.length) collectImageUrls(data, images);
        } else if (w.type === 'img2video' || w.type === 'lipsync') {
          if (result.video || result.videoUrl || result.video_url) {
            var v = result.video || result.videoUrl || result.video_url;
            if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
          }
          if (!videos.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
          }
          if (!videos.length) collectVideoUrls(data, videos);
          var videoId = (result && result.video_id) ||
            (data && data.data && data.data.video_id) ||
            (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
            (data && data.video_id) ||
            '';
          if (videoId) {
            updates.videoId = videoId;
          }
        } else if (w.type === 'dubbing') {
          if (result.audio || result.audioUrl || result.audio_url) {
            var a = result.audio || result.audioUrl || result.audio_url;
            if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
          }
          if (!audios.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
          }
          if (!audios.length) collectAudioUrls(data, audios);
        } else {
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach(function (x) {
              if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
            });
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
        }
        images = [...new Set(images.filter(Boolean))];
        videos = [...new Set(videos.filter(Boolean))];
        audios = [...new Set(audios.filter(Boolean))];
        var hasResources = images.length > 0 || videos.length > 0 || audios.length > 0;
        var updates = {
          status: status === 'done' ? (hasResources ? 'ready' : 'failed') : (status === 'failed' ? 'failed' : 'processing'),
          images: images,
          videos: videos,
          audios: audios,
          progressStatus: statusRaw || '处理中'
        };
        if (videos.length) updates.resultUrl = videos[0];
        else if (audios.length) updates.resultUrl = audios[0];
        else if (images.length) updates.resultUrl = images[0];
        if (status === 'processing') {
          var pw = works.find(function (x) { return x.id === workId; });
          updates.progress = ((pw && pw.progress) || 0) + 1;
        } else {
          updates.progress = null;
        }
        if (window.MediaStudio && window.MediaStudio.updateWork) {
          window.MediaStudio.updateWork(workId, updates);
        }
        renderList(document.getElementById('works-filter').value);
        if (status === 'done' && hasResources) {
          alert('✅ 任务已完成！已获取到资源。');
        } else if (status === 'done' && !hasResources) {
          alert('⚠️ 任务完成但未获取到资源。');
        } else if (status === 'failed') {
          alert('❌ 任务失败：' + (result.message || result.error || '未知错误'));
        } else {
          alert('任务状态已更新：' + (statusRaw || '处理中'));
        }
      })
      .catch(function (err) {
        alert('刷新失败：' + (err.message || String(err)));
      });
  }

  function requeryWorkStatus(workId) {
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var w = works.find(function (x) { return x.id === workId; });
    if (!w || !w.taskId) {
      alert('无法重新查询：缺少任务ID');
      return;
    }
    var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
    if (!apiKey) {
      alert('请先在「设置」中配置并保存云雾 API Key');
      return;
    }
    if (window.MediaStudio && window.MediaStudio.updateWork) {
      window.MediaStudio.updateWork(workId, { status: 'processing', progress: 0, progressStatus: '重新查询中' });
    }
    renderList(document.getElementById('works-filter').value);
    alert('已开始重新查询任务状态：' + w.taskId + '\n\n每2.5秒查询一次，最长10分钟。');
    startWorkPolling(workId, w.taskId, apiKey, w.type);
  }

  var workPollingIntervals = {};

  function startWorkPolling(workId, taskId, apiKey, workType) {
    if (workPollingIntervals[workId]) {
      clearTimeout(workPollingIntervals[workId]);
      delete workPollingIntervals[workId];
    }
    var pollCount = 0;
    var maxPolls = 240;
    function poll() {
      pollCount++;
      if (pollCount > maxPolls) {
        delete workPollingIntervals[workId];
        if (window.MediaStudio && window.MediaStudio.updateWork) {
          window.MediaStudio.updateWork(workId, { status: 'failed', error: '任务超时（10分钟）', progress: null, progressStatus: null });
        }
        renderList(document.getElementById('works-filter').value);
        alert('查询超时（10分钟仍未完成），已判定失败');
        return;
      }
      var apiPath = getApiPathByType(workType);
      var url = apiOrigin() + apiPath + encodeURIComponent(taskId);
      fetch(url, {
        method: 'GET',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success === false && data.message) {
            delete workPollingIntervals[workId];
            if (window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { status: 'failed', error: data.message, progress: null, progressStatus: null });
            }
            renderList(document.getElementById('works-filter').value);
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
          if (workType === 'text2img') {
            if (result.images && Array.isArray(result.images)) {
              result.images.forEach(function (x) {
                if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
              });
            }
            if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
            if (!images.length && result.url) {
              var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
              if (url && !/\.(mp4|webm|mov|avi|mp3|wav|m4a|aac)$/i.test(url)) images.push(url);
            }
            if (!images.length) collectImageUrls(data, images);
          } else if (workType === 'img2video' || workType === 'lipsync') {
            if (result.video || result.videoUrl || result.video_url) {
              var v = result.video || result.videoUrl || result.video_url;
              if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
            }
            if (!videos.length && result.url) {
              var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
              if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
            }
            if (!videos.length) collectVideoUrls(data, videos);
            var videoId = (result && result.video_id) ||
              (data && data.data && data.data.video_id) ||
              (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
              (data && data.video_id) ||
              '';
            if (videoId && window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { videoId: videoId });
            }
          } else if (workType === 'dubbing') {
            if (result.audio || result.audioUrl || result.audio_url) {
              var a = result.audio || result.audioUrl || result.audio_url;
              if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
            }
            if (!audios.length && result.url) {
              var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
              if (url && /\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
            }
            if (!audios.length) collectAudioUrls(data, audios);
          } else {
            if (result.images && Array.isArray(result.images)) {
              result.images.forEach(function (x) {
                if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
              });
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
          }
          images = [...new Set(images.filter(Boolean))];
          videos = [...new Set(videos.filter(Boolean))];
          audios = [...new Set(audios.filter(Boolean))];
          var hasResources = images.length > 0 || videos.length > 0 || audios.length > 0;
          if (status === 'done' && hasResources) {
            delete workPollingIntervals[workId];
            var updates = {
              status: 'ready',
              images: images,
              videos: videos,
              audios: audios,
              progress: null,
              progressStatus: null
            };
            if (videos.length) updates.resultUrl = videos[0];
            else if (audios.length) updates.resultUrl = audios[0];
            else if (images.length) updates.resultUrl = images[0];
            if ((workType === 'img2video' || workType === 'lipsync')) {
              var videoId = (result && result.video_id) ||
                (data && data.data && data.data.video_id) ||
                (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
                (data && data.video_id) ||
                '';
              if (videoId) updates.videoId = videoId;
            }
            if (window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, updates);
            }
            renderList(document.getElementById('works-filter').value);
            return;
          }
          if (status === 'done' && !hasResources) {
            delete workPollingIntervals[workId];
            if (window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { status: 'failed', error: '任务完成但未获取到资源', progress: null, progressStatus: null });
            }
            renderList(document.getElementById('works-filter').value);
            return;
          }
          if (status === 'failed') {
            delete workPollingIntervals[workId];
            if (window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { status: 'failed', error: (result.message || result.error || '任务失败') + '', progress: null, progressStatus: null });
            }
            renderList(document.getElementById('works-filter').value);
            return;
          }
          if (status === 'processing') {
            var pw = (window.MediaStudio && window.MediaStudio.getWorks() || []).find(function (x) { return x.id === workId; });
            var n = ((pw && pw.progress) || 0) + 1;
            if (window.MediaStudio && window.MediaStudio.updateWork) {
              window.MediaStudio.updateWork(workId, { progress: n, progressStatus: statusRaw || '处理中' });
            }
            workPollingIntervals[workId] = setTimeout(poll, 2500);
          } else {
            workPollingIntervals[workId] = setTimeout(poll, 2500);
          }
        })
        .catch(function (err) {
          console.error('轮询任务状态错误:', err);
          workPollingIntervals[workId] = setTimeout(poll, 2500);
        });
    }
    workPollingIntervals[workId] = setTimeout(poll, 2500);
  }

  function getResourceByTaskId() {
    var taskId = prompt('请输入任务ID：');
    if (!taskId || !taskId.trim()) return;
    taskId = taskId.trim();
    var workType = prompt('请选择作品类型：\n1. 文生图 (text2img)\n2. 图生视频 (img2video)\n3. 对口型 (lipsync)\n4. 配音 (dubbing)\n\n请输入类型（默认：text2img）：', 'text2img');
    if (!workType) workType = 'text2img';
    workType = workType.trim().toLowerCase();
    if (!['text2img', 'img2video', 'lipsync', 'dubbing'].includes(workType)) {
      alert('无效的类型，使用默认：text2img');
      workType = 'text2img';
    }
    var apiKey = (window.MediaStudio && window.MediaStudio.getYunwuApiKey()) || '';
    if (!apiKey) {
      alert('请先在「设置」中配置并保存云雾 API Key');
      return;
    }
    var apiPath = getApiPathByType(workType);
    var url = apiOrigin() + apiPath + encodeURIComponent(taskId);
    fetch(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.success === false && data.message) {
          alert('获取失败：' + data.message);
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
        if (workType === 'text2img') {
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach(function (x) {
              if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
            });
          }
          if (!images.length && result.image) images.push(typeof result.image === 'string' ? result.image : (result.image && result.image.url));
          if (!images.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && !/\.(mp4|webm|mov|avi|mp3|wav|m4a|aac)$/i.test(url)) images.push(url);
          }
          if (!images.length) collectImageUrls(data, images);
        } else if (workType === 'img2video' || workType === 'lipsync') {
          if (result.video || result.videoUrl || result.video_url) {
            var v = result.video || result.videoUrl || result.video_url;
            if (typeof v === 'string') videos.push(v); else if (v && v.url) videos.push(v.url);
          }
          if (!videos.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp4|webm|mov|avi)$/i.test(url)) videos.push(url);
          }
          if (!videos.length) collectVideoUrls(data, videos);
          var videoId = (result && result.video_id) ||
            (data && data.data && data.data.video_id) ||
            (data && data.data && data.data.task_result && data.data.task_result.video_id) ||
            (data && data.video_id) ||
            '';
        } else if (workType === 'dubbing') {
          if (result.audio || result.audioUrl || result.audio_url) {
            var a = result.audio || result.audioUrl || result.audio_url;
            if (typeof a === 'string') audios.push(a); else if (a && a.url) audios.push(a.url);
          }
          if (!audios.length && result.url) {
            var url = typeof result.url === 'string' ? result.url : (result.url && result.url.url);
            if (url && /\.(mp3|wav|m4a|aac)$/i.test(url)) audios.push(url);
          }
          if (!audios.length) collectAudioUrls(data, audios);
        } else {
          if (result.images && Array.isArray(result.images)) {
            result.images.forEach(function (x) {
              if (typeof x === 'string') images.push(x); else if (x && x.url) images.push(x.url);
            });
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
        }
        images = [...new Set(images.filter(Boolean))];
        videos = [...new Set(videos.filter(Boolean))];
        audios = [...new Set(audios.filter(Boolean))];
        var hasResources = images.length > 0 || videos.length > 0 || audios.length > 0;
        if (status === 'done' && hasResources) {
          if (window.MediaStudio && window.MediaStudio.addWork) {
            var workData = {
              type: workType,
              status: 'ready',
              taskId: taskId,
              title: '任务ID: ' + taskId,
              images: images,
              videos: videos,
              audios: audios,
              resultUrl: videos.length ? videos[0] : (audios.length ? audios[0] : (images.length ? images[0] : ''))
            };
            if (videoId) workData.videoId = videoId;
            var workId = window.MediaStudio.addWork(workData);
            renderList(document.getElementById('works-filter').value);
            alert('✅ 成功获取资源！已添加到作品管理。\n\n图片：' + images.length + ' 个\n视频：' + videos.length + ' 个\n音频：' + audios.length + ' 个' + (videoId ? '\n视频ID: ' + videoId : ''));
          }
        } else if (status === 'done' && !hasResources) {
          alert('⚠️ 任务完成但未获取到资源。');
        } else if (status === 'failed') {
          alert('❌ 任务失败：' + (result.message || result.error || '未知错误'));
        } else {
          alert('任务状态：' + (statusRaw || '处理中') + '\n\n是否开始轮询查询？');
          if (confirm('是否开始轮询查询？')) {
            if (window.MediaStudio && window.MediaStudio.addWork) {
              var workId = window.MediaStudio.addWork({
                type: workType,
                status: 'processing',
                taskId: taskId,
                title: '任务ID: ' + taskId,
                images: [],
                videos: [],
                audios: [],
                progress: 0,
                progressStatus: statusRaw || '处理中'
              });
              startWorkPolling(workId, taskId, apiKey, workType);
              renderList(document.getElementById('works-filter').value);
            }
          }
        }
      })
      .catch(function (err) {
        alert('获取失败：' + (err.message || String(err)));
      });
  }

  function renderList(filterType) {
    var listEl = document.getElementById('worksList');
    var emptyEl = document.getElementById('worksEmpty');
    if (!listEl) return;
    var works = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
    var filtered = !filterType ? works : works.filter(function (w) { return w.type === filterType; });
    if (filtered.length === 0) {
      listEl.style.display = 'none';
      if (emptyEl) { emptyEl.style.display = 'block'; emptyEl.textContent = works.length ? '该类型暂无作品' : '暂无作品，请先在文生图、图生视频等功能中生成'; }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.style.display = 'block';
    listEl.innerHTML = filtered.map(function (w) {
      var typeName = TYPE_NAMES[w.type] || w.type || '作品';
      var date = (w.createdAt || '').slice(0, 19).replace('T', ' ');
      var processing = isProcessing(w);
      var thumb = '';
      var links = '';
      var statusBadge = '';
      if (processing) {
        var n = (w.progress || 0);
        var st = (w.progressStatus || '处理中');
        statusBadge = '<span class="work-status-badge work-status-processing" title="' + (st || '').replace(/"/g, '&quot;') + '">处理中 · 第' + n + '次 ' + (st ? '· ' + st : '') + '</span>';
      } else if (w.status === 'failed') {
        statusBadge = '<span class="work-status-badge work-status-failed">失败</span>';
      }
      if (w.type === 'text2img' && w.images && w.images.length) {
        w.images.forEach(function (url, i) {
          thumb += '<img src="' + (url || '').replace(/"/g, '&quot;') + '" alt="" class="work-thumb" onerror="this.style.display=\'none\'">';
          links += '<a href="' + (url || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">图' + (i + 1) + '</a> ';
        });
      }
      if (w.videos && w.videos.length) {
        w.videos.forEach(function (url, i) {
          if (!thumb) thumb = '<video src="' + (url || '').replace(/"/g, '&quot;') + '" class="work-thumb" style="max-width:100%;max-height:100%;object-fit:contain;" controls></video>';
          links += '<a href="' + (url || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">视频' + (i + 1) + '</a> ';
        });
      }
      if (w.audios && w.audios.length) {
        w.audios.forEach(function (url, i) {
          if (!thumb) thumb = '<span class="work-thumb-placeholder">🎵</span>';
          links += '<a href="' + (url || '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">音频' + (i + 1) + '</a> ';
        });
      }
      if (w.resultUrl && !thumb) {
        if (/\.(jpg|jpeg|png|gif|webp)$/i.test(w.resultUrl)) {
          thumb = '<img src="' + String(w.resultUrl).replace(/"/g, '&quot;') + '" alt="" class="work-thumb" onerror="this.style.display=\'none\'">';
        } else if (/\.(mp4|webm|mov|avi)$/i.test(w.resultUrl)) {
          thumb = '<video src="' + String(w.resultUrl).replace(/"/g, '&quot;') + '" class="work-thumb" style="max-width:100%;max-height:100%;object-fit:contain;" controls></video>';
        } else if (/\.(mp3|wav|m4a|aac)$/i.test(w.resultUrl)) {
          thumb = '<span class="work-thumb-placeholder">🎵</span>';
        }
        links = '<a href="' + String(w.resultUrl).replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">查看</a>';
      }
      if (w.images && w.images.length && !thumb) {
        thumb = '<img src="' + String(w.images[0]).replace(/"/g, '&quot;') + '" alt="" class="work-thumb" onerror="this.style.display=\'none\'">';
        links = (w.images.map(function (u, i) { return '<a href="' + (u || '#') + '" target="_blank" rel="noopener">图' + (i + 1) + '</a>'; })).join(' ');
      }
      if (!thumb) thumb = '<span class="work-thumb-placeholder">' + (processing ? '处理中…' : typeName) + '</span>';
      var title = (w.title || w.prompt || typeName + ' ' + date || '').toString().slice(0, 80);
      var taskIdInfo = w.taskId ? '<span class="work-taskid" style="font-size:0.7rem;color:var(--muted);display:block;margin-top:2px;">任务ID: ' + String(w.taskId).slice(0, 20) + (String(w.taskId).length > 20 ? '...' : '') + '</span>' : '';
      var videoIdInfo = '';
      if ((w.type === 'img2video' || w.type === 'lipsync') && w.videoId) {
        videoIdInfo = '<span class="work-videoid" style="font-size:0.7rem;color:var(--muted);display:block;margin-top:2px;">视频ID: ' + String(w.videoId).slice(0, 20) + (String(w.videoId).length > 20 ? '...' : '') + '</span>';
      }
      var actionButtons = '';
      if (w.taskId) {
        actionButtons += '<button type="button" class="work-btn-action" onclick="window.refreshWorkStatus(\'' + (w.id || '') + '\')" title="刷新">🔄</button>';
        if (processing || w.status === 'processing') {
          actionButtons += '<button type="button" class="work-btn-action" onclick="window.stopWorkPolling(\'' + (w.id || '') + '\')" title="停止查询" style="color:var(--warning);">⏹️</button>';
        } else {
          actionButtons += '<button type="button" class="work-btn-action" onclick="window.requeryWorkStatus(\'' + (w.id || '') + '\')" title="重新查询">🔎</button>';
        }
      }
      return '<div class="work-card" data-id="' + (w.id || '') + '">' +
        '<div class="work-thumb-wrap">' + thumb + '</div>' +
        '<div class="work-info">' +
        '<span class="work-type">' + typeName + '</span>' +
        (statusBadge ? '<div class="work-status-line">' + statusBadge + '</div>' : '') +
        '<span class="work-title" title="' + title.replace(/"/g, '&quot;') + '">' + title + '</span>' +
        taskIdInfo +
        videoIdInfo +
        '<span class="work-date">' + date + '</span>' +
        '<div class="work-links">' + links + '</div>' +
        '</div>' +
        '<div class="work-actions">' + actionButtons + '<button type="button" class="work-btn-delete" title="删除">🗑️</button></div>' +
        '</div>';
    }).join('');
    listEl.querySelectorAll('.work-btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = (btn.closest('.work-card') || {}).getAttribute('data-id');
        if (!id) return;
        var list = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
        var next = list.filter(function (w) { return w.id !== id; });
        if (workPollingIntervals[id]) {
          clearTimeout(workPollingIntervals[id]);
          delete workPollingIntervals[id];
        }
        try { localStorage.setItem('media_studio_works', JSON.stringify(next)); } catch (e) {}
        renderList(document.getElementById('works-filter').value);
      });
    });
  }

  window.refreshWorkStatus = refreshWorkStatus;
  window.requeryWorkStatus = requeryWorkStatus;
  window.stopWorkPolling = function (workId) {
    if (workPollingIntervals[workId]) {
      clearTimeout(workPollingIntervals[workId]);
      delete workPollingIntervals[workId];
      alert('已停止查询');
    }
  };

  function init(container) {
    if (!container) return;
    var filterEl = document.getElementById('works-filter');
    if (filterEl) {
      filterEl.addEventListener('change', function () { renderList(filterEl.value); });
    }
    var getByTaskIdBtn = document.getElementById('works-get-by-taskid');
    if (getByTaskIdBtn) {
      getByTaskIdBtn.addEventListener('click', getResourceByTaskId);
    }
    renderList(filterEl ? filterEl.value : '');
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(function () {
      if (window.MediaStudio && window.MediaStudio.currentId !== id) return;
      var list = (window.MediaStudio && window.MediaStudio.getWorks()) || [];
      if (!list.some(isProcessing)) return;
      var f = document.getElementById('works-filter');
      if (f && document.getElementById('worksList')) renderList(f.value);
    }, 2500);
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();

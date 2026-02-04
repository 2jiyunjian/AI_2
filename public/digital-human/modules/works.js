/**
 * 数字人 - 作品管理：列表、筛选、收藏、播放、下载、刷新
 * 依赖：core.js (buildApiUrl), config.js (getHeyGenApiKey, getYunwuApiKey)
 */
(function () {
  'use strict';
  var buildApiUrl = typeof window !== 'undefined' && window.buildApiUrl ? window.buildApiUrl : function(p){ return '/api' + (p.charAt(0)==='/' ? p : '/'+p); };
  var getHeyGenApiKey = typeof window !== 'undefined' && window.getHeyGenApiKey ? window.getHeyGenApiKey : function(){ return ''; };
  var getYunwuApiKey = typeof window !== 'undefined' && window.getYunwuApiKey ? window.getYunwuApiKey : function(){ return ''; };

  var dhWorksViewMode = localStorage.getItem('dh_works_view_mode') || 'list';
  var dhWorksShowFavorites = false;
  var dhWorksFilter = '';

    // 初始化作品管理视图切换：列表（默认）、平铺、收藏
    function initWorksViewToggle() {
      const listBtn = document.getElementById('dhWorksViewList');
      const gridBtn = document.getElementById('dhWorksViewGrid');
      const favoriteBtn = document.getElementById('dhWorksShowFavorites');
      
      if (listBtn) {
        listBtn.addEventListener('click', function() {
          dhWorksShowFavorites = false;
          dhWorksViewMode = 'list';
          localStorage.setItem('dh_works_view_mode', 'list');
          updateWorksViewButtons();
          loadWorks();
        });
      }
      
      if (gridBtn) {
        gridBtn.addEventListener('click', function() {
          dhWorksShowFavorites = false;
          dhWorksViewMode = 'tile';
          localStorage.setItem('dh_works_view_mode', 'tile');
          updateWorksViewButtons();
          loadWorks();
        });
      }
      
      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', function() {
          if (dhWorksShowFavorites) {
            dhWorksShowFavorites = false;
            dhWorksViewMode = localStorage.getItem('dh_works_view_mode') || 'list';
          } else {
            dhWorksShowFavorites = true;
            dhWorksViewMode = localStorage.getItem('dh_works_view_mode') || 'list';
            localStorage.setItem('dh_works_view_mode', 'tile');
            // 收藏视图不分类：强制为「全部」，显示所有已收藏（数字人+作品）
            dhWorksFilter = '';
            document.querySelectorAll('.works-filter-btn').forEach(function(b) {
              b.classList.remove('active');
            });
            var allFilterBtn = document.getElementById('dhWorksFilterAll');
            if (allFilterBtn) allFilterBtn.classList.add('active');
          }
          updateWorksViewButtons();
          loadWorks();
        });
      }
      
      updateWorksViewButtons();
      
      // 初始化时设置默认视图为列表
      if (!localStorage.getItem('dh_works_view_mode')) {
        dhWorksViewMode = 'list';
        localStorage.setItem('dh_works_view_mode', 'list');
        updateWorksViewButtons();
      }
    }
    
    function updateWorksViewButtons() {
      const listBtn = document.getElementById('dhWorksViewList');
      const gridBtn = document.getElementById('dhWorksViewGrid');
      const favoriteBtn = document.getElementById('dhWorksShowFavorites');
      const filterRow = document.querySelector('.works-filter-row');
      if (favoriteBtn) favoriteBtn.classList.toggle('active', dhWorksShowFavorites);
      if (listBtn) listBtn.classList.toggle('active', !dhWorksShowFavorites && dhWorksViewMode === 'list');
      if (gridBtn) gridBtn.classList.toggle('active', !dhWorksShowFavorites && dhWorksViewMode === 'tile');
      if (filterRow) filterRow.style.display = dhWorksShowFavorites ? 'none' : 'flex';
    }
    
    // 初始化作品管理筛选
    function initWorksFilter() {
      const allBtn = document.getElementById('dhWorksFilterAll');
      const digitalBtn = document.getElementById('dhWorksFilterDigital');
      const worksBtn = document.getElementById('dhWorksFilterWorks');
      
      [allBtn, digitalBtn, worksBtn].forEach(function(btn) {
        if (btn) {
          btn.addEventListener('click', function() {
            dhWorksFilter = this.getAttribute('data-filter') || '';
            document.querySelectorAll('.works-filter-btn').forEach(function(b) {
              b.classList.remove('active');
            });
            this.classList.add('active');
            loadWorks();
          });
        }
      });
    }
    
    // 获取收藏列表
    function getFavoriteWorkIds() {
      try {
        var raw = localStorage.getItem('dh_works_favorites');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    
    // 切换收藏状态
    function toggleFavoriteWork(workId) {
      var ids = getFavoriteWorkIds();
      var i = ids.indexOf(workId);
      if (i >= 0) {
        ids.splice(i, 1);
      } else {
        ids.push(workId);
      }
      try {
        localStorage.setItem('dh_works_favorites', JSON.stringify(ids));
      } catch (e) {}
      loadWorks();
    }
    
    function loadWorks() {
      const container = document.getElementById('worksList');
      const emptyEl = document.getElementById('worksEmpty');
      
      if (!container) {
        console.warn('找不到worksList容器，跳过加载作品列表');
        return;
      }
      
      // 列表视图下先显示资源加载状态
      container.className = 'works-grid ' + (dhWorksViewMode === 'list' ? 'works-grid-list' : 'works-grid-tile');
      container.style.display = '';
      container.innerHTML = '<div class="works-loading" style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-secondary);"><span style="font-size:1.5rem;">⏳</span><div style="margin-top:8px;">正在加载资源...</div></div>';
      if (emptyEl) emptyEl.style.display = 'none';
      
      const renderContent = function() {
      let works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      
      // 先按类型筛选构建完整列表（不在此处做收藏筛选，避免数字人被错误加入）
      if (dhWorksFilter === 'digital') {
        // 数字人：从digital_humans中获取（含进度、查询状态）
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        works = digitalHumans.map(dh => ({
          id: dh.id,
          type: 'digital',
          title: dh.name || '未命名数字人',
          videoUrl: dh.videoUrl || dh.videoFile?.dataUrl,
          status: dh.status,
          createDate: dh.createDate || dh.create_date,
          platform: dh.platform,
          taskId: dh.taskId,
          progress: dh.progress,
          progressStatus: dh.progressStatus,
          error: dh.error
        }));
      } else if (dhWorksFilter === 'works') {
        // 仅显示作品（排除数字人）
        works = works.filter(w => w.type !== 'digital');
      } else {
        // dhWorksFilter === '' 显示全部：合并数字人和作品
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        const digitalWorks = digitalHumans.map(dh => ({
          id: dh.id,
          type: 'digital',
          title: dh.name || '未命名数字人',
          videoUrl: dh.videoUrl || dh.videoFile?.dataUrl,
          status: dh.status,
          createDate: dh.createDate || dh.create_date,
          platform: dh.platform,
          taskId: dh.taskId,
          progress: dh.progress,
          progressStatus: dh.progressStatus,
          error: dh.error
        }));
        works = [...digitalWorks, ...works.filter(w => w.type !== 'digital')];
      }
      
      // 筛选：收藏（在完整列表上过滤，只显示已收藏的项，数字人未收藏则不会出现）
      if (dhWorksShowFavorites) {
        const favoriteIds = getFavoriteWorkIds();
        works = works.filter(function (w) { return favoriteIds.indexOf(w.id) >= 0; });
      }
      
      if (works.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        var manageList = document.getElementById('digitalHumanManageList');
        if (manageList) { manageList.style.display = 'none'; manageList.innerHTML = ''; }
        if (emptyEl) {
          emptyEl.style.display = 'block';
          if (dhWorksShowFavorites) {
            emptyEl.innerHTML = '<div style="font-size: 2.5rem; margin-bottom: 16px;">☆</div><div style="font-size: 1rem;">暂无收藏</div><div style="font-size: 0.85rem; margin-top: 8px; opacity: 0.8;">在数字人或作品上点击星标可添加收藏</div>';
          } else {
            emptyEl.innerHTML = '<div style="font-size: 2.5rem; margin-bottom: 16px;">📁</div><div style="font-size: 1rem;">暂无数字人/作品</div>';
          }
        }
        return;
      }
      
      if (emptyEl) emptyEl.style.display = 'none';
      
      container.className = 'works-grid ' + (dhWorksViewMode === 'list' ? 'works-grid-list' : 'works-grid-tile');
      container.style.display = '';
      
      const favoriteIds = getFavoriteWorkIds();
      
      function formatLocalDate(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return (isoStr || '').slice(0, 19).replace('T', ' ');
        const pad = (n) => (n < 10 ? '0' : '') + n;
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
          pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      }
      
      if (dhWorksViewMode === 'list') {
        // 列表视图：卡片样式参考 AI 创作工坊（work-card-grid + work-card-header + work-resources-row）
        container.innerHTML = works.map(work => {
          let typeLabel = '';
          if (work.type === 'recite') typeLabel = '诵读文案';
          else if (work.type === 'product') typeLabel = '卖货推送';
          else if (work.type === 'tts') typeLabel = '语音合成';
          else if (work.type === 'digital') typeLabel = '数字人';
          else typeLabel = '其他';
          const title = work.type === 'product' ? (work.productName || work.title || '未命名') : (work.title || (work.script ? work.script.substring(0, 50) + (work.script.length > 50 ? '...' : '') : '未命名'));
          const videoUrl = work.videoUrl || work.video_file?.dataUrl || '';
          const audioUrl = work.audioUrl || work.audio_file?.dataUrl || '';
          const isProcessing = work.status === 'processing' || (!work.status && work.taskId);
          const isFailed = work.status === 'failed';
          const isCompleted = work.status === 'ready' || work.status === 'completed';
          const progress = work.progress || 0;
          const progressStatus = work.progressStatus || '查询中';
          let statusTagClass = 'work-card-status-processing';
          if (isCompleted) statusTagClass = 'work-card-status-success';
          else if (isFailed) statusTagClass = 'work-card-status-failed';
          const date = formatLocalDate(work.createDate);
          const taskIdShort = work.taskId ? (work.taskId.substring(0, 18) + (work.taskId.length > 18 ? '...' : '')) : '';
          const isFavorite = favoriteIds.indexOf(work.id) >= 0;
          const hasMedia = !!videoUrl || !!audioUrl;
          const safeId = (work.id || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const safeType = (work.type || '').replace(/"/g, '&quot;');
          const headerLeft = '<span class="work-function-name">' + typeLabel + '</span>' +
            '<span class="work-info-separator">|</span>' +
            '<span class="work-info-tag work-card-type-tag">' + (title || '').replace(/</g, '&lt;').substring(0, 36) + (title.length > 36 ? '...' : '') + '</span>' +
            '<span class="work-info-tag ' + statusTagClass + '">' + (isProcessing ? '处理中 ' + progress + '%' : isFailed ? '失败' : isCompleted ? '已完成' : '—') + '</span>' +
            (taskIdShort ? '<span class="work-info-tag" title="' + (work.taskId || '').replace(/"/g, '&quot;') + '">' + taskIdShort + '</span>' : '') +
            '<span class="work-info-tag work-card-date-tag">' + date + '</span>';
          const headerRight = (hasMedia ? '<button type="button" class="work-btn-header" onclick="event.stopPropagation();playWork(\'' + safeId + '\')" title="预览">👁</button>' : '') +
            (hasMedia ? '<button type="button" class="work-btn-header" onclick="event.stopPropagation();downloadWork(\'' + safeId + '\')" title="下载">⬇</button>' : '') +
            '<button type="button" class="work-btn-header work-tile-favorite ' + (isFavorite ? 'work-tile-fav-on' : '') + '" onclick="event.stopPropagation();toggleFavoriteWork(\'' + safeId + '\')" title="' + (isFavorite ? '取消收藏' : '收藏') + '">' + (isFavorite ? '⭐' : '☆') + '</button>' +
            '<button type="button" class="work-btn-header" onclick="event.stopPropagation();removeWork(\'' + safeId + '\', \'' + safeType + '\')" title="删除">🗑</button>';
          let resourceHtml = '';
          if (videoUrl) {
            resourceHtml = '<div class="work-resource-item"><div class="work-resource-video work-resource-with-actions" data-work-id="' + safeId + '" data-resource-url="' + videoUrl.replace(/"/g, '&quot;') + '" title="点击预览"><video src="' + videoUrl.replace(/"/g, '&quot;') + '" muted playsinline></video></div></div>';
          } else if (audioUrl) {
            resourceHtml = '<div class="work-resource-item"><div class="work-resource-audio-placeholder" data-work-id="' + safeId + '" title="点击预览">🎵 音频</div></div>';
          } else {
            resourceHtml = '<div class="work-resource-item"><div class="work-resource-placeholder">' + (isProcessing ? '⏳ 处理中...' : '暂无资源') + '</div></div>';
          }
          const progressLine = isProcessing && progressStatus ? '<div class="work-prompt-text">' + (progressStatus || '查询中').replace(/</g, '&lt;') + ' · ' + progress + '%</div>' : '';
          return (
            '<div class="work-card-grid dh-list-card" data-id="' + safeId + '">' +
            '<div class="work-card-body">' +
            '<div class="work-card-header">' +
            '<div class="work-card-header-left">' + headerLeft + '</div>' +
            '<div class="work-card-header-right">' + headerRight + '</div>' +
            '</div>' +
            progressLine +
            '<div class="work-resources-row">' + resourceHtml + '</div>' +
            '</div></div>'
          );
        }).join('');
      } else {
      // 平铺视图
      container.innerHTML = works.map(work => {
        // 作品类型标签
        let typeLabel = '';
        if (work.type === 'recite') {
          typeLabel = '📖 诵读文案';
        } else if (work.type === 'product') {
          typeLabel = '🛒 卖货推送';
        } else if (work.type === 'tts') {
          typeLabel = '🎤 语音合成';
        } else if (work.type === 'digital') {
          typeLabel = '👤 数字人';
        } else {
          typeLabel = '🎬 其他';
        }
        
        const title = work.type === 'product' ? (work.productName || work.title || '未命名') : 
                      (work.title || (work.script ? work.script.substring(0, 50) + (work.script.length > 50 ? '...' : '') : '未命名'));
        
        // 状态
        const isProcessing = work.status === 'processing' || (!work.status && work.taskId);
        const isFailed = work.status === 'failed';
        const isCompleted = work.status === 'ready' || work.status === 'completed';
        
        let statusHtml = '';
        if (isProcessing) {
          const progress = work.progress || 0;
          const progressStatus = work.progressStatus || '处理中';
          statusHtml = `<span class="work-status-grid status-processing" title="${progressStatus}">处理中 (${progress}%)</span>`;
        } else if (isFailed) {
          statusHtml = '<span class="work-status-grid status-failed">失败</span>';
        } else if (isCompleted) {
          statusHtml = '<span class="work-status-grid status-success">已完成</span>';
        }
        
        // 缩略图（支持视频和音频）
        const videoUrl = work.videoUrl || work.video_file?.dataUrl || '';
        const audioUrl = work.audioUrl || work.audio_file?.dataUrl || '';
        const mainUrl = videoUrl || audioUrl;
        let thumbHtml = '';
        
        if (videoUrl) {
          // 视频预览
          thumbHtml = `<div class="work-card-preview-inner" data-work-id="${work.id}" title="点击预览视频">
            <video src="${videoUrl.replace(/"/g, '&quot;')}" class="work-thumb-grid" preload="metadata" muted playsinline referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'work-thumb-placeholder-grid\\'>🎬</div>'"></video>
          </div>`;
        } else if (audioUrl) {
          // 音频预览（显示音频图标）
          thumbHtml = `<div class="work-card-preview-inner" data-work-id="${work.id}" title="点击播放音频">
            <div class="work-thumb-placeholder-grid">🎵</div>
          </div>`;
        } else {
          thumbHtml = `<div class="work-thumb-placeholder-grid">${isProcessing ? '⏳' : typeLabel.charAt(0)}</div>`;
        }
        
        // 任务ID、视频ID和音频ID
        let idsHtml = '';
        if (work.taskId) {
          idsHtml += `<div class="work-taskid-grid">任务ID: <span title="点击复制" data-id="${(work.taskId || '').replace(/"/g, '&quot;')}">${(work.taskId || '').replace(/</g, '&lt;').substring(0, 20)}${work.taskId.length > 20 ? '...' : ''}</span></div>`;
        }
        if (work.videoId) {
          idsHtml += `<div class="work-taskid-grid">视频ID: <span title="点击复制" data-id="${(work.videoId || '').replace(/"/g, '&quot;')}">${(work.videoId || '').replace(/</g, '&lt;').substring(0, 20)}${work.videoId.length > 20 ? '...' : ''}</span></div>`;
        }
        if (work.audioId) {
          idsHtml += `<div class="work-taskid-grid">音频ID: <span title="点击复制" data-id="${(work.audioId || '').replace(/"/g, '&quot;')}">${(work.audioId || '').replace(/</g, '&lt;').substring(0, 20)}${work.audioId.length > 20 ? '...' : ''}</span></div>`;
        }
        
        const date = formatLocalDate(work.createDate);
        const hasVideo = !!videoUrl;
        const hasAudio = !!audioUrl;
        const hasMedia = hasVideo || hasAudio;
        const isFavorite = favoriteIds.indexOf(work.id) >= 0;
        
        // 平铺视图：正方形卡片，悬停显示下载/收藏
        return `
            <div class="work-tile-card" data-id="${work.id}">
              <div class="work-tile-media">
                ${videoUrl ? `<video src="${videoUrl.replace(/"/g, '&quot;')}" muted playsinline onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'work-tile-media-placeholder\\'>🎬</div>'"></video>` : ''}
                ${!videoUrl && audioUrl ? `<div class="work-tile-media-placeholder">🎵</div>` : ''}
                ${!videoUrl && !audioUrl ? `<div class="work-tile-media-placeholder">${isProcessing ? '⏳' : typeLabel.charAt(0)}</div>` : ''}
              </div>
              <div class="work-tile-hover-actions">
                ${hasMedia ? `<button type="button" class="work-tile-action-btn" onclick="event.stopPropagation();downloadWork('${work.id}')" title="下载">⬇</button>` : ''}
                <button type="button" class="work-tile-action-btn work-tile-favorite ${isFavorite ? 'work-tile-fav-on' : ''}" onclick="event.stopPropagation();toggleFavoriteWork('${work.id}')" title="${isFavorite ? '取消收藏' : '收藏'}">${isFavorite ? '⭐' : '☆'}</button>
                <button type="button" class="work-tile-action-btn" onclick="event.stopPropagation();removeWork('${work.id}', '${work.type}')" title="删除">🗑</button>
              </div>
              <div class="work-tile-label">${typeLabel}</div>
            </div>
          `;
      }).join('');
      }
      
      // 绑定复制ID功能
      container.querySelectorAll('.work-taskid-grid span[data-id]').forEach(function (el) {
        el.addEventListener('click', function () {
          const idValue = el.getAttribute('data-id');
          if (!idValue) return;
          navigator.clipboard.writeText(idValue).then(function() {
            const original = el.textContent;
            el.textContent = '已复制!';
            el.style.color = 'var(--success)';
            setTimeout(function() {
              el.textContent = original;
              el.style.color = '';
            }, 1500);
          });
        });
      });
      
      // 绑定预览功能（支持视频和音频）
      container.querySelectorAll('.work-card-preview-inner').forEach(function (el) {
        el.addEventListener('click', function () {
          const workId = el.getAttribute('data-work-id');
          if (workId) {
            const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
            const work = works.find(w => w.id === workId);
            if (work) {
              const videoUrl = work.videoUrl || work.video_file?.dataUrl || '';
              const audioUrl = work.audioUrl || work.audio_file?.dataUrl || '';
              if (videoUrl || audioUrl) {
                playWork(workId);
              }
            }
          }
        });
      });
      
      // 绑定平铺视图卡片点击预览
      container.querySelectorAll('.work-tile-card').forEach(function (el) {
        el.addEventListener('click', function () {
          const workId = el.getAttribute('data-id');
          if (workId) {
            const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
            const work = works.find(w => w.id === workId);
            if (work) {
              const videoUrl = work.videoUrl || work.video_file?.dataUrl || '';
              const audioUrl = work.audioUrl || work.audio_file?.dataUrl || '';
              if (videoUrl || audioUrl) {
                playWork(workId);
              }
            }
          }
        });
      });
      
      // 列表视图：资源区点击预览（与 AI 创作工坊一致）
      container.querySelectorAll('.work-card-grid.dh-list-card .work-resource-video, .work-card-grid.dh-list-card .work-resource-audio-placeholder').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          const workId = el.getAttribute('data-work-id');
          if (workId) playWork(workId);
        });
      });
      }; // end renderContent
      setTimeout(renderContent, 0);
    }
    
    // 统一删除：数字人从 digital_humans 删并刷新，作品从 cn_dh_works 删并刷新
    function removeWork(id, type) {
      if (type === 'digital') {
        if (!confirm('确定要删除这个数字人吗？')) return;
        var list = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        list = list.filter(function (dh) { return dh.id !== id; });
        localStorage.setItem('digital_humans', JSON.stringify(list));
        if (typeof window.loadDigitalHumans === 'function') window.loadDigitalHumans();
        loadWorks();
      } else {
        deleteWork(id);
      }
    }
    
    // 暴露收藏功能到全局
    window.toggleFavoriteWork = toggleFavoriteWork;
    
    function playWork(id) {
      let videoUrl = '', audioUrl = '';
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const w = works.find(x => x.id === id);
      if (w) {
        videoUrl = w.videoUrl || w.video_file?.dataUrl || '';
        audioUrl = w.audioUrl || w.audio_file?.dataUrl || '';
      } else {
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        const dh = digitalHumans.find(x => x.id === id);
        if (dh) {
          videoUrl = dh.videoUrl || dh.videoFile?.dataUrl || '';
        }
      }
      const url = videoUrl || audioUrl;
      if (!url) {
        alert('该作品暂无可播放内容');
        return;
      }
      window.open(url, '_blank', 'noopener');
    }
    
    async function downloadWork(id) {
      let w = null;
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      w = works.find(x => x.id === id);
      if (!w) {
        const digitalHumans = JSON.parse(localStorage.getItem('digital_humans') || '[]');
        const dh = digitalHumans.find(x => x.id === id);
        if (dh) w = { title: dh.name, videoUrl: dh.videoUrl || dh.videoFile?.dataUrl, type: 'digital' };
      }
      if (!w) {
        alert('找不到该作品');
        return;
      }
      const videoUrl = w.videoUrl || w.video_file?.dataUrl || '';
      const audioUrl = w.audioUrl || w.audio_file?.dataUrl || '';
      const url = videoUrl || audioUrl;
      
      if (!url) {
        alert('该作品暂无可下载内容');
        return;
      }
      
      // 根据URL类型确定文件扩展名
      let ext = '.mp4';
      if (audioUrl || w.type === 'tts') {
        // 音频文件
        if (/\.(mp3|wav|m4a|aac)(\?|#|$)/i.test(url)) {
          ext = url.match(/\.(mp3|wav|m4a|aac)/i)[0];
        } else {
          ext = '.mp3'; // 默认音频格式
        }
      } else if (/\.(mp4|webm|mov|avi)(\?|#|$)/i.test(url)) {
        ext = url.match(/\.(mp4|webm|mov|avi)/i)[0];
      }
      
      const filename = (w.title || w.productName || '作品') + ext;
      try {
        // data/blob 直接下载
        if (/^(data:|blob:)/i.test(url)) {
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
        // 远程URL：优先 fetch->blob（更像“下载到本地”）
        const resp = await fetch(url, { mode: 'cors' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (e) {
        // CORS/跨域等失败：退化为打开链接，提示用户另存为
        window.open(url, '_blank', 'noopener');
        alert('已在新窗口打开视频链接。如未自动下载，请在新窗口右键视频选择“另存为”。\n\n原因：可能是跨域限制导致无法直接下载。');
      }
    }
    
    function refreshWorkInWorks(id) {
      const works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      const work = works.find(w => w.id === id);
      if (!work || !work.taskId) return;
      const platform = work.platform || 'heygen';
      const apiKey = platform === 'yunwu' ? (typeof getYunwuApiKey === 'function' ? getYunwuApiKey() : '') : getHeyGenApiKey();
      if (!apiKey) {
        alert('请先登录，由管理员在后台分配 API Key 后即可使用');
        return;
      }
      const done = (status, progress, videoUrl, error) => {
        const idx = works.findIndex(w => w.id === id);
        if (idx === -1) return;
        works[idx].status = status === 'completed' ? 'ready' : status;
        works[idx].progress = progress;
        if (videoUrl) works[idx].videoUrl = videoUrl;
        if (error) works[idx].error = error;
        works[idx].updateDate = new Date().toISOString();
        localStorage.setItem('cn_dh_works', JSON.stringify(works));
        loadWorks();
      };
      const url = buildApiUrl(`/api/digital-human/task/${platform}/${work.taskId}`);
      const authHeaders = (typeof window !== 'undefined' && window.getAuthHeaders) ? window.getAuthHeaders() : {};
      fetch(url, { headers: authHeaders }).then(r => r.json()).then(result => {
        if (result.success) done(result.status, result.progress || 0, result.videoUrl || result.data?.video_url, result.error);
      }).catch(() => {});
    }
    
    function deleteWork(id) {
      if (!confirm('确定要删除这个作品吗？')) return;
      
      let works = JSON.parse(localStorage.getItem('cn_dh_works') || '[]');
      works = works.filter(w => w.id !== id);
      localStorage.setItem('cn_dh_works', JSON.stringify(works));
      
      loadWorks();
    }
    
  if (typeof window !== 'undefined') {
    window.loadWorks = loadWorks;
    window.initWorksViewToggle = initWorksViewToggle;
    window.initWorksFilter = initWorksFilter;
    window.toggleFavoriteWork = toggleFavoriteWork;
    window.playWork = playWork;
    window.downloadWork = downloadWork;
    window.refreshWorkInWorks = refreshWorkInWorks;
    window.deleteWork = deleteWork;
    window.removeWork = removeWork;
  }
})();

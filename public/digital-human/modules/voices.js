/**
 * 数字人 - 共享音色：TTS 音色列表、试听、加载 HeyGen 缓存语音
 * 依赖：core.js（buildApiUrl）, state.js（reciteTtsVoiceList）
 */
(function () {
  'use strict';

  var buildApiUrl = typeof window !== 'undefined' && window.buildApiUrl ? window.buildApiUrl : function (path) { return '/api' + (path.charAt(0) === '/' ? path : '/' + path); };

  // TTS 音色列表（根据音色信息汇总）
  var TTS_VOICES_LIST = [
    { name: '阳光少年', id: 'genshin_vindi2', language: 'zh', demo: 'genshin_vindi2.mp3' },
    { name: '懂事小弟', id: 'zhinen_xuesheng', language: 'zh', demo: 'zhinen_xuesheng.mp3' },
    { name: '运动少年', id: 'tiyuxi_xuedi', language: 'zh', demo: 'tiyuxi_xuedi.mp3' },
    { name: '青春少女', id: 'ai_shatang', language: 'zh', demo: 'ai_shatang.mp3' },
    { name: '温柔小妹', id: 'genshin_klee2', language: 'zh', demo: 'genshin_klee2.mp3' },
    { name: '元气少女', id: 'genshin_kirara', language: 'zh', demo: 'genshin_kirara.mp3' },
    { name: '阳光男生', id: 'ai_kaiya', language: 'zh', demo: 'ai_kaiya.mp3' },
    { name: '幽默小哥', id: 'tiexin_nanyou', language: 'zh', demo: 'tiexin_nanyou.mp3' },
    { name: '文艺小哥', id: 'ai_chenjiahao_712', language: 'zh', demo: 'ai_chenjiahao_712.mp3' },
    { name: '甜美邻家', id: 'girlfriend_1_speech02', language: 'zh', demo: 'girlfriend_1_speech02.mp3' },
    { name: '温柔姐姐', id: 'chat1_female_new-3', language: 'zh', demo: 'chat1_female_new-3.mp3' },
    { name: '职场女青', id: 'girlfriend_2_speech02', language: 'zh', demo: 'girlfriend_2_speech02.mp3' },
    { name: '活泼男童', id: 'cartoon-boy-07', language: 'zh', demo: 'cartoon-boy-07.mp3' },
    { name: '俏皮女童', id: 'cartoon-girl-01', language: 'zh', demo: 'cartoon-girl-01.mp3' },
    { name: '稳重老爸', id: 'ai_huangyaoshi_712', language: 'zh', demo: 'ai_huangyaoshi_712.mp3' },
    { name: '温柔妈妈', id: 'you_pingjing', language: 'zh', demo: 'you_pingjing.mp3' },
    { name: '严肃上司', id: 'ai_laoguowang_712', language: 'zh', demo: 'ai_laoguowang_712.mp3' },
    { name: '优雅贵妇', id: 'chengshu_jiejie', language: 'zh', demo: 'chengshu_jiejie.mp3' },
    { name: '慈祥爷爷', id: 'zhuxi_speech02', language: 'zh', demo: 'zhuxi_speech02.mp3' },
    { name: '唠叨爷爷', id: 'uk_oldman3', language: 'zh', demo: 'uk_oldman3.mp3' },
    { name: '唠叨奶奶', id: 'laopopo_speech02', language: 'zh', demo: 'laopopo_speech02.mp3' },
    { name: '和蔼奶奶', id: 'heainainai_speech02', language: 'zh', demo: 'heainainai_speech02.mp3' },
    { name: '东北老铁', id: 'dongbeilaotie_speech02', language: 'zh', demo: 'dongbeilaotie_speech02.mp3' },
    { name: '重庆小伙', id: 'chongqingxiaohuo_speech02', language: 'zh', demo: 'chongqingxiaohuo_speech02.mp3' },
    { name: '四川妹子', id: 'chuanmeizi_speech02', language: 'zh', demo: 'chuanmeizi_speech02.mp3' },
    { name: '潮汕大叔', id: 'chaoshandashu_speech02', language: 'zh', demo: 'chaoshandashu_speech02.mp3' },
    { name: '台湾男生', id: 'ai_taiwan_man2_speech02', language: 'zh', demo: 'ai_taiwan_man2_speech02.mp3' },
    { name: '西安掌柜', id: 'xianzhanggui_speech02', language: 'zh', demo: 'xianzhanggui_speech02.mp3' },
    { name: '天津姐姐', id: 'tianjinjiejie_speech02', language: 'zh', demo: 'tianjinjiejie_speech02.mp3' },
    { name: '新闻播报男', id: 'diyinnansang_DB_CN_M_04-v2', language: 'zh', demo: 'diyinnansang_DB_CN_M_04-v2.wav' },
    { name: '译制片男', id: 'yizhipiannan-v1', language: 'zh', demo: 'yizhipiannan-v1.wav' },
    { name: '元气少女', id: 'guanxiaofang-v2', language: 'zh', demo: 'tianmeixuemei-v1.wav' },
    { name: '撒娇女友', id: 'tianmeixuemei-v1', language: 'zh', demo: 'guanxiaofang-v2.wav' },
    { name: '刀片烟嗓', id: 'daopianyansang-v1', language: 'zh', demo: 'daopianyansang-v1.wav' },
    { name: '乖巧正太', id: 'mengwa-v1', language: 'zh', demo: 'mengwa-v1.wav' },
    { name: 'Sunny', id: 'genshin_vindi2', language: 'en', demo: 'Sunny genshin_vindi2.mp3' },
    { name: 'Sage', id: 'zhinen_xuesheng', language: 'en', demo: 'Sage zhinen_xuesheng.mp3' },
    { name: 'Ace', id: 'AOT', language: 'en', demo: 'Ace AOT.mp3' },
    { name: 'Blossom', id: 'ai_shatang', language: 'en', demo: 'Blossom ai_shatang.mp3' },
    { name: 'Peppy', id: 'genshin_klee2', language: 'en', demo: 'Peppy genshin_klee2.mp3' },
    { name: 'Dove', id: 'genshin_kirara', language: 'en', demo: 'Dove genshin_kirara.mp3' },
    { name: 'Shine', id: 'ai_kaiya', language: 'en', demo: 'Shine ai_kaiya.mp3' },
    { name: 'Anchor', id: 'oversea_male1', language: 'en', demo: 'Anchor oversea_male1.mp3' },
    { name: 'Lyric', id: 'ai_chenjiahao_712', language: 'en', demo: 'Lyric ai_chenjiahao_712.mp3' },
    { name: 'Melody', id: 'girlfriend_4_speech02', language: 'en', demo: 'Melody girlfriend_4_speech02.mp3' },
    { name: 'Tender', id: 'chat1_female_new-3', language: 'en', demo: 'Tender chat1_female_new-3.mp3' },
    { name: 'Siren', id: 'chat_0407_5-1', language: 'en', demo: 'Siren chat_0407_5-1.mp3' },
    { name: 'Zippy', id: 'cartoon-boy-07', language: 'en', demo: 'Zippy cartoon-boy-07.mp3' },
    { name: 'Bud', id: 'uk_boy1', language: 'en', demo: 'Bud uk_boy1.mp3' },
    { name: 'Sprite', id: 'cartoon-girl-01', language: 'en', demo: 'Sprite cartoon-girl-01.mp3' },
    { name: 'Candy', id: 'PeppaPig_platform', language: 'en', demo: 'Candy  PeppaPig_platform.mp3' },
    { name: 'Beacon', id: 'ai_huangzhong_712', language: 'en', demo: 'Beacon ai_huangzhong_712.mp3' },
    { name: 'Rock', id: 'ai_huangyaoshi_712', language: 'en', demo: 'Rock ai_huangyaoshi_712.mp3' },
    { name: 'Titan', id: 'ai_laoguowang_712', language: 'en', demo: 'Titan ai_laoguowang_712.mp3' },
    { name: 'Grace', id: 'chengshu_jiejie', language: 'en', demo: 'Grace  chengshu_jiejie.mp3' },
    { name: 'Helen', id: 'you_pingjing', language: 'en', demo: 'Helen you_pingjing.mp3' },
    { name: 'Lore', id: 'calm_story1', language: 'en', demo: 'Lore calm_story1.mp3' },
    { name: 'Crag', id: 'uk_man2', language: 'en', demo: 'Crag uk_man2.mp3' },
    { name: 'Prattle', id: 'laopopo_speech02', language: 'en', demo: 'Prattle laopopo_speech02.mp3' },
    { name: 'Hearth', id: 'heainainai_speech02', language: 'en', demo: 'Hearth laopopo_speech02.mp3' },
    { name: 'The Reader', id: 'reader_en_m-v1', language: 'en', demo: 'reader_en_m-v1.wav' },
    { name: 'Commercial Lady', id: 'commercial_lady_en_f-v1', language: 'en', demo: 'commercial_lady_en_f-v1.wav' }
  ];

  var TTS_DEMO_MAP = {
    'genshin_vindi2': { zh: 'genshin_vindi2.mp3', en: 'Sunny genshin_vindi2.mp3' },
    'zhinen_xuesheng': { zh: 'zhinen_xuesheng.mp3', en: 'Sage zhinen_xuesheng.mp3' },
    'tiyuxi_xuedi': { zh: 'tiyuxi_xuedi.mp3', en: '' },
    'ai_shatang': { zh: 'ai_shatang.mp3', en: 'Blossom ai_shatang.mp3' },
    'genshin_klee2': { zh: 'genshin_klee2.mp3', en: 'Peppy genshin_klee2.mp3' },
    'genshin_kirara': { zh: 'genshin_kirara.mp3', en: 'Dove genshin_kirara.mp3' },
    'ai_kaiya': { zh: 'ai_kaiya.mp3', en: 'Shine ai_kaiya.mp3' },
    'tiexin_nanyou': { zh: 'tiexin_nanyou.mp3', en: '' },
    'ai_chenjiahao_712': { zh: 'ai_chenjiahao_712.mp3', en: 'Lyric ai_chenjiahao_712.mp3' },
    'girlfriend_1_speech02': { zh: 'girlfriend_1_speech02.mp3', en: '' },
    'chat1_female_new-3': { zh: 'chat1_female_new-3.mp3', en: 'Tender chat1_female_new-3.mp3' },
    'girlfriend_2_speech02': { zh: 'girlfriend_2_speech02.mp3', en: '' },
    'cartoon-boy-07': { zh: 'cartoon-boy-07.mp3', en: 'Zippy cartoon-boy-07.mp3' },
    'cartoon-girl-01': { zh: 'cartoon-girl-01.mp3', en: 'Sprite cartoon-girl-01.mp3' },
    'ai_huangyaoshi_712': { zh: 'ai_huangyaoshi_712.mp3', en: 'Rock ai_huangyaoshi_712.mp3' },
    'you_pingjing': { zh: 'you_pingjing.mp3', en: 'Helen you_pingjing.mp3' },
    'ai_laoguowang_712': { zh: 'ai_laoguowang_712.mp3', en: 'Titan ai_laoguowang_712.mp3' },
    'chengshu_jiejie': { zh: 'chengshu_jiejie.mp3', en: 'Grace  chengshu_jiejie.mp3' },
    'zhuxi_speech02': { zh: 'zhuxi_speech02.mp3', en: '' },
    'uk_oldman3': { zh: 'uk_oldman3.mp3', en: '' },
    'laopopo_speech02': { zh: 'laopopo_speech02.mp3', en: 'Prattle laopopo_speech02.mp3' },
    'heainainai_speech02': { zh: 'heainainai_speech02.mp3', en: 'Hearth laopopo_speech02.mp3' },
    'dongbeilaotie_speech02': { zh: 'dongbeilaotie_speech02.mp3', en: '' },
    'chongqingxiaohuo_speech02': { zh: 'chongqingxiaohuo_speech02.mp3', en: '' },
    'chuanmeizi_speech02': { zh: 'chuanmeizi_speech02.mp3', en: '' },
    'chaoshandashu_speech02': { zh: 'chaoshandashu_speech02.mp3', en: '' },
    'ai_taiwan_man2_speech02': { zh: 'ai_taiwan_man2_speech02.mp3', en: '' },
    'xianzhanggui_speech02': { zh: 'xianzhanggui_speech02.mp3', en: '' },
    'tianjinjiejie_speech02': { zh: 'tianjinjiejie_speech02.mp3', en: '' },
    'diyinnansang_DB_CN_M_04-v2': { zh: 'diyinnansang_DB_CN_M_04-v2.wav', en: '' },
    'yizhipiannan-v1': { zh: 'yizhipiannan-v1.wav', en: '' },
    'guanxiaofang-v2': { zh: 'tianmeixuemei-v1.wav', en: '' },
    'tianmeixuemei-v1': { zh: 'guanxiaofang-v2.wav', en: '' },
    'daopianyansang-v1': { zh: 'daopianyansang-v1.wav', en: '' },
    'mengwa-v1': { zh: 'mengwa-v1.wav', en: '' },
    'AOT': { zh: '', en: 'Ace AOT.mp3' },
    'oversea_male1': { zh: '', en: 'Anchor oversea_male1.mp3' },
    'girlfriend_4_speech02': { zh: '', en: 'Melody girlfriend_4_speech02.mp3' },
    'chat_0407_5-1': { zh: '', en: 'Siren chat_0407_5-1.mp3' },
    'uk_boy1': { zh: '', en: 'Bud uk_boy1.mp3' },
    'PeppaPig_platform': { zh: '', en: 'Candy  PeppaPig_platform.mp3' },
    'ai_huangzhong_712': { zh: '', en: 'Beacon ai_huangzhong_712.mp3' },
    'calm_story1': { zh: '', en: 'Lore calm_story1.mp3' },
    'uk_man2': { zh: '', en: 'Crag uk_man2.mp3' },
    'reader_en_m-v1': { zh: '', en: 'reader_en_m-v1.wav' },
    'commercial_lady_en_f-v1': { zh: '', en: 'commercial_lady_en_f-v1.wav' }
  };

  function getVoiceDemoFile(voiceId, language) {
    var lang = language || 'zh';
    var demoMap = TTS_DEMO_MAP[voiceId];
    if (!demoMap) return null;
    return demoMap[lang] || demoMap.zh || demoMap.en || null;
  }

  function loadYunwuTTSVoices() {
    var voiceSelect = document.getElementById('reciteYunwuVoiceSelect');
    var languageSelect = document.getElementById('reciteYunwuVoiceLanguage');
    if (!voiceSelect) return;
    if (typeof reciteTtsVoiceList === 'undefined') return;
    try {
      reciteTtsVoiceList = TTS_VOICES_LIST.map(function (v) {
        return { id: v.id, name: v.name, language: v.language, demoFile: v.demo || null };
      });
      voiceSelect.innerHTML = reciteTtsVoiceList.map(function (v) {
        return '<option value="' + v.id + '">' + v.name + ' # ' + v.id + ' # ' + v.language + '</option>';
      }).join('');
      if (voiceSelect.options.length > 0) {
        voiceSelect.value = voiceSelect.options[0].value;
        if (languageSelect && reciteTtsVoiceList.length > 0) {
          var firstVoice = reciteTtsVoiceList[0];
          if (firstVoice.language && languageSelect.querySelector('option[value="' + firstVoice.language + '"]')) {
            languageSelect.value = firstVoice.language;
          }
        }
      }
      if (voiceSelect && languageSelect) {
        var oldHandler = voiceSelect._voiceChangeHandler;
        if (oldHandler) voiceSelect.removeEventListener('change', oldHandler);
        var handler = function () {
          var val = voiceSelect.value;
          var selectedVoice = reciteTtsVoiceList.find(function (v) { return v.id === val; });
          if (selectedVoice && selectedVoice.language && languageSelect.querySelector('option[value="' + selectedVoice.language + '"]')) {
            languageSelect.value = selectedVoice.language;
          }
        };
        voiceSelect._voiceChangeHandler = handler;
        voiceSelect.addEventListener('change', handler);
      }
    } catch (error) {
      console.error('加载音色列表失败:', error);
      voiceSelect.innerHTML = '<option value="genshin_vindi2">阳光少年 # genshin_vindi2 # zh</option>';
      reciteTtsVoiceList = [{ id: 'genshin_vindi2', name: '阳光少年', language: 'zh', demoFile: 'genshin_vindi2.mp3' }];
    }
  }

  function previewReciteVoice() {
    var voiceSelect = document.getElementById('reciteYunwuVoiceSelect');
    var languageSelect = document.getElementById('reciteYunwuVoiceLanguage');
    var hint = document.getElementById('reciteVoicePreviewHint');
    if (!voiceSelect) return;
    var voiceId = (voiceSelect.value || '').trim();
    if (!voiceId) {
      if (hint) { hint.style.display = 'inline'; hint.textContent = '请先选择一个音色'; hint.style.color = 'var(--danger)'; }
      return;
    }
    var language = (languageSelect && languageSelect.value) ? languageSelect.value : 'zh';
    var voice = (typeof reciteTtsVoiceList !== 'undefined' && reciteTtsVoiceList.find) ? reciteTtsVoiceList.find(function (v) { return v.id === voiceId; }) : null;
    var demoFile = (voice && voice.demoFile) ? voice.demoFile : getVoiceDemoFile(voiceId, language);
    if (hint) { hint.style.display = 'none'; hint.textContent = ''; }
    if (!demoFile) {
      if (hint) { hint.style.display = 'inline'; hint.textContent = '该音色暂无试听文件'; hint.style.color = 'var(--warning)'; }
      return;
    }
    if (window._recitePreviewAudio) {
      try { window._recitePreviewAudio.pause(); window._recitePreviewAudio = null; } catch (e) {}
    }
    var url = buildApiUrl('/tts-demos/' + encodeURIComponent(demoFile));
    var audio = new Audio(url);
    window._recitePreviewAudio = audio;
    if (hint) { hint.style.display = 'inline'; hint.textContent = '正在试听…'; hint.style.color = 'var(--primary)'; }
    audio.play().catch(function () {
      if (hint) { hint.style.display = 'inline'; hint.textContent = '试听加载失败'; hint.style.color = 'var(--danger)'; }
    });
    audio.addEventListener('ended', function () { if (hint) { hint.textContent = ''; hint.style.display = 'none'; } });
    audio.addEventListener('error', function () { if (hint) { hint.style.display = 'inline'; hint.textContent = '试听加载失败'; hint.style.color = 'var(--danger)'; } });
  }

  function loadCachedVoicesForContext(context) {
    try {
      var cachedVoices = localStorage.getItem('heygen_voices');
      if (!cachedVoices) return;
      var voices = JSON.parse(cachedVoices);
      var voiceSelectId = context === 'recite' ? 'reciteVoiceSelect' : context === 'promote' ? 'promoteVoiceSelect' : null;
      if (!voiceSelectId) return;
      var voiceSelect = document.getElementById(voiceSelectId);
      if (!voiceSelect || !Array.isArray(voices) || voices.length === 0) return;
      voiceSelect.innerHTML = '<option value="">默认语音（自动选择）</option>';
      voices.forEach(function (voice) {
        var option = document.createElement('option');
        option.value = voice.voice_id;
        var displayName = voice.name || voice.voice_id;
        if (voice.language) displayName += ' (' + voice.language + ')';
        if (voice.gender) displayName += ' - ' + (voice.gender === 'female' ? '女声' : voice.gender === 'male' ? '男声' : voice.gender);
        option.textContent = displayName;
        voiceSelect.appendChild(option);
      });
    } catch (error) {
      console.warn('加载缓存的语音列表失败:', error);
    }
  }

  if (typeof window !== 'undefined') {
    window.TTS_VOICES_LIST = TTS_VOICES_LIST;
    window.TTS_DEMO_MAP = TTS_DEMO_MAP;
    window.getVoiceDemoFile = getVoiceDemoFile;
    window.loadYunwuTTSVoices = loadYunwuTTSVoices;
    window.previewReciteVoice = previewReciteVoice;
    window.loadCachedVoicesForContext = loadCachedVoicesForContext;
  }
})();

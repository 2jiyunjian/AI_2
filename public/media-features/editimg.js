/**
 * AI创作工坊 - 改图（独立文件）
 */
(function () {
  var id = 'editimg';
  var name = '改图';
  var icon = '✏️';

  function getPanel() {
    return [
      '<h2 class="panel-title">改图 · 在原图基础上修改</h2>',
      '<div class="form-row">',
      '  <label>原图</label>',
      '  <div class="upload-zone" id="edit-upload"><span>点击或拖拽上传要修改的图片</span><input type="file" id="edit-file" accept="image/*"></div>',
      '</div>',
      '<div class="form-row">',
      '  <label>修改描述（想改成的样子）</label>',
      '  <textarea id="edit-prompt" placeholder="例如：把背景换成雪山 / 给人物加上墨镜"></textarea>',
      '</div>',
      '<div class="form-row">',
      '  <label>遮罩或区域（若 API 支持）</label>',
      '  <input type="text" id="edit-mask" placeholder="可选，视具体 API 而定">',
      '</div>',
      '<button type="button" class="btn-primary" id="edit-submit">执行改图</button>',
      '<div class="result-area" id="edit-result">生成结果将显示在此处</div>'
    ].join('\n');
  }

  function setResult(html, isContent) {
    var el = document.getElementById('edit-result');
    if (el) { el.innerHTML = html; el.classList.toggle('has-content', !!isContent); }
  }

  function init() {
    var z = document.getElementById('edit-upload');
    var inp = document.getElementById('edit-file');
    if (z && inp) {
      z.addEventListener('click', function () { inp.click(); });
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('dragover'); });
      z.addEventListener('dragleave', function () { z.classList.remove('dragover'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault();
        z.classList.remove('dragover');
        if (e.dataTransfer.files.length) inp.files = e.dataTransfer.files;
      });
    }
    var btn = document.getElementById('edit-submit');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var file = (document.getElementById('edit-file') || {}).files && document.getElementById('edit-file').files[0];
      var prompt = (document.getElementById('edit-prompt') || {}).value.trim();
      if (!file) {
        setResult('<span class="msg-warning">请上传要修改的图片</span>', true);
        return;
      }
      if (!prompt) {
        setResult('<span class="msg-warning">请填写修改描述</span>', true);
        return;
      }
      setResult('正在改图中…（当前为占位，请对接改图/Inpaint API）', true);
      // TODO: 使用云雾 API 调用改图
    });
  }

  if (window.MediaStudio && window.MediaStudio.register) {
    window.MediaStudio.register(id, { name: name, icon: icon, getPanel: getPanel, init: init });
  }
})();

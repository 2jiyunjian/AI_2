# 数字人模块（独立可移植）

将本目录作为**数字人**独立模块部署到任意项目时，请按以下步骤操作。

## 1. 使用 copy.cmd 初始化（推荐）

本项目根目录提供了 `copy.cmd`，用于在需要兼容旧路径时一次性复制静态资源。

```powershell
# 在项目根目录
.\copy.cmd
```

当前仓库中，`digital-human` 目录已自包含所需资源：

- **cn.html**：依赖同目录下的 `./digital-human-cn.css`、`./digital-human-cn.js`，`data-back-url="../page.html?page=my-digital-worker"`。
- **国际版**：`intl.html` 内嵌根目录 `../digital-human-intl.html`（单文件，已支持 `data-back-url` 与可配置 `goBack()`）。若需独立文件，可复制根目录 `digital-human-intl.html` 到本目录为 `intl.html` 覆盖内嵌页。

## 2. 修改返回地址（移植到其他项目时）

- **国内版**：编辑 `digital-human/cn.html` 中 `body` 的 `data-back-url`，或页面加载前设置 `window.DIGITAL_HUMAN_BACK_URL = '你的返回URL';`
- **国际版**：根目录 `digital-human-intl.html` 的 `<body data-back-url="...">` 与 `goBack()` 已支持 `DIGITAL_HUMAN_BACK_URL` / `data-back-url`，按需修改。

## 3. 入口链接

在宿主项目中，将「国内数字人」「国际数字人」的入口指向：

- 国内：`digital-human/cn.html`
- 国际：`digital-human/intl.html`

当前项目已在 dashboard.html、page.html 中使用上述路径。

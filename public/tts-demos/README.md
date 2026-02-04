# 音色试听文件目录

将「音色信息汇总」中的试听文件（.mp3 / .wav）放到**此目录**（`public/tts-demos/`）下，前端「试听音色」即可播放。

- 文件名需与汇总表中的 **Voice Demo** 列**完全一致**，例如：`genshin_vindi2.mp3`、`girlfriend_1_speech02.mp3`、`Sunny genshin_vindi2.mp3`。
- 支持带空格的文件名，会按 URL 编码访问。
- 若出现 404：请检查文件名是否与数据库/汇总表一致。例如「甜美邻家」需要 **`girlfriend_1_speech02.mp3`**（注意是 1 不是 2）；若暂无该文件，可暂时将 `girlfriend_2_speech02.mp3` 复制一份并重命名为 `girlfriend_1_speech02.mp3` 用于试听。
- 若使用外部 CDN，可在服务端设置环境变量 `TTS_DEMO_BASE_URL=https://你的CDN地址/`，则试听地址将指向该基础 URL + 文件名。

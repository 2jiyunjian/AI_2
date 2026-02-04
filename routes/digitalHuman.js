const express = require('express');
const router = express.Router();

const uploadRouter = require('./digitalHuman/upload');
const reciteRouter = require('./digitalHuman/recite');
const promoteRouter = require('./digitalHuman/promote');
const createRouter = require('./digitalHuman/create');

router.use(uploadRouter);
router.use(reciteRouter);
router.use(promoteRouter);
router.use(createRouter);

// 以下路由已拆分到子模块：
// - upload: 上传/临时资源/代理
// - recite: 诵读文案（云雾诵读视频）
// - promote: 卖货推送（统一内容视频）
// - create: 创建数字人（HeyGen/云雾创建、任务查询、图像生成）


module.exports = router;

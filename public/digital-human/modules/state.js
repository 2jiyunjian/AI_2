/**
 * 数字人 - 全局状态
 * 所有模块共享的变量，必须在 create/recite/promote/works 之前加载
 */
let currentPlatform = 'heygen';
let selectedAvatar = '👩‍💼';
let selectedAvatarId = null;
let selectedAvatarForRecite = null;
let selectedAvatarForPromote = null;
let selectedRecitePlatform = null;
let selectedReciteDigitalHumanId = null;
let selectedPromotePlatform = null;
let selectedPromoteDigitalHumanId = null;
let reciteAudioBase64Yunwu = null;
let promoteAudioBase64Yunwu = null;
let heygenAvatarsCache = null;
let heygenVoicesCache = null;
let selectedVoiceId = null;
let currentAvatarMode = 'template';
let selectedTemplatePreviewVideo = null;
let selectedTemplatePreviewImage = null;
let selectedTemplateName = null;

let currentResourceType = 'video';
let currentPage = 1;
let pageSize = 30;
let totalAvatars = 0;
let displayedAvatars = 0;
let digitalHumanType = 'video';
let currentAudioUrl = null;
let currentAudioBlob = null;
let audioContext = null;

let videoStream = null;
let audioStream = null;
let videoRecorder = null;
let audioRecorder = null;
let recordedVideoBlob = null;
let recordedAudioBlob = null;
let currentVideoUrl = null;
let isRecordingVideo = false;
let isRecordingAudio = false;
let recordStartTime = null;
let recordTimer = null;

let currentStep = 1;
let uploadedMaterials = [];
let selectedVideoFile = null;
let selectedAudioFile = null;
let selectedVideoUrl = null;
let extractedFrames = [];
let selectedFrameId = null;

const taskPollingIntervals = new Map();

// 诵读/卖货子模块用到的状态（与主文件中原位置保持一致，便于各模块引用）
let reciteTtsVoiceList = [];
let reciteGeneratedAudioId = null;
let reciteAudioMode = 'upload';
let promotePersonImages = [];
let promoteProductImages = [];

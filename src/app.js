import { Simulation } from './simulation.js';
import { ObservatorySound } from './sound.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const defaults = { scene: 'lorenz', seed: 2048, palette: 'lichen', speed: 1, force: 1, density: 1 };
const scenes = ['lorenz', 'flow', 'life'];
const palettes = {
  lichen: { name: ['LICHEN', '苔绿'], color: '#d4ed9c' },
  glacier: { name: ['GLACIER', '冰川'], color: '#9bcbe5' },
  rose: { name: ['ROSE', '玫瑰'], color: '#e2a4bc' },
  ember: { name: ['EMBER', '余烬'], color: '#e7b37b' },
  mono: { name: ['SILVER', '银白'], color: '#e6e4db' },
};
const translations = {
  en: {
    mastheadCaption: 'AN OBSERVATORY<br/>FOR BEAUTIFUL DISORDER',
    pageTitle: 'CHAOS ATLAS — Beautiful disorder',
    metaDescription: 'A small observatory for beautiful disorder. Explore living particle systems, discover strange attractors, and make a little chaos of your own.',
    mainNavigation: 'Main navigation', languageLabel: 'Language', experimentsLabel: 'Experiments',
    paletteLabel: 'Color palette', paletteName: '{name} palette', seedLabel: 'World seed, up to eight digits',
    simulationLabel: 'Interactive particle simulation', signalLabel: 'Rolling trace of average particle motion',
    homeLabel: 'Chaos Atlas home', githubLabel: 'Star Chaos Atlas on GitHub', closeDialog: 'Close dialog',
    axisY: 'Y — PHASE SPACE', axisX: 'X — INITIAL CONDITIONS', frameRate: 'FRAME RATE', lastSamples: 'LAST 48 SAMPLES',
    soundTitle: 'OBSERVATORY SOUND', soundSubtitle: 'A small melody shaped by this world', volume: 'VOLUME',
    volumeLabel: 'Sound volume', mute: 'MUTE', unmute: 'SOUND ON', soundEnable: 'Enable observatory sound',
    soundDisable: 'Mute observatory sound', soundResume: 'Unmute observatory sound', soundUnavailable: 'Sound is not available in this browser.', soundEnabled: 'Sound enabled',
    navLab: 'Laboratory', navGuide: 'Field guide ↗', system: 'ALL SYSTEMS CURIOUS',
    introEyebrow: 'INDEPENDENT EXPERIMENT NO. 001—003', headline: 'A beautiful kind of <em>disorder.</em>',
    intro: 'A playground for curious minds.<br/>Change a variable. See what emerges.',
    experiments: '01 / EXPERIMENTS', lorenz: 'Strange attractor', lorenzSub: 'ORDER HIDING IN CHAOS',
    flow: 'Flow garden', flowSub: 'FOLLOW THE INVISIBLE', life: 'Particle life', lifeSub: 'SIMPLE RULES. COMPLEX LIFE.',
    parameters: '02 / PARAMETERS', reset: 'RESET ↺', speed: 'Time scale', density: 'Particle density',
    palette: '03 / COLOR PALETTE', random: 'A little serendipity', seed: 'WORLD SEED',
    render: 'LOCAL RENDER', particles: 'PARTICLES', elapsed: 'ELAPSED', engine: 'DETERMINISTIC SEED · ENDLESS POSSIBILITIES',
    signal: '04 / LIVE SIGNAL', motionSignal: 'MEAN MOTION / NORMALIZED', fieldNote: '05 / FIELD NOTE',
    readNote: 'UNDERSTAND THIS WORLD ↗', collect: '06 / KEEP A LITTLE CHAOS',
    collectText: 'This exact moment.<br/>Yours to keep, or pass along.', export: 'Export wallpaper',
    footer: 'SMALL RULES. INFINITE WORLDS.', footerRight: 'MADE FOR THE JOY OF EXPLORING. <span class="footer-star">✳</span>',
    guideEyebrow: "THE OBSERVER'S HANDBOOK", guideTitle: 'A field guide to chaos.',
    shortcutScenes: 'Switch worlds', shortcutPause: 'Pause', shortcutRandom: 'Randomize', shortcutFocus: 'Immerse',
    guideDisclaimer: 'An artistic exploration of mathematical systems. These are numerical simulations, not scientific measurement instruments. All rendering stays on your device.',
    exportEyebrow: 'A MOMENT, MADE TANGIBLE', exportTitle: 'Take the chaos with you.',
    exportDescription: 'Your current world, rendered as a clean PNG. No interface, just the good stuff.',
    canvasSize: 'CANVAS SIZE', download: 'Download PNG', exportNote: 'The current geometry is rendered at your chosen resolution. A different aspect ratio can add space around the composition.',
    shareEyebrow: 'SAME RULES. SAME BEGINNING.', shareTitle: 'Send a little serendipity.',
    shareDescription: 'This link contains your scene, seed, palette and parameters. It recreates the starting conditions; time and gestures are not recorded. Screen shape can change the composition.',
    worldLink: 'YOUR WORLD LINK', copy: 'Copy link ↗', paused: 'TIME IS STANDING STILL', resume: 'Resume experiment →', exitImmersive: 'EXIT IMMERSIVE ↙',
    live: 'LIVE', stopped: 'PAUSED', copySuccess: 'World link copied. Pass it along.', copyManual: 'Select the link above and copy it manually.',
    downloadSuccess: 'A little chaos, yours to keep.', downloadError: 'Export failed. Try a smaller canvas size.', working: 'Rendering…',
    seedError: 'Enter a seed from 0 to 99999999.', newWorld: 'New beginnings. New possibilities.', resetMessage: 'Experiment restored to its initial conditions.',
    pauseLabel: 'Pause simulation', resumeLabel: 'Resume simulation', immersiveLabel: 'Enter immersive mode', exitLabel: 'Exit immersive mode',
  },
  zh: {
    mastheadCaption: '一座观察<br/>美丽无序的实验室',
    pageTitle: 'CHAOS ATLAS · 混沌图谱 — 美丽的无序',
    metaDescription: '一座观察美丽无序的小型实验室。探索奇异吸引子、流场花园和粒子生命，亲手生成并分享属于你的混沌世界。',
    mainNavigation: '主导航', languageLabel: '语言', experimentsLabel: '实验场景',
    paletteLabel: '色彩方案', paletteName: '{name}配色', seedLabel: '世界种子，最多八位数字',
    simulationLabel: '可交互的粒子模拟', signalLabel: '平均粒子运动强度的实时曲线',
    homeLabel: '混沌图谱首页', githubLabel: '在 GitHub 收藏混沌图谱', closeDialog: '关闭弹窗',
    axisY: 'Y — 相空间', axisX: 'X — 初始条件', frameRate: '帧率', lastSamples: '最近 48 次采样',
    soundTitle: '实验室声音', soundSubtitle: '由这个世界生成的一小段旋律', volume: '音量',
    volumeLabel: '声音音量', mute: '静音', unmute: '开启声音', soundEnable: '开启实验室声音',
    soundDisable: '关闭实验室声音', soundResume: '取消静音', soundUnavailable: '当前浏览器不支持声音。', soundEnabled: '声音已开启',
    navLab: '实验室', navGuide: '观测手册 ↗', system: '好奇心，运行中',
    introEyebrow: '独立实验 NO. 001—003', headline: '一种美丽的 <em>无序。</em>',
    intro: '给好奇心一片游乐场。<br/>改变一个变量，看看会发生什么。',
    experiments: '01 / 选择实验', lorenz: '奇异吸引子', lorenzSub: '混沌之中，秩序自生',
    flow: '流场花园', flowSub: '追随看不见的风', life: '粒子生命', lifeSub: '简单规则，复杂生命',
    parameters: '02 / 调节参数', reset: '重置 ↺', speed: '时间流速', density: '粒子密度',
    palette: '03 / 色彩方案', random: '制造一点偶然', seed: '世界种子',
    render: '本地渲染', particles: '粒子数量', elapsed: '运行时间', engine: '相同种子 · 无限可能',
    signal: '04 / 实时信号', motionSignal: '运动强度 / 归一化', fieldNote: '05 / 观测笔记',
    readNote: '读懂这个世界 ↗', collect: '06 / 收藏一点混沌', collectText: '此刻的美丽，<br/>留给自己，或分享给远方。', export: '导出壁纸',
    footer: '简单规则，无穷世界。', footerRight: '为探索的乐趣而作。<span class="footer-star">✳</span>',
    guideEyebrow: '观测者的随身手册', guideTitle: '走近混沌。', shortcutScenes: '切换实验', shortcutPause: '暂停', shortcutRandom: '随机', shortcutFocus: '沉浸',
    guideDisclaimer: '这是对数学系统的艺术探索。数值模拟用于视觉实验，并非科学测量仪器。所有运算与渲染均在你的设备上完成。',
    exportEyebrow: '把一个瞬间，变成一件作品', exportTitle: '带走你的混沌。', exportDescription: '把当前世界导出成清晰的 PNG。收起仪表，只留下画面。',
    canvasSize: '画布尺寸', download: '下载 PNG', exportNote: '将当前几何形态重新渲染至所选分辨率。比例变化时，画面周围可能增加留白。',
    shareEyebrow: '相同的规则，相同的起点', shareTitle: '分享一点偶然。', shareDescription: '链接保存实验、种子、配色与参数，可重现初始条件。运行时间与手势不会录入，不同屏幕比例也会影响构图。',
    worldLink: '你的世界链接', copy: '复制链接 ↗', paused: '时间，在此停留', resume: '继续实验 →', exitImmersive: '退出沉浸 ↙',
    live: '运行中', stopped: '已暂停', copySuccess: '链接已复制，把这个世界分享出去吧。', copyManual: '请选中上方链接并手动复制。',
    downloadSuccess: '一点混沌，已经为你留存。', downloadError: '导出失败，请尝试更小的画布尺寸。', working: '正在渲染…',
    seedError: '请输入 0 到 99999999 之间的整数种子。', newWorld: '新的起点，新的可能。', resetMessage: '实验已回到初始状态。',
    pauseLabel: '暂停模拟', resumeLabel: '继续模拟', immersiveLabel: '进入沉浸模式', exitLabel: '退出沉浸模式',
  },
};
const sceneInfo = {
  lorenz: {
    code: ['LORENZ SYSTEM / 1963', '洛伦兹系统 / 1963'], title: ['The butterfly effect', '蝴蝶效应'],
    note: ['Two almost identical beginnings. Two entirely different futures. A reminder that small things can change everything.', '几乎相同的起点，截然不同的未来。初始条件的微小偏差，也能让轨迹渐行渐远。'],
    hint: ['DRAG TO ROTATE · SCROLL TO ZOOM', '拖动旋转 · 滚轮缩放'], force: ['Chaos / ρ', '混沌参数 / ρ'],
    equation: 'dx/dt = σ(y − x)<br/>dy/dt = x(ρ − z) − y<br/>dz/dt = xy − βz',
  },
  flow: {
    code: ['ANALYTIC FLOW / STREAM FUNCTION', '解析流场 / 流函数'], title: ['Follow the invisible', '追随无形之流'],
    note: ['No particle knows the whole picture. Each follows its local current, and a garden of invisible paths begins to bloom.', '没有一颗粒子知道全貌。它们只追随所在位置的流向，无数局部轨迹，却渐渐长成了一座花园。'],
    hint: ['MOVE TO STIR · DRAG TO DISTURB', '移动指针搅动流场 · 拖动扰动'], force: ['Field complexity', '流场复杂度'],
    equation: ['v = (∂ψ/∂y, −∂ψ/∂x)<br/>dp/dt = v(p, t)<br/>ψ = evolving stream function', 'v = (∂ψ/∂y, −∂ψ/∂x)<br/>dp/dt = v(p, t)<br/>ψ = 随时间演化的流函数'],
  },
  life: {
    code: ['PARTICLE LIFE / EMERGENT SYSTEM', '粒子生命 / 涌现系统'], title: ['Together, something new', '聚在一起，便有了生命'],
    note: ['A little attraction. A little resistance. Without a plan or a leader, tiny particles find a way to become something more.', '一点吸引，一点排斥。没有蓝图，也没有指挥者，微小的粒子依靠彼此间的规则，生长出意想不到的形态。'],
    hint: ['MOVE TO ATTRACT · DRAG TO REPEL', '移动指针吸引 · 按住拖动排斥'], force: ['Interaction strength', '相互作用强度'],
    equation: ['Fᵢ = Σ f(aᵢⱼ, rᵢⱼ)<br/>dv/dt = F − γv<br/>periodic boundaries / 4 species', 'Fᵢ = Σ f(aᵢⱼ, rᵢⱼ)<br/>dv/dt = F − γv<br/>周期边界 / 4 种粒子'],
  },
};

const params = new URLSearchParams(location.search);
const numberParam = (key, fallback, min, max, step = 0) => {
  const raw = params.get(key);
  const value = raw !== null && raw.trim() !== '' ? Number(raw) : fallback;
  const bounded = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  return step ? Number((Math.round(bounded / step) * step).toFixed(4)) : bounded;
};
let savedLanguage;
try { savedLanguage = localStorage.getItem('chaos-atlas-language'); } catch { /* Storage is optional. */ }
const supportedLanguage = (value) => {
  const language = String(value || '').toLowerCase().split(/[-_]/)[0];
  return ['zh', 'en'].includes(language) ? language : null;
};
const browserLanguage = (navigator.languages || [navigator.language]).map(supportedLanguage).find(Boolean);
const state = {
  ...defaults,
  scene: scenes.includes(params.get('scene')) ? params.get('scene') : defaults.scene,
  palette: Object.hasOwn(palettes, params.get('palette')) ? params.get('palette') : defaults.palette,
  seed: numberParam('seed', defaults.seed, 0, 99999999, 1),
  speed: numberParam('speed', defaults.speed, 0.2, 2, 0.1),
  density: numberParam('density', defaults.density, 0.3, 1.5, 0.05),
  force: numberParam('force', defaults.force, 0, 2, 0.02),
  language: supportedLanguage(params.get('lang')) || supportedLanguage(savedLanguage) || browserLanguage || 'en',
  running: !matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const t = (key) => translations[state.language][key] || translations.en[key] || key;
const localized = (values) => Array.isArray(values) ? values[state.language === 'zh' ? 1 : 0] : values;
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600);
}
function worldURL() {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ v: '1', scene: state.scene, seed: String(state.seed), palette: state.palette,
    speed: String(state.speed), force: String(state.force), density: String(state.density), lang: state.language }).toString();
  url.hash = '';
  return url;
}
function syncURL() { history.replaceState(null, '', worldURL()); }

function drawSignal(trace = []) {
  const canvas = $('#signal');
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }
  const ctx = canvas.getContext('2d');
  const w = rect.width, h = rect.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#30382a'; ctx.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4); ctx.stroke(); }
  if (trace.length < 2) return;
  const points = trace.map((value, i) => [i / (trace.length - 1) * w, h - 10 - Math.min(1, Math.max(0, value)) * (h - 20)]);
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, `${palettes[state.palette].color}25`); gradient.addColorStop(1, `${palettes[state.palette].color}00`);
  ctx.beginPath(); ctx.moveTo(0, h); points.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = palettes[state.palette].color; ctx.lineWidth = 1.2; ctx.stroke();
  const [x, y] = points.at(-1); ctx.beginPath(); ctx.arc(x - 2, y, 2, 0, Math.PI * 2); ctx.fillStyle = palettes[state.palette].color; ctx.fill();
}
let lastTrace = [];
function updateStats(stats) {
  $('#particle-stat').textContent = stats.particles.toLocaleString('en-US');
  $('#fps-stat').textContent = stats.fps;
  const seconds = Math.floor(stats.elapsed);
  $('#elapsed-stat').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('#activity-value').textContent = stats.activity.toFixed(3);
  lastTrace = stats.trace; drawSignal(lastTrace);
  if (observatorySound) observatorySound.setStats(stats);
}
let observatorySound;
const simulation = new Simulation($('#simulation'), { onStats: updateStats });
observatorySound = new ObservatorySound({
  onAvailability: (available) => {
    if (!available) {
      $('#sound-button').disabled = true;
      $('#sound-button').title = t('soundUnavailable');
      $('#sound-dock').hidden = true;
      toast(t('soundUnavailable'));
    }
  },
});

function updateRange(id, value) {
  const input = $(`#${id}`); input.value = value;
  input.style.setProperty('--range-fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
}
function updateParameters() {
  updateRange('speed', state.speed); updateRange('complexity', state.force * 50); updateRange('density', state.density * 100);
  $('#speed-output').textContent = `${state.speed.toFixed(1)}×`;
  $('#complexity-output').textContent = state.scene === 'lorenz' ? (24 + state.force * 4).toFixed(1) : `${state.force.toFixed(2)}×`;
  $('#density-output').textContent = `${Math.round(state.density * 100)}%`;
  simulation.setParameters({ speed: state.speed, force: state.force, density: state.density });
}
function updateScene() {
  const info = sceneInfo[state.scene];
  $$('.scene-button').forEach((button) => { const active = button.dataset.scene === state.scene; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  $('#scene-code').textContent = localized(info.code); $('#scene-title').textContent = localized(info.title);
  $('#field-note').textContent = localized(info.note); $('#interaction-hint').textContent = localized(info.hint);
  $('#complexity-label').textContent = localized(info.force); $('#equation').innerHTML = localized(info.equation);
  $('#note-number').textContent = `[ 00${scenes.indexOf(state.scene) + 1} ]`;
  const particlesLabel = $('.telemetry [data-i18n="particles"]');
  particlesLabel.textContent = state.scene === 'lorenz' ? (state.language === 'zh' ? '轨迹采样' : 'SAMPLES') : t('particles');
  $('#signal-label').textContent = state.scene === 'lorenz' ? (state.language === 'zh' ? '轨迹切向速度 / 归一化' : 'TANGENT SPEED / NORMALIZED') : t('motionSignal');
  $('#simulation').setAttribute('aria-label', `${localized(info.title)}. ${localized(info.hint)}`);
  simulation.setScene(state.scene);
  observatorySound.setScene(state.scene);
  updateParameters();
}
function updatePalette() {
  document.documentElement.style.setProperty('--accent', palettes[state.palette].color);
  $$('.palette').forEach((button) => { const active = button.dataset.palette === state.palette; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  $('#palette-name').textContent = localized(palettes[state.palette].name);
  $$('.palette').forEach((button) => {
    const name = localized(palettes[button.dataset.palette].name);
    const label = t('paletteName').replace('{name}', name);
    button.setAttribute('aria-label', label); button.title = label;
  });
  $('#wavelength').textContent = palettes[state.palette].color.toUpperCase();
  simulation.setPalette(state.palette); drawSignal(lastTrace);
}
function updateRunning() {
  simulation.setRunning(state.running);
  $('#paused-overlay').hidden = state.running;
  $('#live-label').textContent = t(state.running ? 'live' : 'stopped');
  $('.live-badge i').style.opacity = state.running ? '1' : '.25';
  $('#pause-button').setAttribute('aria-label', t(state.running ? 'pauseLabel' : 'resumeLabel'));
  $('#pause-button').title = `${t(state.running ? 'pauseLabel' : 'resumeLabel')} (Space)`;
  $('#pause-button svg').innerHTML = state.running ? '<path d="M5 3v10M11 3v10"/>' : '<path d="M4 2l9 6-9 6z"/>';
}

function renderGuide() {
  const zh = state.language === 'zh';
  const guides = [
    { title: zh ? '01 / 奇异吸引子' : '01 / The strange attractor',
      body: zh ? '洛伦兹在 1963 年提出了这个三变量系统。轨迹绕着两个叶瓣流转，却不会简单重复。这里以 RK4 积分预计算轨迹，光点沿轨迹运行；调节 ρ 会重新求解系统。拖动可旋转，滚轮可缩放。' : 'Edward Lorenz described this three-variable system in 1963. Trajectories orbit two lobes without settling into a simple repeating cycle. Paths are precomputed with RK4 integration, then light traces their geometry. Changing ρ solves the system again. Drag to rotate; scroll to zoom.', formula: 'σ = 10 · β = 8/3 · ρ = 24—32' },
    { title: zh ? '02 / 流场花园' : '02 / The flow garden',
      body: zh ? '粒子沿解析流函数形成的速度场前进，留下短暂轨迹。复杂度改变次级涡旋的强度。移动指针可加入局部旋涡。这是一个程序生成的流场，并非完整的流体力学求解器。' : 'Particles follow the velocity field of an evolving analytic stream function, leaving short histories behind. Complexity changes the strength of secondary vortices. Move your pointer to introduce a local swirl. This is a procedural field, rather than a full fluid dynamics solver.', formula: 'v = (∂ψ/∂y, −∂ψ/∂x)' },
    { title: zh ? '03 / 粒子生命' : '03 / Particle life',
      body: zh ? '四种粒子依照由种子生成的关系矩阵彼此吸引或排斥。近距离排斥避免粒子堆叠；阻尼稳定运动。边界首尾相连。移动指针吸引粒子，按住拖动则排斥。它是涌现行为的视觉模型，不代表真实生物。' : 'Four species attract or repel according to a seed-generated interaction matrix. Short-range repulsion prevents collapse; drag damps velocity. Edges wrap into a periodic world. Move your pointer to attract, or hold and drag to repel. This is a visual model of emergence, not a model of biological organisms.', formula: zh ? '局部作用力 + 阻尼 + 周期边界' : 'local forces + damping + periodic boundaries' },
  ];
  $('#guide-content').innerHTML = guides.map((guide) => `<section class="guide-section"><h3>${guide.title}</h3><p>${guide.body}</p><div class="formula">${guide.formula}</div></section>`).join('');
}
function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  $('meta[name="description"]').content = t('metaDescription');
  $$('[data-i18n]').forEach((element) => { element.innerHTML = t(element.dataset.i18n); });
  $$('[data-i18n-aria-label]').forEach((element) => element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)));
  $$('[data-language]').forEach((button) => {
    const active = button.dataset.language === state.language;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  $('.brand').setAttribute('aria-label', t('homeLabel'));
  $$('.close-dialog').forEach((button) => { button.setAttribute('aria-label', t('closeDialog')); button.title = t('closeDialog'); });
  $('#immersive-button').setAttribute('aria-label', t(document.body.classList.contains('is-immersive') ? 'exitLabel' : 'immersiveLabel'));
  $('#immersive-button').title = `${t('immersiveLabel')} (F)`;
  $('#sound-button').setAttribute('aria-label', t(observatorySound.enabled ? (observatorySound.muted ? 'soundResume' : 'soundDisable') : 'soundEnable'));
  $('#sound-button').title = t(observatorySound.enabled ? (observatorySound.muted ? 'soundResume' : 'soundDisable') : 'soundEnable');
  $('#sound-button').classList.toggle('sound-active', observatorySound.enabled && !observatorySound.muted);
  $('#volume').setAttribute('aria-label', t('volumeLabel'));
  $('#mute-button').textContent = observatorySound.enabled && !observatorySound.muted ? t('mute') : t('unmute');
  $('#share-button').setAttribute('aria-label', state.language === 'zh' ? '分享这个世界' : 'Share this world');
  $('#share-button').title = state.language === 'zh' ? '分享这个世界' : 'Share this world';
  const sizes = state.language === 'zh' ? ['桌面 — 2560 × 1440', '4K — 3840 × 2160', '手机 — 1440 × 2560', '方形 — 2048 × 2048'] : ['Desktop — 2560 × 1440', '4K — 3840 × 2160', 'Phone — 1440 × 2560', 'Square — 2048 × 2048'];
  [...$('#export-size').options].forEach((option, i) => { option.textContent = sizes[i]; });
  renderGuide(); updateScene(); updatePalette(); updateRunning();
  try { localStorage.setItem('chaos-atlas-language', state.language); } catch { /* Storage is optional. */ }
}
function setScene(scene) { state.scene = scene; updateScene(); syncURL(); }
function randomize() {
  const values = crypto.getRandomValues(new Uint32Array(3));
  state.seed = values[0] % 100000000;
  state.force = Math.round((0.4 + (values[1] / 4294967295) * 1.6) * 50) / 50;
  state.palette = Object.keys(palettes)[values[2] % Object.keys(palettes).length];
  $('#seed').value = state.seed; updateParameters(); updatePalette(); simulation.setSeed(state.seed); syncURL(); toast(t('newWorld'));
}
function setImmersive(value = !document.body.classList.contains('is-immersive')) {
  document.body.classList.toggle('is-immersive', value);
  $$('.masthead, .intro, .controls, .telemetry, .bottom-grid, footer').forEach((element) => { element.inert = value; });
  $('#immersive-button').setAttribute('aria-label', t(value ? 'exitLabel' : 'immersiveLabel'));
  requestAnimationFrame(() => simulation.resize());
  if (value) $('#exit-immersive').focus(); else $('#immersive-button').focus();
}
function openDialog(selector) { if (document.body.classList.contains('is-immersive')) setImmersive(false); $(selector).showModal(); }

$$('.scene-button').forEach((button) => button.addEventListener('click', () => setScene(button.dataset.scene)));
$$('.palette').forEach((button) => button.addEventListener('click', () => { state.palette = button.dataset.palette; updatePalette(); syncURL(); }));
['speed', 'complexity', 'density'].forEach((id) => $(`#${id}`).addEventListener('input', (event) => {
  state[id === 'complexity' ? 'force' : id] = Number(event.target.value) / (id === 'complexity' ? 50 : id === 'density' ? 100 : 1);
  updateParameters(); syncURL();
}));
$('#seed').addEventListener('change', (event) => {
  if (!/^\d{1,8}$/.test(event.target.value)) { event.target.value = state.seed; toast(t('seedError')); return; }
  state.seed = Number(event.target.value); simulation.setSeed(state.seed); syncURL();
});
$('#seed').addEventListener('keydown', (event) => { if (event.key === 'Enter') event.target.blur(); });
$('#random-button').addEventListener('click', randomize);
$('#reset-button').addEventListener('click', () => { Object.assign(state, { speed: 1, force: 1, density: 1 }); updateParameters(); simulation.reset(); syncURL(); toast(t('resetMessage')); });
$('#pause-button').addEventListener('click', () => { state.running = !state.running; updateRunning(); });
$('#resume-button').addEventListener('click', () => { state.running = true; updateRunning(); });
$('#immersive-button').addEventListener('click', () => setImmersive());
$('#exit-immersive').addEventListener('click', () => setImmersive(false));
$('#guide-button').addEventListener('click', () => openDialog('#guide-dialog'));
$('#read-note').addEventListener('click', () => openDialog('#guide-dialog'));
$('#export-button').addEventListener('click', () => openDialog('#export-dialog'));
$('#sound-button').addEventListener('click', async () => {
  const enabled = await observatorySound.toggleMute();
  if (!observatorySound.enabled) return;
  $('#sound-dock').hidden = false;
  $('#sound-button').classList.toggle('sound-active', enabled && !observatorySound.muted);
  applyLanguage();
  if (enabled && !observatorySound.muted) toast(t('soundEnabled'));
});
$('#mute-button').addEventListener('click', async () => {
  await observatorySound.toggleMute();
  applyLanguage();
});
$('#volume').addEventListener('input', (event) => observatorySound.setVolume(Number(event.target.value) / 100));
$$('[data-language]').forEach((button) => button.addEventListener('click', () => {
  if (state.language === button.dataset.language) return;
  state.language = button.dataset.language; applyLanguage(); syncURL();
}));
$$('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));
$('#share-button').addEventListener('click', () => { $('#share-url').value = worldURL().href; openDialog('#share-dialog'); });
$('#share-url').addEventListener('click', (event) => event.target.select());
$('#copy-button').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#share-url').value); toast(t('copySuccess')); }
  catch { $('#share-url').focus(); $('#share-url').select(); toast(t('copyManual')); }
});
$('#download-button').addEventListener('click', async () => {
  const button = $('#download-button'); button.disabled = true; button.textContent = t('working');
  try {
    const [width, height] = $('#export-size').value.split('x').map(Number);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const blob = await simulation.exportImage({ width, height });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = href;
    anchor.download = `chaos-atlas-${state.scene}-${state.seed}-${width}x${height}.png`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
    $('#export-dialog').close(); toast(t('downloadSuccess'));
  } catch (error) { console.error('Wallpaper export:', error); toast(t('downloadError')); }
  finally { button.disabled = false; button.innerHTML = `<span>${t('download')}</span><span>↓</span>`; }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('is-immersive')) { event.preventDefault(); setImmersive(false); return; }
  if (event.target.closest('input, select, textarea, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey || event.repeat || $$('dialog[open]').length) return;
  if (event.code === 'Space') { if (event.target.closest('button, a')) return; event.preventDefault(); state.running = !state.running; updateRunning(); }
  else if (['1', '2', '3'].includes(event.key)) setScene(scenes[Number(event.key) - 1]);
  else if (event.key.toLowerCase() === 'r') randomize();
  else if (event.key.toLowerCase() === 'f') setImmersive();
  else if (event.key === 'Escape') setImmersive(false);
});
window.addEventListener('resize', () => drawSignal(lastTrace));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) observatorySound.suspend();
  else observatorySound.resume();
});
window.addEventListener('pagehide', (event) => { if (!event.persisted) { simulation.destroy(); observatorySound.destroy(); } });
$('#seed').value = state.seed;
applyLanguage(); simulation.setSeed(state.seed);
if (location.search) syncURL();


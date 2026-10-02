// Original behaviour code — loader, scroll reveals, sound toggle, local video slot.
// (Camera / paint choreography lives in scene.js.)
(function () {
  var loader = document.getElementById('loader');
  var t0 = Date.now();

  // Hide the splash once the page is loaded and the 3D stage is ready,
  // but never trap the user behind it (min display, hard cap).
  var hideLoader = function () {
    if (!loader || loader.classList.contains('done')) return;
    var wait = Math.max(0, 700 - (Date.now() - t0));
    setTimeout(function () { loader.classList.add('done'); }, wait);
  };
  if (document.readyState === 'complete') hideLoader();
  else window.addEventListener('load', hideLoader);
  window.addEventListener('scene:ready', hideLoader);
  setTimeout(hideLoader, 6000);

  // Reveal panels on scroll; without IntersectionObserver just show them.
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) {
        if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Engine-idle sound toggle — synthesised locally with WebAudio, no audio file.
  var btn = document.getElementById('soundBtn');
  var audio = null;
  var on = false;

  function buildAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    var ctx = new Ctx();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 1.2;

    var trem = ctx.createGain(); // idle "putt-putt" wobble
    trem.gain.value = 0.8;
    lp.connect(trem);
    trem.connect(master);
    var o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 44;
    var o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.value = 66.5;
    o2.detune.value = -14;
    o1.connect(lp);
    o2.connect(lp);

    var lfo = ctx.createOscillator();
    lfo.frequency.value = 8.5;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain);
    lfoGain.connect(trem.gain);

    o1.start();
    o2.start();
    lfo.start();
    return { ctx: ctx, master: master };
  }

  function rampTo(value, seconds) {
    var g = audio.master.gain;
    var now = audio.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
  }

  function setSound(next) {
    on = next;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Mute engine sound' : 'Play engine sound');
    if (on) {
      if (!audio) audio = buildAudio();
      if (!audio) { btn.disabled = true; return; } // WebAudio unsupported
      audio.ctx.resume();
      rampTo(0.06, 0.5);
    } else if (audio) {
      rampTo(0, 0.3);
    }
  }

  if (btn) btn.addEventListener('click', function () { setSound(!on); });

  document.addEventListener('visibilitychange', function () {
    if (!audio) return;
    if (document.hidden) audio.ctx.suspend();
    else if (on) audio.ctx.resume();
  });

  // Local video only — copy your recording in as mustang.mp4
  fetch('./mustang.mp4', { method: 'HEAD' }).then(function (r) {
    if (r.ok) {
      var v = document.getElementById('userVideo');
      if (v) { v.src = './mustang.mp4'; v.muted = true; v.loop = true; }
    }
  }).catch(function () {});
})();

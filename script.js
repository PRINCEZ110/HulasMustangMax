// Original behaviour code — loader, scroll reveals, sound toggle, local video slot.
// (Camera / paint choreography lives in scene.js.)
(function () {
  var loader = document.getElementById('loader');
  setTimeout(function () { loader.classList.add('done'); }, 1500);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (x) {
      if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  var on = false, btn = document.getElementById('soundBtn');
  btn.addEventListener('click', function () {
    on = !on;
    btn.textContent = on ? '\u266B' : '\u266A';
  });

  // Local video only — copy your recording in as mustang.mp4
  fetch('./mustang.mp4', { method: 'HEAD' }).then(function (r) {
    if (r.ok) {
      var v = document.getElementById('userVideo');
      if (v) { v.src = './mustang.mp4'; v.muted = true; v.loop = true; }
    }
  }).catch(function () {});
})();

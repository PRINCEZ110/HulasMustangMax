// Original interaction code — parallax hero, loader, reveals.
// No copied PeachWorlds script; behaviour recreated from scratch.
(function(){
  var loader = document.getElementById('loader');
  setTimeout(function(){ loader.classList.add('done'); }, 1600);

  var hero = document.getElementById('hero');
  function onScroll(){
    var y = window.scrollY || 0;
    // fade fixed hero as content covers it, like reference
    var fadeStart = window.innerHeight * 0.4;
    var fadeEnd = window.innerHeight * 1.3;
    var p = (y - fadeStart) / (fadeEnd - fadeStart);
    p = Math.max(0, Math.min(1, p));
    hero.style.opacity = String(1 - p);
    hero.style.pointerEvents = p > 0.9 ? 'none' : 'auto';
    hero.style.transform = 'translateY(' + (y * 0.15) + 'px)';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  // reveal on scroll
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold: 0.12});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  // decorative sound toggle
  var on = false;
  document.getElementById('soundBtn').addEventListener('click', function(){
    on = !on; this.textContent = on ? '♫' : '♪'; this.style.background = on ? '#333' : '#000';
  });

  // If user drops mustang.mp4 next to index.html, autoplay it in the video slot
  fetch('./mustang.mp4', {method:'HEAD'}).then(function(r){
    if(r.ok){
      var v = document.getElementById('userVideo');
      v.style.display = 'block'; v.src = './mustang.mp4'; v.muted = true; v.loop = true; v.play().catch(function(){});
    }
  }).catch(function(){});
})();

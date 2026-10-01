// Original behaviour code — no PeachWorlds script copied.
(function(){
  var loader=document.getElementById('loader');
  setTimeout(function(){loader.classList.add('done');},1500);
  var hero=document.getElementById('hero');
  function onScroll(){
    var y=window.scrollY||0;
    var s=window.innerHeight*0.4,e=window.innerHeight*1.3,p=(y-s)/(e-s);
    p=Math.max(0,Math.min(1,p));
    hero.style.opacity=String(1-p);
    hero.style.pointerEvents=p>0.9?'none':'auto';
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:0.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
  var on=false,btn=document.getElementById('soundBtn');
  btn.addEventListener('click',function(){on=!on;btn.textContent=on?'\u266B':'\u266A';});
  // Local video only — do NOT bundle the 41MB screen recording automatically.
  // To use it: copy it into this folder as mustang.mp4
  fetch('./mustang.mp4',{method:'HEAD'}).then(function(r){
    if(r.ok){var v=document.getElementById('userVideo');v.src='./mustang.mp4';v.muted=true;v.loop=true;}
  }).catch(function(){});
})();

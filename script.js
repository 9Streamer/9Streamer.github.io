'use strict';
// Séries photographiques TDK : images et métadonnées personnalisables.
const PROJECTS = window.CMS.projects;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const mobile = matchMedia('(max-width: 720px)');
let manualMotionOff = false;
try { manualMotionOff = localStorage.getItem('nf-motion') === 'off'; } catch (_) {}
let motion = !reduceMotion.matches && !manualMotionOff;
const motionButton = $('.motion-toggle');
let revealObserver;
function applyMotion() {
  motion = !reduceMotion.matches && !manualMotionOff;
  document.documentElement.classList.toggle('motion-on', motion);
  document.documentElement.classList.toggle('motion-off', !motion);
  motionButton.textContent = `ANIMATIONS : ${motion ? 'ON' : 'OFF'}`;
  motionButton.setAttribute('aria-pressed', String(!motion));
  if (!motion) { $$('.pending').forEach(el => el.classList.remove('pending')); revealObserver?.disconnect(); }
  hideCursor();
  scheduleScroll();
}
// Navigation et suivi de la section active.
$('#year').textContent = new Date().getFullYear();
const NAV_SCENES = window.CMS.scenes || [{"id": "vision", "title": "LE REGARD.", "description": "Une image commence avant le déclenchement.", "photo": "bar-1"}, {"id": "recits", "title": "LES PHOTOS.", "description": "Quatorze instants. Un regard qui se construit.", "photo": "beziers-1"}, {"id": "films", "title": "LES FILMS.", "description": "Le geste prend vie. Le récit trouve son rythme.", "photo": "bar-5"}, {"id": "terrain", "title": "LE TERRAIN.", "description": "Béziers ↔ Montpellier. Les yeux ouverts.", "photo": "beziers-2"}, {"id": "atelier", "title": "LA FABRIQUE.", "description": "Observer. Cadrer. Assembler.", "photo": "chevalier"}, {"id": "contact", "title": "LA SUITE.", "description": "Chaque histoire commence par une rencontre.", "photo": "chat"}];
const menu=$('.menu-toggle'),chapterMenu=$('#chapter-menu');let sceneIndex=0,sceneAnimating=false;
function closeMenu(){if(chapterMenu.open)chapterMenu.close();}
function updateScene(index){if(chapterMenu.open)playCue('step');sceneIndex=(index+NAV_SCENES.length)%NAV_SCENES.length;const scene=NAV_SCENES[sceneIndex];$('.scene-photo img').src=photoURL(scene.photo);$('.scene-photo img').alt='Photographie TDK — '+scene.title;$('.nav-atmosphere img').src=photoURL(scene.photo);$('.previous-scene img').src=photoURL(NAV_SCENES[(sceneIndex+5)%6].photo);$('.following-scene img').src=photoURL(NAV_SCENES[(sceneIndex+1)%6].photo);$('.scene-title').textContent=scene.title;$('.scene-description').textContent=scene.description;$('.scene-number').textContent='SÉQUENCE 0'+(sceneIndex+1)+' / '+NAV_SCENES.length;$('.scene-position').textContent='0'+(sceneIndex+1)+' — '+scene.title;$('.scene-enter').href='#'+scene.id;$$('[data-scene]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scene)===sceneIndex)));if(motion&&chapterMenu.open){$('.scene-photo').animate([{opacity:.35,transform:'scale(1.06)'},{opacity:1,transform:'scale(1)'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});$('.scene-editorial').animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'none'}],{duration:500,easing:'ease-out'});}}
function openMenu(){const nearest=NAV_SCENES.map((s,i)=>({i,d:Math.abs($('#'+s.id).getBoundingClientRect().top)})).sort((a,b)=>a.d-b.d)[0];updateScene(nearest.i);chapterMenu.showModal();document.body.classList.add('modal-open');menu.setAttribute('aria-expanded','true');playCue('open');}
menu.addEventListener('click',openMenu);$('.chapter-close').addEventListener('click',closeMenu);
chapterMenu.addEventListener('close',()=>{document.body.classList.remove('modal-open');menu.setAttribute('aria-expanded','false');menu.focus({preventScroll:true});});
$('.previous-scene').addEventListener('click',()=>updateScene(sceneIndex-1));$('.following-scene').addEventListener('click',()=>updateScene(sceneIndex+1));$$('[data-scene]').forEach(b=>b.addEventListener('click',()=>updateScene(Number(b.dataset.scene))));
chapterMenu.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();updateScene(sceneIndex+(e.key==='ArrowRight'?1:-1));}});
// Glissement tactile : suivi du doigt, verrouillage horizontal et annulation propre.
let swipeStart=null,suppressSceneClick=false,dragFrame=0;
const sceneWindow=$('.scene-window');
function resetSceneDrag(){cancelAnimationFrame(dragFrame);sceneWindow.classList.remove('is-dragging');sceneWindow.style.removeProperty('--drag-x');sceneWindow.style.removeProperty('--drag-tilt');}
sceneWindow.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||!mobile.matches||!e.isPrimary||e.button!==0||sceneAnimating)return;
 suppressSceneClick=false;swipeStart={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),axis:null};
});
sceneWindow.addEventListener('pointermove',e=>{
 const g=swipeStart;if(!g||g.id!==e.pointerId)return;
 const dx=e.clientX-g.x,dy=e.clientY-g.y;
 if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>10)g.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
 if(g.axis!=='x')return;
 suppressSceneClick=true;
 if(!sceneWindow.hasPointerCapture(e.pointerId))sceneWindow.setPointerCapture(e.pointerId);
 sceneWindow.classList.add('is-dragging');
 cancelAnimationFrame(dragFrame);dragFrame=requestAnimationFrame(()=>{if(!motion)return;const shift=Math.max(-110,Math.min(110,dx*.48));sceneWindow.style.setProperty('--drag-x',shift+'px');sceneWindow.style.setProperty('--drag-tilt',(shift/45)+'deg');});
});
sceneWindow.addEventListener('pointerup',e=>{
 const g=swipeStart;if(!g||g.id!==e.pointerId)return;
 const dx=e.clientX-g.x,dy=e.clientY-g.y,elapsed=performance.now()-g.start;
 suppressSceneClick=Math.abs(dx)>10||Math.abs(dy)>10||elapsed>600;
 const threshold=Math.min(70,sceneWindow.clientWidth*.17);
 const commit=g.axis==='x'&&(Math.abs(dx)>threshold||(Math.abs(dx)>25&&Math.abs(dx)/Math.max(elapsed,1)>.45));
 swipeStart=null;resetSceneDrag();if(sceneWindow.hasPointerCapture(e.pointerId))sceneWindow.releasePointerCapture(e.pointerId);
 if(commit)updateScene(sceneIndex+(dx<0?1:-1));
});
function cancelSceneDrag(){if(swipeStart)suppressSceneClick=true;swipeStart=null;resetSceneDrag();}
sceneWindow.addEventListener('pointercancel',cancelSceneDrag);
sceneWindow.addEventListener('lostpointercapture',cancelSceneDrag);
chapterMenu.addEventListener('close',cancelSceneDrag);
mobile.addEventListener('change',cancelSceneDrag);
sceneWindow.addEventListener('dragstart',e=>e.preventDefault());
// Empêche un relâchement après glissement d’activer accidentellement le lien.
sceneWindow.addEventListener('click',e=>{if(suppressSceneClick){e.preventDefault();e.stopImmediatePropagation();suppressSceneClick=false;}},true);
$('.scene-enter').addEventListener('click',async e=>{e.preventDefault();if(sceneAnimating)return;sceneAnimating=true;const scene=NAV_SCENES[sceneIndex],wipe=$('.scene-transition');try{if(motion)await wipe.animate([{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration:230,easing:'ease-in',fill:'forwards'}).finished;closeMenu();const target=$('#'+scene.id);target.scrollIntoView({behavior:'instant',block:'start'});history.replaceState(null,'','#'+scene.id);const heading=target.querySelector('h2')||target;heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});if(motion)await wipe.animate([{transform:'scaleY(1)'},{transform:'scaleY(0)'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}).finished;}finally{wipe.getAnimations().forEach(a=>a.cancel());sceneAnimating=false;}});
// Révélations progressives. Le site reste entièrement visible sans JavaScript.
if ('IntersectionObserver' in window && motion) {
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove('pending'); revealObserver.unobserve(entry.target); }
  }), { threshold: .08 });
  $$('.reveal').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pending'); revealObserver.observe(el); } });
}
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === entry.target.id)); $$('[data-dock]').forEach(a => {const active=a.dataset.dock===entry.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}); }
  }), { rootMargin: '-15% 0px -55% 0px' });
  ['vision','recits','films','terrain','atelier','contact'].forEach(id => sectionObserver.observe($('#'+id)));
}
// Carnet : le défilement contrôle trois plans, les boutons restent accessibles.
const field = $('.field-sequence'), fieldImages = $$('.field-image');
const NOTES = [
  {title:'S’ÉLOIGNER<br>DU <em>BRUIT.</em>', description:'Lever les yeux. Regarder entre les branches.<br>Retrouver la ville autrement.'},
  {title:'SAISIR<br>LE <em>GESTE.</em>', description:'La lumière, les mains, le mouvement.<br>Observer une scène et choisir son instant.'},
  {title:'GARDER<br>UNE <em>TRACE.</em>', description:'Trouver le rythme juste.<br>Faire durer quelque chose de ce qui passe.'}
];
let fieldIndex = 0, fieldTop = 0, fieldTravel = 1;
function setField(index) {
  if (index === fieldIndex) return;
  fieldIndex = index;
  fieldImages.forEach((img, i) => img.classList.toggle('active', i === index));
  $('.field-title').innerHTML = NOTES[index].title; // Contenu statique de confiance.
  $('.field-description').innerHTML = NOTES[index].description;
  $('.field-number').textContent = `NOTE 0${index+1} / ${PROJECTS.length}`;
  $$('[data-step]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
  if(motion)$('.field-copy').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:400});
}
function measure() {}
$$('[data-step]').forEach(b=>b.addEventListener('click',()=>setField(Number(b.dataset.step))));
// Un seul rendu par frame de défilement ; aucun moteur de scroll artificiel.
let scrollFrame = 0;
function updateScroll() {
  scrollFrame = 0;
  const y = scrollY;
  $('.header').classList.toggle('scrolled', y > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  $('.scroll-progress').style.transform = `scaleX(${max > 0 ? y/max : 0})`;
  // Mouvement tactile lié au scroll : aucun survol requis sur mobile.
  const print = $('.contact-print');
  if (print && mobile.matches && motion) {
    const section = $('#vision').getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - section.top) / (innerHeight + Math.min(section.height, 800))));
    print.style.setProperty('--print-y', `${12 - progress * 24}px`);
    print.style.setProperty('--print-angle', `${-4 + progress * 8}deg`);
  }
  if (motion) {
    if (y < innerHeight*1.5) $('.hero-media').style.setProperty('--hero-y',`${Math.min(y*.12,70)}px`);

  }
}
function scheduleScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); }
addEventListener('scroll',scheduleScroll,{passive:true});
addEventListener('resize',()=>{measure();scheduleScroll()},{passive:true});
if ('ResizeObserver' in window) new ResizeObserver(()=>{measure();scheduleScroll()}).observe(document.body);
document.fonts?.ready.then(()=>{measure();scheduleScroll()});
// Curseur contextuel et bouton magnétique. Le curseur natif est conservé.
const cursor = $('.cursor'); let pointerFrame=0, px=0, py=0;
function hideCursor() { cursor.style.opacity='0'; }
document.addEventListener('pointermove',e=>{
  if(!motion || !finePointer.matches || e.pointerType==='touch') return;
  px=e.clientX;py=e.clientY;cursor.style.opacity='1';
  if(!pointerFrame) pointerFrame=requestAnimationFrame(()=>{cursor.style.transform=`translate3d(${px}px,${py}px,0) translate(-50%,-50%)`;pointerFrame=0;});
},{passive:true});
document.addEventListener('pointerover',e=>{
  const label=e.target.closest('[data-cursor]');
  cursor.classList.toggle('labeled',!!label);
  cursor.classList.toggle('link',!label&&!!e.target.closest('a,button,input,textarea,summary'));
  cursor.querySelector('span').textContent=label?.dataset.cursor||'';
});
document.documentElement.addEventListener('pointerleave',hideCursor);addEventListener('blur',hideCursor);
$$('.magnetic').forEach(el=>{
  let frame=0,tx=0,ty=0;
  el.addEventListener('pointermove',e=>{if(!motion||!finePointer.matches)return;const r=el.getBoundingClientRect();tx=(e.clientX-r.left-r.width/2)*.17;ty=(e.clientY-r.top-r.height/2)*.17;if(!frame)frame=requestAnimationFrame(()=>{el.style.transform=`translate(${tx}px,${ty}px)`;frame=0;});});
  el.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);frame=0;el.style.transform='';});
});
// Filtres : annonce aux lecteurs d’écran et correction de la hauteur de séquence.
const projects=$$('.project'),filters=$$('[data-filter]');
filters.forEach(button=>button.addEventListener('click',()=>{
  const value=button.dataset.filter;let count=0;
  filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  $('.project-grid').classList.toggle('filtered',value!=='all');
  projects.forEach(p=>{p.hidden=value!=='all'&&p.dataset.category!==value;if(!p.hidden){count++;p.classList.remove('pending');revealObserver?.unobserve(p);if(motion)p.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,delay:count*45,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});}});
  $('.filter-count').textContent=`${String(count).padStart(2,'0')} PHOTOGRAPHIES / VUE LIBRE`;
  $('#filter-status').textContent=`${count} photographie${count>1?'s':''} affichée${count>1?'s':''}.`;
  measure();scheduleScroll();
}));
// Lecteur de projets : précédent/suivant, flèches clavier et Échap.
const dialog=$('#project-dialog');let projectIndex=0,opener;
let photoIndex=0;
function showPhoto(index){const p=PROJECTS[projectIndex];photoIndex=(index+p.photos.length)%p.photos.length;$('#dialog-image').src=photoURL(p.photos[photoIndex]);$('#dialog-image').alt=p.place+' — photographie '+(photoIndex+1)+' / '+p.photos.length+' — @tdk.dk1';$('.photo-counter').textContent=String(photoIndex+1).padStart(2,'0')+' / '+String(p.photos.length).padStart(2,'0');$$('.photo-thumbs button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===photoIndex)));}
function showProject(index){
 projectIndex=(index+PROJECTS.length)%PROJECTS.length;const p=PROJECTS[projectIndex];
 $('#dialog-title').textContent=p.title;$('#dialog-description').textContent=p.description;$('#dialog-note').textContent=p.note;$('#dialog-role').textContent=p.role;$('.dialog-type').textContent=p.type;$('.dialog-counter').textContent=`SÉRIE 0${projectIndex+1} / ${PROJECTS.length}`;
 const thumbs=$('.photo-thumbs');thumbs.replaceChildren();p.photos.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Voir la photo '+(i+1));const img=document.createElement('img');img.src=photoURL(name);img.alt='';b.append(img);b.addEventListener('click',()=>showPhoto(i));thumbs.append(b);});showPhoto(0);dialog.scrollTop=0;
}
$$('[data-photo-direction]').forEach(b=>b.addEventListener('click',()=>showPhoto(photoIndex+Number(b.dataset.photoDirection))));
$$('.project-open').forEach(b=>b.addEventListener('click',()=>{opener=b;showProject(Number(b.dataset.project));if(b.dataset.photo!==undefined)showPhoto(Number(b.dataset.photo));dialog.showModal();document.body.classList.add('modal-open');hideCursor();}));
$('.dialog-close').addEventListener('click',()=>dialog.close());
$$('[data-direction]').forEach(b=>b.addEventListener('click',()=>showProject(projectIndex+Number(b.dataset.direction))));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();showPhoto(photoIndex+(e.key==='ArrowRight'?1:-1));}});
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');opener?.focus({preventScroll:true});});
// Un réglage accessible pour les animations continues et le mouvement au scroll.
motionButton.hidden=false;
motionButton.addEventListener('click',()=>{manualMotionOff=!manualMotionOff;try{localStorage.setItem('nf-motion',manualMotionOff?'off':'on');}catch(_){}applyMotion();measure();});
reduceMotion.addEventListener('change',()=>{applyMotion();measure();});
finePointer.addEventListener('change',hideCursor);
applyMotion();measure();scheduleScroll();
// Timecode décoratif : suspendu hors du hero, onglet masqué ou mode calme.
let ticks=0;setInterval(()=>{if(!motion||document.hidden||scrollY>innerHeight)return;ticks++;const s=ticks%60,m=Math.floor(ticks/60)%60;$('.timecode').textContent=`00:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:00`;},1000);

const REELS = window.CMS.reels;
let screenIndex=0;
$$('[data-screen]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.screen);if(index===screenIndex)return;screenIndex=index;const r=REELS[index];$$('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('.screen-number').textContent='PLAN 0'+(index+1)+' / '+REELS.length;$('.screen-owner').textContent='PUBLICATION : @'+r.owner;$('.screen-original').href='https://www.instagram.com/reel/'+r.id+'/';const iframe=document.createElement('iframe');iframe.src='https://www.instagram.com/reel/'+r.id+'/embed/';iframe.title='Publication Instagram — '+r.title+' — @'+r.owner;iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';iframe.referrerPolicy='strict-origin-when-cross-origin';$('.screen-player').replaceChildren(iframe);if(motion)$('.screen-monitor').animate([{opacity:.6,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:400,easing:'ease-out'});}));
// Fondu de chapitre au scroll et inclinaison légère des couvertures.
if('IntersectionObserver' in window){const panels=new IntersectionObserver(entries=>entries.forEach(e=>{e.target.classList.toggle('on-stage',e.isIntersecting);}),{threshold:.15});$$('.atelier,.films,.contact,.manifesto').forEach(el=>panels.observe(el));}
$$('.reel-launch').forEach(el=>{let raf=0;el.addEventListener('pointermove',e=>{if(!motion||!finePointer.matches)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{el.style.transform=`perspective(800px) rotateX(${-y*4}deg) rotateY(${x*4}deg)`;});});el.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);el.style.transform='';});});

// Navigation périphérique : repères de lecture et passage au chapitre suivant.
const SCENES=['accueil','vision','recits','films','terrain','atelier','contact'];
const SCENE_LABELS=['OUVERTURE','LE REGARD','LES PHOTOS','LES FILMS','LE TERRAIN','LA FABRIQUE','LE CONTACT'];
if('IntersectionObserver' in window){const sceneObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;const i=SCENES.indexOf(e.target.id),next=i===SCENES.length-1?0:i+1;$('.next-scene').href='#'+SCENES[next];$('.next-caption').textContent=SCENE_LABELS[next];$('.next-arrow').textContent=next===0?'↑':'↓';$$('[data-rail]').forEach(a=>{const active=a.dataset.rail===e.target.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});document.body.classList.toggle('light-scene',['vision','films','atelier','contact'].includes(e.target.id));}),{rootMargin:'-20% 0px -60% 0px'});SCENES.forEach(id=>sceneObserver.observe($('#'+id)));}

// Molette : une impulsion par chapitre, sans bloquer le scroll de la page.
let wheelAmount=0,wheelLast=0,wheelLock=0;
chapterMenu.addEventListener('wheel',e=>{
 if(!chapterMenu.open||e.ctrlKey)return;
 // Sur une petite hauteur, laisser défiler le menu pour atteindre ses commandes.
 if(chapterMenu.scrollHeight>chapterMenu.clientHeight+4)return;
 e.preventDefault();const now=performance.now();if(now<wheelLock)return;
 if(now-wheelLast>180)wheelAmount=0;wheelLast=now;
 wheelAmount+=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 if(Math.abs(wheelAmount)>45){updateScene(sceneIndex+(wheelAmount>0?1:-1));wheelAmount=0;wheelLock=now+750;}
},{passive:false});
// Sons générés localement : aucune piste distante, activation volontaire.
let audioContext=null,soundEnabled=true,audioReady=false;
// Le son commence activé à chaque nouvelle visite ; le bouton le coupe pour cette session.
const soundButton=document.querySelector('.sound-toggle');
function syncSoundButton(){soundButton.textContent='SON : '+(soundEnabled?'ON':'OFF');soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'Couper les sons':'Activer les sons');}
syncSoundButton();
// Tentative audio dès l’ouverture ; reprise au premier geste si le navigateur suspend le contexte.
function unlockSound(e){
 if(!e.isTrusted||(audioReady&&audioContext?.state==='running'))return;
 audioReady=true;
 if(soundEnabled&&audioContext?.state==='suspended')audioContext.resume().catch(()=>{});
 // Le premier geste démarre le paysage sonore, sauf si le visiteur coupe le son.
 if(soundEnabled&&!soundButton.contains(e.target))playCue('step');
}
document.addEventListener('pointerdown',unlockSound,{capture:true});
document.addEventListener('keydown',unlockSound,{capture:true});
document.addEventListener('wheel',unlockSound,{capture:true,passive:true});
// Bruitages mécaniques synthétisés : miroir, rideaux et entraînement de film.
let lastCue=0;
function playCue(kind='click'){
 if(!soundEnabled||document.hidden)return;
 const now=performance.now();if(now-lastCue<65)return;lastCue=now;
 try{
 audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
 if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
 const t=audioContext.currentTime;
 function mechanism(delay,duration,frequency,volume){
 const n=Math.ceil(audioContext.sampleRate*duration),buffer=audioContext.createBuffer(1,n,audioContext.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
 const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
 source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
 gain.gain.setValueAtTime(0,t+delay);gain.gain.linearRampToValueAtTime(volume,t+delay+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+delay+duration);
 source.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);source.start(t+delay);source.stop(t+delay+duration);
 source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 if(kind==='open'){
 // Double claquement d’un obturateur et retour du miroir.
 mechanism(0,.035,900,.26);mechanism(.045,.055,2400,.18);mechanism(.105,.045,650,.12);
 }else if(kind==='step'){
 // Trois crans doux d’une molette d’avancement de pellicule.
 [0,.026,.053].forEach((d,i)=>mechanism(d,.023,1700+i*250,.10-i*.02));
 }else{mechanism(0,.025,1400,.12);mechanism(.028,.02,700,.06);}
 }catch{soundEnabled=false;soundButton.textContent='SON : OFF';soundButton.setAttribute('aria-pressed','false');soundButton.setAttribute('aria-label','Activer les sons');}
}
soundButton.addEventListener('click',()=>{soundEnabled=!soundEnabled;soundButton.textContent='SON : '+(soundEnabled?'ON':'OFF');soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.setAttribute('aria-label',soundEnabled?'Couper les sons':'Activer les sons');playCue('open');});
document.addEventListener('click',e=>{const control=e.target.closest('button,a,summary');if(!control||control===soundButton||control.matches('[data-scene],.previous-scene,.following-scene'))return;playCue(control.matches('.menu-toggle,.project-open,.scene-enter')?'open':'click');});
// Le bouton reste accessible dans le dialogue modal.
const experienceControls=$('.experience-controls');
const controlsHome=experienceControls.parentElement;
chapterMenu.addEventListener('close',()=>controlsHome.querySelector('.logo').after(experienceControls));
menu.addEventListener('click',()=>{if(chapterMenu.open)chapterMenu.querySelector('.navigator-top').append(experienceControls);});

// Le parcours photographique constitue l’écran d’accueil à chaque arrivée.
// Tout est initialisé avant l’ouverture ; aucun son sans activation volontaire.
if(window.CMS.settings?.opening!==false){openMenu();updateScene(0);chapterMenu.querySelector('.navigator-top').append(experienceControls);}

// Cliquer le plan utilise la même transition que son lien ; un balayage ne l’ouvre pas.
sceneWindow.addEventListener('click',e=>{if(e.target.closest('a,button'))return;if(suppressSceneClick){suppressSceneClick=false;return;}$('.scene-enter').click();});
sceneWindow.addEventListener('keydown',e=>{if(e.target===sceneWindow&&(e.key==='Enter'||e.key===' ')){e.preventDefault();$('.scene-enter').click();}});
$('.copy-starter').addEventListener('click',async()=>{const message=$('#starter-text');try{await navigator.clipboard.writeText(message.textContent);$('#copy-status').textContent='Message copié. Ouvrez le réseau de votre choix puis collez-le.';}catch{const range=document.createRange();range.selectNodeContents(message);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('#copy-status').textContent='Sélectionnez et copiez ce texte, puis collez-le dans Instagram.';}});

// Même amorce pour les trois réseaux de contact ; aucun envoi automatique.
$$('.copy-network').forEach(button=>button.addEventListener('click',async()=>{
 const message=$('#starter-text');if(button.dataset.network==='TIKTOK'){window.open('https://www.tiktok.com/@tdk.dk1','_blank','noopener,noreferrer');}try{await navigator.clipboard.writeText(message.textContent);button.textContent='MESSAGE COPIÉ — OUVRIR '+button.dataset.network+' ↑';if(button.dataset.network==='TIKTOK'){$('.tiktok-help').textContent='Message copié. Sur TikTok, touchez « Message » puis collez-le.';}}catch{message.scrollIntoView({behavior:motion?'smooth':'auto',block:'center'});$('#copy-status').textContent='Copiez le message ci-dessus, puis ouvrez '+button.dataset.network+'.';}
}));

// Projection automatique du menu : un plan toutes les quatre secondes.
// Son et défilement indépendants : seuls leurs boutons changent leur état.
const autoButton=document.createElement('button');autoButton.type='button';autoButton.className='auto-scenes mono';
let autoScenes=motion,autoTimer=null;
function syncAutoScenes(){autoButton.textContent=autoScenes?'DÉFILEMENT AUTO : ON Ⅱ':'DÉFILEMENT AUTO : OFF ▶';autoButton.setAttribute('aria-label',autoScenes?'Mettre le défilement automatique en pause':'Reprendre le défilement automatique');autoButton.setAttribute('aria-pressed',String(autoScenes));}
function scheduleAutoScenes(){clearTimeout(autoTimer);syncAutoScenes();if(!autoScenes||!chapterMenu.open||document.hidden)return;autoTimer=setTimeout(()=>{if(!autoScenes||!chapterMenu.open||document.hidden)return;if(!swipeStart&&!sceneAnimating)updateScene(sceneIndex+1);scheduleAutoScenes();},4000);}
function pauseAutoScenes(e){if(e&&autoButton.contains(e.target))return;autoScenes=false;clearTimeout(autoTimer);syncAutoScenes();}
autoButton.addEventListener('click',()=>{autoScenes=!autoScenes;scheduleAutoScenes();});
chapterMenu.querySelector('.navigator-controls').append(autoButton);
chapterMenu.addEventListener('close',()=>clearTimeout(autoTimer));
menu.addEventListener('click',scheduleAutoScenes);
document.addEventListener('visibilitychange',scheduleAutoScenes);
reduceMotion.addEventListener('change',()=>{if(reduceMotion.matches)pauseAutoScenes();});
motionButton.addEventListener('click',()=>{if(!motion)pauseAutoScenes();});
scheduleAutoScenes();

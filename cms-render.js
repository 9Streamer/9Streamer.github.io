// Réglages visuels appliqués au site et à son aperçu.
const settings=CMS.settings||{};
for(const key of ['accent','bg','paper','ink'])if(/^#[0-9a-f]{6}$/i.test(settings[key]||''))document.documentElement.style.setProperty('--'+key,settings[key]);
if(settings.title)document.title=settings.title;
function photoURL(name){return ''+name+(/\.(webp|png|jpg|jpeg)$/i.test(name)?'':'.webp');}
(()=>{const wall=document.querySelector('.photo-wall'),template=wall.firstElementChild.cloneNode(true);wall.replaceChildren();let total=CMS.projects.reduce((n,p)=>n+p.photos.length,0),count=0;
CMS.projects.forEach((p,i)=>p.photos.forEach((name,j)=>{const tile=template.cloneNode(true);tile.dataset.category=p.category;const b=tile.querySelector('button');b.dataset.project=i;b.dataset.photo=j;b.setAttribute('aria-label','Voir '+p.place+', photo '+(j+1));const img=tile.querySelector('img');img.src=photoURL(name);img.alt=p.alt;img.removeAttribute('height');img.removeAttribute('width');tile.querySelector('.tile-number').textContent=String(++count).padStart(2,'0')+' / '+total;tile.querySelector('.project-caption span').textContent=p.place;wall.append(tile);}));
const badge=document.querySelector('.filters button span');if(badge)badge.textContent=total;
const playlist=document.querySelector('.playlist'),bt=playlist.firstElementChild.cloneNode(true);playlist.replaceChildren();CMS.reels.forEach((r,i)=>{const b=bt.cloneNode(true);b.dataset.screen=i;b.setAttribute('aria-pressed',String(i===0));b.setAttribute('aria-label','Film '+(i+1)+' : '+r.title);b.children[0].textContent=String(i+1).padStart(2,'0');b.children[1].textContent=r.title;const small=document.createElement('small');small.textContent='@'+r.owner;b.children[1].append(small);playlist.append(b);});
if(CMS.reels.length){const r=CMS.reels[0],frame=document.querySelector('.screen-player iframe');if(frame){frame.src='https://www.instagram.com/reel/'+r.id+'/embed/';frame.removeAttribute('data-src');}document.querySelector('.screen-original').href='https://www.instagram.com/reel/'+r.id+'/';document.querySelector('.screen-owner').textContent='PUBLICATION : @'+r.owner;}
})();

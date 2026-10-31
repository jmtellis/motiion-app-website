'use strict';
const $=id=>document.getElementById(id), config=window.ROSTER_CONFIG;
const token=decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1)||'');
const validToken=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token);
let expiryTimer, accessRingTimer, generation=0;
let mobileListView=false, rosterProfiles=[], activeProfileIndex=-1;
let disposeGallery = () => {};
function text(tag,value,className){const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;}
function photo(p){let url;try{url=new URL(p.headshot_url);}catch{} if(url&&url.protocol==='https:'){const img=document.createElement('img');img.src=url.href;img.alt=p.full_name||'Talent';img.className='photo';img.loading='lazy';img.referrerPolicy='no-referrer';return img;}return text('div',(p.full_name||'M').slice(0,1),'photo');}
function tags(values){const el=document.createElement('div');el.className='tags';for(const value of values.filter(v=>typeof v==='string'))el.append(text('span',value,'tag'));return el;}
function safeMediaURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function externalLink(label,url,className){const a=text('a',label.replace(' ↗',''),className);if(label.endsWith(' ↗'))a.append(arrowIcon('inline-arrow'));a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function stopMedia(){document.querySelectorAll('#media-content video').forEach(v=>v.pause());$('media-content').replaceChildren();}
function openMedia(node,label){stopMedia();$('media-content').append(node);$('media-title').textContent=label;$('media-view').showModal();}
function headshotGallery(p){
 const gallery=text('div','','quick-portrait');
 const url=safeMediaURL(p.headshot_url)||(Array.isArray(p.headshot_urls)?p.headshot_urls.map(safeMediaURL).find(Boolean):null);
 const image=photo({...p,headshot_url:url});
 if(url){const button=text('button','','headshot-slide');button.setAttribute('aria-label','Enlarge headshot');const expand=text('span','','headshot-expand');expand.setAttribute('aria-hidden','true');expand.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>';button.append(image,expand);button.onclick=()=>openMedia(photo({...p,headshot_url:url}),(p.full_name||'Talent')+' — Headshot');gallery.append(button);}else gallery.append(image);
 return gallery;
}
function identityChips(p){
 const group=text('div','','tags identity-chips');
 if(p.representation){const chip=text('span','','tag');const logo=safeMediaURL(p.agency_logo_url);if(logo){const img=document.createElement('img');img.src=logo;img.alt='';img.onerror=()=>img.remove();chip.append(img);}chip.append(document.createTextNode(p.representation));group.append(chip);}
 if(p.union_status)group.append(text('span',p.union_status,'tag'));return group;
}
function compactTags(label,items){
 const values=Array.isArray(items)?items.filter(v=>typeof v==='string'&&v.trim()):[];if(!values.length)return null;
 const section=text('section','','quick-tags');if(label)section.append(text('h3',label));
 section.append(tags(values.slice(0,5)));if(values.length>5){const more=text('details');more.append(text('summary','Show '+(values.length-5)+' more'),tags(values.slice(5)));section.append(more);}return section;
}
function openProfile(p){
 activeProfileIndex=rosterProfiles.findIndex(item=>item.id===p.id);
 const body=text('div','','bio');const name=text('h2',p.full_name||'Talent');name.id='profile-name';
 const identity=text('div','','profile-identity');identity.append(name,text('p',[p.location,p.height].filter(Boolean).join(' · '),'profile-essentials'));body.append(identity);
 body.append(identityChips(p));
 const highlights=(Array.isArray(p.profile_highlights)?p.profile_highlights:[]).filter(h=>h&&typeof h.title==='string'&&h.title.trim()).slice(0,3);
 if(highlights.length){const section=text('section','','quick-highlights');section.append(text('h3','Selected highlights'));const list=text('ul');for(const h of highlights){const item=text('li');const experience=(Array.isArray(p.experiences)?p.experiences:[]).find(e=>e&&(h.experience_id||h.experienceId)&&e.id===(h.experience_id||h.experienceId));const url=[h.image_url,h.imageUrl,experience?.image_url,experience?.imageUrl,experience?.tv_film_project_poster_url,experience?.production_company_image_url,experience?.main_talent_image_url].map(safeMediaURL).find(Boolean);if(url){const image=document.createElement('img');image.src=url;image.alt='';image.loading='lazy';image.className='highlight-thumbnail';image.onerror=()=>image.remove();item.append(image);}const copy=text('div','','highlight-copy');copy.append(text('strong',h.title));if(h.subtitle)copy.append(text('span',h.subtitle));item.append(copy);list.append(item);}section.append(list);body.append(section);}
 for(const [label,items] of [['Genres',p.styles],['',p.skills]]){const section=compactTags(label,items);if(section)body.append(section);}
 body.append(socialLinks(p));
 const actions=text('div','','quick-actions');
 actions.append(externalLink('View full profile ↗','https://www.motiion.app/profile/'+encodeURIComponent(p.id),'primary-action'));
 $('mobile-profile-action').replaceChildren(externalLink('View full profile ↗','https://www.motiion.app/profile/'+encodeURIComponent(p.id),'primary-action'));
 body.append(actions);const content=text('div','','bio-content');for(const child of [...body.children])if(child!==identity)content.append(child);body.append(content);$('detail').replaceChildren(headshotGallery(p),body);
 $('profile-position').textContent=(activeProfileIndex+1)+' of '+rosterProfiles.length;
 $('previous-profile').disabled=activeProfileIndex<=0;$('next-profile').disabled=activeProfileIndex>=rosterProfiles.length-1;
 body.scrollTop=0;$('detail').scrollTop=0;if(!$('profile').open)$('profile').showModal();
}
function unavailable(message='This link may have expired or been revoked. Ask the sender for a new link.'){clearInterval(accessRingTimer);disposeRoster();rosterProfiles=[];$('media-view').close();stopMedia();$('profile').close();$('sharing').hidden=true;document.querySelector('.view-toggle').hidden=true;$('grid').replaceChildren();$('title').textContent='This roster is unavailable.';$('status').textContent=message;}
async function api(path,options={}){const response=await fetch(config.url+'/rest/v1/'+path,{...options,headers:{apikey:config.key,Authorization:'Bearer '+config.key,'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Request failed');return response.json();}
async function load(){if(!validToken){if(token)unavailable();return;}const run=++generation;clearTimeout(expiryTimer);$('retry').hidden=true;$('status').textContent='Loading your shared roster…';try{const roster=await api('rpc/read_public_roster',{method:'POST',body:JSON.stringify({p_token:token})});if(run!==generation)return;if(!roster){unavailable();return;}const profiles=[];for(let i=0;i<roster.profileIds.length;i+=50){const ids=roster.profileIds.slice(i,i+50);profiles.push(...await api('talent?id=in.('+ids.join(',')+')&select=id,full_name,headshot_url,location,representation,agency_logo_url,username,height,styles,skills,bio,union_status,headshot_urls,instagram_url,youtube_url,profile_highlights,experiences'));}if(run!==generation)return;profiles.sort((a,b)=>roster.profileIds.indexOf(a.id)-roster.profileIds.indexOf(b.id));$('title').textContent=roster.name||'Your shared roster';$('status').textContent=profiles.length?`${profiles.length} ${profiles.length===1?'person':'people'} in this roster`:'No public profiles are available in this roster yet.';$('sharing').hidden=false;$('sender-name').textContent='Shared by '+(roster.sharedBy?.name||'your collaborator');$('access').textContent=roster.expiresAt?'Access until '+new Date(roster.expiresAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'No expiration date';$('sender-avatar').replaceChildren(photo({full_name:roster.sharedBy?.name||'M',headshot_url:roster.sharedBy?.avatarUrl}));renderRoster(profiles);startAccessRing(roster);if(roster.expiresAt){const ms=new Date(roster.expiresAt).getTime()-Date.now();if(ms<=0){unavailable();return;}expiryTimer=setTimeout(()=>load(),Math.min(ms+100,2147483647));}}catch{if(run!==generation)return;unavailable('We couldn’t load this roster. Check your connection and try again.');$('retry').hidden=false;}}
$('close').onclick=()=>$('profile').close();$('profile').onclick=e=>{if(e.target===$('profile'))$('profile').close();};$('retry').onclick=load;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')load();});load();


function disposeRoster(){disposeGallery();disposeGallery=()=>{};}
function socialLinks(p){
 const links=document.createElement('div');links.className='socials';
 const icons={Instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none"/>',YouTube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z"/>'};
 for(const [label,value] of [['Instagram',p.instagram_url],['YouTube',p.youtube_url]]){
  if(!value)continue;let url;try{url=new URL(value);}catch{continue;}if(!['https:','http:'].includes(url.protocol))continue;
  const a=document.createElement('a');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',label+' — '+(p.full_name||'Profile'));a.title=label;
  // Only fixed, authored icon markup enters innerHTML. Profile data uses textContent.
  a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'+icons[label]+'</svg>';
  links.append(a);
 }
 return links;
}
function rosterCard(p,index){
 const article=document.createElement('article');article.className='talent-card';
 const button=document.createElement('button');button.className='portrait-button';button.setAttribute('aria-label','View '+(p.full_name||'profile'));
 button.append(photo(p),text('span',String(index+1).padStart(2,'0'),'portrait-number'));button.onclick=()=>openProfile(p);
 const meta=document.createElement('div');meta.className='card-meta';
 const name=document.createElement('button');name.className='name-button';name.append(text('h2',p.full_name||'Talent'));name.onclick=()=>openProfile(p);
 const summary=document.createElement('div');summary.append(name,text('p',[p.location,p.height].filter(Boolean).join(' / ')));
 summary.append(socialLinks(p));const action=text('button','','list-profile-action');action.setAttribute('aria-label','View '+(p.full_name||'profile'));action.append(arrowIcon('inline-arrow'));action.onclick=()=>openProfile(p);meta.append(summary,action);article.append(button,meta);return article;
}
function renderRoster(profiles){
 rosterProfiles=profiles;
 disposeRoster();
 const grid=$('grid');
 document.querySelector('.view-toggle').hidden=!profiles.length;
 grid.className=mobileListView?'list-view':'';
 grid.replaceChildren(...profiles.map((p,i)=>rosterCard(p,i)));
}

function arrowIcon(className){const el=document.createElement('span');el.className=className;el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18 18 6M6 6h12v12"/></svg>';return el;}
function setMobileLayout(list){mobileListView=list;$('grid').classList.toggle('list-view',list);$('grid-view').setAttribute('aria-pressed',String(!list));$('list-view').setAttribute('aria-pressed',String(list));}
$('grid-view').onclick=()=>setMobileLayout(false);$('list-view').onclick=()=>setMobileLayout(true);

// Reveal the background wordmark only near the end of the roster.
let wordmarkFrame=0;
function updateWordmarkReveal(){
 wordmarkFrame=0;
 if(document.documentElement.classList.contains('modal-scroll-locked'))return;
 document.querySelector('header').classList.toggle('is-scrolled',window.scrollY>2);
 const grid=$('grid');
 const length=window.innerWidth<=600?110:180;
 const remaining=Math.max(0,document.documentElement.scrollHeight-window.innerHeight-window.scrollY);
 const progress=grid.childElementCount?Math.max(0,Math.min(1,1-remaining/length)):0;
 document.documentElement.style.setProperty('--wordmark-reveal',String(progress*progress*(3-2*progress)));
}
function queueWordmarkReveal(){if(!wordmarkFrame)wordmarkFrame=requestAnimationFrame(updateWordmarkReveal);}
window.addEventListener('scroll',queueWordmarkReveal,{passive:true});
window.addEventListener('resize',queueWordmarkReveal,{passive:true});
new ResizeObserver(queueWordmarkReveal).observe($('grid'));
updateWordmarkReveal();

function startAccessRing(roster){
 clearInterval(accessRingTimer);
 const end=roster.expiresAt?Date.parse(roster.expiresAt):null;
 const start=Date.parse(roster.createdAt);
 function update(){
  const remaining=end===null?null:Math.max(0,end-Date.now());
  const fraction=end===null?1:Number.isFinite(start)&&end>start?Math.max(0,Math.min(1,remaining/(end-start))):1;
  $('sharing').style.setProperty('--access-offset',String(100*(1-fraction)));
  const duration=remaining===null?'No expiration date':remaining>=86400000?Math.ceil(remaining/86400000)+' days remaining':remaining>=3600000?Math.ceil(remaining/3600000)+' hours remaining':Math.ceil(remaining/60000)+' minutes remaining';
  $('sharing').setAttribute('aria-label','Sharing details — '+duration);
  $('sharing').title=duration;
 }
 update();accessRingTimer=setInterval(update,30000);
}
// Same Lenis tuning as the main website; native touch and reduced-motion are preserved.
let smoothScroll, smoothFrame=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function configureSmoothScroll(){
 cancelAnimationFrame(smoothFrame);smoothScroll?.destroy();smoothScroll=null;
 if(reducedMotion.matches||!window.Lenis)return;
 smoothScroll=new Lenis({lerp:.075,duration:1.25,smoothWheel:true,syncTouch:false,wheelMultiplier:.9,overscroll:false});
 function frame(time){smoothScroll.raf(time);smoothFrame=requestAnimationFrame(frame);}
 smoothFrame=requestAnimationFrame(frame);
}
reducedMotion.addEventListener('change',configureSmoothScroll);configureSmoothScroll();
// Fix the document in place so native mobile touch scrolling cannot move the roster.
let pageScrollLock=null;
function syncModalScrollLock(){
 const open=$('profile').open||$('media-view').open;
 if(open&&!pageScrollLock){
  pageScrollLock={x:window.scrollX,y:window.scrollY,bodyStyle:document.body.getAttribute('style')};
  smoothScroll?.stop();
  document.documentElement.classList.add('modal-scroll-locked');
  Object.assign(document.body.style,{position:'fixed',top:-pageScrollLock.y+'px',left:-pageScrollLock.x+'px',width:'100%',overflow:'hidden'});
 }else if(!open&&pageScrollLock){
  const saved=pageScrollLock;pageScrollLock=null;
  if(saved.bodyStyle===null)document.body.removeAttribute('style');else document.body.setAttribute('style',saved.bodyStyle);
  document.documentElement.classList.remove('modal-scroll-locked');
  window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
  smoothScroll?.start();queueWordmarkReveal();
 }
}
const modalScrollObserver=new MutationObserver(syncModalScrollLock);
for(const dialog of [$('profile'),$('media-view')]){
 modalScrollObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',syncModalScrollLock);
 dialog.addEventListener('touchmove',e=>{if(e.target===dialog)e.preventDefault();},{passive:false});
}


$('previous-profile').onclick=()=>{if(activeProfileIndex>0)openProfile(rosterProfiles[activeProfileIndex-1]);};
$('next-profile').onclick=()=>{if(activeProfileIndex<rosterProfiles.length-1)openProfile(rosterProfiles[activeProfileIndex+1]);};
$('media-close').onclick=()=>$('media-view').close();
$('media-view').addEventListener('close',stopMedia);
$('media-view').onclick=e=>{if(e.target===$('media-view'))$('media-view').close();};
// iOS opens the installed app, with an App Store fallback. Android remains web until released.
const iosDevice=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const storeURL='https://apps.apple.com/app/id6759847766';
const discoverCTA=$('discover-motion');discoverCTA.textContent='Find them on Motion';discoverCTA.append(arrowIcon('inline-arrow'));
if(iosDevice){
 discoverCTA.textContent='Open Motion';discoverCTA.href='motiion://';
 const fallback=externalLink('Get the iPhone app',storeURL,'store-fallback');discoverCTA.after(fallback);
 discoverCTA.addEventListener('click',()=>{
  const timer=setTimeout(()=>{cleanup();if(document.visibilityState==='visible')location.href=storeURL;},1800);
  function cleanup(){clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',cleanup);}
  function hidden(){if(document.visibilityState==='hidden')cleanup();}
  document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',cleanup,{once:true});
 });
}else if(/Android/.test(navigator.userAgent)&&safeMediaURL(config.androidStoreUrl)){
 discoverCTA.textContent='Get Motion';discoverCTA.href=config.androidStoreUrl;
}


// Touch and pointer focus should not inherit keyboard-only focus rings.
document.addEventListener('pointerdown',()=>document.documentElement.classList.remove('keyboard-focus'),true);
document.addEventListener('keydown',e=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))document.documentElement.classList.add('keyboard-focus');},true);

setInterval(async()=>{if(!validToken||document.visibilityState!=='visible'||!rosterProfiles.length)return;try{const roster=await api('rpc/read_public_roster',{method:'POST',body:JSON.stringify({p_token:token})});if(!roster){++generation;unavailable();}}catch{/* Retry on next heartbeat; expiry is independently enforced. */}},30000);

// Public HTML5 MP4 samples with known browser playback support.
const M=[
['bbb','Big Buck Bunny',2008,['Animation','Comedy','Family'],7.2,10,'https://media.w3.org/2010/05/bunny/trailer.mp4','Big Buck Bunny sample trailer.'],
['sintel','Sintel',2010,['Animation','Fantasy','Adventure'],7.5,1,'https://media.w3.org/2010/05/sintel/trailer.mp4','Sintel sample trailer with AAC audio.'],
['bbb-movie','Big Buck Bunny — Movie',2008,['Animation','Comedy','Family'],7.1,10,'https://media.w3.org/2010/05/bunny/movie.mp4','Big Buck Bunny sample movie.'],
['movie300','HTML5 Movie Sample',2010,['Classic','Sample'],6.9,5,'https://media.w3.org/2010/05/video/movie_300.mp4','W3C HTML5 MP4 sample.'],
['oceans','Oceans Sample',2014,['Nature','Documentary'],7.0,5,'https://vjs.zencdn.net/v/oceans.mp4','Video.js public MP4 sample.'],
['flower','Flower Sample',2020,['Nature','Sample'],6.8,1,'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4','MDN public MP4 sample.'],
['clear-layout','Clear Layout',2018,['Accessibility','Documentary'],6.6,2,'https://media.w3.org/wai/perspective-videos/clear-layout-design.mp4','W3C accessibility video sample.'],
['notifications','Notifications Feedback',2018,['Accessibility','Documentary'],6.5,2,'https://media.w3.org/wai/perspective-videos/notifications-feedback.mp4','W3C accessibility video sample.'],
].map(([id,title,year,cats,rating,mins,url,desc])=>({id,title,year,cats,rating,mins,url,desc}));
const CATS=[...new Set(M.flatMap(m=>m.cats))].sort();
const byId=id=>M.find(m=>m.id===id);
const lev=(a,b)=>{const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[b.length]};
const tok=(q,w)=>w.startsWith(q)?1:w.includes(q)?.85:Math.max(0,1-Math.min(lev(q,w),lev(q,w.slice(0,q.length+1)))/Math.max(q.length,3));
function fuzzy(q,text){const qs=q.toLowerCase().split(/\W+/).filter(Boolean);if(!qs.length)return 1;const ws=text.toLowerCase().split(/\W+/).filter(Boolean);return qs.reduce((s,x)=>s+Math.max(0,...ws.map(w=>tok(x,w))),0)/qs.length}
function search({q='',cat='',minRating=0,sort=''}={}){
  let r=M.filter(m=>(!cat||m.cats.includes(cat))&&m.rating>=minRating).map(m=>({...m,score:q?Math.max(fuzzy(q,m.title),.9*fuzzy(q,[m.title,m.desc,...m.cats].join(' '))):1}));
  if(q)r=r.filter(m=>m.score>=.6);
  const by={rating:(a,b)=>b.rating-a.rating,year:(a,b)=>b.year-a.year,title:(a,b)=>a.title.localeCompare(b.title)}[sort]||(q?(a,b)=>b.score-a.score:(a,b)=>b.rating-a.rating);
  return r.sort(by);
}
module.exports={movies:M,CATS,byId,search,fuzzy};

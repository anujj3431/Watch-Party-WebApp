// Open-licensed sample videos (Blender Foundation films + Google sample clips).
const B='https://storage.googleapis.com/gtv-videos-bucket/sample/';
const M=[
['bbb','Big Buck Bunny',2008,['Animation','Comedy','Family'],7.2,10,'BigBuckBunny','A giant rabbit takes comic revenge on three bullying rodents.'],
['sintel','Sintel',2010,['Animation','Fantasy','Adventure'],7.5,15,'Sintel','A lonely girl searches the world for her lost dragon.'],
['tos','Tears of Steel',2012,['Sci-Fi','Action'],6.8,12,'TearsOfSteel','Warriors and scientists battle robots in Amsterdam.'],
['ed','Elephants Dream',2006,['Animation','Sci-Fi','Surreal'],6.1,11,'ElephantsDream','Two men explore a strange, surreal machine world.'],
['fbb','For Bigger Blazes',2013,['Short','Action'],6.0,1,'ForBiggerBlazes','Fire and spectacle in a quick short.'],
['fbe','For Bigger Escapes',2013,['Short','Adventure'],6.1,1,'ForBiggerEscapes','A short getaway adventure.'],
['fbf','For Bigger Fun',2013,['Short','Comedy'],5.9,1,'ForBiggerFun','A short, playful clip.'],
['fbj','For Bigger Joyrides',2013,['Short','Action'],6.2,1,'ForBiggerJoyrides','A joyride in a short clip.'],
['sub','Subaru Outback: Street and Dirt',2013,['Auto','Documentary'],6.4,7,'SubaruOutbackOnStreetAndDirt','An Outback tackles pavement and dirt roads.'],
['vw','Volkswagen GTI Review',2013,['Auto','Documentary'],6.3,10,'VolkswagenGTIReview','A hands-on look at the GTI.'],
['bull','We Are Going On Bullrun',2013,['Auto','Adventure'],6.5,5,'WeAreGoingOnBullrun','A road rally across the country.'],
].map(([id,title,year,cats,rating,mins,f,desc])=>({id,title,year,cats,rating,mins,url:B+f+'.mp4',desc}));
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
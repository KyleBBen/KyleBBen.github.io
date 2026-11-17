const $=id=>document.getElementById(id);
const demo=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1200" viewBox="0 0 600 1200"><rect width="600" height="1200" fill="white"/><g stroke="#25344e" stroke-width="7" stroke-linejoin="round"><path d="M300 90V40"/><circle cx="300" cy="35" r="16" fill="#f4b553"/><rect x="160" y="105" width="280" height="240" rx="56" fill="#7197e0"/><rect x="190" y="140" width="220" height="125" rx="24" fill="#263a59"/><g fill="#98f0df" stroke="none"><rect x="220" y="178" width="32" height="43" rx="16"/><rect x="347" y="178" width="32" height="43" rx="16"/></g><path d="M250 296h100"/><path d="M264 346v38h72v-38" fill="#a7b7c9"/><path d="M180 389h240l26 284-68 48H222l-68-48z" fill="#7197e0"/><path d="M214 427h172v150H214z" fill="#f4b553"/><circle cx="300" cy="500" r="42" fill="#fff2c8"/><path d="M300 474v53m-26-26h52"/><path d="M190 620h220M235 650h130"/><g fill="#f4b553"><path d="M158 399l-65 31-39 222 67 17 68-225z"/><path d="M442 399l65 31 39 222-67 17-68-225z"/></g><g fill="#a7b7c9"><circle cx="84" cy="700" r="40"/><circle cx="516" cy="700" r="40"/><path d="M222 722l-19 305h80l12-305z"/><path d="M305 722l12 305h80l-19-305z"/></g><g fill="#7197e0"><path d="M193 1027h99v110H144v-66z"/><path d="M308 1027h99l49 44v66H308z"/></g><g fill="#25344e" stroke="none"><rect x="217" y="810" width="62" height="30" rx="6"/><rect x="321" y="810" width="62" height="30" rx="6"/></g></g></svg>`;
let source=URL.createObjectURL(new Blob([demo],{type:'image/svg+xml'})),isDemo=true,isVector=true,hasRaster=false,pxW=600,pxH=1200,H=1700,W=850,units='cm',tiles=true;
$('preview').src=source;
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',5500)}
function config(){let [pw,ph]=({letter:[215.9,279.4],a4:[210,297],a3:[297,420]})[$('paper').value];if($('orientation').value==='landscape')[pw,ph]=[ph,pw];let m=Number($('margin').value),o=Number($('overlap').value);if(!Number.isFinite(m)||m<5||m>30||!Number.isFinite(o)||o<5||o>30)throw Error('Choose margins and overlap between 5 and 30 mm.');const tw=pw-2*m,th=ph-2*m,sx=tw-o,sy=th-o;return{pw,ph,m,o,tw,th,sx,sy,cols:Math.max(1,Math.ceil((W-o)/sx)),rows:Math.max(1,Math.ceil((H-o)/sy))}}
function unitFactor(){return {cm:10,in:25.4,ft:304.8}[units]}
function dimensions(){const factor=unitFactor();$('height').value=+(H/factor).toFixed(2);$('width').value=+(W/factor).toFixed(2)}
function render(){let c;try{c=config()}catch(e){toast(e.message);return}const n=c.rows*c.cols;const dpi=Math.round(pxH/(H/25.4));$('pagecount').textContent=n;$('sheetstat').textContent=n;$('gridstat').textContent=`${c.cols} × ${c.rows}`;$('dpistat').textContent=isVector?(hasRaster?'SVG · mixed':'Vector'):`${dpi} DPI`;$('dimensions').textContent=`${(W/unitFactor()).toFixed(2)} × ${(H/unitFactor()).toFixed(2)} ${units} · ${c.o} mm overlap`;
const human=$('human-toggle').checked;
const available=Math.max(100,document.querySelector('.canvas-area').clientWidth-64);
const scale=Math.min(470/Math.max(H,human?1700:0),440/W,available/(W+(human?620:0)));
$('artboard').style.width=W*scale+'px';$('artboard').style.height=H*scale+'px';$('artboard').style.aspectRatio=W+'/'+H;
$('human-reference').hidden=!human;
$('human-reference').style.width=500*scale+'px';$('human-reference').style.height=1700*scale+'px';
$('scale-stage').style.gap=human?120*scale+'px':'0px';$('scale-stage').classList.toggle('with-human',human);
$('quality').classList.toggle('warn',isVector?hasRaster:dpi<150);
$('qualitytitle').textContent=isVector?(hasRaster?'SVG · contains image elements':isDemo?'Vector demo · crisp at any size':'SVG · resolution-independent artwork'):`${dpi} DPI · ${dpi>=150?'Good source detail':dpi>=75?'Best viewed from a distance':'Low source detail'}`;
$('qualitytext').textContent=isVector?(hasRaster?'Vector shapes scale cleanly. Embedded photos and raster effects can soften when enlarged.':'Vector artwork is kept as SVG for preview and print, without converting it to a bitmap. Convert text to paths for consistent fonts.'):`${pxW.toLocaleString()} × ${pxH.toLocaleString()} pixels. ${dpi<150?'Enlarging cannot restore missing detail. Try a larger original or a smaller print.':'The original pixels are retained in print output.'}`;

$('grid').replaceChildren();$('grid').style.display=tiles?'block':'none';if(n>500){toast('More than 500 sheets. Reduce the size to enable preview and printing.');return}for(let r=0;r<c.rows;r++)for(let col=0;col<c.cols;col++){const el=document.createElement('div');el.className='tile';Object.assign(el.style,{left:col*c.sx/W*100+'%',top:r*c.sy/H*100+'%',width:Math.min(c.tw,W-col*c.sx)/W*100+'%',height:Math.min(c.th,H-r*c.sy)/H*100+'%'});el.innerHTML=`<span>${r+1} · ${col+1}</span>`;$('grid').append(el)}}
async function loadFile(file){
if(!file)return;
const svg=file.type==='image/svg+xml'||/\.svg$/i.test(file.name);
if(!svg&&!['image/png','image/jpeg','image/webp'].includes(file.type)){toast('Please choose an SVG, PNG, JPG or WebP image.');return}
let url;
try{
let payload=file,raster=false;
if(svg){
 const text=await file.text();
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 const root=doc.documentElement;
 if(doc.querySelector('parsererror')||root.localName!=='svg')throw Error('This SVG is not valid. Export it again as a plain SVG.');
 if(root.namespaceURI&&root.namespaceURI!=='http://www.w3.org/2000/svg')throw Error('This file does not use the SVG namespace.');
 root.setAttribute('xmlns','http://www.w3.org/2000/svg');
 // SVG stays in an isolated image context, never inserted as executable page markup.
 if(root.querySelector('foreignObject'))throw Error('Export this artwork as plain SVG without foreignObject / HTML content.');
 const vb=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 const validBox=vb.length===4&&vb.every(Number.isFinite)&&vb[2]>0&&vb[3]>0;
 const absolute=v=>v&&/^\s*(?:\d*\.)?\d+(?:px|mm|cm|in|pt|pc|q)?\s*$/i.test(v)&&parseFloat(v)>0;
 const aw=absolute(root.getAttribute('width')),ah=absolute(root.getAttribute('height'));
 if(!validBox&&(!aw||!ah))throw Error('SVG needs a valid viewBox or positive width and height.');
 if(validBox&&(!aw||!ah)){
  // Avoid the browser default 300 × 150 size for viewBox-only files.
  if(!aw&&!ah){root.setAttribute('width',vb[2]);root.setAttribute('height',vb[3]);}
  else if(aw){root.setAttribute('height',parseFloat(root.getAttribute('width'))*vb[3]/vb[2]+(root.getAttribute('width').match(/[a-z]+/i)?.[0]||''));}
  else{root.setAttribute('width',parseFloat(root.getAttribute('height'))*vb[2]/vb[3]+(root.getAttribute('height').match(/[a-z]+/i)?.[0]||''));}
 }
 raster=!!root.querySelector('image, feImage');
 for(const el of root.querySelectorAll('image, feImage, use')){
  const href=el.getAttribute('href')||el.getAttributeNS('http://www.w3.org/1999/xlink','href')||'';
  if(href&&!href.startsWith('#')&&!href.startsWith('data:'))throw Error('Embed linked images and symbols in your SVG before uploading. External files are not loaded.');
 }
 payload=new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'});
}
url=URL.createObjectURL(payload);const im=new Image();im.src=url;await im.decode();
if(!im.naturalWidth||!im.naturalHeight)throw Error('This image has no usable dimensions.');
const prev=source;source=url;pxW=im.naturalWidth;pxH=im.naturalHeight;isDemo=false;isVector=svg;hasRaster=raster;W=H*pxW/pxH;
$('preview').src=url;$('fileinfo').textContent=svg?`${file.name} · SVG vector artwork${raster?' · embedded images':''}`:`${file.name} · ${pxW} × ${pxH} px`;
URL.revokeObjectURL(prev);dimensions();render();
}catch(e){if(url)URL.revokeObjectURL(url);toast(e.message==='The source image cannot be decoded.'?'That image could not be opened. Try re-exporting it.':e.message||'That image could not be opened.');}
}

$('file').onchange=e=>loadFile(e.target.files[0]);$('drop').ondragover=e=>{e.preventDefault();$('drop').classList.add('over')};$('drop').ondragleave=()=>$('drop').classList.remove('over');$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('over');loadFile(e.dataTransfer.files[0])};
for(const id of ['height','width'])$(id).onchange=()=>{let v=Number($(id).value),f=unitFactor();if(!Number.isFinite(v)||v*f<10||v*f>10000){toast('Use a size between 1 and 1,000 cm.');dimensions();return}if(id==='height'){H=v*f;W=H*pxW/pxH}else{W=v*f;H=W*pxH/pxW}dimensions();render()};
$('units').onchange=()=>{units=$('units').value;dimensions();render()};for(const id of ['paper','orientation','margin','overlap'])$(id).onchange=render;
$('human-toggle').onchange=render;window.addEventListener('resize',render);
$('tiles-tab').onclick=()=>{tiles=true;$('tiles-tab').classList.add('active');$('art-tab').classList.remove('active');render()};$('art-tab').onclick=()=>{tiles=false;$('art-tab').classList.add('active');$('tiles-tab').classList.remove('active');render()};$('reset').onclick=()=>{H=1700;W=H*pxW/pxH;$('paper').value='letter';$('orientation').value='portrait';$('margin').value=10;$('overlap').value=10;units='cm';$('units').value='cm';dimensions();render()};$('help').onclick=()=>$('guide').showModal();$('closehelp').onclick=()=>$('guide').close();
function element(cls,parent,styles={},text){const el=document.createElement('div');el.className=cls;for(const [k,v]of Object.entries(styles))el.style[k]=typeof v==='number'?v+'mm':v;if(text)el.textContent=text;parent.append(el);return el}
function setPrintSize(c){let style=$('page-style');if(!style){style=document.createElement('style');style.id='page-style';document.head.append(style)}style.textContent=`@page{size:${c.pw}mm ${c.ph}mm;margin:0}`}
async function printJob(test=false){let c;try{c=config()}catch(e){toast(e.message);return}if(!test&&c.cols*c.rows>500){toast('Please reduce the size to 500 sheets or fewer.');return}const root=$('print-root');root.replaceChildren();setPrintSize(c);const imgs=[];if(test){const page=element('print-page',root,{width:c.pw,height:c.ph});element('print-label',page,{left:20,top:20},'CUTOUT STUDIO · Scale test · Print at 100% / Actual size');element('',page,{left:20,top:40,width:50,height:50,position:'absolute',border:'.2mm solid black'});element('print-label',page,{left:20,top:98},'Measure the OUTSIDE of this square: 50 × 50 mm.');element('print-label',page,{left:20,top:108},'If it differs, correct print scaling before printing your cutout.')}else{for(let r=0;r<c.rows;r++)for(let col=0;col<c.cols;col++){const p=element('print-page',root,{width:c.pw,height:c.ph});const win=element('print-window',p,{left:c.m,top:c.m,width:c.tw,height:c.th});const im=new Image();im.src=source;Object.assign(im.style,{left:-col*c.sx+'mm',top:-r*c.sy+'mm',width:W+'mm',height:H+'mm'});win.append(im);imgs.push(im);if($('labels').checked){element('print-label',p,{left:c.m,top:2},`CUTOUT STUDIO · Row ${r+1} / Column ${col+1} · Page ${r*c.cols+col+1} of ${c.rows*c.cols}`);element('print-label',p,{left:c.m,top:c.ph-6},'100% / Actual size · Trim LEFT & TOP dashed edges, then align targets');}if($('guides').checked){if(col>0)element('cutline',p,{left:c.m+c.o/2,top:c.m,width:0,height:c.th});if(r>0)element('cutline',p,{left:c.m,top:c.m+c.o/2,width:c.tw,height:0});/* marks use global coordinates so targets match exactly across overlaps */
for(let cc=Math.max(0,col-1);cc<=Math.min(c.cols-2,col);cc++){let x=(cc+1)*c.sx+c.o/2-col*c.sx;for(let rr=r;rr<=r+1;rr++){let y=rr*c.sy+c.o/2-r*c.sy;if(y>=0&&y<=c.th)element('reg',p,{left:c.m+x,top:c.m+y})}}
for(let rr=Math.max(0,r-1);rr<=Math.min(c.rows-2,r);rr++){let y=(rr+1)*c.sy+c.o/2-r*c.sy;for(let cc=col;cc<=col+1;cc++){let x=cc*c.sx+c.o/2-col*c.sx;if(x>=0&&x<=c.tw)element('reg',p,{left:c.m+x,top:c.m+y})}}}}}
try{await Promise.all(imgs.map(i=>i.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));window.print()}catch{toast('Unable to prepare images for printing. Please reload your artwork.')}}
$('print').onclick=()=>printJob(false);$('calibrate').onclick=()=>printJob(true);dimensions();render();

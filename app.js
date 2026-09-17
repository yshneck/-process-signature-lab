const $=id=>document.getElementById(id);
let bitmap=null,lastResult=null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function mean(a){let s=0;for(const x of a)s+=x;return s/a.length}
function variance(a,m=mean(a)){let s=0;for(const x of a){let d=x-m;s+=d*d}return s/a.length}
function corr(a,b){let ma=mean(a),mb=mean(b),sa=0,sb=0,sab=0;for(let i=0;i<a.length;i++){let x=a[i]-ma,y=b[i]-mb;sa+=x*x;sb+=y*y;sab+=x*y}return sab/Math.sqrt(sa*sb+1e-12)}
function entropy(hist,n){let e=0;for(const c of hist)if(c){let p=c/n;e-=p*Math.log2(p)}return e}
function fmt(x){return Number.isFinite(x)?(Math.abs(x)>=100?x.toFixed(1):x.toFixed(4)):"—"}
$('file').onchange=async e=>{
 const f=e.target.files[0]; if(!f)return;
 bitmap=await createImageBitmap(f); $('preview').src=URL.createObjectURL(f); $('preview').hidden=false;
 $('run').disabled=false;$('status').textContent=`נטענה תמונה: ${bitmap.width}×${bitmap.height}. הקובץ נשאר במכשיר.`;
};
$('run').onclick=async()=>{
 if(!bitmap)return; $('prog').hidden=false;$('prog').value=5;$('status').textContent='מחשב micro-features…';
 await new Promise(r=>setTimeout(r,30));
 const t0=performance.now();
 // Full image is decoded locally, then normalized to a bounded analysis raster.
 // This preserves spatial coverage while keeping iPhone memory/runtime predictable.
 const maxSide=1536, scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
 const w=Math.max(32,Math.round(bitmap.width*scale)),h=Math.max(32,Math.round(bitmap.height*scale));
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});
 x.drawImage(bitmap,0,0,w,h);$('prog').value=20;
 const d=x.getImageData(0,0,w,h).data,n=w*h;
 const lum=new Float32Array(n),R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n);
 let hr=new Uint32Array(256),hg=new Uint32Array(256),hb=new Uint32Array(256),hl=new Uint32Array(256);
 for(let i=0,j=0;i<n;i++,j+=4){let r=d[j],g=d[j+1],b=d[j+2];R[i]=r;G[i]=g;B[i]=b;let y=.2126*r+.7152*g+.0722*b;lum[i]=y;hr[r]++;hg[g]++;hb[b]++;hl[Math.round(y)]++}
 $('prog').value=35;
 // Gradient + simple high-pass residual: deterministic and inexpensive.
 let grads=[],res=[],resLum=[],edges=[],chrom=[],hfByLum=[[],[],[],[]],patchStats=[];
 const ps=64;
 for(let py=1;py<h-1;py+=ps)for(let px=1;px<w-1;px+=ps){
   let pv=[],pr=[],pe=[];
   for(let yy=py;yy<Math.min(py+ps,h-1);yy+=2)for(let xx=px;xx<Math.min(px+ps,w-1);xx+=2){
     let i=yy*w+xx, gx=lum[i+1]-lum[i-1],gy=lum[i+w]-lum[i-w],gr=Math.hypot(gx,gy);
     let neigh=(lum[i-1]+lum[i+1]+lum[i-w]+lum[i+w])/4,rr=lum[i]-neigh;
     let ch=Math.abs(R[i]-G[i])+Math.abs(B[i]-G[i]);
     grads.push(gr);res.push(rr);resLum.push(lum[i]);edges.push(gr);chrom.push(ch);pv.push(lum[i]);pr.push(rr);pe.push(gr);
     hfByLum[Math.min(3,Math.floor(lum[i]/64))].push(Math.abs(rr));
   }
   if(pv.length>8)patchStats.push([mean(pv),Math.sqrt(variance(pr)),mean(pe)]);
 }
 $('prog').value=65;
 let absres=res.map(Math.abs),mL=mean(Array.from(lum)),vL=variance(Array.from(lum),mL),mR=mean(absres),vR=variance(absres,mR);
 let patchL=patchStats.map(v=>v[0]),patchN=patchStats.map(v=>v[1]),patchE=patchStats.map(v=>v[2]);
 // DCT-like frequency proxies: neighbor differences at 1/2/4 px.
 function diffEnergy(step){let s=0,k=0;for(let y=0;y<h;y+=2)for(let xx=0;xx<w-step;xx+=2){let i=y*w+xx,dv=lum[i+step]-lum[i];s+=dv*dv;k++}return s/k}
 let f1=diffEnergy(1),f2=diffEnergy(2),f4=diffEnergy(4);
 // spatial residual autocorrelation
 let ac1a=[],ac1b=[];for(let y=2;y<h-2;y+=3)for(let xx=2;xx<w-3;xx+=3){let i=y*w+xx;let r1=lum[i]-(lum[i-1]+lum[i+1]+lum[i-w]+lum[i+w])/4;let q=i+1;let r2=lum[q]-(lum[q-1]+lum[q+1]+lum[q-w]+lum[q+w])/4;ac1a.push(r1);ac1b.push(r2)}
 const features={
  "IMG.width":bitmap.width,"IMG.height":bitmap.height,"IMG.analysis_width":w,"IMG.analysis_height":h,
  "L.mean":mL,"L.std":Math.sqrt(vL),"L.entropy":entropy(hl,n),
  "COL.R_entropy":entropy(hr,n),"COL.G_entropy":entropy(hg,n),"COL.B_entropy":entropy(hb,n),
  "COL.RG_corr":corr(Array.from(R).filter((_,i)=>i%8===0),Array.from(G).filter((_,i)=>i%8===0)),
  "COL.GB_corr":corr(Array.from(G).filter((_,i)=>i%8===0),Array.from(B).filter((_,i)=>i%8===0)),
  "N.abs_residual_mean":mR,"N.abs_residual_std":Math.sqrt(vR),
  "NS.residual_neighbor_corr":corr(ac1a,ac1b),
  "E.gradient_mean":mean(grads),"E.gradient_std":Math.sqrt(variance(grads)),
  "F.diff_energy_1":f1,"F.diff_energy_2":f2,"F.diff_energy_4":f4,
  "F.ratio_1_4":f1/(f4+1e-9),
  "X.noise_luminance_corr":corr(absres,resLum),
  "X.noise_edge_corr":corr(absres,edges),
  "X.noise_chroma_corr":corr(absres,chrom),
  "X.patch_noise_luminance_corr":patchStats.length>2?corr(patchN,patchL):NaN,
  "X.patch_noise_edge_corr":patchStats.length>2?corr(patchN,patchE):NaN,
  "H.patch_noise_cv":patchN.length?Math.sqrt(variance(patchN))/(mean(patchN)+1e-9):NaN,
  "NL.shadow_noise":mean(hfByLum[0]||[0]),"NL.midlow_noise":mean(hfByLum[1]||[0]),
  "NL.midhigh_noise":mean(hfByLum[2]||[0]),"NL.highlight_noise":mean(hfByLum[3]||[0])
 };
 const runtime=performance.now()-t0;
 lastResult={version:"0.1",timestamp:new Date().toISOString(),privacy:"local-only",sourceLabel:null,
   dimensions:{original:[bitmap.width,bitmap.height],analysis:[w,h]},runtime_ms:runtime,features};
 $('prog').value=100;$('status').textContent='הניתוח הסתיים מקומית.';
 $('summary').hidden=false;$('results').hidden=false;$('export').disabled=false;
 $('summaryGrid').innerHTML=[
  ['זמן חישוב',`${runtime.toFixed(0)} ms`],['מספר פיצ׳רים',Object.keys(features).length],
  ['רזולוציית ניתוח',`${w}×${h}`],['פרטיות','Local only']
 ].map(([a,b])=>`<div class="metric"><b>${a}</b><span>${b}</span></div>`).join('');
 $('metrics').innerHTML=Object.entries(features).map(([k,v])=>`<div class="metric"><b>${k}</b><span>${fmt(v)}</span></div>`).join('');
 $('raw').textContent=JSON.stringify(lastResult,null,2);
};
$('export').onclick=()=>{
 if(!lastResult)return;let blob=new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'});
 let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='process-signature-result-v0.1.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

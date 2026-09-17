const $=id=>document.getElementById(id);let bitmap=null,lastResult=null;
const mean=a=>{let s=0;for(const x of a)s+=x;return a.length?s/a.length:NaN};
function variance(a,m=mean(a)){let s=0;for(const x of a){let d=x-m;s+=d*d}return a.length?s/a.length:NaN}
function corr(a,b){if(a.length<3||a.length!==b.length)return NaN;let ma=mean(a),mb=mean(b),sa=0,sb=0,sab=0;for(let i=0;i<a.length;i++){let x=a[i]-ma,y=b[i]-mb;sa+=x*x;sb+=y*y;sab+=x*y}return sab/Math.sqrt(sa*sb+1e-12)}
function quant(a,q){if(!a.length)return NaN;let b=[...a].sort((x,y)=>x-y),p=(b.length-1)*q,i=Math.floor(p),f=p-i;return b[i]*(1-f)+(b[Math.min(i+1,b.length-1)]||b[i])*f}
function moments(a){let m=mean(a),v=variance(a,m),sd=Math.sqrt(v+1e-12),s3=0,s4=0;for(const x of a){let z=(x-m)/sd;s3+=z**3;s4+=z**4}return {mean:m,std:sd,skew:s3/a.length,kurt:s4/a.length-3}}
function entropy(hist,n){let e=0;for(const c of hist)if(c){let p=c/n;e-=p*Math.log2(p)}return e}
function fmt(x){return Number.isFinite(x)?(Math.abs(x)>=100?x.toFixed(1):x.toFixed(4)):"—"}
function addMom(out,p,a){let m=moments(a);for(const k in m)out[`${p}.${k}`]=m[k];out[`${p}.q10`]=quant(a,.1);out[`${p}.q50`]=quant(a,.5);out[`${p}.q90`]=quant(a,.9)}
function sample(arr,step=8){let o=[];for(let i=0;i<arr.length;i+=step)o.push(arr[i]);return o}
$('file').onchange=async e=>{let f=e.target.files[0];if(!f)return;bitmap=await createImageBitmap(f);$('preview').src=URL.createObjectURL(f);$('preview').hidden=false;$('run').disabled=false;$('status').textContent=`נטענה תמונה ${bitmap.width}×${bitmap.height}.`;};
$('run').onclick=async()=>{if(!bitmap)return;$('prog').hidden=false;$('prog').value=4;$('status').textContent='מחשב Feature Registry v0.2…';await new Promise(r=>setTimeout(r,20));let t0=performance.now();
let maxSide=1536,sc=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height)),w=Math.max(32,Math.round(bitmap.width*sc)),h=Math.max(32,Math.round(bitmap.height*sc));
let c=document.createElement('canvas');c.width=w;c.height=h;let ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,w,h);let d=ctx.getImageData(0,0,w,h).data,n=w*h;
let Y=new Float32Array(n),R=new Float32Array(n),G=new Float32Array(n),B=new Float32Array(n),hr=new Uint32Array(256),hg=new Uint32Array(256),hb=new Uint32Array(256),hy=new Uint32Array(256);
for(let i=0,j=0;i<n;i++,j+=4){let r=d[j],g=d[j+1],b=d[j+2],y=.2126*r+.7152*g+.0722*b;R[i]=r;G[i]=g;B[i]=b;Y[i]=y;hr[r]++;hg[g]++;hb[b]++;hy[Math.round(y)]++}$('prog').value=18;
let out={"IMG.width":bitmap.width,"IMG.height":bitmap.height,"IMG.analysis_width":w,"IMG.analysis_height":h,"L.entropy":entropy(hy,n),"COL.R_entropy":entropy(hr,n),"COL.G_entropy":entropy(hg,n),"COL.B_entropy":entropy(hb,n)};
addMom(out,"L",sample(Y,4));
let residuals={HP4:[],HP8:[],LAP:[]},lum=[],edge=[],chroma=[],rg=[],gb=[],rb=[],orientH=[],orientV=[],localEnt=[],patch=[];
let bins=[[],[],[],[]],ps=64;
for(let py=2;py<h-2;py+=ps)for(let px=2;px<w-2;px+=ps){let pY=[],pN=[],pE=[],hist=new Uint32Array(16);
 for(let yy=py;yy<Math.min(py+ps,h-2);yy+=2)for(let xx=px;xx<Math.min(px+ps,w-2);xx+=2){let i=yy*w+xx,y=Y[i],gx=Y[i+1]-Y[i-1],gy=Y[i+w]-Y[i-w],e=Math.hypot(gx,gy);
  let hp4=y-(Y[i-1]+Y[i+1]+Y[i-w]+Y[i+w])/4;
  let hp8=y-(Y[i-1]+Y[i+1]+Y[i-w]+Y[i+w]+Y[i-w-1]+Y[i-w+1]+Y[i+w-1]+Y[i+w+1])/8;
  let lap=4*y-Y[i-1]-Y[i+1]-Y[i-w]-Y[i+w];
  residuals.HP4.push(hp4);residuals.HP8.push(hp8);residuals.LAP.push(lap);lum.push(y);edge.push(e);chroma.push(Math.abs(R[i]-G[i])+Math.abs(B[i]-G[i]));rg.push(R[i]-G[i]);gb.push(G[i]-B[i]);rb.push(R[i]-B[i]);orientH.push(Math.abs(gx));orientV.push(Math.abs(gy));
  bins[Math.min(3,Math.floor(y/64))].push(Math.abs(hp4));pY.push(y);pN.push(Math.abs(hp4));pE.push(e);hist[Math.min(15,Math.floor(y/16))]++;
 }
 let ent=entropy(hist,pY.length);localEnt.push(ent);patch.push([mean(pY),Math.sqrt(variance(pN)),mean(pE),ent]);
}$('prog').value=46;
for(const [k,a] of Object.entries(residuals))addMom(out,`N.${k}`,a);
addMom(out,"E.gradient",edge);addMom(out,"COL.RGdiff",rg);addMom(out,"COL.GBdiff",gb);addMom(out,"COL.RBdiff",rb);addMom(out,"T.local_entropy",localEnt);
out["E.orientation_ratio"]=mean(orientH)/(mean(orientV)+1e-9);out["COL.RG_corr"]=corr(sample(R),sample(G));out["COL.GB_corr"]=corr(sample(G),sample(B));out["COL.RB_corr"]=corr(sample(R),sample(B));
for(let b=0;b<4;b++){out[`NL.bin${b}.noise_mean`]=mean(bins[b]);out[`NL.bin${b}.noise_std`]=Math.sqrt(variance(bins[b]));}
function diffEnergy(dx,dy){let s=0,k=0;for(let y=4;y<h-4;y+=3)for(let x=4;x<w-4;x+=3){let i=y*w+x,j=(y+dy)*w+x+dx,v=Y[i]-Y[j];s+=v*v;k++}return s/k}
for(const q of [1,2,4,8]){out[`F.h${q}`]=diffEnergy(q,0);out[`F.v${q}`]=diffEnergy(0,q);out[`F.d${q}`]=diffEnergy(q,q)}
out["F.hv_ratio1"]=out["F.h1"]/(out["F.v1"]+1e-9);out["F.scale_ratio_1_4"]=(out["F.h1"]+out["F.v1"])/(out["F.h4"]+out["F.v4"]+1e-9);
$('prog').value=68;
let absN=residuals.HP4.map(Math.abs),pL=patch.map(x=>x[0]),pN=patch.map(x=>x[1]),pE=patch.map(x=>x[2]),pT=patch.map(x=>x[3]);
out["X.noise_luminance_corr"]=corr(absN,lum);out["X.noise_edge_corr"]=corr(absN,edge);out["X.noise_chroma_corr"]=corr(absN,chroma);
out["X.edge_luminance_corr"]=corr(edge,lum);out["X.chroma_luminance_corr"]=corr(chroma,lum);out["X.chroma_edge_corr"]=corr(chroma,edge);
out["X.HP4_HP8_corr"]=corr(residuals.HP4,residuals.HP8);out["X.HP4_LAP_corr"]=corr(residuals.HP4,residuals.LAP);
out["X.patch_noise_luminance_corr"]=corr(pN,pL);out["X.patch_noise_edge_corr"]=corr(pN,pE);out["X.patch_entropy_noise_corr"]=corr(pT,pN);out["X.patch_entropy_edge_corr"]=corr(pT,pE);
addMom(out,"H.patch_noise",pN);addMom(out,"H.patch_edge",pE);addMom(out,"H.patch_luminance",pL);
$('prog').value=82;
// Quantization / repeated-value proxies, deliberately content-agnostic.
let diffs=[];for(let y=0;y<h;y+=4)for(let x=0;x<w-1;x+=4)diffs.push(Math.abs(Y[y*w+x+1]-Y[y*w+x]));
let nearZero=diffs.filter(v=>v<.5).length/diffs.length;out["Q.neighbor_equal_rate"]=nearZero;addMom(out,"Q.neighbor_diff",diffs);
// Residual spatial autocorrelation at several offsets.
function residualAt(i){return Y[i]-(Y[i-1]+Y[i+1]+Y[i-w]+Y[i+w])/4}
for(const off of [1,2,4]){let a=[],b=[];for(let y=5;y<h-5;y+=4)for(let x=5;x<w-5-off;x+=4){let i=y*w+x;a.push(residualAt(i));b.push(residualAt(i+off))}out[`NS.residual_corr_x${off}`]=corr(a,b)}
let runtime=performance.now()-t0;$('prog').value=100;
let gt={class:$('truth').value||null,source_id:$('sourceId').value.trim()||null,transformation:$('transform').value};
lastResult={schema:"process-signature-lab/0.2",timestamp:new Date().toISOString(),ground_truth:gt,privacy:"local-only",runtime_ms:runtime,feature_count:Object.keys(out).length,features:out};
$('status').textContent='הניתוח הסתיים מקומית.';$('summary').hidden=false;$('families').hidden=false;$('results').hidden=false;$('export').disabled=false;
$('summaryGrid').innerHTML=[['זמן חישוב',`${runtime.toFixed(0)} ms`],['מספר פיצ׳רים',Object.keys(out).length],['רזולוציית ניתוח',`${w}×${h}`],['Ground Truth',gt.class||'לא סומן'],['Transformation',gt.transformation],['פרטיות','Local only']].map(([a,b])=>`<div class="metric"><b>${a}</b><span>${b}</span></div>`).join('');
let fam={};for(const k of Object.keys(out)){let f=k.split('.')[0];fam[f]=(fam[f]||0)+1}$('familyPills').innerHTML=Object.entries(fam).map(([k,v])=>`<span class="pill">${k}: ${v}</span>`).join('');
$('metrics').innerHTML=Object.entries(out).map(([k,v])=>`<div class="metric"><b>${k}</b><span>${fmt(v)}</span></div>`).join('');$('raw').textContent=JSON.stringify(lastResult,null,2);
};
$('export').onclick=()=>{if(!lastResult)return;let b=new Blob([JSON.stringify(lastResult,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`pslab-v02-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

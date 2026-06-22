let currentStep = 0;
const steps = () => [...document.querySelectorAll('.form-step')];
const dots = () => [...document.querySelectorAll('.step-dot')];
function showStep(n){ steps().forEach((s,i)=>s.classList.toggle('active',i===n)); dots().forEach((d,i)=>d.classList.toggle('active',i<=n)); currentStep=n; window.scrollTo({top:0,behavior:'smooth'}); }
function nextStep(){ if(currentStep < steps().length-1) showStep(currentStep+1); }
function prevStep(){ if(currentStep>0) showStep(currentStep-1); }

let signaturePad, canvas;
function resizeCanvas(){ if(!canvas) return; const ratio=Math.max(window.devicePixelRatio||1,1); const rect=canvas.getBoundingClientRect(); canvas.width=rect.width*ratio; canvas.height=190*ratio; const ctx=canvas.getContext('2d'); ctx.scale(ratio,ratio); ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#0B2E63'; }
function initSignature(){ canvas=document.getElementById('signatureCanvas'); if(!canvas) return; resizeCanvas(); let drawing=false; const pos=e=>{ const r=canvas.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-r.left,y:p.clientY-r.top};}; const start=e=>{drawing=true; const p=pos(e); const c=canvas.getContext('2d'); c.beginPath(); c.moveTo(p.x,p.y); e.preventDefault();}; const move=e=>{if(!drawing)return; const p=pos(e); const c=canvas.getContext('2d'); c.lineTo(p.x,p.y); c.stroke(); e.preventDefault();}; const end=()=>drawing=false; canvas.addEventListener('mousedown',start); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',end); canvas.addEventListener('touchstart',start,{passive:false}); canvas.addEventListener('touchmove',move,{passive:false}); canvas.addEventListener('touchend',end); }
function clearSignature(){ if(canvas) canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); }

async function submitForm(e){ e.preventDefault(); const form=e.target; const sig=document.getElementById('signatureData'); if(canvas&&sig) sig.value=canvas.toDataURL('image/png'); const data=new FormData(form); const btn=form.querySelector('button[type="submit"]'); if(btn) {btn.disabled=true; btn.textContent='Submitting...';}
 try{ const res=await fetch('/api/submit',{method:'POST',body:data}); const json=await res.json(); if(!res.ok||!json.ok) throw new Error(json.error||'Submission failed'); document.getElementById('formResult').innerHTML=`<div class="notice"><strong>Submitted successfully.</strong><br>Your confirmation number is ${json.id}.</div>`; form.reset(); clearSignature(); showStep(0); } catch(err){ document.getElementById('formResult').innerHTML=`<div class="notice"><strong>Error:</strong> ${err.message}</div>`; } finally{ if(btn){btn.disabled=false; btn.textContent='Submit Application';} } }

document.addEventListener('DOMContentLoaded',()=>{ initSignature(); const form=document.getElementById('applicationForm'); if(form) form.addEventListener('submit',submitForm); });
let currentStep = 0;
const steps = document.querySelectorAll(".form-step);

function  showStep(index){
  steps.forEach((step, i) => {
    step.classList.toggle("active", i === index);
  });
}
document.querySelectorAll("next-step").forEach(button => {
  button.addEventListener("click", () => {
    if(currentStep < steps.length -1){
      currentStep++;
      showStep(currentStep);
      window.scrollTo({top:0, behavior:"smooth"});
    }
  });
});
document.querySelectorAll(".prev-step").forEach(button => {
  button.addEventListener("click", () => {
    if(currentStep > 0){
      currentStep--;
      showStep(currentStep);
      window.scrollTo({top:0,  behavior:"smooth"});
    }
  });
});
showStep(currentStep);r

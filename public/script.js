document.addEventListener('DOMContentLoaded',()=>{ initSignature(); const form=document.getElementById('applicationForm'); if(form) form.addEventListener('submit',submitForm); });
let currentStep = 0;
const steps = document.querySelectorAll(".form-step);

function  showStep(index){
  steps.forEach((step, i) => {
    step.classList.toggle("active", i === index);
  });
}
document.querySelectorAll(".next-step").forEach(button => {
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
showStep(currentStep);

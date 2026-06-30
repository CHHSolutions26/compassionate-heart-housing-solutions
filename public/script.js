document.addEventListener("DOMContentLoaded", function () {
  let currentStep = 0;
  const steps = document.querySelectorAll(".form-step");

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
  }

  document.querySelectorAll(".next-step").forEach(button => {
    button.addEventListener("click", function () {
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  document.querySelectorAll(".prev-step").forEach(button => {
    button.addEventListener("click", function () {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  showStep(currentStep);
});

function saveSignature() {
  const canvas = document.getElementById("signaturePad");
  const signatureData = document.getElementById("signatureData");

  if (canvas && signatureData) {
    signatureData.value = canvas.toDataURL("image/png");
    alert("Signature saved.");
  }
}

function clearSignature() {
  const canvas = document.getElementById("signaturePad");

  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
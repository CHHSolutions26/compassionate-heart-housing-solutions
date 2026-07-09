document.addEventListener("DOMContentLoaded", function () {
  let currentStep = 0;
  const steps = document.querySelectorAll(".form-step");

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle("active", i === index);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep(step) {
    const requiredFields = step.querySelectorAll("[required]");
    for (const field of requiredFields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  document.querySelectorAll(".next-step").forEach(button => {
    button.addEventListener("click", function () {
      const current = steps[currentStep];

      if (!validateStep(current)) return;

      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });
  });

  document.querySelectorAll(".prev-step").forEach(button => {
    button.addEventListener("click", function () {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  });

  const canvas = document.getElementById("signaturePad");
  const signatureData = document.getElementById("signatureData");

  if (canvas) {
    const ctx = canvas.getContext("2d");
    let drawing = false;

    function getPosition(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }

    function startDrawing(e) {
      drawing = true;
      const pos = getPosition(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault();
    }

    function draw(e) {
      if (!drawing) return;
      const pos = getPosition(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#3b2c7a";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
      e.preventDefault();
    }

    function stopDrawing() {
      drawing = false;
      if (signatureData) {
        signatureData.value = canvas.toDataURL("image/png");
      }
    }

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);
  }

  window.saveSignature = function () {
    if (canvas && signatureData) {
      signatureData.value = canvas.toDataURL("image/png");
      alert("Signature saved.");
    }
  };

  window.clearSignature = function () {
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (signatureData) signatureData.value = "";
    }
  };

  const form = document.getElementById("applicationForm");

  if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (canvas && signatureData) {
      signatureData.value = canvas.toDataURL("image/png");
    }

    try {
      const formData = new FormData(form);

      const res = await fetch("/api/submit", {
        method: "POST",
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        alert("Application submitted successfully. Your ID is: " + result.id);
        form.reset();
        currentStep = 0;
        showStep(currentStep);
      } else {
        alert(result.error || "Submission failed.");
      }
    } catch (error) {
      alert("Submission error. Check Render logs.");
      console.error(error);
    }
  });
}

  showStep(currentStep);
});
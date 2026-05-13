const form = document.querySelector("[data-access-request-form]");
const statusEl = document.querySelector("[data-access-request-status]");

function setStatus(message, tone = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    const data = Object.fromEntries(new FormData(form).entries());
    button.disabled = true;
    setStatus("Sending request...");

    try {
      const response = await fetch("https://access-request.noahairmet.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Request failed.");
      }
      form.reset();
      setStatus("Sent. Noah will add you if he recognizes the request.", "success");
    } catch (error) {
      setStatus("That did not send. Use the email link below for now.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

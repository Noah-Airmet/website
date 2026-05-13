import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const ALLOWED_ORIGINS = new Set([
  "https://noahairmet.com",
  "https://www.noahairmet.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

const TO = "noah.airmet@icloud.com";
const FROM = "access-requests@noahairmet.com";

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://noahairmet.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
    },
  });
}

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildMessage({ name, email, relationship, userAgent }) {
  const msg = createMimeMessage();
  const body = [
    "New Gospel Scholar Archive access request",
    "",
    `Name: ${name || "(not provided)"}`,
    `Email to approve: ${email}`,
    `How they know Noah: ${relationship || "(not provided)"}`,
    "",
    `User agent: ${userAgent || "(not provided)"}`,
  ].join("\n");

  msg.setSender({ name: "Gospel Scholar Archive", addr: FROM });
  msg.setRecipient(TO);
  msg.setSubject("Gospel Scholar Archive access request");
  msg.addMessage({
    contentType: "text/plain",
    data: body,
  });
  return msg.asRaw();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== "POST") {
      return jsonResponse(request, { ok: false, error: "Use POST." }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(request, { ok: false, error: "That request was not readable." }, 400);
    }

    if (normalize(payload.website)) {
      return jsonResponse(request, { ok: true });
    }

    const email = normalize(payload.email).toLowerCase();
    const name = normalize(payload.name);
    const relationship = normalize(payload.relationship);

    if (!isEmail(email)) {
      return jsonResponse(request, { ok: false, error: "Enter a valid email address." }, 400);
    }

    const raw = buildMessage({
      name,
      email,
      relationship,
      userAgent: request.headers.get("User-Agent") || "",
    });
    const message = new EmailMessage(FROM, TO, raw);

    try {
      await env.ACCESS_REQUEST_EMAIL.send(message);
    } catch (error) {
      return jsonResponse(
        request,
        {
          ok: false,
          error: "The request could not be sent. Please email Noah directly.",
          detail: String(error && error.message ? error.message : error),
        },
        502,
      );
    }

    return jsonResponse(request, { ok: true });
  },
};

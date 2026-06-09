import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = "gangasarajayawickrama@gmail.com";
const SITE_URL       = Deno.env.get("SITE_URL") || "https://your-site.vercel.app";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  try {
    const { type, booking } = await req.json();
    if (type === "booking_received")  return await sendBookingReceived(booking);
    if (type === "payment_approved")  return await sendQRApproval(booking);
    if (type === "payment_rejected")  return await sendRejection(booking);
    if (type === "admin_notify")      return await sendAdminNotify(booking);
    return new Response(JSON.stringify({error:"unknown type"}),{status:400,headers:jsonHeaders()});
  } catch(e) {
    return new Response(JSON.stringify({error:String(e)}),{status:500,headers:jsonHeaders()});
  }
});

function corsHeaders(){ return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}; }
function jsonHeaders(){ return {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}; }

async function sendEmail(to:string, subject:string, html:string) {
  const res = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
    body: JSON.stringify({ from:"PEAK Adventures <noreply@resend.dev>", to, subject, html })
  });
  return res.json();
}

function baseStyle() {
  return `<style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:#040D12;color:#E8F4F8}
    .wrap{max-width:580px;margin:0 auto;padding:0}
    .header{background:linear-gradient(135deg,#040D12,#0D2233);padding:32px 28px;border-bottom:1px solid rgba(0,255,209,0.2)}
    .logo{font-size:1.5rem;font-weight:900;color:#00FFD1;letter-spacing:5px}
    .logo-sub{font-size:0.6rem;color:#7A9BAD;letter-spacing:4px;margin-top:2px}
    .body{background:#081822;padding:28px}
    .badge{display:inline-block;padding:4px 14px;font-size:0.65rem;letter-spacing:2px;border-radius:2px;margin-bottom:16px;font-weight:600}
    .badge.green{background:rgba(0,255,209,0.12);color:#00FFD1;border:1px solid rgba(0,255,209,0.2)}
    .badge.red{background:rgba(255,107,107,0.12);color:#FF6B6B;border:1px solid rgba(255,107,107,0.2)}
    .badge.yellow{background:rgba(255,184,0,0.12);color:#FFB800;border:1px solid rgba(255,184,0,0.2)}
    h2{font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:8px}
    p{font-size:0.875rem;color:#7A9BAD;line-height:1.75;margin-bottom:12px}
    p strong{color:#E8F4F8}
    .table{width:100%;border-collapse:collapse;margin:16px 0}
    .table td{padding:9px 12px;border-bottom:1px solid rgba(0,255,209,0.07);font-size:0.82rem}
    .table td:first-child{color:#7A9BAD;width:120px;font-size:0.72rem;letter-spacing:1px;text-transform:uppercase}
    .table td:last-child{color:#E8F4F8;font-weight:500}
    .ref{font-family:monospace;color:#00FFD1;font-size:0.95rem;letter-spacing:1px}
    .qr-wrap{text-align:center;padding:24px 0 8px}
    .qr-wrap img{border:2px solid rgba(0,255,209,0.25);padding:12px;background:#fff;border-radius:4px}
    .qr-label{font-size:0.7rem;color:#7A9BAD;letter-spacing:2px;margin-top:10px;text-transform:uppercase}
    .seat-box{background:rgba(0,255,209,0.06);border:1px solid rgba(0,255,209,0.18);padding:14px;margin:16px 0;text-align:center}
    .seat-num{font-size:2rem;font-weight:900;color:#00FFD1;font-family:monospace;letter-spacing:3px}
    .seat-label{font-size:0.65rem;color:#7A9BAD;letter-spacing:3px;text-transform:uppercase;margin-top:4px}
    .info-box{background:rgba(123,97,255,0.07);border:1px solid rgba(123,97,255,0.18);padding:14px;margin:16px 0}
    .info-box p{font-size:0.8rem;margin:0;line-height:1.7}
    .cta{display:inline-block;background:#00FFD1;color:#040D12;padding:11px 26px;font-weight:700;font-size:0.72rem;letter-spacing:2px;text-decoration:none;margin-top:6px}
    .footer{background:#040D12;padding:18px 28px;text-align:center;font-size:0.68rem;color:#7A9BAD;border-top:1px solid rgba(0,255,209,0.08);line-height:1.8}
  </style>`;
}

async function sendBookingReceived(b:any) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge yellow">⏳ BOOKING RECEIVED</span>
      <h2>Hey ${b.name.split(' ')[0]}, you're almost in!</h2>
      <p>Your seat request has been received. To complete your booking, please transfer the payment and upload your payment slip below.</p>
      <table class="table">
        <tr><td>Booking Ref</td><td><span class="ref">${b.booking_ref}</span></td></tr>
        <tr><td>Name</td><td>${b.name}</td></tr>
        <tr><td>Seats</td><td>${b.seats}</td></tr>
        <tr><td>City</td><td>${b.city}</td></tr>
        <tr><td>Status</td><td>⏳ Pending Payment</td></tr>
      </table>
      <div class="info-box"><p>📌 <strong>Next step:</strong> Make your payment and upload the slip on our website.<br>Your booking reference is <strong>${b.booking_ref}</strong> — keep this safe.<br><br>Questions? Contact us: <strong>${ADMIN_EMAIL}</strong></p></div>
      <a class="cta" href="${SITE_URL}#booking">UPLOAD PAYMENT SLIP</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka<br>This is an automated email. Do not reply.</div>
  </div></body></html>`;
  const [adminRes, bookerRes] = await Promise.all([
    sendEmail(ADMIN_EMAIL, `🎟 New Booking: ${b.booking_ref} — ${b.name} (${b.seats} seat${b.seats>1?'s':''})`, html),
    sendEmail(b.email, `PEAK Adventures — Booking Received (${b.booking_ref})`, html)
  ]);
  return new Response(JSON.stringify({success:true,admin:adminRes,booker:bookerRes}),{headers:jsonHeaders()});
}

async function sendAdminNotify(b:any) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADMIN NOTIFICATION</div></div>
    <div class="body">
      <span class="badge yellow">💳 PAYMENT SLIP UPLOADED</span>
      <h2>Payment slip submitted for review</h2>
      <p><strong>${b.name}</strong> has uploaded a payment slip for booking <strong>${b.booking_ref}</strong>. Please review and approve or reject.</p>
      <table class="table">
        <tr><td>Booking Ref</td><td><span class="ref">${b.booking_ref}</span></td></tr>
        <tr><td>Name</td><td>${b.name}</td></tr>
        <tr><td>Email</td><td>${b.email}</td></tr>
        <tr><td>Seats</td><td>${b.seats}</td></tr>
      </table>
      <a class="cta" href="${SITE_URL}/admin.html">REVIEW IN DASHBOARD</a>
    </div>
    <div class="footer">PEAK Adventures · Admin Notification</div>
  </div></body></html>`;
  const res = await sendEmail(ADMIN_EMAIL, `💳 Payment Slip: ${b.booking_ref} — ${b.name}`, html);
  return new Response(JSON.stringify({success:true,res}),{headers:jsonHeaders()});
}

async function sendQRApproval(b:any) {
  const seatInfo = b.seat_numbers?.length
    ? `<div class="seat-box"><div class="seat-label">Your Seat${b.seat_numbers.length>1?'s':''}</div><div class="seat-num">${b.seat_numbers.join(' · ')}</div><div class="seat-label" style="margin-top:4px">${b.bus_name||'Bus 1'}</div></div>`
    : `<div class="info-box"><p>🪑 Your seat will be assigned soon. Check your email for an update.</p></div>`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qr_token)}&bgcolor=ffffff&color=000000&margin=0`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge green">✅ PAYMENT APPROVED · CONFIRMED</span>
      <h2>You're confirmed, ${b.name.split(' ')[0]}!</h2>
      <p>Your payment has been verified and your seat is confirmed for the PEAK Nuwara Eliya Day Expedition. Show the QR code below at the check-in gate.</p>
      <table class="table">
        <tr><td>Booking Ref</td><td><span class="ref">${b.booking_ref}</span></td></tr>
        <tr><td>Name</td><td>${b.name}</td></tr>
        <tr><td>Seats</td><td>${b.seats}</td></tr>
        <tr><td>Status</td><td>✅ Confirmed</td></tr>
      </table>
      ${seatInfo}
      <div class="qr-wrap">
        <img src="${qrImgSrc}" width="180" height="180" alt="QR Code">
        <div class="qr-label">Show this QR at check-in</div>
      </div>
      <div class="info-box"><p>⚠️ <strong>Important:</strong> This QR code is unique to your booking. Do not share it. Screenshot and save it — you must show it at the gate on the day of the trip.<br><br>📞 Questions? <strong>${ADMIN_EMAIL}</strong></p></div>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;
  const res = await sendEmail(b.email, `✅ PEAK Adventures — You're Confirmed! (${b.booking_ref})`, html);
  return new Response(JSON.stringify({success:true,res}),{headers:jsonHeaders()});
}

async function sendRejection(b:any) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge red">❌ PAYMENT NOT VERIFIED</span>
      <h2>Payment slip issue — action needed</h2>
      <p>Unfortunately your payment slip for booking <strong>${b.booking_ref}</strong> could not be verified. Please re-upload a clear photo of your payment receipt.</p>
      <div class="info-box"><p>Reason: ${b.reject_reason||'Slip was unclear or payment details did not match.'}<br><br>Please visit the website to upload a new slip or contact us directly at <strong>${ADMIN_EMAIL}</strong></p></div>
      <a class="cta" href="${SITE_URL}#booking">UPLOAD NEW SLIP</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;
  const res = await sendEmail(b.email, `❌ PEAK Adventures — Payment Slip Issue (${b.booking_ref})`, html);
  return new Response(JSON.stringify({success:true,res}),{headers:jsonHeaders()});
}

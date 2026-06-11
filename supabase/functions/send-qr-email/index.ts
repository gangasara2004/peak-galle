import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = "gangasarajayawickrama@gmail.com";
const SITE_URL       = Deno.env.get("SITE_URL") || "https://peak-nuwaraeliya.vercel.app";
const TG_TOKEN       = Deno.env.get("TG_TOKEN") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders() });
  try {
    const { type, booking, extra } = await req.json();
    if (type === "booking_received")  return await handleBookingReceived(booking);
    if (type === "payment_approved")  return await handleApproved(booking);
    if (type === "payment_rejected")  return await handleRejected(booking, extra?.reason);
    if (type === "seat_assigned")     return await handleSeatAssigned(booking);
    return new Response(JSON.stringify({error:"unknown type"}),{status:400,headers:jsonHeaders()});
  } catch(e) {
    return new Response(JSON.stringify({error:String(e)}),{status:500,headers:jsonHeaders()});
  }
});

function corsHeaders(){ return {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}; }
function jsonHeaders(){ return {"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}; }

// ── TELEGRAM TO USER ──
async function sendTelegramToUser(username: string, text: string) {
  if (!TG_TOKEN || !username) return;
  try {
    // First get chat_id from username via getUpdates or use username directly
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        chat_id: `@${username}`,
        text,
        parse_mode: "HTML"
      })
    });
  } catch(e) { console.warn("TG user error:", e); }
}

// ── EMAIL ──
async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true };
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
    .wrap{max-width:580px;margin:0 auto}
    .header{background:linear-gradient(135deg,#040D12,#0D2233);padding:28px;border-bottom:1px solid rgba(0,255,209,0.2)}
    .logo{font-size:1.4rem;font-weight:900;color:#00FFD1;letter-spacing:5px}
    .logo-sub{font-size:0.58rem;color:#7A9BAD;letter-spacing:4px;margin-top:2px}
    .body{background:#081822;padding:26px}
    .badge{display:inline-block;padding:4px 14px;font-size:0.62rem;letter-spacing:2px;border-radius:2px;margin-bottom:14px;font-weight:600}
    .badge.green{background:rgba(0,255,209,0.12);color:#00FFD1;border:1px solid rgba(0,255,209,0.2)}
    .badge.red{background:rgba(255,107,107,0.12);color:#FF6B6B;border:1px solid rgba(255,107,107,0.2)}
    .badge.yellow{background:rgba(255,184,0,0.12);color:#FFB800;border:1px solid rgba(255,184,0,0.2)}
    .badge.blue{background:rgba(123,97,255,0.12);color:#B8A9FF;border:1px solid rgba(123,97,255,0.2)}
    h2{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:8px}
    p{font-size:0.86rem;color:#7A9BAD;line-height:1.75;margin-bottom:10px}
    p strong{color:#E8F4F8}
    .table{width:100%;border-collapse:collapse;margin:14px 0}
    .table td{padding:9px 12px;border-bottom:1px solid rgba(0,255,209,0.07);font-size:0.82rem}
    .table td:first-child{color:#7A9BAD;width:120px;font-size:0.7rem;letter-spacing:1px;text-transform:uppercase}
    .table td:last-child{color:#E8F4F8;font-weight:500}
    .ref{font-family:monospace;color:#00FFD1;font-size:0.92rem}
    .qr-wrap{text-align:center;padding:20px 0 8px}
    .qr-wrap img{border:2px solid rgba(0,255,209,0.25);padding:10px;background:#fff;border-radius:4px}
    .qr-label{font-size:0.68rem;color:#7A9BAD;letter-spacing:2px;margin-top:8px;text-transform:uppercase}
    .seat-box{background:rgba(0,255,209,0.06);border:1px solid rgba(0,255,209,0.18);padding:14px;margin:14px 0;text-align:center}
    .seat-num{font-size:1.8rem;font-weight:900;color:#00FFD1;font-family:monospace;letter-spacing:3px}
    .seat-label{font-size:0.62rem;color:#7A9BAD;letter-spacing:3px;text-transform:uppercase;margin-top:4px}
    .info-box{background:rgba(123,97,255,0.07);border:1px solid rgba(123,97,255,0.18);padding:14px;margin:14px 0}
    .info-box p{font-size:0.8rem;margin:0;line-height:1.7}
    .cta{display:inline-block;background:#00FFD1;color:#040D12;padding:10px 24px;font-weight:700;font-size:0.7rem;letter-spacing:2px;text-decoration:none;margin-top:6px}
    .footer{background:#040D12;padding:16px 28px;text-align:center;font-size:0.66rem;color:#7A9BAD;border-top:1px solid rgba(0,255,209,0.08);line-height:1.8}
  </style>`;
}

async function handleBookingReceived(b: any) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge yellow">⏳ REGISTRATION RECEIVED</span>
      <h2>Hey ${b.name.split(' ')[0]}, you're almost in!</h2>
      <p>Your registration has been received. Please transfer the payment and upload your payment slip to complete your booking.</p>
      <table class="table">
        <tr><td>Booking Ref</td><td><span class="ref">${b.booking_ref}</span></td></tr>
        <tr><td>Name</td><td>${b.name}</td></tr>
        <tr><td>Institution</td><td>${b.institution||'—'}</td></tr>
        <tr><td>District Rank</td><td>${b.district_rank?'#'+b.district_rank:'—'}</td></tr>
        <tr><td>Food</td><td>${b.food_preference||'—'}</td></tr>
        <tr><td>Status</td><td>⏳ Pending Payment</td></tr>
      </table>
      <div class="info-box"><p>📌 <strong>Next step:</strong> Make your payment and upload the slip on our website. Your booking reference is <strong>${b.booking_ref}</strong> — keep this safe.<br><br>Questions? <strong>${ADMIN_EMAIL}</strong></p></div>
      <a class="cta" href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">VIEW YOUR TICKET</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;

  const tgMsg = b.telegram_username
    ? `🎟 <b>PEAK Adventures</b>\n\nHey ${b.name.split(' ')[0]}! Your registration is received.\n\n📋 Ref: <code>${b.booking_ref}</code>\n🏫 ${b.institution||'—'}\n🏆 Rank #${b.district_rank||'—'}\n\n⚡ <b>Next step:</b> Upload your payment slip to complete booking.\n\n<a href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">View Ticket</a>`
    : null;

  await Promise.all([
    sendEmail(b.email, `PEAK Adventures — Registration Received (${b.booking_ref})`, html),
    tgMsg ? sendTelegramToUser(b.telegram_username, tgMsg) : Promise.resolve()
  ]);
  return new Response(JSON.stringify({success:true}),{headers:jsonHeaders()});
}

async function handleApproved(b: any) {
  const seatInfo = b.seat_numbers?.length
    ? `<div class="seat-box"><div class="seat-label">Your Seat${b.seat_numbers.length>1?'s':''}</div><div class="seat-num">${b.seat_numbers.join(' · ')}</div><div class="seat-label" style="margin-top:4px">${b.bus_name||'Bus 1'}</div></div>`
    : `<div class="info-box"><p>🪑 Your seat will be assigned soon. You'll receive another notification with your seat details.</p></div>`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qr_token)}&bgcolor=ffffff&color=000000&margin=0`;
  const noteSection = b.admin_note ? `<div class="info-box"><p>📝 <strong>Note from PEAK:</strong> ${b.admin_note}</p></div>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge green">✅ PAYMENT APPROVED · CONFIRMED</span>
      <h2>You're confirmed, ${b.name.split(' ')[0]}!</h2>
      <p>Your payment has been verified and your seat is confirmed. Show the QR code below at the check-in gate on the day of the trip.</p>
      <table class="table">
        <tr><td>Booking Ref</td><td><span class="ref">${b.booking_ref}</span></td></tr>
        <tr><td>Name</td><td>${b.name}</td></tr>
        <tr><td>Institution</td><td>${b.institution||'—'}</td></tr>
        <tr><td>District Rank</td><td>${b.district_rank?'#'+b.district_rank:'—'}</td></tr>
        <tr><td>Food</td><td>${b.food_preference||'—'}</td></tr>
        <tr><td>Status</td><td>✅ Confirmed</td></tr>
      </table>
      ${seatInfo}
      ${noteSection}
      <div class="qr-wrap">
        <img src="${qrSrc}" width="180" height="180" alt="QR Code">
        <div class="qr-label">Show this QR at check-in</div>
      </div>
      <div class="info-box"><p>⚠️ <strong>Important:</strong> This QR is unique to your booking. Screenshot and save it.<br><br>📞 Questions? <strong>${ADMIN_EMAIL}</strong></p></div>
      <a class="cta" href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">VIEW & DOWNLOAD TICKET</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;

  const tgMsg = b.telegram_username
    ? `✅ <b>PEAK Adventures — CONFIRMED!</b>\n\nHey ${b.name.split(' ')[0]}! Your payment is approved.\n\n📋 Ref: <code>${b.booking_ref}</code>\n${b.admin_note?`📝 Note: ${b.admin_note}\n`:''}\n🎟 <a href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">View & Download Your Ticket</a>\n\nShow your QR code at the check-in gate. See you there! 🏔️`
    : null;

  await Promise.all([
    sendEmail(b.email, `✅ PEAK Adventures — You're Confirmed! (${b.booking_ref})`, html),
    tgMsg ? sendTelegramToUser(b.telegram_username, tgMsg) : Promise.resolve()
  ]);
  return new Response(JSON.stringify({success:true}),{headers:jsonHeaders()});
}

async function handleRejected(b: any, reason?: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge red">❌ PAYMENT NOT VERIFIED</span>
      <h2>Payment slip issue — action needed</h2>
      <p>Unfortunately your payment slip for booking <strong>${b.booking_ref}</strong> could not be verified.</p>
      <div class="info-box"><p>Reason: ${reason||'Slip was unclear or payment details did not match.'}<br><br>Please visit the website to upload a new slip or contact us at <strong>${ADMIN_EMAIL}</strong></p></div>
      <a class="cta" href="${SITE_URL}#booking">UPLOAD NEW SLIP</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;

  const tgMsg = b.telegram_username
    ? `❌ <b>PEAK Adventures</b>\n\nHey ${b.name.split(' ')[0]}, your payment slip could not be verified.\n\nReason: ${reason||'Slip unclear or payment mismatch.'}\n\nPlease upload a new slip: <a href="${SITE_URL}#booking">Upload Here</a>`
    : null;

  await Promise.all([
    sendEmail(b.email, `❌ PEAK Adventures — Payment Slip Issue (${b.booking_ref})`, html),
    tgMsg ? sendTelegramToUser(b.telegram_username, tgMsg) : Promise.resolve()
  ]);
  return new Response(JSON.stringify({success:true}),{headers:jsonHeaders()});
}

async function handleSeatAssigned(b: any) {
  const seatNums = b.seat_numbers?.join(', ')||'—';
  const busName = b.bus_name||'Bus 1';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qr_token)}&bgcolor=ffffff&color=000000&margin=0`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${baseStyle()}</head><body><div class="wrap">
    <div class="header"><div class="logo">PEAK</div><div class="logo-sub">ADVENTURES · NUWARA ELIYA</div></div>
    <div class="body">
      <span class="badge blue">🪑 SEAT ASSIGNED</span>
      <h2>Your seat is ready, ${b.name.split(' ')[0]}!</h2>
      <p>Your seat has been assigned for the PEAK Nuwara Eliya Day Expedition.</p>
      <div class="seat-box">
        <div class="seat-label">Your Seat${b.seat_numbers?.length>1?'s':''}</div>
        <div class="seat-num">${seatNums}</div>
        <div class="seat-label" style="margin-top:4px">${busName}</div>
      </div>
      <div class="qr-wrap">
        <img src="${qrSrc}" width="160" height="160" alt="QR Code">
        <div class="qr-label">Updated QR — Show at check-in</div>
      </div>
      <a class="cta" href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">VIEW UPDATED TICKET</a>
    </div>
    <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka</div>
  </div></body></html>`;

  const tgMsg = b.telegram_username
    ? `🪑 <b>PEAK Adventures — Seat Assigned!</b>\n\nHey ${b.name.split(' ')[0]}! Your seat has been assigned.\n\n🚌 ${busName}\n💺 Seat: <b>${seatNums}</b>\n\n<a href="${SITE_URL}/ticket.html?ref=${b.booking_ref}">View Updated Ticket</a>`
    : null;

  await Promise.all([
    sendEmail(b.email, `🪑 PEAK Adventures — Your Seat is Assigned! (${b.booking_ref})`, html),
    tgMsg ? sendTelegramToUser(b.telegram_username, tgMsg) : Promise.resolve()
  ]);
  return new Response(JSON.stringify({success:true}),{headers:jsonHeaders()});
}

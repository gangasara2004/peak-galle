import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL = "gangasarajayawickrama@gmail.com";

interface BookingPayload {
  booking_ref: string;
  name: string;
  email: string;
  phone: string;
  seats: number;
  city: string;
  age_group?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const booking: BookingPayload = await req.json();

    // ── Email to Admin ──
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',sans-serif;background:#040D12;color:#E8F4F8;margin:0;padding:0}
  .wrap{max-width:560px;margin:0 auto;padding:32px 24px}
  .logo{font-size:1.6rem;font-weight:900;color:#00FFD1;letter-spacing:6px;margin-bottom:4px}
  .sub{font-size:0.7rem;color:#7A9BAD;letter-spacing:4px;margin-bottom:28px}
  .badge{display:inline-block;background:rgba(255,184,0,0.15);color:#FFB800;padding:4px 12px;font-size:0.7rem;letter-spacing:2px;border-radius:2px;margin-bottom:20px}
  .title{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:16px}
  .table{width:100%;border-collapse:collapse}
  .table td{padding:10px 12px;border-bottom:1px solid rgba(0,255,209,0.08);font-size:0.85rem}
  .table td:first-child{color:#7A9BAD;width:130px;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase}
  .table td:last-child{color:#E8F4F8;font-weight:500}
  .ref{font-family:monospace;color:#00FFD1;font-size:0.9rem}
  .footer{margin-top:28px;font-size:0.72rem;color:#7A9BAD;border-top:1px solid rgba(0,255,209,0.1);padding-top:16px}
  .cta{display:inline-block;margin-top:16px;background:#00FFD1;color:#040D12;padding:10px 24px;font-weight:700;font-size:0.75rem;letter-spacing:2px;text-decoration:none;border-radius:2px}
</style></head>
<body><div class="wrap">
  <div class="logo">PEAK</div>
  <div class="sub">ADVENTURES · ADMIN NOTIFICATION</div>
  <div class="badge">🎟 NEW BOOKING REQUEST</div>
  <div class="title">A new seat has been requested</div>
  <table class="table">
    <tr><td>Booking Ref</td><td><span class="ref">${booking.booking_ref}</span></td></tr>
    <tr><td>Name</td><td>${booking.name}</td></tr>
    <tr><td>Email</td><td>${booking.email}</td></tr>
    <tr><td>Phone</td><td>${booking.phone}</td></tr>
    <tr><td>Seats</td><td>${booking.seats}</td></tr>
    <tr><td>City</td><td>${booking.city}</td></tr>
    <tr><td>Age Group</td><td>${booking.age_group || "—"}</td></tr>
    <tr><td>Notes</td><td>${booking.notes || "—"}</td></tr>
    <tr><td>Status</td><td>⏳ PENDING</td></tr>
  </table>
  <a class="cta" href="https://your-admin-url.netlify.app/admin.html">OPEN ADMIN DASHBOARD</a>
  <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · This is an automated notification.</div>
</div></body></html>`;

    // ── Email to Booker ──
    const bookerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:'Segoe UI',sans-serif;background:#040D12;color:#E8F4F8;margin:0;padding:0}
  .wrap{max-width:560px;margin:0 auto;padding:32px 24px}
  .logo{font-size:1.6rem;font-weight:900;color:#00FFD1;letter-spacing:6px;margin-bottom:4px}
  .sub{font-size:0.7rem;color:#7A9BAD;letter-spacing:4px;margin-bottom:28px}
  .badge{display:inline-block;background:rgba(0,255,209,0.12);color:#00FFD1;padding:4px 12px;font-size:0.7rem;letter-spacing:2px;border-radius:2px;margin-bottom:20px}
  .title{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:8px}
  .desc{font-size:0.88rem;color:#7A9BAD;line-height:1.7;margin-bottom:20px}
  .table{width:100%;border-collapse:collapse}
  .table td{padding:10px 12px;border-bottom:1px solid rgba(0,255,209,0.08);font-size:0.85rem}
  .table td:first-child{color:#7A9BAD;width:130px;font-size:0.75rem;letter-spacing:1px;text-transform:uppercase}
  .table td:last-child{color:#E8F4F8;font-weight:500}
  .ref{font-family:monospace;color:#00FFD1;font-size:1rem;font-weight:700}
  .info-box{background:rgba(0,255,209,0.05);border:1px solid rgba(0,255,209,0.15);padding:16px;margin:20px 0;border-radius:2px}
  .info-box p{font-size:0.82rem;color:#7A9BAD;margin:0;line-height:1.7}
  .info-box strong{color:#E8F4F8}
  .footer{margin-top:28px;font-size:0.72rem;color:#7A9BAD;border-top:1px solid rgba(0,255,209,0.1);padding-top:16px}
  .highlights{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap}
  .hl{background:rgba(123,97,255,0.1);border:1px solid rgba(123,97,255,0.2);padding:8px 12px;font-size:0.72rem;color:#B8A9FF;border-radius:2px}
</style></head>
<body><div class="wrap">
  <div class="logo">PEAK</div>
  <div class="sub">ADVENTURES · NUWARA ELIYA</div>
  <div class="badge">✅ BOOKING RECEIVED</div>
  <div class="title">Hey ${booking.name.split(" ")[0]}, you're almost in!</div>
  <p class="desc">Your seat request for the PEAK Nuwara Eliya Day Expedition has been received. Our team will review your booking and contact you within <strong>24 hours</strong> with payment details and final confirmation.</p>
  <table class="table">
    <tr><td>Booking Ref</td><td><span class="ref">${booking.booking_ref}</span></td></tr>
    <tr><td>Name</td><td>${booking.name}</td></tr>
    <tr><td>Seats</td><td>${booking.seats}</td></tr>
    <tr><td>City</td><td>${booking.city}</td></tr>
    <tr><td>Status</td><td>⏳ Pending Confirmation</td></tr>
  </table>
  <div class="highlights">
    <div class="hl">🏔️ Horton Plains</div>
    <div class="hl">🌊 Gregory Lake</div>
    <div class="hl">🍃 Tea Estates</div>
  </div>
  <div class="info-box">
    <p>📌 <strong>Keep this email safe.</strong> Your booking reference is <strong>${booking.booking_ref}</strong>. You may need it when contacting us.<br><br>
    📞 Questions? Reach us on WhatsApp or email: <strong>gangasarajayawickrama@gmail.com</strong></p>
  </div>
  <div class="footer">PEAK Adventures · Nuwara Eliya Day Expedition · Sri Lanka<br>This is an automated confirmation. Please do not reply to this email.</div>
</div></body></html>`;

    // Send both emails via Resend
    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PEAK Adventures <noreply@resend.dev>",
          to,
          subject,
          html,
        }),
      });
      return res.json();
    };

    const [adminRes, bookerRes] = await Promise.all([
      sendEmail(ADMIN_EMAIL, `🎟 New Booking: ${booking.booking_ref} — ${booking.name} (${booking.seats} seat${booking.seats > 1 ? "s" : ""})`, adminHtml),
      sendEmail(booking.email, `PEAK Adventures — Booking Received (${booking.booking_ref})`, bookerHtml),
    ]);

    return new Response(JSON.stringify({ success: true, admin: adminRes, booker: bookerRes }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

/* ठिkaana Ops — footfall tracker.
   Embed on a site's pages:
     <script src="https://aidevstudioone-max.github.io/Project-Management-Suite/track.js" data-site="thikaana.co"></script>
   Writes one row per page view into the Supabase `thikops_footfall` table.
   The anon key below is publishable (Row Level Security allows anon INSERT only). */
(function () {
  var SB_URL = "https://vdxojmbcridrxkphewkl.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeG9qbWJjcmlkcnhrcGhld2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTkzNDMsImV4cCI6MjEwMzc3NTM0M30.4hwBumjsLE3mWqwxIYNW5vDlnJB0D0WSf01P-dErWCY";

  try {
    var scriptEl = document.currentScript;
    var site = (scriptEl && scriptEl.getAttribute("data-site")) ||
               location.hostname.replace(/^www\./, "");

    var vid;
    try {
      vid = localStorage.getItem("thk_vid");
      if (!vid) {
        vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
        localStorage.setItem("thk_vid", vid);
      }
    } catch (e) { vid = "anon"; }

    var sid;
    try {
      sid = sessionStorage.getItem("thk_sid");
      if (!sid) {
        sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem("thk_sid", sid);
      }
    } catch (e) { sid = "s"; }

    var payload = JSON.stringify({
      site: site,
      path: (location.pathname + location.search).slice(0, 300),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      visitor_id: vid,
      session_id: sid,
      user_agent: (navigator.userAgent || "").slice(0, 300)
    });

    fetch(SB_URL + "/rest/v1/thikops_footfall", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Prefer": "return=minimal"
      },
      body: payload,
      keepalive: true,
      mode: "cors"
    }).catch(function () {});
  } catch (e) { /* never break the host page */ }
})();

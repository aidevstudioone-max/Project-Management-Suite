/* ठिkaana Ops — footfall tracker.
   Embed on a site's pages:
     <script src="https://aidevstudioone-max.github.io/Project-Management-Suite/track.js"
             data-site="thikaana.co" data-product="coaching-erp"></script>
   - data-site   groups everything under one property in Footfall (keep it "thikaana.co").
   - data-product (optional) marks this as a product rather than the marketing site.
   Writes one row per page view into the Supabase `thikops_footfall` table, including
   country + city looked up from the visitor's IP. The anon key below is publishable
   (Row Level Security allows anon INSERT only). */
(function () {
  var SB_URL = "https://vdxojmbcridrxkphewkl.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeG9qbWJjcmlkcnhrcGhld2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTkzNDMsImV4cCI6MjEwMzc3NTM0M30.4hwBumjsLE3mWqwxIYNW5vDlnJB0D0WSf01P-dErWCY";

  try {
    var scriptEl = document.currentScript;
    var site = (scriptEl && scriptEl.getAttribute("data-site")) ||
               location.hostname.replace(/^www\./, "");
    var product = (scriptEl && scriptEl.getAttribute("data-product")) || null;

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

    var base = {
      site: site,
      product: product,
      path: (location.pathname + location.search).slice(0, 300),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      visitor_id: vid,
      session_id: sid,
      user_agent: (navigator.userAgent || "").slice(0, 300)
    };

    function send(extra) {
      var payload = JSON.stringify(Object.assign({}, base, extra || {}));
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
    }

    /* One geo lookup per visitor per day, cached so we don't hammer the free API. */
    var geo = null;
    try {
      var raw = localStorage.getItem("thk_geo");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && (Date.now() - parsed.at) < 86400000) geo = parsed.v;
      }
    } catch (e) {}

    if (geo) {
      send(geo);
    } else {
      var done = false;
      var finish = function (g) {
        if (done) return;
        done = true;
        if (g) {
          try { localStorage.setItem("thk_geo", JSON.stringify({ at: Date.now(), v: g })); } catch (e) {}
        }
        send(g || {});
      };
      // fail-safe: never hold the beacon more than 1.2s
      setTimeout(function () { finish(null); }, 1200);
      fetch("https://ipwho.is/?fields=success,country,country_code,city", { mode: "cors" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.success !== false) {
            finish({
              country: d.country || null,
              country_code: d.country_code || null,
              city: d.city || null
            });
          } else { finish(null); }
        })
        .catch(function () { finish(null); });
    }
  } catch (e) { /* never break the host page */ }
})();

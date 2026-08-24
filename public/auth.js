import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const app = document.querySelector("#app");
const platformName = "ExamPrep AI";
let supabase;
let quizLoaded = false;
let demoMode = false;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function loginScreen(message = "") {
  app.innerHTML = `
    <main class="auth-page">
      <div class="auth-orb auth-orb-one"></div><div class="auth-orb auth-orb-two"></div>
      <section class="auth-story">
        <a class="auth-brand" href="/"><span class="brand-mark">EP</span><span>ExamPrep AI</span></a>
        <div class="auth-copy"><span class="auth-kicker">One platform for competitive exams</span><h1>Prepare for your exam.<br><em>One goal at a time.</em></h1><p>Choose ADRE, NEET UG, JEE Main, JEE Advanced, and more as verified exam content becomes available.</p><div class="auth-stats"><span><strong>4</strong>exam paths</span><span><strong>AI</strong>assistance</span><span><strong>24/7</strong>practice</span></div></div>
        <p class="auth-quote">Built for serious aspirants.</p>
      </section>
      <section class="auth-panel"><div class="auth-card"><div class="auth-card-mark"><span>✦</span></div><p class="auth-overline">Welcome to ExamPrep AI</p><h2>Continue your preparation</h2><p class="auth-subtitle">Sign in to access every paper and keep your practice space secure.</p><button class="google-button" id="google-signin" ${supabase ? "" : "disabled"}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.37l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.54l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"/></svg><span>Continue with Google</span></button>${message ? `<p class="auth-error">${escapeHtml(message)}</p>` : ""}<div class="auth-divider"><span>Secure access</span></div><div class="trust-row"><span>✓ No password to remember</span><span>✓ Protected by Supabase</span></div><p class="auth-terms">By continuing, you agree to use this platform responsibly.</p></div></section>
    </main>`;
  const overline = document.querySelector(".auth-overline");
  if (overline) overline.textContent = `Welcome to ${platformName}`;
  if (supabase) document.querySelector("#google-signin")?.addEventListener("click", signIn);
  if(demoMode){const divider=document.querySelector(".auth-divider"),wrap=document.createElement("div");wrap.className="demo-access";wrap.innerHTML='<button class="demo-button" id="demo-signin">Explore demo without signing in</button><p>Browse the interface in demo mode. Protected AI and account features still require sign-in.</p>';divider?.before(wrap);document.querySelector("#demo-signin")?.addEventListener("click",startDemo)}
}

function startDemo(){showQuiz({access_token:"demo",user:{email:"demo@local.invalid",user_metadata:{full_name:"Demo Student"}}},true)}

async function signIn() {
  const button = document.querySelector("#google-signin");
  button.disabled = true;
  button.querySelector("span").textContent = "Opening Google…";
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  if (error) loginScreen(error.message);
}

async function showQuiz(session,demo=false) {
  if (window.quizAuth) Object.assign(window.quizAuth, { supabase, session, demo });
  else window.quizAuth = { supabase, session, demo };
  if (!quizLoaded) { quizLoaded = true; await import("/app.js"); }
}

async function initialize() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    if (!response.ok) throw new Error(config.error || "Authentication is not configured.");
    demoMode = config.demoMode === true;
    window.appConfig = config;
    if(!config.supabaseUrl||!config.supabaseKey){if(demoMode)return loginScreen();throw new Error("Supabase authentication is not configured.")}
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    supabase.auth.onAuthStateChange((_event, session) => {
      if (window.quizAuth) Object.assign(window.quizAuth, { supabase, session });
      else window.quizAuth = { supabase, session };
      if (session) showQuiz(session); else loginScreen();
    });
  } catch (error) {
    loginScreen(error.message || "Unable to start authentication.");
  }
}

initialize();

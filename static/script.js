// ---------- State ----------
let conversationId = null;
let tone = "professional";
let busy = false;

const $ = (id) => document.getElementById(id);
const messagesEl = $("messages");
const inputEl = $("input");

// ---------- Helpers ----------
function addBubble(role, text = "") {
  messagesEl.querySelector(".empty")?.remove();
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function clearChat() {
  messagesEl.innerHTML = '<p class="empty">Ask anything. Pick a tone above to change how the AI answers.</p>';
}

// ---------- History sidebar ----------
async function loadHistory() {
  const res = await fetch("/api/conversations");
  const list = await res.json();
  const ul = $("history");
  ul.innerHTML = "";
  list.forEach((c) => {
    const li = document.createElement("li");
    if (c._id === conversationId) li.classList.add("active");
    li.innerHTML = `<span></span><button title="Delete chat" aria-label="Delete chat">×</button>`;
    li.querySelector("span").textContent = c.title;
    li.onclick = () => openConversation(c._id);
    li.querySelector("button").onclick = async (e) => {
      e.stopPropagation();
      await fetch(`/api/conversations/${c._id}`, { method: "DELETE" });
      if (c._id === conversationId) newChat();
      loadHistory();
    };
    ul.appendChild(li);
  });
}

async function openConversation(id) {
  const res = await fetch(`/api/conversations/${id}`);
  const convo = await res.json();
  conversationId = id;
  clearChat();
  convo.messages.forEach((m) => addBubble(m.role === "user" ? "user" : "ai", m.content));
  loadHistory();
}

function newChat() {
  conversationId = null;
  clearChat();
  loadHistory();
}

// ---------- Sending + streaming ----------
async function sendMessage(text) {
  busy = true;
  $("send").disabled = true;
  addBubble("user", text);
  const aiBubble = addBubble("ai");
  aiBubble.classList.add("typing");

  // Typing effect: network chunks go into a queue, and we print 1 character at a time.
  let queue = "";
  let streamDone = false;
  const typer = setInterval(() => {
    if (queue.length) {
      aiBubble.textContent += queue[0];
      queue = queue.slice(1);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (streamDone) {
      clearInterval(typer);
      aiBubble.classList.remove("typing");
      busy = false;
      $("send").disabled = false;
      loadHistory();
    }
  }, 12);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, tone, conversation_id: conversationId }),
    });
    conversationId = res.headers.get("X-Conversation-Id");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      queue += decoder.decode(value, { stream: true });
    }
  } catch (err) {
    queue += "Something went wrong. Check that the server is running.";
  }
  streamDone = true;
}

// ---------- Events ----------
$("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text || busy) return;
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendMessage(text);
});

// Enter sends, Shift+Enter adds a new line
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("chat-form").requestSubmit();
  }
});
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = inputEl.scrollHeight + "px";
});

// Tone toggle (Vibe Check)
document.querySelectorAll(".tone").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tone").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tone = btn.dataset.tone;
  };
});

$("new-chat").onclick = newChat;

// Extra feature: export chat as Markdown
$("export").onclick = () => {
  if (!conversationId) return alert("Start a chat first, then you can export it.");
  window.location = `/api/conversations/${conversationId}/export`;
};

loadHistory();

// ---------- Extra feature 2: dark mode toggle ----------
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("theme").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  localStorage.setItem("theme", theme);
}

$("theme").onclick = () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
};

// On load: use the saved choice, or the computer's own setting
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
applyTheme(savedTheme || (prefersDark ? "dark" : "light"));

let socket, cryptoKey;

async function deriveKey(password) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("secure-room"),
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(text)
  );
  return { iv: [...iv], data: [...new Uint8Array(encrypted)] };
}

async function decrypt(payload) {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
    cryptoKey,
    new Uint8Array(payload.data)
  );
  return new TextDecoder().decode(decrypted);
}

async function join() {
  cryptoKey = await deriveKey(password.value);

  socket = new WebSocket(`wss://${location.host}`);
  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "join", room: room.value }));
    chat.style.display = "block";
  };

  socket.onmessage = async (e) => {
    const msg = JSON.parse(e.data);
    const text = await decrypt(msg.payload);
    showMessage(text);
  };
}

async function sendMsg() {
  const payload = await encrypt(msg.value);
  socket.send(JSON.stringify({ type: "message", payload }));
  showMessage("You: " + msg.value);
  msg.value = "";
}

function showMessage(text, mine = false) {
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  div.textContent = text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;

  // 30-minute self-destruct
  setTimeout(() => div.remove(), 30 * 60 * 1000);
}


document.addEventListener("visibilitychange", () => {
  if (document.hidden) location.reload();
});

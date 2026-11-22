"""
AI Chat Assistant - Backend (Flask + MongoDB + Claude API)

Run:  python app.py   ->  open http://localhost:5000
"""
import os
from datetime import datetime, timezone

from anthropic import Anthropic
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, stream_with_context
from pymongo import MongoClient

load_dotenv()

# ---------- Setup ----------
app = Flask(__name__, static_folder="static", static_url_path="")
ai = Anthropic()  # reads ANTHROPIC_API_KEY from .env
MODEL = os.getenv("MODEL_NAME", "claude-sonnet-5-5")

db = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))["ai_chat"]
conversations = db["conversations"]

# ---------- Vibe Check: tone -> system instruction ----------
TONES = {
    "professional": "Respond in a formal, professional tone. Be precise, structured and polite.",
    "casual": "Respond in a friendly, casual tone, like chatting with a friend. Keep it relaxed.",
    "concise": "Respond as briefly as possible. Give only the key points, no filler.",
}
BASE_PROMPT = "You are a helpful AI assistant. "


def now():
    return datetime.now(timezone.utc)


def clean(doc):
    """Convert a MongoDB document into JSON-friendly data."""
    doc["_id"] = str(doc["_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    for m in doc.get("messages", []):
        m["timestamp"] = m["timestamp"].isoformat()
    return doc


# ---------- Routes ----------
@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.route("/api/conversations")
def list_conversations():
    """Sidebar: newest conversations first (without the messages)."""
    docs = conversations.find({}, {"messages": 0}).sort("created_at", -1)
    return jsonify([clean(d) for d in docs])


@app.route("/api/conversations/<cid>")
def get_conversation(cid):
    doc = conversations.find_one({"_id": ObjectId(cid)})
    return jsonify(clean(doc)) if doc else ("Not found", 404)


@app.route("/api/conversations/<cid>", methods=["DELETE"])
def delete_conversation(cid):
    conversations.delete_one({"_id": ObjectId(cid)})
    return jsonify({"ok": True})


@app.route("/api/conversations/<cid>/export")
def export_conversation(cid):
    """EXTRA FEATURE: download a chat as a Markdown file."""
    doc = conversations.find_one({"_id": ObjectId(cid)})
    if not doc:
        return "Not found", 404
    lines = [f"# {doc['title']}", ""]
    for m in doc["messages"]:
        who = "You" if m["role"] == "user" else "AI"
        lines += [f"**{who}** ({m['timestamp']:%Y-%m-%d %H:%M} UTC)", "", m["content"], ""]
    return Response(
        "\n".join(lines),
        mimetype="text/markdown",
        headers={"Content-Disposition": "attachment; filename=chat.md"},
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    prompt = data["message"].strip()
    tone = data.get("tone", "professional")
    cid = data.get("conversation_id")

    # 1. Load the conversation, or start a new one
    if cid:
        convo = conversations.find_one({"_id": ObjectId(cid)})
    else:
        convo = {"title": prompt[:40], "created_at": now(), "messages": []}
        convo["_id"] = conversations.insert_one(convo).inserted_id

    # 2. Save the user's message
    user_msg = {"role": "user", "content": prompt, "timestamp": now(), "tone": tone}
    conversations.update_one({"_id": convo["_id"]}, {"$push": {"messages": user_msg}})

    # 3. Build the history the AI will see
    history = [{"role": m["role"], "content": m["content"]} for m in convo["messages"]]
    history.append({"role": "user", "content": prompt})
    system = BASE_PROMPT + TONES.get(tone, TONES["professional"])

    # 4. Stream the AI reply back to the browser, then save it
    def generate():
        reply = ""
        try:
            with ai.messages.stream(
                model=MODEL, max_tokens=1000, system=system, messages=history
            ) as stream:
                for text in stream.text_stream:
                    reply += text
                    yield text
        except Exception as e:
            reply = f"[Error: {e}]"
            yield reply
        ai_msg = {"role": "assistant", "content": reply, "timestamp": now(), "tone": tone}
        conversations.update_one({"_id": convo["_id"]}, {"$push": {"messages": ai_msg}})

    return Response(
        stream_with_context(generate()),
        mimetype="text/plain",
        headers={"X-Conversation-Id": str(convo["_id"])},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)

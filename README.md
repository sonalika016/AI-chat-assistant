# AI Chat Assistant
 
A real-time AI chat app with streaming replies, saved conversation history, and a tone switch that changes how the AI answers. Built with Flask, MongoDB, and the Claude API, with a plain HTML, CSS and JavaScript frontend.
 
<!-- Add a screenshot: save it as screenshot.png in this folder, then uncomment the next line -->
<!-- ![App screenshot](screenshot.png) -->
 
## Features
 
- **Chat interface:** scrollable conversation with separate bubbles for you and the AI.
- **Streaming replies:** text appears character by character as the AI responds.
- **History sidebar:** reopen or delete any past conversation.
- **Tone toggle (Vibe Check):** choose Professional, Casual, or Concise. The choice is sent to the backend and added to the AI's system instruction, so the next reply changes style right away.
- **Export chat (extra feature):** download any conversation as a Markdown file.
- **Persistence:** every conversation is saved in MongoDB with timestamps.
## Tech Stack
 
| Part | Technology |
|---|---|
| Backend | Python, Flask |
| Database | MongoDB (PyMongo) |
| AI | Anthropic Claude API |
| Frontend | HTML, CSS, JavaScript |
 
## Project Structure
 
```
ai-chat/
├── app.py              # Flask backend: API routes, Claude streaming, MongoDB
├── requirements.txt    # Python dependencies
├── .env.example        # Template for your secret settings
└── static/
    ├── index.html      # Page layout
    ├── style.css       # Styling
    └── script.js       # Chat logic, streaming, sidebar
```
 
## Getting Started
 
### Prerequisites
 
- Python 3.9 or newer
- MongoDB running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- An Anthropic API key with credits, from [console.anthropic.com](https://console.anthropic.com)
### Setup
 
1. Clone the repository:
```
git clone https://github.com/sonalika016/AI-chat-assistant.git
cd AI-chat-assistant
```
 
2. Create a virtual environment and install the packages:
```
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```
 
3. Create your settings file. Copy `.env.example` to `.env` and fill it in:
```
ANTHROPIC_API_KEY=your_api_key_here
MONGO_URI=mongodb://localhost:27017
MODEL_NAME=claude-sonnet-5-5
```
   For Atlas, use your connection string instead, for example `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/`.
 
4. Start the app:
```
python app.py
```
 
5. Open **http://127.0.0.1:5000** in your browser.
## How the Tone Toggle Works
 
The frontend sends the selected tone with every message. In `app.py`, the `TONES` dictionary maps each tone to an instruction that is added to the system prompt:
 
| Tone | Instruction added |
|---|---|
| Professional | Formal, precise, structured |
| Casual | Friendly and relaxed |
| Concise | Brief, key points only |
 
You can switch tone in the middle of a conversation.
 
## API Endpoints
 
| Method | Route | Description |
|---|---|---|
| POST | `/api/chat` | Send a message and stream the AI reply |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/<id>` | Get one conversation with its messages |
| DELETE | `/api/conversations/<id>` | Delete a conversation |
| GET | `/api/conversations/<id>/export` | Download a conversation as Markdown |
 
## Data Model
 
Each conversation is one MongoDB document:
 
```json
{
  "title": "First 40 characters of the first message",
  "created_at": "2026-11-22T19:07:24Z",
  "messages": [
    { "role": "user", "content": "Hello", "timestamp": "...", "tone": "casual" },
    { "role": "assistant", "content": "Hi there!", "timestamp": "...", "tone": "casual" }
  ]
}
```
 
## Troubleshooting
 
| Problem | Fix |
|---|---|
| `Invalid URI scheme` | `MONGO_URI` must start with `mongodb://` or `mongodb+srv://` |
| Timeout when sending a message | MongoDB isn't running. Start it or use Atlas |
| `credit balance is too low` | Add credits to your Anthropic API account |
| Authentication error | Check `ANTHROPIC_API_KEY` in `.env` |
 
## Security
 
Never commit your `.env` file. It holds your API key and is listed in `.gitignore`.
 
## Ideas for Improvement
 
- Render Markdown and code blocks in AI replies
- Add a "Stop generating" button
- Add user login
- Rename conversations
## License
 
Free to use for learning and personal projects.

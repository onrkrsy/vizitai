## TODO

1) Initialize project structure and planning files
   - Create `index.html`, `styles/`, `scripts/`, `data/`
   - Add Node/Express backend scaffolding (`server.js`)
   - Add providers (`providers/`), routes (`routes/`)
   - Add `package.json`, `.env.example`, `.gitignore`, `README.md`

2) Build index.html with scenario form and chat UI
   - Scenario selection (doctor type, specialty, personality, difficulty, drug category)
   - Start button and chat layout

3) Add CSS styles: main, components, responsive

4) Implement scenario-manager for config and dynamic prompt
   - Load options from `data/*.json`
   - Build prompt payload

5) Implement api-client and wire frontend chat flow
   - `start` and `message` API calls
   - Display messages with auto-scroll

6) Create Node Express server with Gemini chat endpoint
   - `POST /api/chat/start`
   - `POST /api/chat/message`

7) Connect frontend to backend, display transcript and auto-scroll

8) Add basic error handling, loading states, and session storage

9) Prepare for future OpenAI provider with pluggable design

10) Add README with Windows setup and run instructions



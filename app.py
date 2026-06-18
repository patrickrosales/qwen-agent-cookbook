import re
import logging
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from qwen_agent.agents import Assistant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- App Initialization ---
app = FastAPI(
    title="Qwen-Agent Web Summarizer",
    description="Real-time webpage summarizer powered by Qwen3 via Ollama and Qwen-Agent.",
    version="1.0.0",
)

# --- Request Schema ---
class RequestData(BaseModel):
    content: str

# --- Qwen-Agent Bot Setup ---
SYSTEM_MESSAGE = (
    "You are a summarization assistant. Directly output the cleaned summary of the given text "
    "without any reasoning, self-talk, thoughts, or internal planning steps. "
    "Do not include phrases like 'I think', 'maybe', 'let's', 'the user wants', or anything "
    "not part of the final summary. Your output must look like it was written by an editor, not a model."
)

bot = Assistant(
    llm={
        "model": "qwen3:1.7b",
        "model_server": "http://localhost:11434/v1",
        "api_key": "EMPTY",
    },
    # code_interpreter requires Docker — omitted for local runs without Docker
    function_list=[],
    system_message=SYSTEM_MESSAGE,
)

# --- Summarization Endpoint ---
@app.post("/summarize_stream_status")
async def summarize_stream_status(data: RequestData):
    user_input = data.content

    def stream():
        try:
            yield "🔍 Reading content on website...\n"
            logger.info("Received text: %s", user_input[:200])

            messages = [
                {
                    "role": "system",
                    "content": SYSTEM_MESSAGE,
                },
                {
                    "role": "user",
                    "content": (
                        "<nothink>\n"
                        "Summarize the following text clearly and concisely. "
                        "Do not include any internal thoughts, planning, or reasoning. "
                        "Just return the final summary:\n\n"
                        + user_input
                        + "\n</nothink>"
                    ),
                },
            ]

            yield "🧠 Generating summary...\n"
            result = bot.run(messages)
            result_list = list(result)
            logger.info("Raw result: %s", result_list)

            # Extract the most recent content from the model response
            last_content = None
            for item in reversed(result_list):
                if isinstance(item, list):
                    for subitem in reversed(item):
                        if isinstance(subitem, dict) and "content" in subitem:
                            last_content = subitem["content"]
                            break
                if last_content:
                    break

            if not last_content:
                yield "⚠️ No valid summary found.\n"
                return

            # Clean up internal reasoning markers and extra whitespace
            summary = re.sub(r"</?think>", "", last_content)
            summary = re.sub(
                r"(?s)^.*?(Summary:|Here's a summary|The key points are|Your tutorial|"
                r"This tutorial|To summarize|Final summary:)",
                "",
                summary,
                flags=re.IGNORECASE,
            )
            summary = re.sub(r"\n{3,}", "\n\n", summary)
            summary = summary.strip()

            yield "\n📄 Summary:\n" + summary + "\n"

        except Exception as e:
            logger.error("Error during summarization: %s", e)
            yield f"\n❌ Error: {str(e)}\n"

    return StreamingResponse(stream(), media_type="text/plain")


# --- Health Check ---
@app.get("/health")
async def health():
    return {"status": "ok", "model": "qwen3:1.7b", "server": "http://localhost:11434/v1"}

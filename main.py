import json
from pathlib import Path
from typing import Dict, List, Optional

import aiofiles
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- Configuration ---
app = FastAPI(title="AI Model Showcase API")
DB_PATH = Path("database.json")
STATIC_DIR = Path("static")

# Mount the 'static' directory to serve files like CSS and JS
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- Pydantic Models for Data Validation ---
class Model(BaseModel):
    id: int
    name: str

class ModelIn(BaseModel):
    name: str
    htmlContent: str

# Use a Dict to represent our database structure
class Database(BaseModel):
    data: Dict[str, List[Model]]

# --- Helper Functions for Database I/O ---
async def read_data() -> Dict[str, list]:
    """Asynchronously reads data from the JSON database."""
    if not DB_PATH.exists():
        return {}
    async with aiofiles.open(DB_PATH, "r") as f:
        content = await f.read()
        return json.loads(content)

async def write_data(data: dict):
    """Asynchronously writes data to the JSON database."""
    async with aiofiles.open(DB_PATH, "w") as f:
        await f.write(json.dumps(data, indent=2))

async def find_model_by_id(model_id: int) -> Optional[dict]:
    """Finds a model across all companies by its unique ID."""
    db = await read_data()
    for company, models in db.items():
        for model in models:
            if model.get("id") == model_id:
                return model
    return None

# --- API Routes ---

@app.get("/api/data", response_class=JSONResponse)
async def get_all_data():
    """Fetches all companies and their models."""
    return await read_data()

@app.get("/models/{model_id}", response_class=HTMLResponse)
async def get_model_html(model_id: int):
    """Serves the specific HTML content for a single model."""
    model = await find_model_by_id(model_id)
    if not model or "htmlContent" not in model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # We add a back button to the raw HTML for better UX
    back_button_html = """
    <a href="/" style="position: fixed; top: 10px; left: 10px; padding: 10px 15px; background-color: #03DAC6; color: black; text-decoration: none; border-radius: 5px; font-family: sans-serif; z-index: 10000;">
        &larr; Back to Showcase
    </a>
    """
    return HTMLResponse(content=back_button_html + model["htmlContent"])

@app.post("/api/companies", status_code=201)
async def create_company(request: Request):
    """Creates a new, empty company."""
    body = await request.json()
    company_name = body.get("companyName")
    if not company_name:
        raise HTTPException(status_code=400, detail="Company name is required.")
    
    data = await read_data()
    if company_name in data:
        raise HTTPException(status_code=409, detail="Company already exists.")
    
    data[company_name] = []
    await write_data(data)
    return {"message": "Company created successfully."}

@app.post("/api/companies/{company_name}/models", status_code=201)
async def add_model_to_company(company_name: str, model_in: ModelIn):
    """Adds a new model (with its HTML) to a specified company."""
    data = await read_data()
    if company_name not in data:
        raise HTTPException(status_code=404, detail="Company not found.")
    
    new_model = {
        "id": int(Path.cwd().stat().st_mtime * 1_000_000), # Simple unique ID
        "name": model_in.name,
        "htmlContent": model_in.htmlContent
    }
    data[company_name].append(new_model)
    await write_data(data)
    return new_model

@app.delete("/api/models/{company_name}/{model_id}", status_code=204)
async def delete_model(company_name: str, model_id: int):
    """Deletes a model from a company."""
    data = await read_data()
    if company_name not in data:
        raise HTTPException(status_code=404, detail="Company not found.")
        
    initial_length = len(data[company_name])
    data[company_name] = [m for m in data[company_name] if m.get("id") != model_id]

    if len(data[company_name]) == initial_length:
        raise HTTPException(status_code=404, detail="Model not found.")

    await write_data(data)
    return Response(status_code=204)


# --- Serve The Front-End ---
@app.get("/", response_class=FileResponse)
async def serve_frontend():
    """Serves the main index.html file."""
    return FileResponse(STATIC_DIR / "index.html")

# --- For Running the App Directly ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import httpx
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from pydantic import BaseModel

# --- Configuration & Secrets ---
# These are loaded securely from your Vercel project's environment variables.
ORACLE_SERVER_URL = os.getenv("ORACLE_SERVER_URL")
ORACLE_API_KEY = os.getenv("ORACLE_API_KEY")

# These are now just simple names for our files on the Oracle server.
DB_BIN_ID = "database"
VOTE_BIN_ID = "votes"

SECRET_KEY = "huehuhijiwqiiijqijq"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# !!! SECURITY WARNING: This is highly insecure. Do not use in production. !!!
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "21@Pril2012"  # Plain-text password

app = FastAPI(title="AI Model Showcase API")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Middleware to prevent API caching ---
@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

app.mount("/static", StaticFiles(directory="static"), name="static")


# --- Pydantic Models ---
class Token(BaseModel):
    access_token: str
    token_type: str

class ModelIn(BaseModel):
    name: str
    description: Optional[str] = ""
    htmlContent: str

# --- Database I/O Functions (Replaced with API Calls to your Oracle Server) ---
async def read_data(bin_id: str):
    """Reads a JSON 'bin' from your self-hosted Oracle server."""
    url = f"{ORACLE_SERVER_URL}/b/{bin_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
    response.raise_for_status()  # Will raise an exception for 4xx/5xx errors
    return response.json()

async def write_data(data: dict, bin_id: str):
    """Writes a JSON 'bin' to your self-hosted Oracle server using the secret API key."""
    headers = {'Content-Type': 'application/json', 'X-API-Key': ORACLE_API_KEY}
    url = f"{ORACLE_SERVER_URL}/b/{bin_id}"
    async with httpx.AsyncClient() as client:
        response = await client.put(url, json=data, headers=headers)
    response.raise_for_status()

# --- Slug & Security Utility Functions ---
def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[\s/]+', '-', text)
    text = re.sub(r'[^a-z0-9-]', '', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')

def verify_password(plain_password, stored_password):
    return plain_password == stored_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return {"username": username}

# --- Authentication Endpoint ---
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    if not (form_data.username == ADMIN_USERNAME and verify_password(form_data.password, ADMIN_PASSWORD)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Public API Routes ---
@app.get("/api/data", response_class=JSONResponse)
async def get_all_data():
    return await read_data(DB_BIN_ID)

@app.get("/api/leaderboard", response_class=JSONResponse)
async def get_leaderboard():
    db = await read_data(DB_BIN_ID)
    all_models = []
    for company_data in db.values():
        for model in company_data.get("models", []):
            all_models.append({
                "company": company_data.get("name"),
                "name": model.get("name"),
                "votes": model.get("votes", 0)
            })
    sorted_models = sorted(all_models, key=lambda x: (-x.get("votes", 0), x.get("name")))
    return sorted_models[:5]

@app.post("/api/models/{model_id}/vote", status_code=200)
async def vote_for_model(model_id: int, request: Request):
    client_ip = request.client.host
    votes_db = await read_data(VOTE_BIN_ID)
    voters_for_model = votes_db.get(str(model_id), [])
    
    if client_ip in voters_for_model:
        raise HTTPException(status_code=403, detail="You have already voted for this model.")
    
    db = await read_data(DB_BIN_ID)
    model_to_update = None
    for company_data in db.values():
        for model in company_data.get("models", []):
            if model.get("id") == model_id:
                model["votes"] = model.get("votes", 0) + 1
                model_to_update = model
                break
        if model_to_update: break
            
    if not model_to_update: raise HTTPException(status_code=404, detail="Model not found.")
        
    voters_for_model.append(client_ip)
    votes_db[str(model_id)] = voters_for_model
    await write_data(votes_db, VOTE_BIN_ID)
    await write_data(db, DB_BIN_ID)
    
    return {"message": "Vote successful", "new_votes": model_to_update["votes"]}

# --- PROTECTED Admin API Routes ---
@app.post("/api/companies", status_code=201)
async def create_company(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    company_name = body.get("companyName")
    if not company_name: raise HTTPException(status_code=400, detail="Company name is required.")
    
    slug = slugify(company_name)
    if not slug: raise HTTPException(status_code=400, detail="Company name is invalid.")

    data = await read_data(DB_BIN_ID)
    if slug in data: raise HTTPException(status_code=409, detail="A company with a similar name already exists.")
    
    data[slug] = { "name": company_name, "models": [] }
    await write_data(data, DB_BIN_ID)
    return {"message": "Company created successfully."}

@app.post("/api/companies/{company_slug}/models", status_code=201)
async def add_model_to_company(company_slug: str, model_in: ModelIn, current_user: dict = Depends(get_current_user)):
    data = await read_data(DB_BIN_ID)
    if company_slug not in data: raise HTTPException(status_code=404, detail="Company not found.")
    
    new_model = {
        "id": int(datetime.now().timestamp() * 1000), "name": model_in.name,
        "description": model_in.description, "htmlContent": model_in.htmlContent, "votes": 0
    }
    data[company_slug]["models"].append(new_model)
    await write_data(data, DB_BIN_ID)
    return new_model

@app.delete("/api/models/{company_slug}/{model_id}", status_code=204)
async def delete_model(company_slug: str, model_id: int, current_user: dict = Depends(get_current_user)):
    data = await read_data(DB_BIN_ID)
    if company_slug not in data: raise HTTPException(status_code=404, detail="Company not found.")
    
    models_list = data[company_slug].get("models", [])
    initial_length = len(models_list)
    data[company_slug]["models"] = [m for m in models_list if m.get("id") != model_id]
    
    if len(data[company_slug]["models"]) == initial_length: raise HTTPException(status_code=404, detail="Model not found.")
    
    await write_data(data, DB_BIN_ID)
    return Response(status_code=204)

# --- Serve The Front-End ---
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")

# This catch-all route must be last
@app.get("/{path:path}")
async def serve_frontend(path: str):
    return FileResponse("static/index.html")
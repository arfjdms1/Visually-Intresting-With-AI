import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

import aiofiles
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
# Passlib and CryptContext are removed
from pydantic import BaseModel

# --- Security & Configuration ---
SECRET_KEY = "a_very_secret_key_that_you_should_change"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DB_PATH = Path("/tmp/database.json")
VOTE_DB_PATH = Path("/tmp/votes.json")

# --- MODIFICATION: Plain-text password is stored directly ---
# !!! SECURITY WARNING: This is highly insecure. Do not use in production. !!!
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "21@Pril2012"  # The plain-text password

app = FastAPI(title="AI Model Showcase API")
app.mount("/static", StaticFiles(directory="static"), name="static")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# --- Pydantic Models ---
class Token(BaseModel):
    access_token: str
    token_type: str


class ModelIn(BaseModel):
    name: str
    description: Optional[str] = ""
    htmlContent: str


# --- MODIFICATION: Security functions are simplified ---
def verify_password(plain_password, stored_password):
    # This is now a simple, insecure string comparison.
    return plain_password == stored_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return {"username": username}


# --- Database I/O Functions ---
async def read_data(path: Path):
    if not path.exists(): return {}
    async with aiofiles.open(path, "r") as f:
        try:
            return json.loads(await f.read())
        except json.JSONDecodeError:
            return {}


async def write_data(data: dict, path: Path):
    async with aiofiles.open(path, "w") as f:
        await f.write(json.dumps(data, indent=2))


async def find_model_by_id(model_id: int):
    db = await read_data(DB_PATH)
    for models in db.values():
        for model in models:
            if model.get("id") == model_id:
                return model
    return None


# --- MODIFICATION: Authentication Endpoint now uses plain-text check ---
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # The check now compares the submitted password directly with the stored plain-text password.
    if not (form_data.username == ADMIN_USERNAME and verify_password(form_data.password, ADMIN_PASSWORD)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- Public API Routes ---
@app.get("/api/data", response_class=JSONResponse)
async def get_all_data():
    return await read_data(DB_PATH)


@app.get("/models/{model_id}", response_class=HTMLResponse)
async def get_model_html(model_id: int):
    model = await find_model_by_id(model_id)
    if not model: raise HTTPException(status_code=404)
    back_button_html = """<a href="/" style="position: fixed; top: 10px; left: 10px; padding: 10px 15px; background-color: #03DAC6; color: black; text-decoration: none; border-radius: 5px; font-family: sans-serif; z-index: 10000;">&larr; Back</a>"""
    return HTMLResponse(content=back_button_html + model.get("htmlContent", ""))


@app.get("/api/leaderboard", response_class=JSONResponse)
async def get_leaderboard():
    db = await read_data(DB_PATH)
    all_models = [model for models in db.values() for model in models]
    sorted_models = sorted(all_models, key=lambda x: (-x.get("votes", 0), x.get("name")))

    # Need to find the company for each model
    leaderboard = []
    for model in sorted_models[:5]:
        company_name = "Unknown"
        for company, models_list in db.items():
            if any(m.get("id") == model.get("id") for m in models_list):
                company_name = company
                break
        leaderboard.append({
            "company": company_name,
            "name": model.get("name"),
            "votes": model.get("votes", 0)
        })
    return leaderboard


@app.post("/api/models/{model_id}/vote", status_code=200)
async def vote_for_model(model_id: int, request: Request):
    client_ip = request.client.host
    votes_db = await read_data(VOTE_DB_PATH)
    voters_for_model = votes_db.get(str(model_id), [])

    if client_ip in voters_for_model:
        raise HTTPException(status_code=403, detail="You have already voted for this model.")

    db = await read_data(DB_PATH)
    model_to_update = None
    for models in db.values():
        for model in models:
            if model.get("id") == model_id:
                model["votes"] = model.get("votes", 0) + 1
                model_to_update = model
                break
        if model_to_update: break

    if not model_to_update: raise HTTPException(status_code=404, detail="Model not found.")

    voters_for_model.append(client_ip)
    votes_db[str(model_id)] = voters_for_model
    await write_data(votes_db, VOTE_DB_PATH)
    await write_data(db, DB_PATH)

    return {"message": "Vote successful", "new_votes": model_to_update["votes"]}


# --- PROTECTED Admin API Routes ---
@app.post("/api/companies", status_code=201)
async def create_company(request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    company_name = body.get("companyName")
    if not company_name: raise HTTPException(status_code=400, detail="Company name is required.")
    data = await read_data(DB_PATH)
    if company_name in data: raise HTTPException(status_code=409, detail="Company already exists.")
    data[company_name] = []
    await write_data(data, DB_PATH)
    return {"message": "Company created successfully."}


@app.post("/api/companies/{company_name}/models", status_code=201)
async def add_model_to_company(company_name: str, model_in: ModelIn, current_user: dict = Depends(get_current_user)):
    data = await read_data(DB_PATH)
    if company_name not in data: raise HTTPException(status_code=404, detail="Company not found.")

    new_model = {
        "id": int(datetime.now().timestamp() * 1000), "name": model_in.name,
        "description": model_in.description, "htmlContent": model_in.htmlContent,
        "votes": 0
    }
    data[company_name].append(new_model)
    await write_data(data, DB_PATH)
    return new_model


@app.delete("/api/models/{company_name}/{model_id}", status_code=204)
async def delete_model(company_name: str, model_id: int, current_user: dict = Depends(get_current_user)):
    data = await read_data(DB_PATH)
    if company_name not in data: raise HTTPException(status_code=404, detail="Company not found.")
    initial_length = len(data[company_name])
    data[company_name] = [m for m in data[company_name] if m.get("id") != model_id]
    if len(data[company_name]) == initial_length: raise HTTPException(status_code=404, detail="Model not found.")
    await write_data(data, DB_PATH)
    return Response(status_code=204)


# --- Serve The Front-End ---
@app.get("/", response_class=FileResponse)
async def serve_frontend():
    return FileResponse("static/index.html")


# --- Run Command ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
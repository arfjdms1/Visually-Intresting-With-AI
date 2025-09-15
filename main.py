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
# --- REMOVED: passlib is no longer used ---
from pydantic import BaseModel

# --- Security & Configuration ---
SECRET_KEY = """1rl;kuuz>M"A=Cu8oB*oWBDGs]$$98P8[I=]l<7v3Bo]UUc{'*0e"""
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DB_PATH = Path("/tmp/database.json")

# --- MODIFICATION: Plain-text password is stored directly ---
# !!! SECURITY WARNING: This is highly insecure. Do not use in production. !!!
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "21@Pril2012" # Plain text password

app = FastAPI(title="AI Model Showcase API")
app.mount("/static", StaticFiles(directory="static"), name="static")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# --- Pydantic Models ---
class Token(BaseModel):
    access_token: str
    token_type: str

class ModelIn(BaseModel):
    name: str
    htmlContent: str

# --- MODIFICATION: Security functions are simplified ---
def verify_password(plain_password, stored_password):
    # This is now a simple, insecure string comparison.
    return plain_password == stored_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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

# --- Database I/O (Unchanged) ---
async def read_data():
    if not DB_PATH.exists():
        await write_data({})
        return {}
    async with aiofiles.open(DB_PATH, "r") as f:
        return json.loads(await f.read())

async def write_data(data: dict):
    async with aiofiles.open(DB_PATH, "w") as f:
        await f.write(json.dumps(data, indent=2))
        
async def find_model_by_id(model_id: int):
    db = await read_data()
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
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- Public API Routes (Unchanged) ---
@app.get("/api/data", response_class=JSONResponse)
async def get_all_data():
    return await read_data()

@app.get("/models/{model_id}", response_class=HTMLResponse)
async def get_model_html(model_id: int):
    model = await find_model_by_id(model_id)
    if not model or "htmlContent" not in model:
        raise HTTPException(status_code=404, detail="Model not found")
    back_button_html = """<a href="/" style="position: fixed; top: 10px; left: 10px; padding: 10px 15px; background-color: #03DAC6; color: black; text-decoration: none; border-radius: 5px; font-family: sans-serif; z-index: 10000;">&larr; Back</a>"""
    return HTMLResponse(content=back_button_html + model["htmlContent"])

# --- PROTECTED Admin API Routes (Unchanged) ---
@app.post("/api/companies", status_code=201)
async def create_company(request: Request, current_user: dict = Depends(get_current_user)):
    # ... (rest of the admin routes are unchanged) ...
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
async def add_model_to_company(company_name: str, model_in: ModelIn, current_user: dict = Depends(get_current_user)):
    data = await read_data()
    if company_name not in data:
        raise HTTPException(status_code=404, detail="Company not found.")
    new_model = {"id": int(datetime.now().timestamp() * 1000), "name": model_in.name, "htmlContent": model_in.htmlContent}
    data[company_name].append(new_model)
    await write_data(data)
    return new_model

@app.delete("/api/models/{company_name}/{model_id}", status_code=204)
async def delete_model(company_name: str, model_id: int, current_user: dict = Depends(get_current_user)):
    data = await read_data()
    if company_name not in data:
        raise HTTPException(status_code=404, detail="Company not found.")
    initial_length = len(data[company_name])
    data[company_name] = [m for m in data[company_name] if m.get("id") != model_id]
    if len(data[company_name]) == initial_length:
        raise HTTPException(status_code=404, detail="Model not found.")
    await write_data(data)
    return Response(status_code=204)


# --- Serve The Front-End (Unchanged) ---
@app.get("/", response_class=FileResponse)
async def serve_frontend():
    return FileResponse("static/index.html")

# --- Run Command (Unchanged) ---
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

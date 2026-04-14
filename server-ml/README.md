# ML Service (`server-ml`)

Python Flask microservice for dengue prediction and breeding-area detection. It serves endpoints used by `server-api`, including `/health`, `/predict`, `/predict/three-models`, and `/detect-breeding-areas`.

## Prerequisites

- Python 3.10+ (3.11 recommended)
- `pip` and virtual environment support
- Model artifacts in `server-ml/models/` (already present in this repo)

## 1) Create and activate virtual environment

Windows (PowerShell):

```powershell
cd server-ml
python -m venv venv
.\venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
cd server-ml
python -m venv venv
source venv/bin/activate
```

## 2) Install dependencies

```bash
pip install -r requirements.txt
```

## 3) Configure environment

Create `.env` from the template:

```bash
cp env.example .env
```

Important local values:

- `PORT=5001`
- `MODELS_DIR=models`
- `FLASK_ENV=development`
- `FLASK_DEBUG=True`

## 4) Run the service

```bash
python prediction_service.py
```

Default local URL: `http://localhost:5001`

You can also use helper scripts:

- Windows: `start_service.bat`
- macOS/Linux: `start_service.sh`

## Local test checks

### Service health

```bash
curl http://localhost:5001/health
```

### Integration smoke tests

- Interface-level test:
  - `python test_interface.py`
- End-to-end integration checks (expects API service on `http://localhost:4000` too):
  - `python test_three_model_integration.py`

## Notes

- `server-api` expects this service at `ML_SERVICE_URL` (default `http://localhost:5001`).
- If you move model files, update `MODELS_DIR` accordingly.


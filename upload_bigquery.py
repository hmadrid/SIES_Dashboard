"""Sube universidades_bq.csv a BigQuery.

Uso en 2 pasos:
  python upload_bigquery.py              # Genera URL de autorización
  python upload_bigquery.py <auth_code>  # Completa auth y sube el CSV
"""
import os, sys, pickle

PROJECT_ID = "dotacion-ua"
CSV_FILE = "universidades_bq.csv"
DATASET = "sies"
TABLE = "universidades"
TOKEN_FILE = "bq_token.pickle"
CLIENT_CONFIG = {
    "installed": {
        "client_id": "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com",
        "project_id": "clasp",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_secret": "GOCSPX-not-needed",
        "redirect_uris": ["http://localhost:8888"],
    }
}

def get_credentials():
    """Obtiene credenciales: token guardado, refresh, o nuevo OAuth."""
    from google.auth.transport.requests import Request

    creds = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "rb") as f:
            creds = pickle.load(f)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(TOKEN_FILE, "wb") as f:
            pickle.dump(creds, f)
        return creds

    # Nuevo OAuth flow
    from google_auth_oauthlib.flow import InstalledAppFlow

    flow = InstalledAppFlow.from_client_config(
        CLIENT_CONFIG,
        scopes=["https://www.googleapis.com/auth/bigquery"],
        redirect_uri="http://localhost:8888",
    )

    # ¿Paso 1 o paso 2?
    auth_code = sys.argv[1] if len(sys.argv) > 1 else None

    if not auth_code:
        # Paso 1: generar URL
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        print("\n=== Paso 1: Abre esta URL en tu navegador y autoriza ===")
        print(auth_url)
        print("\n=== Paso 2: Seras redirigido a localhost:8888/?code=XXXXX... ===")
        print('   Copia el codigo y ejecuta:')
        print('   python upload_bigquery.py CODIGO')
        sys.exit(0)

    # Paso 2: completar auth con el código
    flow.fetch_token(code=auth_code)
    creds = flow.credentials

    with open(TOKEN_FILE, "wb") as f:
        pickle.dump(creds, f)
    print("[OK] Token guardado en", TOKEN_FILE)
    return creds


def upload():
    from google.cloud import bigquery

    creds = get_credentials()
    client = bigquery.Client(project=PROJECT_ID, credentials=creds)

    # Dataset
    dataset_ref = client.dataset(DATASET)
    try:
        client.get_dataset(dataset_ref)
        print(f"[OK] Dataset {DATASET} ya existe")
    except Exception:
        client.create_dataset(dataset_ref, location="northamerica-northeast1")
        print(f"[OK] Dataset {DATASET} creado en northamerica-northeast1")

    # Subir CSV
    print(f"[..] Subiendo {CSV_FILE} ({os.path.getsize(CSV_FILE)/1024/1024:.1f} MB)...")
    table_ref = dataset_ref.table(TABLE)
    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.CSV,
        skip_leading_rows=1,
        autodetect=True,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )

    with open(CSV_FILE, "rb") as f:
        job = client.load_table_from_file(f, table_ref, job_config=job_config)

    job.result()  # Esperar que termine
    table = client.get_table(table_ref)
    print(f"\n[OK] {table.num_rows:,} filas en {PROJECT_ID}.{DATASET}.{TABLE}")


if __name__ == "__main__":
    upload()

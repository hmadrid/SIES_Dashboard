import pandas as pd
import os

BASE = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Oferta Academica"
OUT = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Google_App_Script\data_clean\Oferta"

cols = ["Año", "Tipo Institución 1", "Código IES", "Nombre IES", "Código Sede", "Nombre Sede", "Código Carrera", "Nombre Carrera",
        "Modalidad", "Jornada", "Nivel Global", "Nivel Carrera",
        "Vacantes Semestre Uno", "Matrícula Anual", "Arancel Anual",
        "Acreditación Carrera o Programa", "Vigencia",
        "Duración Estudios", "Región Sede"]

dfs = []

# 1. Cargar histórico 2010-2023 y filtrar >= 2018
hist_file = os.path.join(BASE, "Oferta_Academica_2010_al_2023_SIES_25_05_2023_E.csv")
if os.path.exists(hist_file):
    print("Cargando y filtrando histórico 2018-2023...")
    df_hist = pd.read_csv(hist_file, sep=";", encoding="latin-1", low_memory=False)
    df_hist.columns = [c.strip() for c in df_hist.columns]
    
    # Limpiar columna Año
    if "Año" in df_hist.columns:
        df_hist["Año"] = df_hist["Año"].astype(str).str.replace("OFE_", "", case=False).str.strip()
        df_hist["Año"] = pd.to_numeric(df_hist["Año"], errors="coerce")
        df_hist = df_hist[df_hist["Año"] >= 2018]
        
    df_hist = df_hist[cols].copy()
    dfs.append(df_hist)

# 2. Cargar 2024
file_2024 = os.path.join(BASE, "Oferta_Academica_2024_SIES_04_07_2024_WEB_EE.csv")
if os.path.exists(file_2024):
    print("Cargando 2024...")
    df_2024 = pd.read_csv(file_2024, sep=";", encoding="latin-1", low_memory=False)
    df_2024.columns = [c.strip() for c in df_2024.columns]
    if "Año" in df_2024.columns:
        df_2024["Año"] = df_2024["Año"].astype(str).str.replace("OFE_", "", case=False).str.strip()
        df_2024["Año"] = pd.to_numeric(df_2024["Año"], errors="coerce")
    df_2024 = df_2024[cols].copy()
    dfs.append(df_2024)

# 3. Cargar 2025
file_2025 = os.path.join(BASE, "Oferta_Academica_2025_SIES_21_04_2025_WEB_E.csv")
if os.path.exists(file_2025):
    print("Cargando 2025...")
    df_2025 = pd.read_csv(file_2025, sep=";", encoding="latin-1", low_memory=False)
    df_2025.columns = [c.strip() for c in df_2025.columns]
    if "Año" in df_2025.columns:
        df_2025["Año"] = df_2025["Año"].astype(str).str.replace("OFE_", "", case=False).str.strip()
        df_2025["Año"] = pd.to_numeric(df_2025["Año"], errors="coerce")
    df_2025 = df_2025[cols].copy()
    dfs.append(df_2025)

# 4. Cargar 2026 (Excel .xlsx)
file_2026 = os.path.join(BASE, "Oferta_Academica_2026_SIES_05_06_2026_WEB_E.xlsx")
if os.path.exists(file_2026):
    print("Cargando 2026 (Excel)...")
    df_2026 = pd.read_excel(file_2026, engine="openpyxl")
    df_2026.columns = [c.strip() for c in df_2026.columns]
    if "Año" in df_2026.columns:
        df_2026["Año"] = df_2026["Año"].astype(str).str.replace("OFE_", "", case=False).str.strip()
        df_2026["Año"] = pd.to_numeric(df_2026["Año"], errors="coerce")
    df_2026 = df_2026[cols].copy()
    dfs.append(df_2026)

if not dfs:
    print("No se encontró ningún archivo para consolidar.")
    exit()

# Consolidar
print("Consolidando todos los años...")
df_final = pd.concat(dfs, ignore_index=True)

# Limpiar campos numéricos y strings vacíos
df_final["Año"] = df_final["Año"].fillna(0).astype(int)
df_final["Vacantes Semestre Uno"] = pd.to_numeric(df_final["Vacantes Semestre Uno"], errors="coerce").fillna(0).astype(int)

# Limpiar Arancel Anual (eliminar puntos, etc. si vienen como texto)
if df_final["Arancel Anual"].dtype == object:
    df_final["Arancel Anual"] = df_final["Arancel Anual"].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False).str.strip()
df_final["Arancel Anual"] = pd.to_numeric(df_final["Arancel Anual"], errors="coerce").fillna(0).astype(float)

# Ordenar
df_final = df_final.sort_values(["Año", "Tipo Institución 1", "Nombre IES", "Nombre Carrera"], ascending=[False, True, True, True])

print(f"\nConsolidación completada:")
print(f"Total filas: {len(df_final):,}")
print(f"Rango de años: {df_final['Año'].min()} a {df_final['Año'].max()}")
print(f"Distribución de filas por año:")
print(df_final["Año"].value_counts().sort_index(ascending=False))

# Guardar CSV consolidado completo
csv_out = os.path.join(OUT, "todas_instituciones_2018_2026.csv")
df_final.to_csv(csv_out, index=False, encoding="utf-8")
print(f"\nArchivo completo guardado en: {csv_out} ({os.path.getsize(csv_out)/1024/1024:.2f} MB)")

# 5. Generar archivos segmentados por Tipo de Institución
# Normalizar los textos de tipo institución para evitar fallos por mayúsculas/minúsculas o espacios
df_final["Tipo_Clean"] = df_final["Tipo Institución 1"].astype(str).str.upper().str.strip()

# Segmento 1: Universidades (ej: "UNIVERSIDADES")
df_univ = df_final[df_final["Tipo_Clean"].str.contains("UNIVERSIDAD", na=False)].drop(columns=["Tipo_Clean"])
univ_out = os.path.join(OUT, "universidades_2018_2026.csv")
df_univ.to_csv(univ_out, index=False, encoding="utf-8")
print(f"Universidades (2018-2026): {len(df_univ):,} filas -> {univ_out}")

# Segmento 2: Institutos Profesionales (ej: "INSTITUTOS PROFESIONALES")
df_ip = df_final[df_final["Tipo_Clean"].str.contains("INSTITUTO", na=False)].drop(columns=["Tipo_Clean"])
ip_out = os.path.join(OUT, "institutos_2018_2026.csv")
df_ip.to_csv(ip_out, index=False, encoding="utf-8")
print(f"Institutos Profesionales (2018-2026): {len(df_ip):,} filas -> {ip_out}")

# Segmento 3: Centros de Formación Técnica (ej: "CENTROS DE FORMACION TECNICA")
df_cft = df_final[df_final["Tipo_Clean"].str.contains("CENTRO", na=False) | df_final["Tipo_Clean"].str.contains("CFT", na=False)].drop(columns=["Tipo_Clean"])
cft_out = os.path.join(OUT, "cft_2018_2026.csv")
df_cft.to_csv(cft_out, index=False, encoding="utf-8")
print(f"Centros de Formación Técnica (2018-2026): {len(df_cft):,} filas -> {cft_out}")

print("\nTodos los archivos segmentados listos para subir a BigQuery.")

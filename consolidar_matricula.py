import pandas as pd
import os

BASE = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Matricula"
OUT = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Google_App_Script\data_clean\Matricula"

# Crear carpeta de salida si no existe
os.makedirs(OUT, exist_ok=True)

input_file = os.path.join(BASE, "SIES_MAT_2007_al_Presente.csv")

if not os.path.exists(input_file):
    print(f"Error: No se encontró el archivo de matrícula en: {input_file}")
    exit()

print("Cargando y filtrando datos de Matrícula (2018-2025)...")
# Leemos con coma como separador y encoding latin-1
df = pd.read_csv(input_file, sep=",", encoding="latin-1", low_memory=False)

# Limpiar espacios en los nombres de las columnas
df.columns = [c.strip() for c in df.columns]

# Definir columnas de interés para no saturar BigQuery
cols_interes = [
    "AÑO", "TOTAL MATRÍCULA", "TOTAL MATRÍCULA MUJERES", "TOTAL MATRÍCULA HOMBRES",
    "TOTAL MATRÍCULA PRIMER AÑO", "CLASIFICACIÓN INSTITUCIÓN NIVEL 1", "CLASIFICACIÓN INSTITUCIÓN NIVEL 2",
    "CÓDIGO DE INSTITUCIÓN", "NOMBRE INSTITUCIÓN", "REGIÓN", "NOMBRE SEDE", 
    "NOMBRE CARRERA", "CÓDIGO CARRERA", "NIVEL GLOBAL", "MODALIDAD", "JORNADA"
]

# Verificar cuáles columnas realmente existen en el archivo (por diferencias de acentos o tipeo)
# Buscaremos las columnas de forma flexible
mapeo_columnas = {}
for col_deseada in cols_interes:
    # Buscar una columna que se parezca quitando acentos
    found = False
    for col_real in df.columns:
        if col_real.upper().replace("Í", "I").replace("Ó", "O").replace("Á", "A").replace("Ú", "U").replace("É", "E") == col_deseada.upper().replace("Í", "I").replace("Ó", "O").replace("Á", "A").replace("Ú", "U").replace("É", "E"):
            mapeo_columnas[col_real] = col_deseada
            found = True
            break

# Renombrar al estándar deseado y filtrar
df = df[list(mapeo_columnas.keys())].rename(columns=mapeo_columnas)

# Limpiar año y filtrar 2018-2025
df["AÑO"] = df["AÑO"].astype(str).str.replace("MAT_", "", case=False).str.strip()
df["AÑO"] = pd.to_numeric(df["AÑO"], errors="coerce").fillna(0).astype(int)
df = df[(df["AÑO"] >= 2018) & (df["AÑO"] <= 2025)]

# Convertir tipos de matrícula a numéricos
for col in ["TOTAL MATRÍCULA", "TOTAL MATRÍCULA PRIMER AÑO", "TOTAL MATRÍCULA MUJERES", "TOTAL MATRÍCULA HOMBRES"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

# Normalizar tipo de institución
tipo_col = "CLASIFICACIÓN INSTITUCIÓN NIVEL 1"
df["Tipo_Clean"] = df[tipo_col].astype(str).str.upper().str.strip()

# Ordenar
df = df.sort_values(["AÑO", "CLASIFICACIÓN INSTITUCIÓN NIVEL 1", "NOMBRE INSTITUCIÓN", "NOMBRE CARRERA"])

# Guardar Consolidado Completo
todas_out = os.path.join(OUT, "todas_matricula_2018_2025.csv")
df.to_csv(todas_out, index=False, encoding="utf-8")
print(f"\nMatrícula Completa (2018-2025): {len(df):,} filas -> {todas_out} ({os.path.getsize(todas_out)/1024/1024:.2f} MB)")

# Segmentar 1: Universidades
df_univ = df[df["Tipo_Clean"].str.contains("UNIVERSIDAD", na=False)].drop(columns=["Tipo_Clean"])
univ_out = os.path.join(OUT, "universidades_matricula_2018_2025.csv")
df_univ.to_csv(univ_out, index=False, encoding="utf-8")
print(f"Universidades: {len(df_univ):,} filas -> {univ_out}")

# Segmentar 2: Institutos Profesionales
df_ip = df[df["Tipo_Clean"].str.contains("INSTITUTO", na=False)].drop(columns=["Tipo_Clean"])
ip_out = os.path.join(OUT, "institutos_matricula_2018_2025.csv")
df_ip.to_csv(ip_out, index=False, encoding="utf-8")
print(f"Institutos Profesionales: {len(df_ip):,} filas -> {ip_out}")

# Segmentar 3: Centros de Formación Técnica (CFT)
df_cft = df[df["Tipo_Clean"].str.contains("CENTRO", na=False) | df["Tipo_Clean"].str.contains("CFT", na=False)].drop(columns=["Tipo_Clean"])
cft_out = os.path.join(OUT, "cft_matricula_2018_2025.csv")
df_cft.to_csv(cft_out, index=False, encoding="utf-8")
print(f"CFTs: {len(df_cft):,} filas -> {cft_out}")

print("\n¡Consolidación y segmentación de Matrícula completada!")
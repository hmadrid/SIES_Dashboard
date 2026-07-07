import pandas as pd
import os

BASE = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Oferta Academica"
OUT = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Google_App_Script"

# 1. Cargar archivos
print("Cargando archivos...")
df_multi = pd.read_csv(os.path.join(BASE, "Oferta_Academica_2010_al_2023_SIES_25_05_2023_E.csv"),
                       sep=";", encoding="latin-1", low_memory=False)
df_2024 = pd.read_csv(os.path.join(BASE, "Oferta_Academica_2024_SIES_04_07_2024_WEB_EE.csv"),
                      sep=";", encoding="latin-1", low_memory=False)
df_2025 = pd.read_csv(os.path.join(BASE, "Oferta_Academica_2025_SIES_21_04_2025_WEB_E.csv"),
                      sep=";", encoding="latin-1", low_memory=False)

# 2. Limpiar nombres de columna (quitar espacios)
for df in [df_multi, df_2024, df_2025]:
    df.columns = [c.strip() for c in df.columns]

# 3. Filtrar multi: quitar OFE_2023 (está duplicado con el archivo individual 2023 que no usamos)
# Pero como 2023 individual = OFE_2023 del multi, y no cargamos 2023 individual, 
# el multi ya tiene todo 2010-2023. Solo agregamos 2024 y 2025.
df_multi = df_multi[df_multi["Año"] != "OFE_2023"]  # quitar 2023 del multi
# Pero espera, si no cargamos 2023 individual, necesitamos 2023 del multi
# Mejor: conservar todo del multi (2010-2023) + 2024 + 2025

print(f"Multi (2010-2023): {len(df_multi):,} filas")
print(f"2024:              {len(df_2024):,} filas")
print(f"2025:              {len(df_2025):,} filas")

# 4. Consolidar
df_all = pd.concat([df_multi, df_2024, df_2025], ignore_index=True)
print(f"\nTotal consolidado: {len(df_all):,} filas")

# 5. Filtrar Universidad Autónoma de Chile
ua = df_all[df_all["Nombre IES"].str.contains("AUTONOMA", na=False)].copy()
print(f"Filas UA: {len(ua):,}")

# 6. Columnas relevantes para dashboard
cols_dashboard = [
    "Año", "Nombre IES", "Tipo Institución 1", "Nombre Sede", "Nombre Carrera",
    "Modalidad", "Jornada", "Nivel Global", "Nivel Carrera",
    "Vacantes Semestre Uno", "Matrícula Anual", "Arancel Anual",
    "Acreditación Carrera o Programa", "Vigencia",
    "Duración Estudios", "Región Sede"
]
ua = ua[cols_dashboard]

# Limpiar columna Año (quitar prefijo OFE_)
ua["Año"] = ua["Año"].str.replace("OFE_", "").astype(int)

# Ordenar por año descendente
ua = ua.sort_values(["Año", "Nombre Carrera"], ascending=[False, True])

print(f"\nAños: {sorted(ua['Año'].unique())}")
print(f"Sedes: {ua['Nombre Sede'].nunique()}")
print(f"Carreras únicas: {ua['Nombre Carrera'].nunique()}")
print(f"\nMuestra:")
print(ua.head(10).to_string())

# 7. Guardar CSV limpio
csv_path = os.path.join(OUT, "oferta_academica_ua_limpio.csv")
ua.to_csv(csv_path, index=False, encoding="utf-8")
print(f"\nGuardado: {csv_path}")
print(f"Tamaño: {os.path.getsize(csv_path):,} bytes")

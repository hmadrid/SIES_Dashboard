import pandas as pd
from sqlalchemy import create_engine, text
import os

CONN = "postgresql://postgres:ee6e381abfaeba251d111b6eaea52169@rn5h6ghm.us-east.database.insforge.app:5432/insforge?sslmode=require"
engine = create_engine(CONN)

BASE = r"C:\Users\herna\Universidad Autónoma de Chile\Análisis VRA - Documentos\11.Informacion Entorno SIES\Google_App_Script\data_clean"

def subir_oferta():
    csv_file = os.path.join(BASE, "Oferta", "todas_instituciones_2018_2026.csv")
    if not os.path.exists(csv_file):
        print(f"No se encontró el CSV de oferta: {csv_file}")
        return

    print("Cargando CSV de Oferta Académica...")
    df = pd.read_csv(csv_file, encoding="utf-8", low_memory=False)

    # Mapear nombres de columnas de CSV a columnas de DB de PostgreSQL
    mapping = {
        "Año": "año",
        "Tipo Institución 1": "tipo_institucion_1",
        "Código IES": "codigo_ies",
        "Nombre IES": "nombre_ies",
        "Código Sede": "codigo_sede",
        "Nombre Sede": "nombre_sede",
        "Código Carrera": "codigo_carrera",
        "Nombre Carrera": "nombre_carrera",
        "Modalidad": "modalidad",
        "Jornada": "jornada",
        "Nivel Global": "nivel_global",
        "Nivel Carrera": "nivel_carrera",
        "Vacantes Semestre Uno": "vacantes_semestre_uno",
        "Matrícula Anual": "matricula_anual",
        "Arancel Anual": "arancel_anual",
        "Acreditación Carrera o Programa": "acreditacion_carrera",
        "Vigencia": "vigencia",
        "Duración Estudios": "duracion_estudios",
        "Región Sede": "region_sede"
    }

    df = df[list(mapping.keys())].rename(columns=mapping)

    print("Limpiando datos en tabla de base de datos 'oferta'...")
    with engine.connect() as conn:
      conn.execute(text("TRUNCATE TABLE oferta RESTART IDENTITY;"))
      conn.commit()

    print(f"Subiendo {len(df):,} filas a la tabla 'oferta' en InsForge...")
    df.to_sql("oferta", engine, if_exists="append", index=False, method="multi", chunksize=5000)
    print("¡Tabla 'oferta' subida con éxito!")

def subir_matricula():
    csv_file = os.path.join(BASE, "Matricula", "todas_matricula_2018_2025.csv")
    if not os.path.exists(csv_file):
        print(f"No se encontró el CSV de matrícula: {csv_file}")
        return

    print("\nCargando CSV de Matrícula...")
    df = pd.read_csv(csv_file, encoding="utf-8", low_memory=False)

    # Mapear nombres de columnas de CSV a columnas de DB de PostgreSQL
    mapping = {
        "AÑO": "año",
        "TOTAL MATRÍCULA": "total_matricula",
        "TOTAL MATRÍCULA MUJERES": "total_matricula_mujeres",
        "TOTAL MATRÍCULA HOMBRES": "total_matricula_hombres",
        "TOTAL MATRÍCULA PRIMER AÑO": "total_matricula_primer_año",
        "CLASIFICACIÓN INSTITUCIÓN NIVEL 1": "clasificacion_institucion_nivel_1",
        "CLASIFICACIÓN INSTITUCIÓN NIVEL 2": "clasificacion_institucion_nivel_2",
        "CÓDIGO DE INSTITUCIÓN": "codigo_de_institucion",
        "NOMBRE INSTITUCIÓN": "nombre_institucion",
        "REGIÓN": "region",
        "NOMBRE SEDE": "nombre_sede",
        "NOMBRE CARRERA": "nombre_carrera",
        "CÓDIGO CARRERA": "codigo_carrera",
        "NIVEL GLOBAL": "nivel_global",
        "MODALIDAD": "modalidad",
        "JORNADA": "jornada"
    }

    df = df[list(mapping.keys())].rename(columns=mapping)

    print("Limpiando datos en tabla de base de datos 'matricula'...")
    with engine.connect() as conn:
      conn.execute(text("TRUNCATE TABLE matricula RESTART IDENTITY;"))
      conn.commit()

    print(f"Subiendo {len(df):,} filas a la tabla 'matricula' en InsForge...")
    df.to_sql("matricula", engine, if_exists="append", index=False, method="multi", chunksize=5000)
    print("¡Tabla 'matricula' subida con éxito!")

if __name__ == "__main__":
    subir_oferta()
    subir_matricula()
    print("\nProceso de carga a InsForge completado.")
# -*- coding: utf-8 -*-
"""Sube CSV al Google Sheet usando el mismo OAuth que clasp ya tiene."""
import csv, os, sys, json

SHEET_ID = '1q5RXQqOxQCMWqKc8eeI1PQMvIUXgsYZdGZVaObvP7TE'
CSV_FILE = 'oferta_academica_ua_limpio.csv'

def upload():
    # Usar gspread con OAuth local (abre navegador, captura token automaticamente)
    import gspread
    
    print('Abriendo navegador para autorizar...')
    print('(Si no se abre, usa la URL que aparece abajo)')
    
    # gspread oauth con servidor local
    gc = gspread.oauth(
        scopes=['https://www.googleapis.com/auth/spreadsheets'],
        flow=gspread.auth.console_flow,
        # Si no hay client_secret, gspread da instrucciones
    )
    
    sh = gc.open_by_key(SHEET_ID)
    ws = sh.sheet1
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    print(f'Subiendo {len(rows)-1} filas...')
    ws.clear()
    ws.update(rows, value_input_option='RAW')
    
    print(f'OK: {len(rows)-1} filas subidas.')
    print(f'API: https://script.google.com/macros/s/AKfycbyRv1bKQRhsotd8XP5uIhjfbNgpprJ7VAnxdj5nIQvpm4U_9aZI9-DK-K0lY6jXUcAN/exec')

if __name__ == '__main__':
    upload()

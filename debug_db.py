import sqlite3
import json

conn = sqlite3.connect('backend/cards.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT * FROM cards WHERE name LIKE '%Delver of Secrets%' LIMIT 1")
row = c.fetchone()

if row:
    print(json.dumps(dict(row), indent=2))
else:
    print("Nenhum Delver encontrado.")

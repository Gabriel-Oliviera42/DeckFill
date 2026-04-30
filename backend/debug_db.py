import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'cards.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, name, set_code, collector_number FROM cards WHERE name LIKE '%Etali%' ORDER BY set_code, collector_number LIMIT 10")
print("--- CARTAS ETALI NO BANCO ---")
for row in cursor.fetchall():
    print(f"ID: {row[0]} | Nome: {row[1]} | Set: {row[2]} | Number: {row[3]}")

conn.close()

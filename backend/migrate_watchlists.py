import sqlite3

def migrate():
    conn = sqlite3.connect('cityvision.db')
    cur = conn.cursor()

    columns_to_add = [
        ('case_reference', 'VARCHAR(100)'),
        ('status', 'VARCHAR(50) DEFAULT "active"'),
        ('verification_status', 'VARCHAR(50) DEFAULT "verified"'),
        ('verified_by', 'INTEGER'),
        ('verified_at', 'DATETIME'),
        ('effective_from', 'DATETIME'),
        ('expiry_date', 'DATETIME'),
        ('resolution_notes', 'TEXT'),
        ('resolved_at', 'DATETIME')
    ]

    cur.execute('PRAGMA table_info(watchlists)')
    existing_cols = [r[1] for r in cur.fetchall()]

    for col, col_type in columns_to_add:
        if col not in existing_cols:
            try:
                cur.execute(f'ALTER TABLE watchlists ADD COLUMN {col} {col_type}')
                print(f'Added column {col}')
            except Exception as e:
                print(f'Error adding {col}: {e}')

    conn.commit()

    cur.execute("UPDATE watchlists SET case_reference = 'BEL-2026-0914', status = 'active', verification_status = 'verified' WHERE plate_number = 'AP39AB1234'")
    cur.execute("UPDATE watchlists SET case_reference = 'FIR-VSP-2026-0412', status = 'active', verification_status = 'verified' WHERE plate_number = 'AP31TX9901'")
    cur.execute("UPDATE watchlists SET case_reference = 'TRF-2026-881', status = 'active', verification_status = 'verified' WHERE plate_number = 'TS09UB4432'")
    cur.execute("UPDATE watchlists SET case_reference = 'SEC-VIP-09', status = 'active', verification_status = 'verified' WHERE plate_number = 'KA01MN7712'")
    cur.execute("UPDATE watchlists SET case_reference = 'DEMO-TEST-01', status = 'active', verification_status = 'verified' WHERE plate_number = 'AP39ZZ0007'")
    conn.commit()

    cur.execute('PRAGMA table_info(watchlists)')
    for r in cur.fetchall():
        print(r)

    conn.close()

if __name__ == '__main__':
    migrate()

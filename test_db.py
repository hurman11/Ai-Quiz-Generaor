import psycopg2

URL = "postgresql://neondb_owner:npg_0T1OUbNWHLxV@ep-lingering-haze-aokfs2g2-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
try:
    conn = psycopg2.connect(URL)
    print("Success")
except Exception as e:
    print(f"Error: {e}")

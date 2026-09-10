#!/usr/bin/env python3
"""
Administracao de usuarios - Acompanhamento de Custos.

Uso:
    python scripts/admin_users.py block-test-users [--yes]
    python scripts/admin_users.py create-user --email EMAIL --name "Nome" [--role viewer|analyst|admin]

Requisitos (mesmos do backend/.env):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    DATABASE_URL (opcional; sem ele o profile e gravado via PostgREST)

Nenhuma credencial fica salva neste arquivo: senhas sao geradas em
runtime e exibidas uma unica vez no terminal.
"""

import argparse
import os
import secrets
import string
import sys

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL', '').rstrip('/')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
DATABASE_URL = os.getenv('DATABASE_URL', '')

TEST_USER_EMAILS = ['admin@test.com', 'analyst@test.com', 'viewer@test.com']
ROLES = ['viewer', 'analyst', 'admin']
PASSWORD_SYMBOLS = '!@#$%&*+-=?'


def require_config(need_db=False):
    missing = []
    if not SUPABASE_URL:
        missing.append('SUPABASE_URL')
    if not SERVICE_ROLE_KEY:
        missing.append('SUPABASE_SERVICE_ROLE_KEY')
    if need_db and not DATABASE_URL:
        missing.append('DATABASE_URL')
    if missing:
        print(f"[ERRO] Variaveis ausentes: {', '.join(missing)} (configure em backend/.env)")
        sys.exit(1)


def auth_base():
    if SUPABASE_URL.endswith('/auth/v1'):
        return SUPABASE_URL
    return f'{SUPABASE_URL}/auth/v1'


def headers(with_json=False):
    h = {'apikey': SERVICE_ROLE_KEY, 'Authorization': f'Bearer {SERVICE_ROLE_KEY}'}
    if with_json:
        h['Content-Type'] = 'application/json'
    return h


def list_users():
    users, page = [], 1
    while True:
        r = requests.get(
            f'{auth_base()}/admin/users',
            headers=headers(),
            params={'page': page, 'per_page': 200},
            timeout=30,
        )
        if r.status_code != 200:
            print(f"[ERRO] Falha ao listar usuarios: {r.status_code} {r.text}")
            sys.exit(1)
        batch = r.json().get('users', [])
        users.extend(batch)
        if len(batch) < 200:
            return users
        page += 1


def generate_password(length=16):
    alphabet = string.ascii_letters + string.digits + PASSWORD_SYMBOLS
    while True:
        pw = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in pw) and any(c.isupper() for c in pw)
                and any(c.isdigit() for c in pw) and any(c in PASSWORD_SYMBOLS for c in pw)):
            return pw


def upsert_profile(user_id, email, full_name, role):
    if not DATABASE_URL:
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/profiles',
            headers={**headers(with_json=True), 'Prefer': 'resolution=merge-duplicates'},
            json={'id': user_id, 'email': email, 'full_name': full_name, 'role': role},
            timeout=30,
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f'Falha no upsert via PostgREST: {r.status_code} {r.text}')
        return

    import psycopg2

    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO profiles (id, email, full_name, role)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
              SET email = EXCLUDED.email,
                  full_name = EXCLUDED.full_name,
                  role = EXCLUDED.role
            """,
            (user_id, email, full_name, role),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()


def block_test_users(assume_yes):
    require_config()
    users = list_users()
    targets = [u for u in users if u.get('email') in TEST_USER_EMAILS]

    if not targets:
        print("[OK] Nenhum usuario de teste encontrado neste ambiente.")
        return

    print("Usuarios de teste encontrados (credenciais publicas no historico do git):")
    for u in targets:
        print(f"  - {u['email']} (id {u['id']})")

    if not assume_yes:
        answer = input("Bloquear esses acessos agora? [y/N] ").strip().lower()
        if answer != 'y':
            print("Abortado.")
            return

    for u in targets:
        email = u['email']
        r = requests.delete(f"{auth_base()}/admin/users/{u['id']}", headers=headers(), timeout=30)
        if r.status_code in (200, 204):
            print(f"[OK] Deletado: {email} (profile removido via ON DELETE CASCADE)")
            continue

        # Delecao pode falhar por FKs (registros criados pelo usuario).
        # Fallback: ban permanente + rotacao de senha para valor aleatorio.
        rotated = secrets.token_urlsafe(32)
        r2 = requests.put(
            f"{auth_base()}/admin/users/{u['id']}",
            headers=headers(with_json=True),
            json={'password': rotated, 'ban_duration': '876000h'},
            timeout=30,
        )
        if r2.status_code == 200:
            print(f"[OK] Delecao bloqueada por FK ({r.status_code}); usuario banido e senha rotacionada: {email}")
        else:
            print(f"[ERRO] Falha ao bloquear {email}: delete={r.status_code}, ban={r2.status_code} {r2.text}")

    print()
    print("Nota: sessoes ja abertas expiram quando o JWT atual vencer (ate ~1h).")


def create_user(email, full_name, role):
    require_config()
    password = generate_password()

    existing = next((u for u in list_users() if u.get('email') == email), None)

    if existing:
        user_id = existing['id']
        r = requests.put(
            f'{auth_base()}/admin/users/{user_id}',
            headers=headers(with_json=True),
            json={'password': password, 'email_confirm': True},
            timeout=30,
        )
        action = 'atualizado e confirmado'
    else:
        r = requests.post(
            f'{auth_base()}/admin/users',
            headers=headers(with_json=True),
            json={
                'email': email,
                'password': password,
                'email_confirm': True,
                'user_metadata': {'full_name': full_name},
            },
            timeout=30,
        )
        action = 'criado'

    if r.status_code not in (200, 201):
        print(f"[ERRO] Falha ao processar usuario no Supabase Auth: {r.status_code} {r.text}")
        sys.exit(1)

    if not existing:
        user_id = r.json().get('id')
        if not user_id:
            print(f"[ERRO] Resposta sem id do usuario: {r.text}")
            sys.exit(1)

    print(f"[OK] Usuario {action} no Supabase Auth: {email} (id {user_id})")

    try:
        upsert_profile(user_id, email, full_name, role)
        print(f"[OK] Profile salvo em public.profiles (role={role})")
    except Exception as e:
        print(f"[ERRO] Auth ok, mas falha ao salvar profile: {e}")
        sys.exit(1)

    print()
    print("=" * 56)
    print("  CREDENCIAIS DE ACESSO (exibidas uma unica vez)")
    print("=" * 56)
    print(f"  Email: {email}")
    print(f"  Senha: {password}")
    print(f"  Role:  {role}")
    print("=" * 56)
    print("Envie a senha por um canal seguro e peca para trocar no primeiro acesso.")


def main():
    parser = argparse.ArgumentParser(description='Administracao de usuarios do sistema')
    sub = parser.add_subparsers(dest='command', required=True)

    p_block = sub.add_parser('block-test-users', help='Bloqueia/deleta os usuarios de teste com credenciais vazadas')
    p_block.add_argument('--yes', action='store_true', help='Pula a confirmacao interativa')

    p_create = sub.add_parser('create-user', help='Cria (ou confirma/reseta) um usuario e gera senha')
    p_create.add_argument('--email', required=True)
    p_create.add_argument('--name', required=True, help='Nome completo')
    p_create.add_argument('--role', choices=ROLES, default='viewer')

    args = parser.parse_args()

    if args.command == 'block-test-users':
        block_test_users(assume_yes=args.yes)
    elif args.command == 'create-user':
        create_user(args.email, args.name, args.role)


if __name__ == '__main__':
    main()

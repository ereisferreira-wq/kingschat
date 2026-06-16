import paramiko, time, os, zipfile, tempfile

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.140.188.24', username='root', password='Gabi2311', timeout=15, allow_agent=False, look_for_keys=False)
sftp = ssh.open_sftp()

dist = r'C:\Users\Erik\Downloads\bot\kmenu-ai\backend\dist'
with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
    zip_path = tmp.name

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist):
        for f in files:
            if not f.endswith('.js'): continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, dist)
            zf.write(full, rel)

sftp.put(zip_path, '/root/projects/kingschat/backend-dist.zip')
os.unlink(zip_path)

# Deploy into container: clear old dist, extract new one, restart
cmds = (
    'docker cp /root/projects/kingschat/backend-dist.zip kingschat-backend-1:/tmp/dist.zip && '
    'docker exec kingschat-backend-1 sh -c "'
    'cd /app/dist && '
    'find . -name \\*.js -type f -delete 2>/dev/null; '
    'cd /tmp && unzip -o dist.zip -d dist_js/ && '
    'cp -r dist_js/* /app/dist/ && '
    'rm -rf dist_js dist.zip'
    '" && '
    'docker restart kingschat-backend-1'
)

stdin, stdout, stderr = ssh.exec_command(cmds, timeout=120)
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('STDOUT:', out)
print('STDERR:', err)

sftp.close()
ssh.close()

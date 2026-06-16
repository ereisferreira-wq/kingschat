import paramiko, time, os, zipfile, tempfile

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.140.188.24', username='root', password='Gabi2311', timeout=15, allow_agent=False, look_for_keys=False)

sftp = ssh.open_sftp()

# Zip dist
dist = r'C:\Users\Erik\Downloads\bot\kmenu-ai\frontend\dist'
with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
    zip_path = tmp.name
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(dist):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, dist)
            zf.write(full, rel)

sftp.put(zip_path, '/root/projects/kingschat/frontend-dist.zip')
os.unlink(zip_path)

# Deploy
ssh.exec_command(
    'docker cp /root/projects/kingschat/frontend-dist.zip kingschat-frontend-1:/tmp/dist.zip && '
    'docker exec kingschat-frontend-1 sh -c "cd /tmp && unzip -o dist.zip -d dist/ && '
    'cp -r dist/* /usr/share/nginx/html/ && rm -rf dist dist.zip"',
    timeout=30
)

time.sleep(2)

# Verify no AI provider in deployed JS
stdin, stdout, stderr = ssh.exec_command(
    "grep -c 'Provedor\\|aiProvider\\|aiModel' /usr/share/nginx/html/assets/index-*.js 2>&1",
    timeout=10
)
print("AI references found:", stdout.read().decode('utf-8', errors='replace').strip())

# Check frontend accessible
import urllib.request
try:
    resp = urllib.request.urlopen('http://13.140.188.24:8080/', timeout=10)
    print("Frontend online:", resp.status)
except Exception as e:
    print("Frontend check:", e)

sftp.close()
ssh.close()

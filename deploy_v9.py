import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('13.140.188.24', username='root', password='Gabi2311', timeout=15, allow_agent=False, look_for_keys=False)
sftp = ssh.open_sftp()
files = [
    ('backend/dist/modules/chatbot/chatbotService.js', '/tmp/chatbotService.js'),
    ('backend/dist/modules/whatsapp/whatsappService.js', '/tmp/whatsappService.js'),
    ('backend/dist/modules/scheduler/schedulerService.js', '/tmp/schedulerService.js'),
    ('backend/dist/modules/scheduler/schedulerController.js', '/tmp/schedulerController.js'),
    ('backend/dist/modules/scheduler/schedulerRoutes.js', '/tmp/schedulerRoutes.js'),
    ('backend/dist/shared/database/models/ChatbotConfig.js', '/tmp/ChatbotConfig.js'),
    ('backend/dist/shared/database/models/SystemNotice.js', '/tmp/SystemNotice.js'),
    ('backend/dist/shared/database/models/index.js', '/tmp/modelsIndex.js'),
    ('backend/dist/shared/database/index.js', '/tmp/dbIndex.js'),
    ('backend/dist/modules/admin/adminController.js', '/tmp/adminController.js'),
    ('backend/dist/modules/admin/adminRoutes.js', '/tmp/adminRoutes.js'),
    ('backend/dist/shared/services/cryptoStore.js', '/tmp/cryptoStore.js'),
    ('backend/dist/shared/services/persistService.js', '/tmp/persistService.js'),
    ('backend/dist/shared/utils/encryption.js', '/tmp/encryption.js'),
    ('backend/dist/app.js', '/tmp/app.js'),
    ('backend/dist/server.js', '/tmp/server.js'),
]
for local, remote in files:
    sftp.put(f'C:\\Users\\Erik\\Downloads\\bot\\kmenu-ai\\{local}', remote)
sftp.close()
cmds = 'docker exec kingschat-backend-1 mkdir -p /app/dist/modules/admin && '
cmds += 'docker cp /tmp/chatbotService.js kingschat-backend-1:/app/dist/modules/chatbot/chatbotService.js && '
cmds += 'docker cp /tmp/whatsappService.js kingschat-backend-1:/app/dist/modules/whatsapp/whatsappService.js && '
cmds += 'docker cp /tmp/schedulerService.js kingschat-backend-1:/app/dist/modules/scheduler/schedulerService.js && '
cmds += 'docker cp /tmp/schedulerController.js kingschat-backend-1:/app/dist/modules/scheduler/schedulerController.js && '
cmds += 'docker cp /tmp/schedulerRoutes.js kingschat-backend-1:/app/dist/modules/scheduler/schedulerRoutes.js && '
cmds += 'docker cp /tmp/ChatbotConfig.js kingschat-backend-1:/app/dist/shared/database/models/ChatbotConfig.js && '
cmds += 'docker cp /tmp/SystemNotice.js kingschat-backend-1:/app/dist/shared/database/models/SystemNotice.js && '
cmds += 'docker cp /tmp/modelsIndex.js kingschat-backend-1:/app/dist/shared/database/models/index.js && '
cmds += 'docker cp /tmp/dbIndex.js kingschat-backend-1:/app/dist/shared/database/index.js && '
cmds += 'docker cp /tmp/adminController.js kingschat-backend-1:/app/dist/modules/admin/adminController.js && '
cmds += 'docker cp /tmp/adminRoutes.js kingschat-backend-1:/app/dist/modules/admin/adminRoutes.js && '
cmds += 'docker cp /tmp/cryptoStore.js kingschat-backend-1:/app/dist/shared/services/cryptoStore.js && '
cmds += 'docker cp /tmp/persistService.js kingschat-backend-1:/app/dist/shared/services/persistService.js && '
cmds += 'docker cp /tmp/encryption.js kingschat-backend-1:/app/dist/shared/utils/encryption.js && '
cmds += 'docker cp /tmp/app.js kingschat-backend-1:/app/dist/app.js && '
cmds += 'docker cp /tmp/server.js kingschat-backend-1:/app/dist/server.js && '
cmds += 'docker restart kingschat-backend-1'
stdin, stdout, stderr = ssh.exec_command(cmds, timeout=60)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('STDOUT:', out)
print('STDERR:', err)
ssh.close()

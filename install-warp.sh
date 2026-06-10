#!/bin/bash
set -e

cd /tmp

echo "=== Baixando wgcf ==="
wget -q --no-check-certificate https://github.com/ViRb3/wgcf/releases/latest/download/wgcf_2.2.22_linux_amd64 -O wgcf
chmod +x wgcf
echo "=== Registrando WARP ==="
./wgcf register --accept-tos
echo "=== Gerando config ==="
./wgcf generate

echo "=== Baixando wireproxy v1.1.2 ==="
wget -q --no-check-certificate https://github.com/windtf/wireproxy/releases/download/v1.1.2/wireproxy-linux-amd64.tar.gz -O wireproxy-linux-amd64.tar.gz
tar -xf wireproxy-linux-amd64.tar.gz
mv wireproxy /usr/local/bin/wireproxy

PRIVATE_KEY=$(grep PrivateKey wgcf-profile.conf | cut -d= -f2 | tr -d ' ')
ADDRESS=$(grep Address wgcf-profile.conf | cut -d= -f2 | tr -d ' ')
WGCDNS=$(grep DNS wgcf-profile.conf | cut -d= -f2 | tr -d ' ')
PUBLIC_KEY=$(grep PublicKey wgcf-profile.conf | head -1 | cut -d= -f2 | tr -d ' ')
ENDPOINT=$(grep Endpoint wgcf-profile.conf | cut -d= -f2 | tr -d ' ')

mkdir -p /etc/wireproxy

cat > /etc/wireproxy/config.conf << 'CONFEOF'
[Interface]
PrivateKey = PRIVATEKEYPLACEHOLDER
Address = ADDRESSPLACEHOLDER
DNS = DNSPLACEHOLDER

[Peer]
PublicKey = PUBLICKEYPLACEHOLDER
Endpoint = ENDPOINTPLACEHOLDER
AllowedIPs = 0.0.0.0/0

[Socks5]
BindAddress = 127.0.0.1:1080
CONFEOF

sed -i "s|PRIVATEKEYPLACEHOLDER|$PRIVATE_KEY|" /etc/wireproxy/config.conf
sed -i "s|ADDRESSPLACEHOLDER|$ADDRESS|" /etc/wireproxy/config.conf
sed -i "s|DNSPLACEHOLDER|$WGCDNS|" /etc/wireproxy/config.conf
sed -i "s|PUBLICKEYPLACEHOLDER|$PUBLIC_KEY|" /etc/wireproxy/config.conf
sed -i "s|ENDPOINTPLACEHOLDER|$ENDPOINT|" /etc/wireproxy/config.conf

cat > /etc/systemd/system/wireproxy.service << 'SERVICEEOF'
[Unit]
Description=WARP SOCKS5 Proxy
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/wireproxy -c /etc/wireproxy/config.conf
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable wireproxy
systemctl start wireproxy

rm -f /tmp/wgcf /tmp/wgcf-profile.conf /tmp/wireproxy-linux-amd64.tar.gz

echo ""
echo "========================================"
echo " WARP SOCKS5 rodando em 127.0.0.1:1080"
echo "========================================"
echo ""
echo "Agora edite o .env: cd /root/kingschat && nano .env"
echo "Adicione: WA_PROXY_URL=socks5://127.0.0.1:1080"
echo "Depois: docker compose down && docker compose up -d"

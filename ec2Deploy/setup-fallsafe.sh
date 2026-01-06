#!/bin/bash
set -e

echo "🔧 Updating system packages..."
sudo dnf update -y

echo "🔧 Installing Git 2.42.0..."
sudo dnf install -y git

echo "🐹 Installing Go 1.23.2..."
GO_VERSION=1.23.2
wget https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go$GO_VERSION.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
rm go$GO_VERSION.linux-amd64.tar.gz

echo "🟢 Installing Node.js 22.12.0 and npm 11.0.0..."
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
sudo npm install -g http-server

echo "🐳 Installing Docker 27.4.0..."
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

echo "📦 Installing kubectl 1.30.5, kubelet, and kubeadm..."

cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.30/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.30/rpm/repodata/repomd.xml.key
repo_gpgcheck=1
EOF

sudo dnf install -y kubelet-1.30.5 kubeadm-1.30.5 kubectl-1.30.5
sudo systemctl enable kubelet

echo "📦 Installing k3d 5.7.5..."
curl -Lo k3d https://github.com/k3d-io/k3d/releases/download/v5.7.5/k3d-linux-amd64
chmod +x k3d
sudo mv k3d /usr/local/bin/

echo "🌐 Installing Nginx..."
sudo dnf install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "✅ Installed Versions:"
go version
node -v
npm -v
http-server -v
git --version
docker --version
kubectl version --client
k3d version
nginx -v

echo "🟢 Setup complete. Please log out and back in or run: newgrp docker"

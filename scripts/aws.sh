# How to configure a DB for Teamward,
# On i3.xlarge
# SSH into machine
# Ensure security group is open for PG

sudo parted -a optimal /dev/nvme0n1 mklabel gpt
sudo parted -a optimal /dev/nvme0n1 mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/nvme0n1p1
sudo mkdir //var/lib/postgresql/
sudo mount /dev/nvme0n1p1 //var/lib/postgresql/ -t ext4
sudo apt-get update
sudo apt-get install postgresql
// See http://www.techrepublic.com/blog/diy-it-guy/diy-a-postgresql-database-server-setup-anyone-can-handle/
// See https://www.cyberciti.biz/tips/postgres-allow-remote-access-tcp-connection.html

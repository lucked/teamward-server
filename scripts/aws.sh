# How to configure a DB for Teamward,
# On i3.xlarge
# SSH into machine
# Ensure security group are open for port 27017

# Mount SSD nvme
# See https://help.packet.net/technical/storage/how-to-configure-an-nvme-flash-drive
sudo mkdir /data
sudo parted -a optimal /dev/nvme0n1 mklabel gpt
sudo parted -a optimal /dev/nvme0n1 mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/nvme0n1p1
sudo mount /dev/nvme0n1p1 /data -t ext4
echo '/dev/nvme0n1p1 /data ext4 defaults,auto,noatime,noexec 0 0' | sudo tee -a /etc/fstab

# Setup mongo
echo "[mongodb-org-3.2]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/3.2/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.2.asc" |
  sudo tee -a /etc/yum.repos.d/mongodb-org-3.2.repo
sudo yum -y update && sudo yum install -y mongodb-org-server \
    mongodb-org-shell mongodb-org-tools

sudo chown mongod:mongod /data

echo '* soft nofile 64000
* hard nofile 64000
* soft nproc 64000
* hard nproc 64000' | sudo tee /etc/security/limits.d/90-mongodb.conf
sudo blockdev --setra 32 /dev/nvme0n1p1
echo 'ACTION=="add|change", KERNEL=="nvme0n1p1", ATTR{bdi/read_ahead_kb}="16"' | sudo tee -a /etc/udev/rules.d/85-ebs.rules
# Config
sudo vi /etc/mongod.conf
# dbPath: /data
# comment line on bindIp

sudo chkconfig mongod on

# Connect to mongo shell
# use admin
# db.createUser(
#  {
#    user: "admin",
#    pwd: "PASSWORD",
#    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
#  }
#)

#Turn on authentication
sudo vi /etc/mongod.conf
# security:
#     authorization: enabled

sudo service mongod restart

# Reconnect to mongo shell, and create the "standard" user:
mongo admin -u admin -p
# use teamward
# db.createUser(
#   {
#     user: "teamward",
#     pwd: "PASSWORD",
#     roles: [ { role: "readWrite", db: "teamward" } ]
#   }
# )

#Read the following attentively
# Shut down dynos
mongodump <old_db> /tmp
mongorestore --host localhost --db teamward -u teamward -p PASSWORD /tmp/

#!/bin/bash

echo 'Running gitlab-pages'
cd /home/sshuser/gitlab-pages
pwd
whoami
export PORT=1437
export DEBUG=*
npm start >log/one 2>log/two
#node debug ./bin/www
echo '...'



# angband-webclient
Browser client and webserver for playing Angband and variants

Quick installation instructions:

cd ~
git clone https://github.com/OwenGHB/angband-webclient/angband-webclient.git webclient
cd angband webclient
npm install
npm start

You'll need angband or the variants used here. Compile with:

./configure --prefix=$HOME

You'll need node.js, mongodb, probably some global npm packages.

If all goes well the server should be accessible at http://localhost:3000

If you succeed at this I'm impressed. Eventually there'll be some kind of installation routine using docker etc

Functionality is at a minimum, more to come

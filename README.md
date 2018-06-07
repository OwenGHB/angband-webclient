# angband-webclient
Browser client and webserver for playing Angband and variants

Since clients are in a roundabout way being given shell access, it's intended to install for a system user with limited priveliges for the express purpose of running the service. Clone this repo into the new user's home directory.

You'll need to download and compile the source code of the games you want to host. Sources are listed in the wiki. Many variants compile using autotools - for these you'll want to run configure with --prefix=$HOME --with-setgid=$USER --disable-x11. I keep the angband source files inside $HOME/src/

There are some modifications needed to the source code. Angband configuration predates the use of autotools, and the option in config.h (z-config.h in some variants) specifying USE_PRIVATE_PATHS should be disabled. Angband in curses mode will attempt to handle signals if given them, I have found the simplest way to avoid sending signals through the keyboard is to insert a raw(); call immediately after the line in main-gcu.c containing initscr();. Incidentally and unrelatedly, comments insisting someone should really check the semantics of that line go back decades.

Beyond this, several more modifications were made to Sil in order to have it behave similarly to other variants. There is no autotools build system, so the makefile was edited, along with several changes to config.h. A comparison of the main.c and load.c files between Sil and NPPAngband 0.4.1 is instructive in making savefile handling conform to other variants. More extensive modifications may be necessary for e.g. proper display of colour.

You can find download links for variants known to work in the wiki

As for the actual server, you need a mongodb service running in the background, but aside from that just npm install npm start and you should be good to go on port 3000 (subject to inevitable complications).



## database and sessions

This build uses file-based databases. All files are in `./db` and for security reasons are kept in private repository. If you want to use existing data make sure you checkout from that repository before you run angband.live client. Otherwise new empty files will be created.

`SESSION_SECRET` environment variable must be set before you launch this client. If you use existing files in `./db` make sure you set the same `SESSION_SECRET` value as was used before, otherwise sessions will be invalid and users will have to relogin.

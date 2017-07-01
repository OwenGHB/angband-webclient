# angband-webclient
Browser client and webserver for playing Angband and variants

Since clients are in a roundabout way being given shell access, it's intended to install for a system user with limited priveliges for the express purpose of running the service. Clone this repo into the new user's home directory.

You'll need to download and compile the source code of the games you want to host. Sources are listed in the wiki. Many variants compile using autotools - for these you'll want to run configure with --prefix=$HOME --with-setgid=$USER --disable-x11. I keep the angband source files inside $HOME/src/

There are some modifications needed to the source code. Angband configuration predates the use of autotools, and the option in config.h (z-config.h in some variants) specifying USE_PRIVATE_PATHS should be disabled. Angband in curses mode will attempt to handle signals if given them, I have found the simplest way to avoid sending signals through the keyboard is to insert a raw(); call immediately after the line in main-gcu.c containing initscr();. Incidentally and unrelatedly, comments insisting someone should really check the semantics of that line go back decades.

Beyond this, several more modifications were made to Sil in order to have it behave similarly to other variants. There is no autotools build system, so the makefile was edited, along with several changes to config.h. A comparison of the main.c and load.c files between Sil and NPPAngband 0.4.1 is instructive in making savefile handling conform to other variants. More extensive modifications may be necessary for e.g. proper display of colour.

Repositories for the modified source code of all currently supported variants will be made available.

After using make install on your configured variants you'll have several more directories not listed in the repository:
~/games/ containing the binaries
~/etc/$game/ is equivalent to the lib folder from the source download and contains static data loaded by the game at runtime. The precise names of each subdirectory are not consistent across variants but their functions are the same. Much of this can be deleted with no affect - e.g. fonts, tiles, icons, sounds (sometimes collected together in an 'xtra' folder). Poschengband seems a little confused here but runs without complaint.
~/share/$game/ contains 'file' or 'screens' information. Some variants use these for gameplay purposes but they are essentially the loading, victory and death screens.
~/var/games/$game/ is where the scorefiles and savefiles are kept - one savefile per user, one scorefile per variant.

By default Angband will store files created by the user at runtime (i.e. character sheets and pref files inside the ~/etc/ directory, but specifying another directory is easy. We specify a subdirectory of ~/public/user/$username/$game - Angband will happily create this for us if it does not already exist.

The exception to all of the above is once again Sil. Files have been copied manually and directories created in advance to reflect this structure.

As for the actual server, you need a mongodb service running in the background, but aside from that just npm install npm start and you should be good to go on port 3000 (subject to inevitable complications).

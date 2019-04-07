#!/usr/bin/env bash
cd ~/games/$1
git pull
git reset --hard origin/master
if test $1 = 'angband-master' || test $1 = 'composband' || test $1 = 'frogcomposband'
then
./autogen.sh
./configure --with-no-install --disable-x11
make
fi
if test $1 = 'silq-dev'
then
cd src
make -f Makefile.nfe
cd ../
fi
printf "Build complete, proceed to replace executable? [y/n]"
read -n 1 ans
if test $ans = 'y'
then
rm $1
if test $1 = 'angband-master'
then
cp src/angband ./$1
fi
if test $1 = 'composband' || test $1 = 'frogcomposband'
then
cp src/$1 ./
fi
if test $1 = 'silq-dev'
then
cp src/sil ./$1
fi
else
printf "\nExecutable not updated. Lib files replaced."
fi
printf "\nOperation complete. Press enter to continue".
read

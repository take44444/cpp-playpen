#!/bin/dash

g++ -xc++ - -std=gnu++17 -Wall -Wextra -O2 -DONLINE_JUDGE -I/opt/boost/gcc/include -L/opt/boost/gcc/lib -o ./a.out
if [ $? -gt 0 ]; then
  exit 1
fi

printf '\377' # 255 in octal

exec ./a.out

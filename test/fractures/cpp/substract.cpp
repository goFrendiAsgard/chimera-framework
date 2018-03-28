#include <iostream>
#include <stdio.h>
using namespace std;
int main( int argc, char *argv[], char *envp[] ) {
  if (argc < 3) {
    cout << "Invalid argument\n";
    cout << "Usage: substract <num1> <num2>\n";
  } else {
    int num1, num2, result;
    sscanf(argv[1], "%d", &num1);
    sscanf(argv[2], "%d", &num2);
    result = num1 - num2;
    cout << result << "\n";
  }
}

import sys
# process
def add(n1, n2):
    return n1 + n2;

# executor
if __name__ == '__main__':
    n1 = int(sys.argv[1])
    n2 = int(sys.argv[2])
    print(add(n1,n2))

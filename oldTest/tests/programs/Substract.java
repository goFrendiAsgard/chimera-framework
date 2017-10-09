public class Substract
{
    // process
    public static int substract(int n1, int n2)
    {
        return n1-n2;
    }

    // executor
    public static void main(String[] args)
    {
        int n1 = Integer.parseInt(args[0]);
        int n2 = Integer.parseInt(args[1]);
        System.out.println(substract(n1, n2));
    }

}

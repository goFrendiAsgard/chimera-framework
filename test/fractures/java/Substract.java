public class Substract {
  public static void main(String[] args) {
    if (args.length < 2) {
      System.out.println("Invalid argument");
      System.out.println("Usage: java Substract <num1> <num2>");
    } else {
      int n1 = Integer.parseInt(args[0]);
      int n2 = Integer.parseInt(args[1]);
      System.out.println(n1 - n2);
    }
  }
}

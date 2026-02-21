export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = "default",
    }: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      console.log("Toast:", title, description);

      alert(
        `${variant === "destructive" ? "❌ " : ""}${title ?? ""}\n${description ?? ""}`
      );
    },
  };
}

import Image from "next/image";

export function RentCoreLogo() {
  return (
    <Image
      src="/rentcore.png"
      alt="RentCore Logo"
      width={120}
      height={40}
      priority
      style={{ width: "auto", height: "auto" }}
    />
  );
}

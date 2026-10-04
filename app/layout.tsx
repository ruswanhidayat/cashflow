import "./globals.css";
import { Open_Sans, Pacifico } from "next/font/google";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
});

export const metadata = {
  title: "Buku Kas",
  description: "Aplikasi Pencatatan Pembayaran Kas - PSPP II",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${openSans.variable} ${pacifico.variable}`}
      >
        {children}
      </body>
    </html>
  );
}